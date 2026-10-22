# Arquitectura de Taquímetro

Basada en `docs/spec.md` y en las decisiones D1 a D12 de `docs/decisiones.md`. Los detalles que la spec no fijaba están resueltos al final.

## 1. Resumen

1. App web en Next.js, desplegada en Vercel, con datos, login, fotos y tiempo real en un solo proyecto de Supabase (D1).
2. Cualquiera ve el ranking, el mapa y el detalle; para calificar o subir fotos hay que entrar con enlace mágico (D9).
3. El navegador escribe directo en Supabase con la sesión del usuario; RLS es la única defensa (D6).
4. Un trigger recalcula los agregados y el puntaje bayesiano en la base con cada calificación nueva, editada o borrada en cascada al borrar un usuario (D7).
5. La app se suscribe solo a `agregados_taqueria` para reordenar el ranking en vivo, nunca a `calificaciones` (D8).

## 2. Tablas

**taquerias** (20 filas sembradas desde `supabase/seed/datos.csv`, D11)

| Columna | Tipo | Nota |
| --- | --- | --- |
| id | entero (bigint) | llave primaria |
| nombre | texto | obligatorio; sale de "Taquería (con sucursal)" |
| alcaldia | texto | sale de "Alcaldía" |
| latitud, longitud | número decimal (double precision) | salen de "Latitud" y "Longitud" |

Del CSV se ignoran las columnas "#", "Fuente" y "Estado de verificación".

**calificaciones** (una por usuario por taquería; no se borran desde la app)

| Columna | Tipo | Nota |
| --- | --- | --- |
| id | entero (bigint) | llave primaria |
| user_id | uuid | apunta al usuario de Auth con `on delete cascade`: si se borra el usuario, se borran sus calificaciones; se llena solo con el id de la sesión |
| taqueria_id | bigint | apunta a `taquerias` |
| salsa, tortilla, carne | entero pequeño (smallint) | obligatorios, validados entre 1 y 5 |
| puntaje | numérico | columna calculada por la base: promedio de los tres criterios |
| precio | numérico con decimales | obligatorio, validado entre 5 y 150 |
| copia | booleano | obligatorio: sí o no |
| creada_en | fecha y hora (timestamptz) | se llena sola con la hora actual |

Restricción única en (user_id, taqueria_id): editar actualiza la misma fila.

**fotos**

| Columna | Tipo | Nota |
| --- | --- | --- |
| id | bigint | llave primaria |
| taqueria_id | bigint | apunta a `taquerias` |
| user_id | uuid | autor; apunta al usuario de Auth con `on delete cascade`: si se borra el usuario, se borran sus filas (no los archivos de Storage); se llena solo con el id de la sesión |
| ruta | texto | `<user_id>/<nombre-aleatorio>.<ext>` dentro del bucket |
| creada_en | timestamptz | se llena sola con la hora actual |

**agregados_taqueria** (una fila por taquería; la semilla crea las 20 con 0 votos)

| Columna | Tipo | Nota |
| --- | --- | --- |
| taqueria_id | bigint | llave primaria, apunta a `taquerias` |
| votos | entero | v; empieza en 0 |
| prom_salsa, prom_tortilla, prom_carne | numérico | vacío (null) sin votos |
| precio_promedio | numérico | vacío sin votos |
| porcentaje_copia | numérico | vacío sin votos |
| puntaje_bayesiano | numérico | vacío sin votos |

## 3. Permisos: RLS y GRANT

Como "exponer tablas nuevas" está apagado, cada tabla necesita dos cosas: el GRANT (qué operaciones puede intentar cada rol) y la política RLS (qué filas puede tocar). Roles: `anon` (sin sesión) y `authenticated` (con sesión).

- **taquerias**: GRANT de lectura a `anon` y `authenticated`. Política: todos leen todas las filas. Sin GRANT ni política de escritura; la semilla entra con `supabase/seed.sql`, que se aplica con `supabase db push --include-seed`.
- **calificaciones**: sin GRANT para `anon`. A `authenticated`:
  - GRANT de lectura de todas las columnas.
  - GRANT de inserción solo en `taqueria_id`, `salsa`, `tortilla`, `carne`, `precio` y `copia`; `user_id` y `creada_en` se llenan solos.
  - GRANT de actualización solo en `salsa`, `tortilla`, `carne`, `precio` y `copia`. Así nadie puede mover su voto a otra taquería ni cambiar el autor.
  - Políticas: solo lees, insertas y actualizas filas donde `user_id` es tu propio id. En la actualización se revisa tanto la fila antes del cambio (USING) como la fila después (WITH CHECK), las dos con `user_id = auth.uid()`.
  - Sin GRANT ni política de borrado: nadie borra calificaciones desde la app.
  - Para editar, la app usa `.update()` y no `.upsert()`: el upsert intenta escribir columnas sin GRANT y falla.
