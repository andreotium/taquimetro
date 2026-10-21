# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

Taquímetro: ranking colaborativo y en vivo de taquerías de CDMX. MVP de 3 días con Next.js, Supabase y Vercel. La fuente de verdad del alcance es `docs/spec.md` (historias, modelo de datos, pruebas obligatorias, orden de recorte). `docs/bitacora.md` registra decisiones y su porqué; léela antes de reabrir una decisión. Todo el proyecto (docs, datos, UI) está en español.

Estado actual: solo el esqueleto de `create-next-app` (`app/page.tsx` es la plantilla). Aún no hay cliente de Supabase, migraciones ni pruebas.

## Comandos

```bash
npm run dev     # servidor de desarrollo (http://localhost:3000)
npm run build
npm run lint    # eslint 9, flat config (eslint-config-next core-web-vitals + typescript)
```

No hay framework de pruebas configurado todavía.

## Stack y particularidades

- Next.js 16.4 + React 19.3, App Router. Por `AGENTS.md`, consulta `node_modules/next/dist/docs/` antes de escribir código de Next; las APIs difieren de versiones anteriores.
- `next.config.ts` activa `cacheComponents` y `partialPrefetching`.
- Tailwind v4 se carga con el loader `@tailwindcss/turbopack` declarado en `turbopack.rules` de `next.config.ts`, no con PostCSS (no hay `postcss.config`).
- Alias de importación `@/*` apunta a la raíz del repo.

## Arquitectura prevista (de la spec)

Una sola página con ranking, mapa (Leaflet) y panel de detalle; en celular, bloques apilados o en pestañas.

La lógica y los permisos viven en la base, no en la app:

- Tablas: `taquerias` (20 sembradas, solo lectura), `config` (incluye C del bayesiano, inicial 3), `votos` (privada: solo el autor, `auth.uid() = user_id`; un voto por usuario por taquería), `agregados_taqueria` (pública, escrita solo por trigger), `fotos` (pública, **sin** `user_id`). RLS en todas las tablas y en el bucket.
- El puntaje del voto (promedio de salsa/tortilla/carne), la validación de precio (5 a 150) y el puntaje bayesiano (función SQL pura, `v/(v+C)*R + C/(v+C)*m`) se calculan en la base. Cada voto recalcula las 20 filas de agregados; es aceptable en el MVP.
- Tiempo real: los clientes se suscriben a `agregados_taqueria`, nunca a `votos`.
- Login por enlace mágico, solo al tocar "Votar". La taquería de retorno viaja en la URL de redirección, no en el almacenamiento del navegador.
- Fotos: nombre de archivo aleatorio sin `user_id` en la ruta; propiedad verificada por `owner_id` de Storage; solo imágenes, máximo 5 MB. El vínculo foto-autor vive solo en el voto privado.
- Errores visibles que distinguen "no hay datos", "no se encontró" y "no se pudo consultar".

Cada prueba obligatoria (bayesiano, mediana de precio, RLS entre dos usuarios) debe verse en rojo con la ruptura deliberada que indica la spec.

## Supabase

- Proyecto en la organización propia `andre-onboarding`. "Automatically expose new tables" está desactivado: **cada migración debe otorgar permisos (GRANT) de forma explícita**, además de sus políticas RLS.
- El MCP de Supabase está configurado en `read_only=true`. Las migraciones requieren aprobación del usuario antes de aplicarse.
- La llave `service_role` nunca llega al navegador ni lleva prefijo `NEXT_PUBLIC_`. Los archivos `.env*` están ignorados por git.
- `supabase/seed/datos.csv`: 20 taquerías. Las coordenadas están marcadas NO VERIFICADO; antes de la migración de semilla deben salir de OpenStreetMap (script local), no solo contrastarse.
