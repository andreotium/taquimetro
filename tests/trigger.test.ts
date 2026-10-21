import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { borrarUsuario, crearUsuario, sesionComo, sinSesion, type UsuarioDePrueba } from "./ayudantes";

const calificacionDeC = { salsa: 5, tortilla: 3, carne: 4, precio: 30, copia: false };

// Usuarios que siguen vivos; si la prueba falla a la mitad, afterAll los borra
// y sus calificaciones se van en cascada.
const vivos: UsuarioDePrueba[] = [];

let c: UsuarioDePrueba;
let clienteC: SupabaseClient<Database>;
let taqueria: number;

// Votos y promedios de la taquería. El puntaje bayesiano queda fuera a propósito: depende
// del promedio global, que cambia si tests/rls.test.ts califica otra taquería al mismo tiempo.
// Se lee sin sesión: los agregados son públicos y C deja de existir a la mitad de la prueba.
async function leerAgregados() {
  const { data, error } = await sinSesion()
    .from("agregados_taqueria")
    .select("votos, prom_salsa, prom_tortilla, prom_carne, precio_promedio, porcentaje_copia")
    .eq("taqueria_id", taqueria)
    .single();
  expect(error).toBeNull();
  const { votos, ...promedios } = data!;
  return { votos, promedios };
}

beforeAll(async () => {
  c = await crearUsuario("C");
  vivos.push(c);
  clienteC = await sesionComo(c);

  // La primera taquería: tests/rls.test.ts usa las dos últimas.
  const { data, error } = await clienteC.from("taquerias").select("id").order("id").limit(1).single();
  expect(error).toBeNull();
  taqueria = data!.id;
});

afterAll(async () => {
  await Promise.all(vivos.map(borrarUsuario));
});

describe("trigger de agregados", () => {
  it("suma el voto de C y lo quita al borrar a C", async () => {
    const antes = await leerAgregados();

    const { error } = await clienteC.from("calificaciones").insert({ taqueria_id: taqueria, ...calificacionDeC });
    expect(error).toBeNull();

    const conC = await leerAgregados();
    expect(conC.votos).toBe(antes.votos + 1);
    expect(conC.promedios).not.toEqual(antes.promedios);

    // Borrar a C borra su calificación en cascada; el trigger debe recalcular.
    for (const usuario of vivos.splice(0)) await borrarUsuario(usuario);

    const despues = await leerAgregados();
    expect(despues).toEqual(antes);
  });
});
