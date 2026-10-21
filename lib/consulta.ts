// Los cuatro estados que puede mostrar la página después de una consulta a Supabase.
export type EstadoConsulta<T> =
  | { estado: "ok"; datos: T }
  | { estado: "vacio" }
  | { estado: "no-encontrado" }
  | { estado: "error" };

// El error va primero: si Supabase falla, "no hay datos" sería mentira.
// Una fila que no existe llega como null; una lista sin filas, como [].
export function estadoConsulta<T>(resultado: { data: T | null; error: unknown }): EstadoConsulta<T> {
  if (resultado.error) return { estado: "error" };
  if (resultado.data === null) return { estado: "no-encontrado" };
  if (Array.isArray(resultado.data) && resultado.data.length === 0) return { estado: "vacio" };
  return { estado: "ok", datos: resultado.data };
}