- **fotos**: GRANT de lectura a `anon` y `authenticated`. A `authenticated`, GRANT de inserción solo en `taqueria_id` y `ruta`, y GRANT de borrado. Políticas: todos leen; solo insertas filas con tu `user_id` y cuya `ruta` empiece con tu id como primera carpeta; solo borras tus filas.
- **agregados_taqueria**: GRANT de lectura a `anon` y `authenticated`. Política: todos leen. Sin escritura desde la app; solo escribe el trigger.
- **Función bayesiana**: GRANT de ejecución a `anon` y `authenticated`. Es segura porque es pura: solo hace cuentas con los números que recibe y no lee datos. Se declara `immutable` (mismo resultado con los mismos números), con permisos del que la llama y con `search_path` vacío.
- **Bucket `fotos`** (políticas sobre los archivos de Storage; todas filtran por el bucket `fotos`):
  - Configurado como público, con límite de 5 MB y solo `image/jpeg` e `image/png` (D4). El tipo que se revisa es el que declara el navegador al subir.
  - Ver las imágenes: cualquiera, por su URL pública, sin necesidad de política.
  - Listar o consultar archivos: solo los de tu propia carpeta. Así nadie lista todo el bucket.
  - Subir: solo con sesión y solo si la primera carpeta de la ruta es tu id.
  - Borrar: solo archivos dentro de tu propia carpeta.
  - Sin permiso para reemplazar archivos.
- El operador borra fotos inapropiadas desde el panel de Supabase, que no pasa por RLS: el archivo en Storage y la fila en el editor de tablas.

## 4. Trigger de agregados y función bayesiana

**Función bayesiana.** Una función SQL pura: recibe v (votos), R (promedio de la taquería), m (promedio global) y C (peso), y devuelve `v/(v+C) * R + C/(v+C) * m`. No lee tablas, así que se prueba con números fijos. Si v es 0 o no hay promedio global, devuelve vacío.

**Trigger.** Se dispara después de cada inserción, edición o borrado en `calificaciones`. La app no borra calificaciones, pero al borrar un usuario de prueba sus calificaciones se borran en cascada y los agregados deben recalcularse. En cada disparo:

1. Calcula m: el promedio del `puntaje` de todas las calificaciones de todas las taquerías.
2. Para cada una de las 20 taquerías, calcula votos, promedios de salsa, tortilla y carne, precio promedio y porcentaje de copia.
3. Llama a la función bayesiana con C = 3 y actualiza las filas que ya existen en `agregados_taqueria`.
4. Recalcula las 20 filas aunque solo cambie una, porque m cambia para todas (aceptado en el MVP).

El trigger necesita ver todas las calificaciones, no solo las del usuario que votó, así que corre con los permisos del dueño de la función (`security definer`) y no con los del usuario. Por eso fija un `search_path` vacío (la lista de esquemas donde busca tablas) y escribe los nombres completos, como `public.calificaciones`, para que nadie pueda colarle una tabla falsa.

**En la pantalla.** Ranking por puntaje bayesiano de mayor a menor; si hay empate, primero la de más votos, y si sigue el empate, por nombre. Con menos de 3 votos se muestra la etiqueta "pocos votos". Sin votos: al final, sin puntaje, en orden alfabético.

## 5. Cómo funciona cada flujo

**Tiempo real**
1. La migración inicial agrega `agregados_taqueria` a la publicación de Realtime.
2. Al cargar, la app lee el ranking (taquerías con sus agregados).
3. El navegador se suscribe a los cambios de `agregados_taqueria`.
4. Alguien califica; el trigger reescribe las filas de agregados.
5. Supabase avisa a cada pantalla abierta, una vez por fila. La app agrupa esos avisos y vuelve a pedir el ranking una sola vez; la taquería elegida se conserva.

**Login con enlace mágico** (con `@supabase/ssr`, que guarda la sesión en cookies para que la lean tanto el navegador como el servidor)
1. El usuario toca "Calificar" sin sesión y aparece el formulario de correo.
2. La app pide a Supabase enviar el enlace mágico (correo por defecto de Supabase, D2).
3. El usuario abre el enlace y llega a la ruta de regreso del login. En Supabase se registran URLs exactas (localhost y el dominio de producción), sin comodines como `*.vercel.app`, y la Site URL apunta a producción.
4. Esa ruta cambia el código del enlace por una sesión, guarda la cookie y siempre redirige a la página principal del mismo sitio. Ignora cualquier parámetro como `next`, para que nadie pueda usarla para mandar al usuario a otro sitio. Solo inicia la sesión; no escribe datos de la app, así que no choca con D6.
5. El usuario ya puede calificar. No vuelve a la taquería con el formulario abierto (fuera de alcance).

