# CLAUDE.md

Este archivo guía a Claude Code al trabajar en este repositorio.

@AGENTS.md

## Proyecto

Taquímetro: app web de ranking colaborativo y en vivo de taquerías de CDMX, con Next.js, Supabase y Vercel. Es un proyecto de onboarding: el objetivo es demostrar el uso de las herramientas, no construir un producto real. Ante dos opciones, elige siempre la más simple que cumpla.

- Alcance: `docs/spec.md`.
- Decisiones de arquitectura: `docs/decisiones.md`. Léelo antes de proponer algo distinto.
- `docs/bitacora.md` es la bitácora personal de André. No escribas en ella.
- Todo el proyecto (docs, datos, UI y comentarios) está en español.

Estado actual: fases 1 a 3 de `docs/plan.md` hechas. La migración `supabase/migrations/20261021174405_esquema_inicial.sql` está aplicada y la semilla cargada. Vitest corre pruebas del bayesiano, de RLS y del trigger en `tests/`. La UI sigue siendo la plantilla de `create-next-app` y aún no hay cliente de Supabase en la app.

## Cómo trabajar en este repo

- Una tarea a la vez. Antes de escribir código, explica en pocas líneas qué vas a hacer y qué archivos vas a tocar, y espera aprobación.
- Si una tarea va a crear o cambiar más de 3 archivos, muestra primero la lista y espera aprobación.
- Si una tarea va a leer mucho o tardar más de unos minutos, avisa antes y propón partirla en pasos más chicos.
- No generes blueprints, paquetes de tareas, skills, reglas ni archivos de configuración de Claude, salvo que André lo pida.
- No lances subagentes en segundo plano sin avisar antes.
- No ejecutes comandos que modifiquen Supabase. Las migraciones se proponen y André las aprueba.
- Explica las cosas de forma simple y directa; si usas un término técnico, explícalo en una línea.

## Comandos

```bash
npm run dev     # servidor de desarrollo (http://localhost:3000)
npm run build
npm run lint    # eslint 9, flat config (eslint-config-next core-web-vitals + typescript)
npm run test    # Vitest contra el proyecto de Supabase; requiere .env.test.local
```

## Stack y particularidades

- Next.js 16.4 + React 19.3, App Router. Por `AGENTS.md`, consulta `node_modules/next/dist/docs/` antes de escribir código de Next; las APIs difieren de versiones anteriores.
- `next.config.ts` activa `cacheComponents` y `partialPrefetching`.
- Tailwind v4 se carga con el loader `@tailwindcss/turbopack` declarado en `turbopack.rules` de `next.config.ts`, no con PostCSS (no hay `postcss.config`).
- Alias de importación `@/*` apunta a la raíz del repo. No hay carpeta `src/`.

## Diseño

App web minimalista, fácil de entender, con colores claros, buen contraste y tipografía legible. En computadora: ranking, mapa y detalle lado a lado. En celular: pestañas "Ranking" y "Mapa" y el detalle en su propia vista. No hay mockup de referencia.

## Supabase

- Proyecto `taquimetro-onboarding` en la organización `andre-onboarding`. "Automatically expose new tables" está desactivado: cada migración debe otorgar permisos (GRANT) de forma explícita, además de sus políticas RLS.
- El MCP de Supabase está en `read_only=true`.
- La llave `service_role` nunca llega al navegador ni lleva prefijo `NEXT_PUBLIC_`. Los archivos `.env*` están ignorados por git.
- `supabase/seed/datos.csv`: 20 taquerías que se siembran tal cual (ver D11 en `docs/decisiones.md`).

## Reglas de la casa

- Propón antes de implementar. Ninguna línea de código sin una spec revisada.
- Una prueba que solo pasa no prueba nada: rómpela a propósito y confirma que se pone en rojo.
- RLS en todas las tablas y buckets. Los permisos viven en la base.
- Secretos fuera del cliente y del repo. La llave service_role nunca va en el navegador ni con prefijo NEXT_PUBLIC_.
- Lee el SKILL.md de una skill antes de instalarla.
- André aprueba lo irreversible: migraciones, borrado de datos, cambios de permisos y de producción.
- Errores visibles: distinguir "no hay datos", "no se encontró" y "no se pudo consultar".
- Mide antes de concluir: comprueba una hipótesis con datos o una prueba antes de cambiar código.
- Tono: español, tú, profesional, sin emojis, sin raya larga.