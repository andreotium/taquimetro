# Taquímetro: especificación del MVP

Versión simplificada, 21 de octubre de 2026.

## Objetivo

Taquímetro es una app web de ranking colaborativo y en vivo de taquerías de CDMX. Cualquiera puede ver el ranking y el mapa sin cuenta. Para calificar, el usuario inicia sesión con un enlace mágico. Cada calificación mueve el puntaje de las taquerías y el ranking se reordena solo en todas las pantallas abiertas.

Es un proyecto de onboarding. Su propósito es demostrar el uso de Next.js, Supabase (base de datos, RLS, Storage, Realtime y Auth), Vercel y Claude. Ante dos opciones, se elige siempre la más simple que cumpla.

Es una app web: se usa desde el navegador, en computadora y en celular.

## Usuario

El comensal local de CDMX que decide a dónde ir a comer tacos.

## Historias de usuario

1. Como comensal, quiero ver el ranking y el mapa sin crear cuenta, para decidir rápido a dónde ir.
2. Como comensal, quiero abrir el detalle de una taquería y ver su puntaje, su número de votos, sus promedios de salsa, tortilla y carne, su precio promedio por taco, qué porcentaje dice que hay copia y sus fotos.
3. Como comensal, quiero que el login aparezca solo al tocar "Calificar", entrar con un enlace mágico enviado a mi correo y volver a la página principal con mi sesión iniciada.
4. Como comensal, quiero calificar salsa, tortilla y carne del 1 al 5, indicar el precio por taco y si hay copia (doble tortilla).
5. Como comensal, quiero subir fotos de tacos de una taquería (JPG o PNG, máximo 5 MB).
6. Como comensal, quiero editar mi calificación. Hay una sola calificación por usuario por taquería.
7. Como comensal, quiero ver el ranking reordenarse solo cuando alguien más califica, sin recargar.
8. Como comensal, quiero usar la app en computadora y en celular.
9. Como comensal, quiero que nadie más pueda leer ni editar mi calificación, y que solo yo pueda borrar mis fotos.
10. Como operador, quiero sembrar el catálogo de 20 taquerías y poder borrar cualquier foto inapropiada desde el panel de Supabase.

## Modelo de datos

Cuatro tablas y un bucket, todos con RLS.

| Tabla | Contenido | Lectura | Escritura |
| --- | --- | --- | --- |
| taquerias | id, nombre, alcaldía, latitud, longitud (20 sembradas) | Pública | Ninguna desde la app |
| calificaciones | id, user_id, taqueria_id, salsa, tortilla, carne (1 a 5), puntaje, precio, copia (sí o no), fechas | Solo el autor | Solo el autor |
| fotos | id, taqueria_id, user_id, ruta del archivo, fecha | Pública | Subir y borrar: solo el autor |
| agregados_taqueria | Por taquería: número de votos, promedios de salsa, tortilla y carne, precio promedio, porcentaje de copia, puntaje bayesiano | Pública | Solo el trigger |

Bucket `fotos`:

- Lectura pública, para mostrar las imágenes.
- Cada usuario sube solo a su carpeta: `<user_id>/<nombre-aleatorio>.<ext>`.
- Cada usuario borra solo sus archivos.
- Solo JPG o PNG, máximo 5 MB.

Reglas que viven en la base:

- El puntaje de una calificación es el promedio de salsa, tortilla y carne, calculado en la base.
- El precio por taco se valida entre 5 y 150, con decimales.
- Hay una sola calificación por usuario por taquería. Editar actualiza esa fila.
- El puntaje bayesiano es una función SQL pura que recibe v, R, m y C, para probarla con valores fijos. C vale 3.
- Un trigger recalcula `agregados_taqueria` con cada calificación nueva, editada o borrada (incluido el borrado en cascada al borrar un usuario). Como cambia el promedio global, recalcula las 20 filas; es aceptable en el MVP.
- La etiqueta "pocos votos" aplica con menos de 3 votos. Las taquerías sin votos van al final, sin puntaje, en orden alfabético.