**Subida de fotos**
1. Con sesión, el usuario elige un archivo en el detalle de la taquería.
2. La app revisa tipo y tamaño antes de enviar, solo para dar un mensaje claro.
3. La app sube el archivo al bucket en `<su_id>/<nombre-aleatorio>.<ext>`. El bucket y sus políticas rechazan lo que no cumpla.
4. Si la subida funciona, la app inserta la fila en `fotos` con la ruta.
5. El detalle muestra la foto con su URL pública. Para borrar, la app borra el archivo y luego la fila.
6. Riesgo aceptado: si falla un paso intermedio puede quedar un archivo sin fila o una fila sin archivo. El operador los limpia a mano.

## 6. Carpetas de Next.js

```
app/
  layout.tsx              estructura general y estilos
  page.tsx                página principal: ranking, mapa y detalle
  error.tsx               error inesperado: mensaje en español y "Intentar de nuevo"
  not-found.tsx           ruta que no existe: "No se encontró esta página"
  auth/callback/          ruta de regreso del login: inicia la sesión y redirige a /
proxy.ts                  renueva la sesión antes de cada página y guarda la cookie (un Server Component no puede)
components/               ranking, mapa (Leaflet), detalle, formulario de calificación, fotos, login
lib/supabase/             clientes de @supabase/ssr para navegador y servidor (solo llave pública)
supabase/
  migrations/             esquema inicial (tablas, RLS, GRANT, función, trigger, bucket, Realtime) y formato de fotos.ruta
  seed.sql                semilla: 20 taquerías y sus agregados en 0 (db push --include-seed)
  seed/datos.csv          las 20 taquerías
tests/                    pruebas de Vitest:
  ayudantes.ts            crear y borrar usuarios de prueba, abrir sesiones y limpiar sus fotos
  ayudantes.test.ts       los ayudantes crean a A, B y C, abren sus sesiones y los borran
  bayesiano.test.ts       función bayesiana en la base
  rls.test.ts             RLS de calificaciones, de la tabla fotos (incluye el formato de la ruta) y del bucket
  trigger.test.ts         agregados al insertar, editar y borrar una calificación
  ranking.test.ts         orden del ranking y etiqueta "pocos votos"
  consulta.test.ts        estados "ok", "vacío", "no encontrado" y "error"
  auth.test.ts            destino del login y mensajes de error del envío del correo
  calificacion.test.ts    validación, mensajes de error, y leer y guardar contra Supabase
  fotos.test.ts           validación, ruta, mensajes de error, y leer, subir y borrar contra Supabase
  agrupar.test.ts         agrupación de avisos de Realtime
  mapa.test.ts            taquerías con y sin coordenadas en el mapa
.env.local                URL y llave pública de Supabase (ignorado por git)
.env.example              nombres de las variables de .env.local, sin valores
.env.test.local           URL, llave pública y llave secreta, solo para pruebas (ignorado por git, D3)
.env.test.example         nombres de las variables de .env.test.local, sin valores
```

## 7. Pruebas

Vitest con supabase-js contra el proyecto real (D1, D10). Las pruebas crean tres usuarios con la API de administración (D3): A y B para RLS, y C solo para la prueba del trigger, para que borrarlo no afecte a las demás. Al terminar borran lo que crearon.

- La llave secreta solo crea y borra los usuarios de prueba. Todas las comprobaciones usan la llave pública con la sesión de A, B o C, o sin sesión; si se hicieran con la llave secreta, RLS no aplicaría y la prueba pasaría siempre.
- Los usuarios de prueba reciben una contraseña aleatoria en cada corrida.
- La llave secreta vive en una variable sin prefijo `NEXT_PUBLIC_`, y nada en `app/` ni en `lib/` lee `.env.test.local`.

