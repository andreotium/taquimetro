# Decisiones de arquitectura

Registro de decisiones de Taquímetro: qué se decidió, por qué y qué se descartó. La fuente del alcance es `docs/spec.md`.

Las decisiones salieron de la entrevista con `/the-architect` del 20 de octubre de 2026 y se simplificaron el 21 de octubre para ajustarlas a lo que pide la guía de onboarding. Regla general: ante dos opciones, gana la más simple que cumpla.

## D1. Un solo proyecto de Supabase

- Decisión: todo vive en el proyecto `taquimetro-onboarding`, incluidas las pruebas. Las pruebas usan dos usuarios de prueba y borran al terminar los datos que crearon.
- Por qué: no es una app real ni tiene usuarios externos, y no hay Docker para un Supabase local.
- Descartado: un segundo proyecto solo para pruebas y Supabase local con Docker.

## D2. El correo usa el SMTP por defecto de Supabase

- Decisión: el enlace mágico usa el correo integrado de Supabase. La prueba en teléfono real usa el correo de André.
- Por qué: un SMTP propio (Resend) exige verificar un dominio, y no se usará el de la empresa.
- Riesgo aceptado: el correo por defecto solo llega a miembros del equipo y envía pocos correos por hora. Ninguna prueba automática depende del correo.

## D3. Los usuarios de prueba se crean sin correo

- Decisión: las pruebas crean dos usuarios con la API de administración de Supabase. La llave secreta solo vive en `.env.test.local`, que git ignora, y nunca la usa la app.
- Por qué: una prueba que depende del correo no se puede repetir.

## D4. Fotos en una carpeta por usuario

- Decisión:
  - Bucket `fotos` público para mostrar las imágenes, con límite de 5 MB y solo `image/jpeg` e `image/png`.
  - Subir: solo usuarios con sesión y solo dentro de su carpeta (`<user_id>/<nombre-aleatorio>.<ext>`).
  - Borrar: solo el dueño del archivo.
  - Tabla `fotos` con `user_id`: lectura pública; insertar y borrar solo el autor.
- Por qué: es el patrón estándar de Supabase y se prueba con dos usuarios sin piezas extra.
- Descartado: fotos anónimas con tabla sin autor, trigger y verificación por `owner_id`. Era la parte más compleja y la guía no la pide.

## D5. Bitácora personal separada

- Decisión: `docs/bitacora.md` es la bitácora personal de André y nadie más escribe en ella. Las decisiones del proyecto van en este archivo.

## D6. Las escrituras van del navegador a Supabase, protegidas por RLS

- Decisión: la calificación y la foto se guardan desde el navegador con la sesión del usuario. No hay rutas de API propias para escribir.
- Por qué: los permisos viven en la base, así que RLS es la única defensa y se prueba en un solo lugar. Además, una foto de 5 MB no cabe en el límite de una función de Vercel.

## D7. Agregados recalculados por un trigger simple

- Decisión: un trigger sobre `calificaciones` recalcula las 20 filas de `agregados_taqueria` con cada cambio. El puntaje bayesiano es una función SQL pura que recibe v, R, m y C; el trigger la llama con C = 3.
- Por qué: es lo más simple que mantiene el ranking correcto.
- Descartado: candado para votos simultáneos, tabla `config`, mediana de precio y recálculo incremental.

## D8. Tiempo real sobre agregados

- Decisión: `agregados_taqueria` entra en la publicación de Realtime. La app se suscribe a sus cambios y reordena el ranking. Nunca hay suscripción a `calificaciones`.

## D9. Login con enlace mágico estándar

- Decisión: se usa el flujo normal de Supabase. El login aparece al tocar "Calificar" y, al volver del correo, el usuario llega a la página principal con su sesión iniciada. Se registran como URLs permitidas localhost y el dominio de Vercel.
- Riesgo conocido: si el enlace se abre en otro navegador del teléfono, puede fallar. Se resuelve solo si pasa en la prueba real.
- Descartado: volver a la misma taquería con el formulario abierto y la plantilla de correo con `token_hash`.

## D10. Pruebas con Vitest y rupturas a mano

- Decisión:
  - Vitest con supabase-js contra el proyecto, como usuario A, usuario B y anónimo.
  - La prueba del bayesiano llama a la función con valores fijos.
  - Cada ruptura se hace una vez a mano: se cambia C a 0 o se debilita una política en el SQL Editor, se confirma que la prueba se pone en rojo, se restaura y se anota en la bitácora.
- Descartado: huella de políticas, `npm run rupturas`, archivos `romper.sql` y `restaurar.sql` y carril con conexión directa a Postgres.

## D11. Semilla tal cual

- Decisión: la migración de semilla usa las 20 taquerías de `supabase/seed/datos.csv` sin verificarlas contra otra fuente. La guía pide buscarlas en el mapa del chat, y así se hizo.
- Descartado: scripts de Nominatim y CSV de revisión.

## D12. Diseño minimalista sin mockup

- Decisión: app web minimalista, de colores claros y fácil de entender. En computadora: ranking, mapa y detalle lado a lado. En celular: pestañas "Ranking" y "Mapa" y el detalle en su propia vista. No se usa mockup de referencia.
- Por qué: el mockup de Claude Design estaba pensado como app de celular y era difícil de entender.