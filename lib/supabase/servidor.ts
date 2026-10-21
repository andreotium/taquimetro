import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente para Server Components, Server Functions y Route Handlers. Lee la sesión de las cookies.
export async function crearClienteServidor() {
  const almacenCookies = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return almacenCookies.getAll();
        },
        setAll(cookiesPorPoner) {
          try {
            cookiesPorPoner.forEach(({ name, value, options }) =>
              almacenCookies.set(name, value, options),
            );
          } catch {
            // Un Server Component no puede escribir cookies; se ignora porque la sesión
            // se escribe en la ruta de regreso del login (Route Handler).
          }
        },
      },
    },
  );
}
