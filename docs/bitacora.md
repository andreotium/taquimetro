# Bitacora Taquimetro

## 2026-10-20

- Antes de empezar: curso de Claude Code visto. Aprendizajes: (1) el contexto se gestiona con /context, /compact y /clear, (2) las skills se activan por su descripcion o con /nombre, (3) /rewind deshace cambios, pero no reemplaza a Git.
- Decision: elegi Taquimetro por interes propio (me gustan los tacos) y porque su reto, un ranking justo con pocos votos, es claro de explicar y probar.
- Decision: proyecto de onboarding separado de los repos y proyectos de clientes de Otium (carpeta, repo, organizacion de Supabase).

- 12:55 Decision: crear el proyecto de Supabase en una organizacion propia (andre-onboarding, plan Free) y no en la organizacion Otium (Pro), para no mezclarlo con los proyectos de la plataforma.
- 12:58 Decision de seguridad al crear el proyecto: Data API activada, "Automatically expose new tables" desactivado y "Enable automatic RLS" activado. Consecuencia: cada migracion debe otorgar permisos de forma explicita.
- 13:03 Error mio: ejecute git clone con TU_USUARIO literal. GitHub pidio autenticacion porque ese repo no existia. Aprendizaje: reemplazar siempre los marcadores de los comandos.
- 13:09 Conector de Supabase limitado con project_ref y read_only=true. La salida de mcp add mostraba solo la URL base, asi que verifique con mcp get que los parametros quedaron guardados.
- 13:12 Autorizacion de Supabase solo para la organizacion andre-onboarding, con permisos de lectura. Conector conectado.

- 13:38 Plugins oficiales instalados en user scope: superpowers, frontend-design y playwright. Verificados en /plugin y /mcp (supabase y playwright conectados).
- 14:53 Isacc compartio el repo de /the-architech: github.com/Hainrixz/the-architect. Antes de instalar revise que el manifiesto no define hooks ni MCP y que el marketplace (soyenriquerocha) apunta al mismo repo.
- 15:01 the-architect instalado en local scope. El comando real es /the-architect:architect, no /the-architech como dice la guia.
- 15:03 Lo ejecute solo para comprobar que respondia y empezo su entrevista completa, en auto mode. Lo pause porque aun no tengo spec (pasos 1 y 2). Aprendizaje: probar una skill puede arrancar todo su flujo, y hay que revisar el modo de permisos antes.

- 15:25 Discovery cerrado en el chat del Proyecto Taquimetro. Decisiones: usuario comensal local, voto por criterios (salsa, tortilla y carne del 1 al 5) con precio por taco y copia, catalogo sembrado de 20 taquerias, login por enlace magico, una sola pagina con ranking, mapa y panel, ranking en vivo y foto opcional por voto.
- Discrepe del chat en cuatro puntos. (1) Fotos: las inclui porque la guia pide Storage con politicas, y el chat sugeria dejarlas fuera. (2) Umbral de 3 votos para entrar al ranking: lo descarte para no dejar el ranking vacio al inicio ni esconder el reto del puntaje bayesiano. (3) Orden del login: primero el login y luego el formulario, para no perder un voto a medias cuando el enlace abre el correo. (4) Mapa: lo mantuve en el MVP, como primer recorte si falta tiempo.
- Aprendizaje: el chat optimizaba por plazo y la guia por lo que se evalua, asi que hay que contrastar sus sugerencias con la guia.

- 15:41 Investigacion de apps parecidas hecha en la app de Claude. Hallazgo: ninguna usa calificacion por criterios, es un hueco que Taquimetro puede ocupar. Descarte dos ideas porque contradicen mi alcance (ranking por tipo de taco y altas de taquerias por usuarios) y las deje como "despues". La investigacion mezclo ruido en sus fuentes, asi que verifico antes de citar.