El puntaje bayesiano usa la forma ponderada estándar, donde v es el número de votos de la taquería, R su promedio, m el promedio global y C el peso del prior:

```
puntaje = v/(v+C) * R + C/(v+C) * m
```

El promedio global m es el promedio de los puntajes de todas las calificaciones de todas las taquerías. Si no hay calificaciones, no se calcula puntaje.

## Reto técnico

Un ranking justo: una taquería con un solo voto de 5 no debe ganarle a una con 80 votos de 4.6. Lo resuelve el puntaje bayesiano, calculado en la base.

Además, el tiempo real no debe exponer calificaciones privadas: la app se suscribe a `agregados_taqueria`, nunca a `calificaciones`.

## Diseño

- App web minimalista, fácil de entender a primera vista.
- Colores claros, buen contraste, tipografía legible y sin adornos.
- En computadora: ranking a la izquierda, mapa al centro y detalle a la derecha.
- En celular: pestañas "Ranking" y "Mapa"; el detalle se abre en su propia vista.
- No hay mockup de referencia. El diseño se hace a partir de esta descripción.
- Los errores son visibles y distinguen "no hay datos", "no se encontró" y "no se pudo consultar".

## Datos semilla

Las 20 taquerías de `supabase/seed/datos.csv` salieron del mapa del chat de Claude, como pide la guía. Se usan tal cual, sin verificarlas contra otra fuente.

## Fuera de alcance

- Duelos entre taquerías.
- Taquerías agregadas por usuarios.
- Comentarios de texto libre.
- Avisos de actividad ("alguien acaba de votar en...").
- Páginas y enlaces compartibles por taquería.
- Moderación automática de fotos.
- Fotos anónimas.
- Volver a la misma taquería con el formulario abierto después del login.
- Verificar coordenadas contra OpenStreetMap.
- Optimizar el recálculo de agregados.

## Orden de recorte

Si el tiempo no alcanza, se recorta en este orden:

1. Mapa (las coordenadas se guardan igual).
2. Fotos.
3. Tiempo real (el ranking se actualiza al recargar).

No se recorta: login, calificación por criterios, puntaje bayesiano en la base, RLS con su prueba y despliegue en Vercel.

## Criterios de aceptación

- [ ] Producción en Vercel con login funcionando.
- [ ] Dos pantallas viendo el ranking reordenarse en vivo.
- [ ] Puntaje bayesiano en la base, con su prueba.
- [ ] RLS verificado con una prueba entre dos usuarios.
- [ ] Subida de fotos con límites.
- [ ] Funciona en computadora y en celular.

Además, los errores son visibles y distinguen "no hay datos", "no se encontró" y "no se pudo consultar".

### Pruebas obligatorias

| Prueba | Qué verifica | Ruptura a propósito |
| --- | --- | --- |
| Puntaje bayesiano | Con m fijo, 1 voto de 5 contra 80 votos de 4.6: la segunda queda arriba | Correr la prueba con C = 0 y ver que se pone en rojo |
| RLS entre dos usuarios | B no lee ni edita la calificación de A; B no borra fotos de A ni sube a su carpeta; se rechaza un archivo que no es imagen o que pesa más de 5 MB | Debilitar una política a mano en el SQL Editor, ver la prueba en rojo, restaurarla y anotarlo en la bitácora |
| Enlace mágico | El flujo completo funciona desde un teléfono real | Prueba manual |

### Seguridad

- RLS en todas las tablas y en el bucket.
- Secretos fuera del repo. La llave service_role nunca llega al navegador ni lleva prefijo NEXT_PUBLIC_.

### Acciones que requieren aprobación o ejecución de André

- Colocar las llaves en variables de entorno.
- Registrar las URLs de redirección permitidas (localhost y el dominio de Vercel).
- Aprobar cada migración antes de aplicarla.
- Borrar manualmente desde el panel cualquier foto inapropiada.