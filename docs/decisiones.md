# Decisiones de arquitectura

Registro de decisiones de Taquímetro: qué se decidió, por qué y qué se descartó. La fuente del alcance es `docs/spec.md`; este archivo cierra lo que la spec dejó abierto.

Estado: **confirmada** (la aprobó Andre) o **propuesta** (espera confirmación en la revisión de arquitectura).

## D1. Las pruebas corren contra un proyecto remoto de Supabase

- Estado: confirmada, 2026-10-20.
- Decisión: las pruebas de la base y de RLS corren contra un segundo proyecto de Supabase en la nube, `taquimetro-pruebas`, dentro de la organización `andre-onboarding`. Cada migración se aplica primero ahí y después, con aprobación, en producción.
- Por qué: no hay Docker y no se instalará para el MVP, así que no se puede levantar un Supabase local. Además, los límites del bucket (5 MB, solo imágenes) los aplica el servidor de Storage, no Postgres, y probarlos exige un Supabase real.
- Descartado: Supabase CLI local con Docker y pgTAP.

## D2. El correo usa el SMTP por defecto de Supabase

- Estado: confirmada, 2026-10-20.
- Decisión: el enlace mágico usa el SMTP integrado de Supabase. La prueba en teléfono real usa el correo de Andre, que ya es miembro de la organización. Los dos dispositivos de la demo en vivo pueden compartir esa cuenta.
- Por qué: el SMTP propio (Resend) exige verificar un dominio, y no se usará el de la empresa.
- Riesgo aceptado: el SMTP por defecto solo entrega a miembros del equipo y está limitado a unos 2 correos por hora para todo el proyecto. Usuarios externos no pueden entrar en el MVP.
- Consecuencia: ninguna prueba automática depende del correo (ver D3).

## D3. Los usuarios de prueba se crean sin correo

- Estado: confirmada, 2026-10-20.
- Decisión: la prueba de RLS crea dos usuarios en `taquimetro-pruebas` con la API de administración, usando la llave secreta de ese proyecto solo en las pruebas. Las sesiones se obtienen sin enviar ningún correo.
- Por qué: D2 limita el correo, y una prueba que depende del correo no es repetible.

## D4. Propiedad de las fotos por owner_id

- Estado: confirmada, 2026-10-20.
- Decisión:
  - El bucket `fotos` es público para mostrar los archivos y tiene límites de 5 MB e `image/*`.
  - Políticas en `storage.objects`:
    - Subir: usuarios con sesión, con nombre `<uuid>.<ext>` y sin carpetas.
    - Leer y borrar: solo el dueño, `owner_id = auth.uid()::text`.
    - Actualizar: sin política, así que ningún archivo se sobrescribe.
  - El cliente no escribe la tabla `fotos`. La mantiene un trigger sobre `votos.foto_ruta`, que es privada, y ese trigger rechaza una ruta cuyo objeto no le pertenece al autor del voto.
  - El operador borra una foto con una función SQL que limpia `fotos` y `votos`, y borra el archivo desde el panel de Storage.
- Por qué: la ruta no lleva `user_id`, así que la propiedad se verifica con el `owner_id` que Storage registra en el objeto. Si el trigger no revisara al dueño, B podría ligar la foto de A a su propio voto.

## D5. Bitácora personal separada

- Estado: confirmada, 2026-10-20.
- Decisión: `docs/bitacora.md` es la bitácora personal de Andre y nadie más escribe en ella. Las decisiones del proyecto se registran aquí y en el blueprint.

## D6. Todas las escrituras van del navegador a Supabase, protegidas por RLS

- Estado: confirmada, 2026-10-20.
- Decisión: el voto (`upsert`) y la foto (subida a Storage) salen del navegador con la sesión del usuario. No hay Server Actions ni rutas API de escritura. Los Server Components hacen la primera lectura del ranking con la llave publicable.
- Por qué: la spec pone los permisos en la base, así que RLS es la única defensa y queda probada en un solo lugar. Además, una foto de 5 MB no cabe en el límite de cuerpo de una función de Vercel.

## D7. Agregados recalculados por trigger con candado