- 15:54 Spec revisada y corregida en la app de Claude. Le pedi cuatro cambios: definir el promedio global, cerrar el punto de propiedad de las fotos (owner_id en lugar de la ruta), la formula en texto plano y quitar una redaccion desactualizada. Un segundo ajuste dejo coherente la prueba de RLS. Aprendizaje: la spec traia un punto abierto bien senalado, pero sin mi revision habria quedado una prueba que describia un mecanismo ya descartado.

- 15:59 Hoja de datos semilla creada en la app de Claude: 20 taquerias con nombre, alcaldia, latitud y longitud. La sesion intento verificarlas contra OpenStreetMap, pero el acceso a Nominatim estaba bloqueado y no lo rodeo, asi que las dejo todas como NO VERIFICADO. Corregi la columna de fuente, que atribuia los datos a mi cuando venian de Google Places. Pendiente: verificar coordenadas con un script local antes de la migracion de semilla (paso 4).

- 16:05 Hoja de datos semilla corregida: fuente exacta (Google Places via chat de Discovery) y colonia en los nombres de sucursales multiples. Pendiente antes de la migracion de semilla: las coordenadas finales deben salir de OpenStreetMap, no solo contrastarse. Lo hare con un script local desde Claude Code.

- 16:57 Paso 2 completo en la app de Claude, en sesiones separadas: investigacion, spec, datos semilla, mockups y lista de tareas. Cambios mios sobre lo que propuso Claude: la spec cerro el punto de propiedad de fotos y definio el promedio global; en los mockups elegi la variante clara, precio sin valor preseleccionado (para evitar anclaje) y agregue los promedios por criterio al detalle, con el cambio correspondiente en la spec. La lista de tareas traia un error (decia crear el proyecto de Supabase, que ya existia) y le faltaba la verificacion de coordenadas.

17:12 Paso 3.1 completo. Spec en docs/spec.md y datos semilla en supabase/seed/datos.csv (exportado desde xlsx, UTF-8, 20 taquerías). Coordenadas aún NO VERIFICADO: se contrastan con OpenStreetMap antes del seed. La guía pedía datos.csv; lo generé desde el xlsx.

17:50 Leí el SKILL.md de the-architect antes de usarla (pendiente desde la instalación). Escribe solo en blueprints/, no toca servicios. Riesgos: generar su propio CLAUDE.md, repetir el discovery y proponer otro stack; los acoté en el prompt.

Arquitectura con /the-architect. Sin Docker: pruebas contra un segundo proyecto en la nube (taquimetro-pruebas), en vez de Supabase local. Rechacé Resend porque exige verificar un dominio propio y no voy a usar el de Otium; se queda el SMTP por defecto como riesgo conocido. Pedí que la decisión quede en docs/decisiones.md y no en mi bitácora. Antes de confirmar pedí: revisión manual de coordenadas OSM, aclarar "sesiones que no expiran", verificar políticas antes de cada ruptura y ver qué guardó en memoria.

18:30 Paso 3.2. create-next-app no acepta carpetas desconocidas (supabase/); la saqué del repo, creé el proyecto y la devolví. El primer mv falló por bloqueo de VS Code. Quedó sin src/ y generó AGENTS.md. npm reporta 5 vulnerabilidades altas: no apliqué audit fix --force. Primer commit en main.

19:55 Al confirmar la arquitectura, la skill eligió el modo bundle sin preguntar. A los 18 minutos llevaba unos 300K tokens y empezó a escribir código de scripts. Lo detuve (Ctrl+K choca con VS Code, así que cerré la terminal). No escribió archivos. Las decisiones quedaron en docs/decisiones.md.

## 2026-10-21

09:30 Simplificación. Comparé la spec con la guía: cumplía todo, pero tenía de más. Quité fotos anónimas, regreso a la misma taquería tras el login, verificación de coordenadas con OSM, mediana de precio con prueba propia, tabla config, segundo proyecto de pruebas, huella de políticas y candado en el trigger. También descarté el mockup: Claude Design lo entendió como app de celular y era difícil de entender; ahora es una app web minimalista de colores claros que también funciona en celular. Reescribí spec.md, decisiones.md y CLAUDE.md, y borré docs/mockups. Aprendizaje: cada pieza extra parecía razonable sola, pero juntas multiplicaron la complejidad. Hay que comparar contra la guía antes de diseñar.

