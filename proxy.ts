import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

// Un Server Component no puede escribir cookies: si la sesión vence, el servidor la renovaría
// sin poder guardarla y el token de renovación (de un solo uso) se perdería. El proxy la renueva
// antes de cada página y escribe la cookie nueva en la respuesta.
export async function proxy(request: NextRequest) {
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesPorPoner, encabezados) {
          // La petición lleva las cookies nuevas para que la página ya las lea; la respuesta, para el navegador.
          cookiesPorPoner.forEach(({ name, value }) => request.cookies.set(name, value));
          respuesta = NextResponse.next({ request });
          cookiesPorPoner.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options),
          );
          Object.entries(encabezados).forEach(([nombre, valor]) => respuesta.headers.set(nombre, valor));
        },
      },
    },
  );

  // Lee la sesión y, si venció, la renueva.
  await supabase.auth.getClaims();

  return respuesta;
}

export const config = {
  // Todo menos archivos estáticos e imágenes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
