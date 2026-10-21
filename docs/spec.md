# Taquímetro: especificación del MVP

20 de octubre de 2026

## Objetivo

Taquímetro es una app web de ranking colaborativo y en vivo de taquerías de CDMX, que ayuda al comensal local a decidir dónde comer tacos con datos de otros comensales y no con reseñas genéricas. Se construye con Next.js, Supabase y Vercel, como MVP de 3 días.

El MVP entrega una sola página con ranking, mapa y panel de detalle. Cualquiera puede ver el ranking sin cuenta; para votar, el usuario inicia sesión con un enlace mágico. Cada voto mueve el puntaje de las taquerías y el ranking se reordena solo en todas las pestañas abiertas.

El catálogo inicial son 20 taquerías reales, sembradas con nombre, alcaldía, latitud y longitud.

## Usuarios

El usuario principal es el comensal local de CDMX que decide a dónde comer tacos y no se fía de las reseñas genéricas.

Quedan fuera de alcance como usuarios los turistas y los dueños de taquerías.

## Historias de usuario

1. Como comensal, quiero ver el ranking y el mapa sin crear cuenta, para decidir rápido a dónde ir.
2. Como comensal, quiero abrir el detalle de una taquería y ver su precio (mediana), si ofrece copia, su puntaje y sus promedios de salsa, tortilla y carne, para comparar con otras.
3. Como comensal, quiero que el login aparezca solo al tocar "Votar", para no tener fricción antes de decidir si participo.
4. Como comensal, quiero entrar con un enlace mágico enviado a mi correo y volver a la misma taquería con el formulario abierto, para no repetir el camino.
5. Como comensal, quiero calificar salsa, tortilla y carne del 1 al 5, indicar el precio por taco y si usan copia (doble tortilla), para aportar datos comparables.
6. Como comensal, quiero subir una foto opcional con mi voto, sin escribir texto libre, para ilustrar mi experiencia.
7. Como comensal, quiero editar mi voto en una taquería, sabiendo que hay un solo voto por usuario por taquería, para corregir mi opinión sin duplicar datos.
8. Como comensal, quiero ver el ranking reordenarse solo cuando alguien más vota, para tener el orden actual sin recargar.
9. Como comensal, quiero usar todo desde el celular, con los bloques apilados o en pestañas, para consultarlo en la calle.
10. Como comensal, quiero que mi voto y mi identidad no sean legibles por otros usuarios, y que mis fotos no revelen quién las subió.
11. Como operador del proyecto, quiero sembrar el catálogo de 20 taquerías y poder borrar manualmente desde el panel cualquier foto inapropiada, para mantener el contenido bajo control en el MVP.

## Modelo de datos preliminar

El modelo tiene cinco tablas y un bucket, todos con RLS. Los nombres de columnas son preliminares y se cierran en la spec técnica.

| Tabla | Contenido | Lectura | Escritura |
| --- | --- | --- | --- |
| taquerias | id, nombre, alcaldía, latitud, longitud (20 sembradas) | Pública | Ninguna desde el cliente |
| config | Parámetros, entre ellos C del puntaje bayesiano (inicial 3) | Pública | Ninguna desde el cliente |
| votos | user_id, taquería, salsa, tortilla, carne (1 a 5), puntaje, precio, copia (sí o no), foto opcional | Solo el autor (auth.uid() = user_id) | Solo el autor |
| agregados_taqueria | Por taquería: número de votos, mediana de precio, conteo de copia, promedio de salsa, promedio de tortilla, promedio de carne, puntaje bayesiano | Pública | Solo triggers |
| fotos | Identificador, taquería y ruta del archivo. Sin user_id | Pública | Ver propuesta de fotos |

Reglas que viven en la base:

- El puntaje del voto es el promedio de salsa, tortilla y carne, calculado en la base.
- El precio por taco se valida en la base entre 5 y 150, con decimales.
- Hay un solo voto por usuario por taquería. Editar actualiza esa fila.
- El puntaje bayesiano se calcula en una función SQL pura, para probarla con valores fijos. Usa el promedio global y C, leído de config.
- La mediana de precio es la mediana de lo reportado. La copia se decide por mayoría simple y, si hay empate, se muestra "sin consenso".
- Un trigger actualiza agregados_taqueria con cada voto, incluidos los promedios de salsa, tortilla y carne por taquería. Como cambia el promedio global, cada voto recalcula las 20 filas, lo cual es aceptable en el MVP.
- La etiqueta "pocos votos" aplica con menos de 3 votos. Las taquerías sin votos van al final, sin puntaje, en orden alfabético.

El puntaje bayesiano usa la forma ponderada estándar, donde v es el número de votos de la taquería, R su promedio, m el promedio global y C el peso del prior:

```
puntaje = v/(v+C) * R + C/(v+C) * m
```

