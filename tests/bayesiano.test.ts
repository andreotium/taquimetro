import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";

// Peso del prior (C). El trigger usa 3. Cámbialo a 0 para ver la prueba en rojo:
// sin prior, el voto único de 5 le gana a los 80 votos de 4.6.
const C = 3;

// Promedio global fijo. Con C = 3, el voto único ganaría solo si m pasara de 4.46.
const M = 4;

// Llave pública y sin sesión: la función se llama como `anon`.
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } },
);

async function puntaje(v: number, r: number) {
  const { data, error } = await supabase.rpc("puntaje_bayesiano", { v, r, m: M, c: C });
  expect(error).toBeNull();
  // La función devuelve vacío si v es 0 o falta un promedio; aquí no debe pasar.
  expect(data).not.toBeNull();
  return data as number;
}

describe("puntaje_bayesiano", () => {
  it("80 votos de 4.6 quedan arriba de 1 voto de 5", async () => {
    const unVoto = await puntaje(1, 5);
    const ochentaVotos = await puntaje(80, 4.6);

    expect(ochentaVotos).toBeGreaterThan(unVoto);
  });
});
