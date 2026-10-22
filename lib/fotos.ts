import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
// Ruta relativa: Vitest no resuelve el alias @/ y las pruebas importan este archivo.
import { estadoConsulta, type EstadoConsulta } from "./consulta";

type Cliente = SupabaseClient<Database>;

export type Foto = { id: number; ruta: string; user_id: string; url: string };

// Storage avisa con un statusCode HTTP; la tabla, con un code de Postgres. Una falla de red no trae ninguno.
export type ErrorFoto = { statusCode?: string; code?: string };

// Mismo límite y tipos que el bucket; aquí solo dan un mensaje claro antes de enviar.
const LIMITE = 5 * 1024 * 1024;
const extensiones: Record<string, "jpg" | "png"> = { "image/jpeg": "jpg", "image/png": "png" };

const mensajeTipo = "Solo se aceptan fotos JPG o PNG.";
const mensajeTamano = "La foto pesa más de 5 MB. Elige una más ligera.";

export function validarArchivo(archivo: {
  type: string;
  size: number;
}): { ok: true; extension: "jpg" | "png" } | { ok: false; mensaje: string } {
  const extension = extensiones[archivo.type];
  if (!extension) return { ok: false, mensaje: mensajeTipo };
  if (archivo.size > LIMITE) return { ok: false, mensaje: mensajeTamano };
  return { ok: true, extension };
}

// La primera carpeta es el id del usuario: es lo que revisan las políticas del bucket y de la tabla.
export function rutaNueva(userId: string, extension: string) {
  return `${userId}/${crypto.randomUUID()}.${extension}`;
}

export function mensajeErrorFoto(error: ErrorFoto, accion: "subir" | "borrar"): string {
  if (error.statusCode === "413") return mensajeTamano;
  if (error.statusCode === "415") return mensajeTipo;
  if (error.statusCode === "403" || error.code === "42501") {
    return "Tu sesión venció. Recarga la página y vuelve a entrar con tu correo.";
  }
  if (!error.statusCode && !error.code) return "No se pudo enviar. Revisa tu conexión e intenta de nuevo.";
  return `No se pudo ${accion} la foto. Intenta de nuevo en un momento.`;
}

function errorDeStorage(error: Error): ErrorFoto {
  return "statusCode" in error ? { statusCode: String(error.statusCode) } : {};
}

// Las fotos de la taquería, de la más nueva a la más vieja. La URL pública se arma sin pedir nada.
export async function leerFotos(cliente: Cliente, taqueriaId: number): Promise<EstadoConsulta<Foto[]>> {
  const { data, error } = await cliente
    .from("fotos")
    .select("id, ruta, user_id")
    .eq("taqueria_id", taqueriaId)
    .order("creada_en", { ascending: false });

  const bucket = cliente.storage.from("fotos");
  const fotos = data?.map((f) => ({ ...f, url: bucket.getPublicUrl(f.ruta).data.publicUrl })) ?? null;
  return estadoConsulta({ data: fotos, error });
}

// Sube el archivo y luego registra la fila. Si el registro falla, el archivo queda huérfano:
// riesgo aceptado (docs/arquitectura.md, subida de fotos).
export async function subirFoto(
  cliente: Cliente,
  taqueriaId: number,
  ruta: string,
  archivo: Blob,
): Promise<{ error: ErrorFoto | null }> {
  const { error: errorSubida } = await cliente.storage.from("fotos").upload(ruta, archivo, { contentType: archivo.type });
  if (errorSubida) return { error: errorDeStorage(errorSubida) };

  const { error } = await cliente.from("fotos").insert({ taqueria_id: taqueriaId, ruta });
  return { error };
}

// Borra el archivo y luego la fila. Si el archivo no es tuyo, Storage no da error: no borra nada.
// Con .single(), la fila que RLS no deja borrar sí da error en vez de pasar en silencio.
export async function borrarFoto(cliente: Cliente, foto: Foto): Promise<{ error: ErrorFoto | null }> {
  const { error: errorArchivo } = await cliente.storage.from("fotos").remove([foto.ruta]);
  if (errorArchivo) return { error: errorDeStorage(errorArchivo) };

  const { error } = await cliente.from("fotos").delete().eq("id", foto.id).select("id").single();
  return { error };
}
