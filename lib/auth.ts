// A dónde manda la ruta de regreso del login. Solo conserva el origen de la petición:
// ignora `next` y cualquier otro parámetro para que nadie la use para mandar al usuario a otro sitio.
export function destinoRegreso(urlPeticion: string, fallo = false): URL {
  const destino = new URL("/", new URL(urlPeticion).origin);
  if (fallo) destino.searchParams.set("login", "error");
  return destino;
}

// Mensaje visible cuando Supabase no pudo enviar el enlace mágico.
export function mensajeErrorEnvio(error: { code?: string; status?: number }): string {
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "Ya se enviaron varios enlaces. Espera unos minutos e intenta de nuevo.";
  }
  return "No se pudo enviar el enlace. Intenta de nuevo en un momento.";
}