- Estado: confirmada, 2026-10-20.
- Decisión: un trigger `AFTER INSERT OR UPDATE OR DELETE` sobre `votos` (`SECURITY DEFINER`) toma `pg_advisory_xact_lock` y recalcula las 20 filas de `agregados_taqueria` desde cero. El `puntaje` del voto es una columna generada. El bayesiano es una función SQL `IMMUTABLE` que recibe v, R, m y C. La mediana usa `percentile_cont(0.5)`. La copia por mayoría simple se guarda como `'si'`, `'no'` o `'sin_consenso'`.
- Por qué: sin el candado, dos votos simultáneos pueden escribir agregados calculados sobre datos viejos. Con él, cada recálculo ve los votos ya confirmados.
- Descartado: el recálculo incremental, que la spec saca del alcance.

## D8. Tiempo real con postgres_changes sobre agregados

- Estado: confirmada, 2026-10-20.
- Decisión: `agregados_taqueria` entra en la publicación `supabase_realtime`. El cliente se suscribe a sus cambios y agrupa los 20 eventos de un voto en un solo reordenamiento. Nunca hay suscripción a `votos`.

## D9. Enlace mágico con token_hash y retorno codificado

- Estado: confirmada, 2026-10-20.
- Decisión: `/auth/confirm` llama a `verifyOtp({ token_hash, type })` del lado del servidor y redirige a `next`. `next` lleva su propia query (`/?t=<id>&votar=1`), así que se codifica con `encodeURIComponent` al construir `emailRedirectTo` y se valida al volver: solo se aceptan rutas relativas que empiezan con `/` y no con `//`. Una prueba confirma que `votar=1` llega completo. La plantilla del correo en producción se cambia para usar `token_hash`, y ese paso le toca a Andre.
- Por qué: con PKCE, el enlace falla si el correo se abre en otro navegador del teléfono.
- Aclaración: no se cambia la caducidad de sesiones ni de JWT. En los dispositivos con sesión iniciada, supabase-js la mantiene con su refresco automático.

## D10. Ciclo de vida de la foto al editar el voto

- Estado: confirmada, 2026-10-20.
- Decisión:
  - Cambiar la foto: primero se sube el archivo nuevo, después se hace el `upsert` del voto con la `foto_ruta` nueva y al final el cliente borra el archivo anterior.
  - Quitar la foto: `foto_ruta = null` y luego se borra el archivo.
  - El trigger mantiene `fotos`: borra la fila de la ruta anterior e inserta la nueva tras verificar el `owner_id`.
  - `fotos.ruta` y `votos.foto_ruta` son únicas.
  - El bucket acepta `image/jpeg` e `image/png`, como dice el mockup ("JPG o PNG, máximo 5 MB").
- Riesgo aceptado: si falla el borrado del archivo anterior, queda un huérfano sin fila en `fotos` y con una URL imposible de adivinar. Se limpia a mano.

## D11. Estrategia de pruebas contra taquimetro-pruebas

- Estado: confirmada, 2026-10-20.
- Decisión: Vitest con dos carriles, corriendo en serie.
  - Carril SQL: driver `pg` al session pooler; cada prueba va en una transacción con `ROLLBACK`, y la ruptura se aplica dentro de esa misma transacción.
  - Carril API: supabase-js como A, B y anónimo; la ruptura usa `romper.sql` y `restaurar.sql` en `finally`.
  - Antes de cualquier corrida se compara una huella de políticas, límites del bucket y funciones con `pruebas/rupturas/huella-esperada.json`. Si no coincide, todo se aborta. La huella se vuelve a comparar después de restaurar.
  - `npm run rupturas` pasa solo si cada ruptura deja en rojo la prueba exacta que le corresponde.
  - Las llaves van en `.env.test.local`, y una protección aborta si apuntan a producción.

## D12. Coordenadas revisadas antes de la semilla

- Estado: confirmada, 2026-10-20.
- Decisión: `scripts/verificar-coordenadas.mjs` consulta Nominatim (1 petición por segundo, con User-Agent) y escribe `supabase/seed/revision-coordenadas.csv` con estas columnas: `nombre_buscado`, `nombre_osm`, `lat_anterior`, `lon_anterior`, `lat_osm`, `lon_osm`, `distancia_m`. Andre lo revisa. Solo con su aprobación, `scripts/generar-semilla.mjs` produce la migración de semilla.

## D13. Dirección visual

- Estado: confirmada, 2026-10-20.
- Decisión: `docs/mockups/celular-clara.pdf` define colores, tipografía y componentes. En celular, ranking y mapa van en pestañas y el detalle en su propia vista. En escritorio, ranking, mapa y detalle van lado a lado en una sola página, sin mockup aparte.
