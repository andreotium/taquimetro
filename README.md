# Taquímetro

Ranking colaborativo y en vivo de taquerías de CDMX. Cualquiera ve el ranking, el mapa y el detalle de cada taquería; con sesión (enlace mágico por correo) puedes calificar salsa, tortilla, carne, precio y copia, y subir fotos. El ranking se reordena solo cuando alguien califica.

Es un proyecto de onboarding: su objetivo es mostrar el uso de las herramientas, no ser un producto real.

Producción: https://taquimetro.vercel.app

## Stack

- Next.js 16.4 (App Router) con React 19.3 y Tailwind v4.
- Supabase: Postgres con RLS, Auth con enlace mágico, Realtime y Storage para las fotos.
- Leaflet con mapas de OpenStreetMap.
- Vitest para las pruebas.
- Vercel para el despliegue.

## Correr en local

```bash
npm install
cp .env.example .env.local
```

Llena `.env.local` con la URL del proyecto de Supabase y la llave pública (publishable). Nunca pongas ahí la llave secreta.

```bash
npm run dev
```

Abre http://localhost:3000.

## Pruebas

Las pruebas corren contra el proyecto real de Supabase: crean usuarios de prueba, comprueban RLS, el trigger y las fotos, y al terminar borran lo que crearon.

```bash
cp .env.test.example .env.test.local
```

Llena `.env.test.local` con la URL, la llave pública y la llave secreta. La llave secreta solo crea y borra los usuarios de prueba, y nunca lleva el prefijo `NEXT_PUBLIC_`.

```bash
npm run test
npm run lint
```

## Documentos

- `docs/spec.md`: alcance.
- `docs/arquitectura.md`: modelo de datos, permisos, flujos y pruebas.
- `docs/decisiones.md`: decisiones de arquitectura.
- `docs/plan.md`: plan de implementación por fases.
