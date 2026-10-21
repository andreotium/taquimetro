import { createBrowserClient } from "@supabase/ssr";

// Cliente para componentes con "use client". Solo usa la llave pública.
export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
