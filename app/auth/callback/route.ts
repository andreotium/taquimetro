import { NextResponse, type NextRequest } from "next/server";
import { destinoRegreso } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Ruta de regreso del enlace mágico: cambia el código por una sesión, guarda la cookie
// y siempre regresa a / del mismo sitio. No escribe datos de la app (D6).
export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("code");
  let fallo = true;

  if (codigo) {
    const supabase = await crearClienteServidor();
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    fallo = error !== null;
  }

  return NextResponse.redirect(destinoRegreso(request.url, fallo));
}
