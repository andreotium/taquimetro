# Plan de implementación de Taquímetro

Sale de `docs/arquitectura.md`. Son 21 tareas en 8 fases; cada una cabe en una sesión corta.

Reglas:

- Una tarea a la vez, en orden. No se empieza la siguiente hasta que la comprobación de la actual pase.
- "[André]" marca lo que André aprueba o ejecuta: aplicar migraciones, poner llaves, registrar URLs y configurar Vercel.
- Cada migración se propone como archivo nuevo en `supabase/migrations/`; André la revisa y la aplica. Nadie más modifica Supabase.
- Al terminar cada fase: `npm run lint` y `npm run build` pasan.

## Fase 1. Base de datos (hecha)

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 1.1 | **Hecha.** Migración única con toda la base: las 4 tablas, GRANT por columna, RLS, función bayesiana, trigger de agregados (inserción, edición y borrado), bucket `fotos` (público, 5 MB, JPG y PNG) con sus políticas y Realtime en `agregados_taqueria`. [André] la aplicó | `supabase/migrations/20261021174405_esquema_inicial.sql` | En el panel: las 4 tablas con RLS; límites del bucket correctos y políticas filtradas por `fotos`; solo `agregados_taqueria` en la publicación de Realtime; el advisor de seguridad no marca tablas sin RLS ni funciones por `search_path` |
| 1.2 | **Hecha.** Semilla: 20 taquerías desde el CSV y 20 filas de agregados con 0 votos; se puede correr dos veces sin duplicar. [André] la aplicó con `supabase db push --include-seed` | `supabase/seed.sql` | En el panel: 20 filas en `taquerias` y en `agregados_taqueria`, con nombre, alcaldía, latitud y longitud del CSV |

## Fase 2. Vitest y prueba del bayesiano (hecha)

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 2.1 | **Hecha.** Instalar Vitest y supabase-js, agregar el script `test`. [André] crea `.env.test.local` con URL, llave pública y llave secreta | `package.json`, `vitest.config.ts`, `.env.test.example`, `.gitignore` | `npm run test` corre (sin pruebas todavía); `git status` no muestra `.env.test.local` |
| 2.2 | **Hecha.** Prueba del bayesiano: llamada como `anon` con m fijo; 80 votos de 4.6 quedan arriba de 1 voto de 5. [André] la rompe con C = 0 y la anota en su bitácora | `tests/bayesiano.test.ts` | `npm run test` en verde; con C = 0, en rojo |

## Fase 3. Prueba de RLS y del trigger (hecha)

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 3.1 | **Hecha.** Ayudantes de prueba: crear y borrar a A, B y C con contraseña aleatoria (llave secreta) y abrir sesión como A, B, C o anónimo (llave pública) | `tests/ayudantes.ts`, `tests/ayudantes.test.ts` | Una corrida crea y borra los tres usuarios; en el panel de Auth no quedan usuarios de prueba |
| 3.2 | **Hecha.** Prueba de RLS de tablas: B no lee ni edita la calificación de A; A no la mueve de taquería; nadie la borra; anónimo no escribe | `tests/rls.test.ts` | `npm run test` en verde; en el panel no quedan calificaciones de prueba |
| 3.3 | **Hecha.** Prueba del trigger con su propio usuario C: se leen los votos y promedios de una taquería; C la califica y los votos suben en 1 respecto a los de antes; al borrar a C, votos y promedios regresan a los valores de antes. [André] la rompe quitando el borrado del trigger en el SQL Editor y la anota en su bitácora | `tests/trigger.test.ts` | `npm run test` en verde; sin el borrado en el trigger, en rojo |
| 3.4 | **Hecha.** [André] Debilitar la política de lectura de calificaciones en el SQL Editor (mover, borrar e insertar sin sesión los protege el GRANT, no una política), correr la prueba de RLS, restaurar y anotarlo en su bitácora | ninguno | La prueba se pone en rojo y vuelve a verde al restaurar |