El promedio global m es el promedio de los puntajes de todos los votos de todas las taquerías. Si no hay votos, no se calcula puntaje.

### Propuesta de fotos

Las fotos son públicas pero no deben revelar al autor. Una ruta con user_id en el bucket expone el identificador, así que se propone:

1. Guardar cada archivo con un nombre aleatorio, sin user_id en la ruta.
2. Publicar una tabla de fotos sin user_id, con lectura pública, que solo liga la ruta con la taquería.
3. Mantener el vínculo entre foto y autor únicamente en el voto, que es privado.
4. Mantener en el bucket los límites: solo imágenes, máximo 5 MB.

Propiedad de los archivos, por confirmar en la arquitectura: la propiedad de un archivo se verifica con el usuario que lo subió, que Storage registra en el objeto (owner_id), no con la ruta. El público no tiene lectura sobre storage.objects, y las fotos se muestran desde la tabla pública de fotos.

## Reto técnico

El reto es entregar seguridad real y tiempo real en 3 días, con los permisos en la base y no en la aplicación. Cuatro puntos concentran el riesgo:

1. **Tiempo real sin exponer votos.** Los clientes se suscriben a la tabla de agregados por taquería, actualizada por trigger, y nunca a la tabla de votos, que es privada. Cada voto recalcula las 20 filas.
2. **Enlace mágico con retorno.** Al volver del correo, el usuario debe llegar a la misma taquería con el formulario abierto. La taquería viaja en la URL de redirección, no en el almacenamiento del navegador. Las URLs de redirección permitidas (localhost y el dominio de Vercel) se registran en Supabase.
3. **Fotos públicas que no revelan al autor.** Exige nombre aleatorio, tabla pública sin user_id, límites en el bucket y una política de propiedad que siga funcionando sin user_id en la ruta (por confirmar en la arquitectura).
4. **Pruebas que se rompen a propósito.** Cada prueba obligatoria debe ponerse en rojo con una ruptura deliberada, para confirmar que prueba algo.

A esto se suma el calendario: 3 días son ajustados para seis condiciones de terminado, y el riesgo está en las fotos con su prueba destructiva. Por eso importa el orden de recorte.

## Fuera de alcance y orden de recorte

Quedan fuera del MVP:

- Duelos entre taquerías.
- Sugerencia de taquerías por usuarios con moderación.
- Comentarios de texto libre.
- Aviso de actividad ("alguien acaba de votar en...").
- Páginas y enlaces compartibles por taquería.
- Moderación automática de fotos.
- Optimización del recálculo de agregados.
- Turistas y dueños de taquerías como usuarios.

Si el día 2 va atrasado, se recorta en este orden:

1. Mapa de Leaflet (las coordenadas se guardan igual).
2. Fotos (la columna queda en el modelo, sin bucket activo).
3. Tiempo real (el ranking se actualiza al recargar).

No se recorta: login, voto por criterios, puntaje bayesiano en la base, RLS con prueba destructiva y despliegue en Vercel.

## Criterios de aceptación

El MVP está terminado el día 3 cuando se cumplen estas seis condiciones:

- [ ] Producción en Vercel con login funcionando.
- [ ] Dos dispositivos viendo el ranking reordenarse en vivo.
- [ ] Puntaje bayesiano en la base, con su prueba.
- [ ] RLS verificado con la prueba destructiva entre dos usuarios.
- [ ] Subida de fotos con límites.
- [ ] Funciona en celular.

Además, los errores son visibles y distinguen "no hay datos", "no se encontró" y "no se pudo consultar".

### Pruebas obligatorias

| Prueba | Qué verifica | Ruptura deliberada |
| --- | --- | --- |
| Puntaje bayesiano | Con promedio global fijo, 1 voto de 5 contra 80 votos de 4.6: la segunda queda arriba | C = 0 |
| Mediana de precio | La mediana no se mueve por un valor extremo | Un precio absurdo, para confirmar que no mueve el resultado |
| RLS entre dos usuarios | B no lee ni edita el voto de A; no sube ni borra fotos de A, con la propiedad verificada por owner_id y no por la ruta; se rechaza un archivo que no es imagen o que pesa más de 5 MB | Cada política se debilita a propósito para ver la prueba en rojo |
| Enlace mágico | El flujo completo funciona desde un teléfono real | No aplica |

### Seguridad

- RLS en todas las tablas y en el bucket.
- Secretos fuera del repo. La llave service_role nunca llega al navegador ni lleva prefijo NEXT_PUBLIC_.

### Acciones que requieren tu aprobación o ejecución

- Colocar las llaves en variables de entorno.
- Registrar las URLs de redirección permitidas (localhost y el dominio de Vercel).
- Aprobar cada migración antes de aplicarla.
- Borrar manualmente desde el panel cualquier foto inapropiada.