10:10 Paso 3, puntos 3 y 4. docs/arquitectura.md escrito en una sesión normal de Claude Code (sin la skill), con límites de archivos y líneas. Resolví 13 dudas eligiendo siempre lo más simple (por ejemplo, sin borrar calificaciones). Segunda opinión del subagente Plan en 1 minuto: encontró un hueco real de RLS (editar una calificación permitía cambiarla de taquería), una prueba de RLS que habría salido siempre en verde y una redirección abierta en el login. Apliqué sus cambios. Aprendizaje: con límites claros, un subagente revisor es rápido y útil; el problema de ayer fue el modo bundle, no los subagentes.

10:25 Paso 3, punto 5. Plan de 26 tareas en docs/plan.md, cada una con su comprobación y con las acciones mías marcadas. No usé writing-plans porque escribe el código completo dentro del plan; para este MVP bastaba un plan corto.

10:35 Repo en público para que Isacc pueda revisar el PR sin unirse (repo revisado antes: sin llaves ni secretos). La spec decía que las calificaciones se borran y la arquitectura que no; corregí la spec.
10:45 PR #1 abierto y enviado a Isacc para revisión. Hasta que conteste no escribo código.

12:05 Paso 4 (Supabase). Isacc no ha revisado el PR entonces decidí avanzar: la base está vacía y cualquier cambio que pida se corrige con otra migración. Supabase CLI con npx (sin instalarla en el proyecto), repo ligado en la rama fase-1/base-de-datos. Seguí la guía con una sola migración (el plan la dividía en varias). Antes de aplicarla, el autor de la migración señaló que el trigger no reaccionaba a borrados y que los usuarios de prueba borran sus calificaciones en cascada; lo agregué. Ensayo con db push --dry-run antes del push real.

12:30 Isacc aprobó el diseño con dos ajustes: DELETE en el trigger con on delete cascade (ya estaba en la migración) y una prueba del trigger. Agregué la prueba con su propio usuario, comparando contra los votos previos, y anoté en D7 el riesgo de votos simultáneos. Merge del PR #1.

12:45 Verificación con el MCP (solo lectura): 20 taquerías y 20 agregados, RLS activo en las 4 tablas, bucket con 5 MB y solo JPG/PNG, Realtime solo en agregados. El advisor marca rls_auto_enable(), una función que instaló Supabase por la opción "Enable automatic RLS"; no se puede llamar directamente, así que la dejo como riesgo aceptado.

13:10 Tarea 2.2. Prueba del bayesiano con la llave pública (como anon): con C = 3, 1 voto de 5 saca 4.25 y 80 votos de 4.6 sacan 4.58. Ruptura a mano: con C = 0 la prueba se puso en rojo ("expected 4.6 to be greater than 5"); al regresar a 3, verde.

13:23 Paso 4, punto 7. Prueba de RLS con usuarios de prueba (7 pruebas en verde). Ruptura a mano en el SQL Editor: cambié la política de lectura de calificaciones a using (true) y falló exactamente "B no puede leer la calificación de A" (B recibió la calificación completa de A). Las otras 4 siguieron en verde porque las protege el GRANT, no la política. Restauré la política original de la migración y todo volvió a verde.

13:35 Tarea 3.3. Prueba del trigger con su propio usuario C (pedida por Isacc). Ruptura en el SQL Editor: recreé el trigger sin delete y la prueba falló con votos = 1 donde debía haber 0 (el voto de C se quedó tras borrarlo). Restauré el trigger original de la migración: 8 de 8 pruebas en verde.

13:40 Cierre del paso 4 de la guía (fases 1 a 3 del plan). Migración aplicada y versionada, semilla cargada y verificada con el MCP, y 8 pruebas en verde (bayesiano, RLS y trigger), cada una vista en rojo con su ruptura a propósito. Limpieza de docs, plan y CLAUDE.md para reflejar el estado real.
