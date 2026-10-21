import { randomBytes, randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export type NombreUsuario = "A" | "B" | "C";

export type UsuarioDePrueba = {
  nombre: NombreUsuario;
  id: string;
  email: string;
  password: string;
};

function variable(nombre: string) {
  const valor = process.env[nombre];
  if (!valor) throw new Error(`Falta ${nombre} en .env.test.local`);
  return valor;
}

// Sin guardar sesión ni refrescar el token: cada cliente vive solo en memoria y no deja timers abiertos.
const opciones = { auth: { persistSession: false, autoRefreshToken: false } };

// Llave secreta: solo crea y borra usuarios. Nunca se usa para las comprobaciones,
// porque se salta RLS y la prueba pasaría siempre.
function clienteAdmin() {
  return createClient<Database>(variable("SUPABASE_URL"), variable("SUPABASE_SECRET_KEY"), opciones);
}

// Cliente con la llave pública y sin sesión: actúa como `anon`.
export function sinSesion(): SupabaseClient<Database> {
  return createClient<Database>(variable("SUPABASE_URL"), variable("SUPABASE_PUBLISHABLE_KEY"), opciones);
}

// Correo único por corrida para que dos archivos de prueba no choquen; contraseña aleatoria cada vez.
export async function crearUsuario(nombre: NombreUsuario): Promise<UsuarioDePrueba> {
  const email = `prueba-${nombre.toLowerCase()}-${randomUUID()}@example.com`;
  const password = randomBytes(24).toString("base64url");

  const { data, error } = await clienteAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`No se pudo crear al usuario ${nombre}: ${error.message}`);

  return { nombre, id: data.user.id, email, password };
}

// Al borrar al usuario, sus calificaciones y filas de fotos se borran en cascada.
export async function borrarUsuario(usuario: UsuarioDePrueba) {
  const { error } = await clienteAdmin().auth.admin.deleteUser(usuario.id);
  if (error) throw new Error(`No se pudo borrar al usuario ${usuario.nombre}: ${error.message}`);
}

// Cliente con la llave pública y la sesión del usuario: RLS aplica como a cualquier persona.
export async function sesionComo(usuario: UsuarioDePrueba): Promise<SupabaseClient<Database>> {
  const cliente = sinSesion();
  const { error } = await cliente.auth.signInWithPassword({
    email: usuario.email,
    password: usuario.password,
  });
  if (error) throw new Error(`No se pudo abrir sesión como ${usuario.nombre}: ${error.message}`);
  return cliente;
}