## Fase 4. Ranking y detalle de solo lectura

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 4.1 | **Hecha.** Instalar `@supabase/ssr` y pasar `@supabase/supabase-js` a `dependencies`; clientes para navegador y servidor. [André] crea `.env.local` con URL y llave pública a partir de `.env.example` | `package.json`, `lib/supabase/`, `.env.example`, `.gitignore` | `npm run build` pasa; `git status` no muestra `.env.local` |
| 4.2 | **Hecha.** Lectura del ranking: orden por bayesiano, desempate por votos y nombre, sin votos al final por nombre, etiqueta "pocos votos" | `app/page.tsx`, `components/` | `npm run dev`: las 20 aparecen en orden alfabético (todas sin votos) |
| 4.3 | **Hecha.** Vista: en computadora ranking, espacio para el mapa y detalle lado a lado; en celular pestañas y detalle en su vista. El detalle muestra puntaje, votos, promedios, precio promedio, porcentaje de copia y la etiqueta "pocos votos" | `app/layout.tsx`, `app/page.tsx`, `components/` | Revisión en el navegador a ancho de computadora y de celular |
| 4.4 | Errores visibles: "no hay datos", "no se encontró" y "no se pudo consultar" | `components/` | Con una URL de Supabase falsa en `.env.local` aparece "no se pudo consultar"; al restaurarla, el ranking vuelve |

## Fase 5. Login y calificación

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 5.1 | Formulario de correo al tocar "Calificar" y ruta de regreso que inicia la sesión, ignora `next` y redirige a `/` | `components/`, `app/auth/callback/` | En local, el enlace del correo de André lo deja en `/` con sesión; agregar `?next=https://ejemplo.com` no cambia el destino |
| 5.2 | Formulario de calificación: crear con inserción y editar con `.update()` | `components/` | Calificar una taquería, editarla y ver en el panel una sola fila con los valores nuevos |
| 5.3 | El detalle (hecho en 4.3) refleja la calificación nueva al recargar | `components/` | Tras calificar, el detalle muestra 1 voto, los promedios y "pocos votos" al recargar |

## Fase 6. Despliegue en Vercel

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 6.1 | [André] Crear el proyecto en Vercel y poner URL y llave pública como variables de entorno | ninguno | El despliegue termina y la página muestra el ranking en producción |
| 6.2 | [André] Registrar en Supabase las URLs exactas (localhost y dominio de producción) y la Site URL de producción | ninguno | Prueba manual: el enlace mágico funciona desde un teléfono real en producción |

## Fase 7. Tiempo real

La publicación de Realtime ya quedó en la migración de la tarea 1.1.

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 7.1 | Suscripción a cambios de agregados que reordena el ranking | `components/` | Dos navegadores abiertos: uno califica y el otro reordena sin recargar |

## Fase 8. Fotos y mapa

El bucket `fotos` y sus políticas ya quedaron en la migración de la tarea 1.1.

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 8.1 | Ampliar la prueba de RLS: B no borra fotos de A, no sube a su carpeta ni registra su ruta; se rechazan un `.txt` y un archivo de más de 5 MB | `tests/rls.test.ts` | `npm run test` en verde; en el panel no quedan archivos de prueba |
| 8.2 | Subir, ver y borrar fotos en el detalle, con mensajes claros de tipo y tamaño | `components/` | Subir un JPG, verlo, borrarlo; un archivo de 6 MB muestra el error en pantalla |
| 8.3 | Mapa con Leaflet, react-leaflet y OpenStreetMap; tocar un marcador abre el detalle | `components/`, `package.json` | Las 20 taquerías aparecen en el mapa en computadora y en la pestaña "Mapa" en celular |

Si falta tiempo, se recorta en este orden: 8.3 (mapa), luego 8.1 y 8.2 (fotos), luego la fase 7.
