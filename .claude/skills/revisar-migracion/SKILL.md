---
name: revisar-migracion
description: Úsala cuando alguien pida revisar, validar o aplicar una migración de Supabase (archivos en supabase/migrations/, db push, cambios de tablas, políticas RLS, GRANT, funciones o buckets) antes de que llegue a la base.
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git status:*)
---

# Revisar migración

Revisa una migración contra las reglas de la casa y entrega una lista: qué está bien, qué está mal y cómo arreglarlo.

**Solo lee.** No edites archivos. No corras `supabase db push`, `migration up`, `migration repair`, `db reset` ni `execute_sql` o `apply_migration` del MCP. Si te piden "aplicar", revisa y detente: el push lo aprueba y lo corre André.

## Qué revisar

1. La migración que te nombren. Si no nombran ninguna, las nuevas o cambiadas en `supabase/migrations/` según `git status` y `git diff main --name-status -- supabase/migrations/`.
2. Lee también `supabase/migrations/20261021174405_esquema_inicial.sql`: es la referencia de "bien hecho".

## Lista de verificación

Revisa cada punto. Cita `archivo:línea` en cada hallazgo.

| Regla | Bien hecho | Referencia en `esquema_inicial.sql` |
|---|---|---|
| RLS en cada tabla nueva | `alter table ... enable row level security` por cada `create table` | 54-57 |
| Políticas por operación | Una por select, insert, update y delete; nada de `for all`; `to <rol>` explícito; update con `using` y `with check` | 90-132 |
| `(select auth.uid())` | Nunca `auth.uid()` suelto en una política: el `select` lo evalúa una vez por consulta | 98, 103 |
| Permisos mínimos | `revoke all ... from anon, authenticated` y luego GRANT; insert y update por columna, sin `user_id` ni `creada_en`; nada de `grant all` | 63-84 |
| Funciones | `revoke execute ... from public, anon, authenticated` y GRANT solo si hace falta | 152-155, 203 |
| `security definer` | `set search_path = ''` y nombres con esquema (`public.tabla`); si no necesita saltarse RLS, `security invoker` | 163-172 |
| Buckets | `file_size_limit` y `allowed_mime_types`; políticas por operación en `storage.objects` con `bucket_id` y carpeta `(storage.foldername(name))[1] = (select auth.uid())::text` | 215-240 |
| No editar migraciones aplicadas | Si `git diff main` marca un archivo existente como M o D, es error: el cambio va en una migración nueva, como `20261022183030_fotos_formato_ruta.sql` | |
| Sin secretos | Ni llaves, ni `service_role`, ni JWT (`eyJ`), ni contraseñas o URLs con credenciales, tampoco en comentarios | |

## Formato de respuesta

Responde en español, con este orden:

1. **Archivo revisado:** ruta.
2. **Bien:** cada regla que cumple, con su línea.
3. **Mal:** cada falla con `archivo:línea`, por qué importa en una línea y cómo arreglarla (SQL corto si ayuda).
4. **No aplica:** reglas sin objeto en esta migración (por ejemplo, no crea buckets).
5. **Siguiente paso:** "Corre `supabase db push --dry-run` para ver qué se aplicaría. El push real lo aprueba André."

Termina siempre con el punto 5, aunque haya fallas.

## Errores comunes

- `auth.uid()` sin `select` en la política.
- Una sola política `for all` o sin `to`.
- `grant insert` o `grant update` a toda la tabla, o permisos a `anon` que no necesita.
- Olvidar `revoke execute ... from public` en funciones nuevas.
- Bucket sin límite de tamaño o sin tipos permitidos.
- Arreglar algo editando una migración ya aplicada en vez de crear una nueva.
