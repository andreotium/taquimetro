# Plan de implementación de Taquímetro

Sale de `docs/arquitectura.md`. Son 26 tareas en 8 fases; cada una cabe en una sesión corta.

Reglas:

- Una tarea a la vez, en orden. No se empieza la siguiente hasta que la comprobación de la actual pase.
- "[André]" marca lo que André aprueba o ejecuta: aplicar migraciones, poner llaves, registrar URLs y configurar Vercel.
- Cada migración se propone como archivo nuevo en `supabase/migrations/`; André la revisa y la aplica. Nadie más modifica Supabase.
- Al terminar cada fase: `npm run lint` y `npm run build` pasan.

## Fase 1. Base de datos

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 1.1 | Migración de las 4 tablas: columnas, tipos, valores por defecto, validaciones (1 a 5, precio 5 a 150) y restricción única | migración nueva | Revisión de André contra la sección 2 de la arquitectura |
| 1.2 | Migración de GRANT por columna y políticas RLS de las 4 tablas | migración nueva | Revisión de André contra la sección 3, tabla por tabla |
| 1.3 | Migración de semilla: 20 taquerías desde el CSV y 20 filas de agregados con 0 votos | migración nueva | Revisión de André: 20 filas con nombre, alcaldía, latitud y longitud del CSV |
| 1.4 | [André] Aplicar las tres migraciones | ninguno | En el panel: 20 filas en `taquerias` y en `agregados_taqueria`; el advisor de seguridad no marca tablas sin RLS |

## Fase 2. Función bayesiana y trigger

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 2.1 | Instalar Vitest y supabase-js, agregar el script `test`. [André] crea `.env.test.local` con URL, llave pública y llave secreta | `package.json`, `vitest.config.ts`, `.env.test.local` | `npm run test` corre (sin pruebas todavía); `git status` no muestra `.env.test.local` |
| 2.2 | Migración de la función bayesiana (pura, `immutable`, GRANT de ejecución) y del trigger (`security definer`, `search_path` vacío, inserción y edición) | migración nueva | Revisión de André contra la sección 4 |
| 2.3 | [André] Aplicar la migración | ninguno | El advisor de seguridad no marca la función por `search_path` |
| 2.4 | Prueba del bayesiano: llamada como `anon` con m fijo; 80 votos de 4.6 quedan arriba de 1 voto de 5. [André] la rompe con C = 0 y la anota en su bitácora | `tests/bayesiano.test.ts` | `npm run test` en verde; con C = 0, en rojo |

## Fase 3. Prueba de RLS

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 3.1 | Ayudantes de prueba: crear y borrar a A y B con contraseña aleatoria (llave secreta) y abrir sesión como A, B o anónimo (llave pública) | `tests/ayudantes.ts` | Una corrida crea y borra los dos usuarios; en el panel de Auth no quedan usuarios de prueba |
| 3.2 | Prueba de RLS de tablas: B no lee ni edita la calificación de A; A no la mueve de taquería; nadie la borra; anónimo no escribe | `tests/rls.test.ts` | `npm run test` en verde; en el panel no quedan calificaciones de prueba |
| 3.3 | [André] Debilitar una política en el SQL Editor, correr la prueba, restaurar y anotarlo en su bitácora | ninguno | La prueba se pone en rojo y vuelve a verde al restaurar |

## Fase 4. Ranking y detalle de solo lectura

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 4.1 | Clientes de `@supabase/ssr` para navegador y servidor. [André] crea `.env.local` con URL y llave pública | `lib/supabase/`, `.env.local` | `npm run build` pasa; `git status` no muestra `.env.local` |
| 4.2 | Lectura del ranking: orden por bayesiano, desempate por votos y nombre, sin votos al final por nombre, etiqueta "pocos votos" | `app/page.tsx`, `components/` | `npm run dev`: las 20 aparecen en orden alfabético (todas sin votos) |
| 4.3 | Vista: en computadora ranking y detalle lado a lado (espacio para el mapa); en celular pestañas y detalle en su vista | `app/layout.tsx`, `app/page.tsx`, `components/` | Revisión en el navegador a ancho de computadora y de celular |
| 4.4 | Errores visibles: "no hay datos", "no se encontró" y "no se pudo consultar" | `components/` | Con una URL de Supabase falsa en `.env.local` aparece "no se pudo consultar"; al restaurarla, el ranking vuelve |

## Fase 5. Login y calificación

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 5.1 | Formulario de correo al tocar "Calificar" y ruta de regreso que inicia la sesión, ignora `next` y redirige a `/` | `components/`, `app/auth/callback/` | En local, el enlace del correo de André lo deja en `/` con sesión; agregar `?next=https://ejemplo.com` no cambia el destino |
| 5.2 | Formulario de calificación: crear con inserción y editar con `.update()` | `components/` | Calificar una taquería, editarla y ver en el panel una sola fila con los valores nuevos |
| 5.3 | Detalle con los agregados y la etiqueta "pocos votos" | `components/` | Tras calificar, el detalle muestra 1 voto, los promedios y "pocos votos" al recargar |

## Fase 6. Despliegue en Vercel

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 6.1 | [André] Crear el proyecto en Vercel y poner URL y llave pública como variables de entorno | ninguno | El despliegue termina y la página muestra el ranking en producción |
| 6.2 | [André] Registrar en Supabase las URLs exactas (localhost y dominio de producción) y la Site URL de producción | ninguno | Prueba manual: el enlace mágico funciona desde un teléfono real en producción |

## Fase 7. Tiempo real

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 7.1 | Migración que agrega `agregados_taqueria` a la publicación de Realtime. [André] la aplica | migración nueva | En el panel, solo `agregados_taqueria` aparece en la publicación; `calificaciones` no |
| 7.2 | Suscripción a cambios de agregados que reordena el ranking | `components/` | Dos navegadores abiertos: uno califica y el otro reordena sin recargar |

## Fase 8. Fotos y mapa

| # | Qué se hace | Archivos | Cómo se comprueba |
| --- | --- | --- | --- |
| 8.1 | Migración del bucket `fotos` (público, 5 MB, JPG y PNG) y sus políticas. [André] la aplica | migración nueva | En el panel: límites del bucket correctos y políticas filtradas por `fotos` |
| 8.2 | Ampliar la prueba de RLS: B no borra fotos de A, no sube a su carpeta ni registra su ruta; se rechazan un `.txt` y un archivo de más de 5 MB | `tests/rls.test.ts` | `npm run test` en verde; en el panel no quedan archivos de prueba |
| 8.3 | Subir, ver y borrar fotos en el detalle, con mensajes claros de tipo y tamaño | `components/` | Subir un JPG, verlo, borrarlo; un archivo de 6 MB muestra el error en pantalla |
| 8.4 | Mapa con Leaflet, react-leaflet y OpenStreetMap; tocar un marcador abre el detalle | `components/`, `package.json` | Las 20 taquerías aparecen en el mapa en computadora y en la pestaña "Mapa" en celular |

Si falta tiempo, se recorta en este orden: 8.4 (mapa), luego 8.1 a 8.3 (fotos), luego la fase 7.
