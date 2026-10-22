import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
// Ruta relativa: Vitest no resuelve el alias @/ y las pruebas importan este archivo.
import { estadoConsulta, type EstadoConsulta } from "./consulta";

type Cliente = SupabaseClient<Database>;

// Lo que lleva el formulario mientras se llena: criterios y copia sin elegir, precio como texto.
export type Borrador = {
  salsa: number | null;
  tortilla: number | null;
  carne: number | null;
  precio: string;
  copia: boolean | null;
};

export type Calificacion = { salsa: number; tortilla: number; carne: number; precio: number; copia: boolean };

export type CalificacionGuardada = Calificacion & { id: number };

function criterioValido(valor: number | null) {
  return valor !== null && Number.isInteger(valor) && valor >= 1 && valor <= 5;
}

// Mismos rangos que los check de la base; aquí solo dan un mensaje claro antes de enviar.
export function validarCalificacion(
  borrador: Borrador,
): { ok: true; datos: Calificacion } | { ok: false; mensaje: string } {
  const { salsa, tortilla, carne, copia } = borrador;
  if (!criterioValido(salsa) || !criterioValido(tortilla) || !criterioValido(carne)) {
    return { ok: false, mensaje: "Elige del 1 al 5 para salsa, tortilla y carne." };
  }

  // Number("") da 0, así que el vacío también queda fuera de rango.
  const precio = Number(borrador.precio.trim());
  if (!Number.isFinite(precio) || precio < 5 || precio > 150) {
    return { ok: false, mensaje: "El precio por taco debe estar entre 5 y 150 pesos." };
  }

  if (copia === null) return { ok: false, mensaje: "Indica si hay copia." };

  return { ok: true, datos: { salsa: salsa!, tortilla: tortilla!, carne: carne!, precio, copia } };
}

// Mensaje visible cuando Supabase no pudo guardar. Una falla de red llega sin código.
export function mensajeErrorGuardado(error: { code?: string }): string {
  switch (error.code) {
    case undefined:
    case "":
      return "No se pudo guardar. Revisa tu conexión e intenta de nuevo.";
    case "23514":
      return "La base rechazó los valores: el precio va de 5 a 150 pesos y cada criterio del 1 al 5.";
    // Token inválido o vencido.
    case "PGRST301":
    case "PGRST303":
      return "Tu sesión venció. Recarga la página y vuelve a entrar con tu correo.";
    // Si la sesión se pierde, la petición llega como anónima y RLS responde esto mismo.
    case "42501":
      return "No tienes permiso o tu sesión venció. Vuelve a iniciar sesión.";
    case "23505":
      return "Ya tenías una calificación de esta taquería. Recarga la página para editarla.";
    default:
      return "No se pudo guardar la calificación. Intenta de nuevo en un momento.";
  }
}

// La calificación del usuario en esa taquería. RLS solo deja ver la propia, así que hay una o ninguna.
export async function leerCalificacion(
  cliente: Cliente,
  taqueriaId: number,
): Promise<EstadoConsulta<CalificacionGuardada>> {
  const resultado = await cliente
    .from("calificaciones")
    .select("id, salsa, tortilla, carne, precio, copia")
    .eq("taqueria_id", taqueriaId)
    .maybeSingle();
  return estadoConsulta(resultado);
}

// Crea con insert o edita con update. No se usa upsert: intentaría escribir columnas sin GRANT.
// Con .single(), un update que no toca ninguna fila da error en vez de pasar en silencio.
export async function guardarCalificacion(
  cliente: Cliente,
  taqueriaId: number,
  idExistente: number | null,
  datos: Calificacion,
): Promise<{ id: number | null; error: { code?: string } | null }> {
  const consulta =
    idExistente === null
      ? cliente.from("calificaciones").insert({ taqueria_id: taqueriaId, ...datos })
      : cliente.from("calificaciones").update(datos).eq("id", idExistente);

  const { data, error } = await consulta.select("id").single();
  return { id: data?.id ?? null, error };
}
