-- fotos.ruta solo acepta el formato que genera rutaNueva() en lib/fotos.ts:
-- <user_id>/<uuid>.<jpg|png>, en minúsculas. La política de insert ya exige que la primera
-- carpeta sea el id de quien registra; esto impide rutas con "..", carpetas extra o
-- archivos que la app nunca crea. Las filas existentes cumplen (revisado el 2026-10-22).

alter table public.fotos
  add constraint fotos_ruta_formato check (
    ruta ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png)$'
  );