| Prueba | Qué verifica | Cómo se rompe a propósito |
| --- | --- | --- |
| Puntaje bayesiano | Llamando a la función como `anon`, con m fijo, 1 voto de 5 queda debajo de 80 votos de 4.6 | Correrla con C = 0: el voto único de 5 gana y la prueba se pone en rojo |
| RLS entre dos usuarios | B no lee ni edita la calificación de A; A no puede mover su calificación a otra taquería; nadie puede borrar una calificación; B no borra fotos de A, no sube a la carpeta de A ni registra en `fotos` una ruta de A; B tampoco registra una ruta con `..` ni una que la app no genera (restricción `fotos_ruta_formato`, código 23514); se rechaza un `.txt` y un archivo de más de 5 MB | Debilitar una política a mano en el SQL Editor, ver la prueba en rojo y restaurarla |
| Trigger de agregados | Se leen los votos y promedios de una taquería; C la califica y los votos suben en 1 respecto a los de antes; C edita su calificación y los promedios cambian sin cambiar los votos; al borrar a C, votos y promedios regresan a los valores de antes. Comparar contra el valor previo evita fallar si la taquería ya tenía votos reales | Quitar el borrado del trigger en el SQL Editor: los votos se quedan uno arriba y la prueba se pone en rojo |
| Enlace mágico | El flujo completo funciona en un teléfono real | Prueba manual, sin ruptura |

Cada ruptura se hace una vez, a mano. André la anota en su bitácora.

## 8. Fases de construcción

1. **Base de datos** (hecha): una sola migración, `supabase/migrations/20261021174405_esquema_inicial.sql`, con las 4 tablas, GRANT, RLS, función bayesiana, trigger, bucket `fotos` y Realtime; y la semilla en `supabase/seed.sql` (20 taquerías y 20 filas de agregados en 0), aplicada con `supabase db push --include-seed`. Se comprueba: los datos aparecen en el panel y un usuario anónimo puede leerlos pero no escribir.
2. **Vitest y prueba del bayesiano**: se instala Vitest y se prueba la función bayesiana. Se comprueba: la prueba pasa y se pone en rojo con C = 0.
3. **Prueba de RLS y del trigger**: Vitest con tres usuarios (A y B para RLS, C para el trigger). Se comprueba: pasa, y se pone en rojo al debilitar una política o quitar el borrado del trigger a mano.
4. **Ranking y detalle de solo lectura**: clientes de `@supabase/ssr` para navegador y servidor; la página muestra el ranking ordenado (con desempates) y el detalle, con los tres errores distintos. Se comprueba: `npm run build` y `npm run lint` pasan, y la app se ve en computadora y en celular.
5. **Login y calificación**: formulario de correo, ruta de regreso y formulario de calificación con edición. Se comprueba: al calificar en local, el agregado cambia y aparece "pocos votos" con menos de 3 votos.
6. **Despliegue en Vercel**: variables de entorno y URLs de redirección (las coloca André). Se comprueba: el enlace mágico funciona en producción desde un teléfono real.
7. **Tiempo real**: suscripción a `agregados_taqueria`. Se comprueba: con dos pantallas abiertas, una califica y la otra reordena el ranking sin recargar.
8. **Fotos y mapa**: prueba de RLS del bucket (que ya existe desde la fase 1), subida y borrado de fotos, y mapa con Leaflet. Se comprueba: la prueba de RLS cubre el bucket y pasa; un archivo de más de 5 MB se rechaza en pantalla; las 20 taquerías aparecen en el mapa.

Si falta tiempo, la fase 8 se recorta primero (mapa, luego fotos) y después la 7, según el orden de recorte de la spec.

## Detalles resueltos

1. **Tipos de columnas**: los de la sección 2.
2. **Columnas del CSV**: "#, Taquería (con sucursal), Alcaldía, Latitud, Longitud, Fuente, Estado de verificación". Se usan nombre, alcaldía, latitud y longitud; las otras tres se ignoran.
3. **Filas de agregados**: la semilla crea las 20 filas con 0 votos; el trigger solo las actualiza.
4. **Borrar calificación**: no se permite desde la app. Sin GRANT ni política de borrado. El trigger también reacciona al borrado, que solo ocurre en cascada al borrar un usuario de prueba.
5. **Campos obligatorios**: precio y copia son obligatorios.
6. **Fecha de edición**: no hay columna `actualizada_en`.
7. **Función bayesiana**: GRANT de ejecución a `anon` y `authenticated`; es pura y no lee datos.
8. **Tipo de archivo**: basta con el tipo declarado. La prueba sube un `.txt` y confirma que se rechaza.
9. **Fotos huérfanas**: riesgo aceptado. El operador borra el archivo en Storage y la fila en el editor de tablas.
10. **Ruta de regreso del login**: se permite. D6 prohíbe rutas que escriban datos de la app, y esta solo inicia la sesión.
11. **Cliente de Supabase**: `@supabase/ssr`.
12. **Mapa**: Leaflet con react-leaflet y mapas de OpenStreetMap.
13. **Empates**: primero más votos; si siguen empatados, por nombre.
14. **Agregados con un solo voto**: riesgo aceptado. Con 1 voto, los promedios públicos muestran la calificación exacta de esa persona, aunque no quién la hizo.
