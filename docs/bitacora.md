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

