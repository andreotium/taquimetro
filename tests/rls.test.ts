import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { borrarUsuario, crearUsuario, sesionComo, sinSesion, type UsuarioDePrueba } from "./ayudantes";

// Código de Postgres para "permiso denegado". Se compara contra él para que un error
// de otro tipo (por ejemplo, una columna obligatoria vacía) no haga pasar la prueba.
const PERMISO_DENEGADO = "42501";

const calificacionDeA = { salsa: 4, tortilla: 4, carne: 4, precio: 25, copia: true };

// Usuarios que siguen vivos; si la prueba falla a la mitad, afterAll los borra
// y sus calificaciones se van en cascada.
const vivos: UsuarioDePrueba[] = [];

let clienteA: SupabaseClient<Database>;
let clienteB: SupabaseClient<Database>;
let idCalificacion: number;
let taqueriaDeA: number;
let otraTaqueria: number;

// Lee la calificación de A con la sesión de A; es la fuente de verdad de cada comprobación.
async function releerComoA() {
  const { data, error } = await clienteA.from("calificaciones").select("*").eq("id", idCalificacion).single();
  expect(error).toBeNull();
  return data!;
}

beforeAll(async () => {
  const [a, b] = await Promise.all((["A", "B"] as const).map(crearUsuario));
  vivos.push(a, b);
  [clienteA, clienteB] = await Promise.all([sesionComo(a), sesionComo(b)]);

  // No hay taquerías de prueba: solo existen las 20 de la semilla y nadie puede insertar más.
  // Se usan las dos últimas para no tocar las primeras, que son las que verá la tarea 3.3.
  const { data: taquerias, error: errorTaquerias } = await clienteA
    .from("taquerias")
    .select("id")
    .order("id", { ascending: false })
    .limit(2);
  expect(errorTaquerias).toBeNull();
  expect(taquerias).toHaveLength(2);
  [taqueriaDeA, otraTaqueria] = taquerias!.map((t) => t.id);

  const { data, error } = await clienteA
    .from("calificaciones")
    .insert({ taqueria_id: taqueriaDeA, ...calificacionDeA })
    .select("id")
    .single();
  expect(error).toBeNull();
  idCalificacion = data!.id;
});

afterAll(async () => {
  await Promise.all(vivos.map(borrarUsuario));
});

describe("RLS de calificaciones", () => {
  it("B no puede leer la calificación de A", async () => {
    const { data, error } = await clienteB.from("calificaciones").select("*").eq("id", idCalificacion);

    // RLS no da error: simplemente no le devuelve la fila.
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("B no puede editar la calificación de A", async () => {
    const { data, error } = await clienteB
      .from("calificaciones")
      .update({ salsa: 1, precio: 150 })
      .eq("id", idCalificacion)
      .select();

    expect(error).toBeNull();
    expect(data).toEqual([]);

    const fila = await releerComoA();
    expect(fila.salsa).toBe(calificacionDeA.salsa);
    expect(Number(fila.precio)).toBe(calificacionDeA.precio);
  });

  it("A no puede mover su calificación a otra taquería", async () => {
    const { error } = await clienteA
      .from("calificaciones")
      .update({ taqueria_id: otraTaqueria })
      .eq("id", idCalificacion);

    // Lo impide el GRANT por columna: taqueria_id no está entre las columnas editables.
    expect(error?.code).toBe(PERMISO_DENEGADO);

    const fila = await releerComoA();
    expect(fila.taqueria_id).toBe(taqueriaDeA);
  });

  it("nadie puede borrar una calificación, ni su dueño", async () => {
    for (const cliente of [clienteA, clienteB]) {
      const { error } = await cliente.from("calificaciones").delete().eq("id", idCalificacion);
      expect(error?.code).toBe(PERMISO_DENEGADO);
    }

    // Comprobación final: la fila sigue ahí.
    await releerComoA();
  });

  it("sin sesión no se puede insertar una calificación", async () => {
    const { error } = await sinSesion()
      .from("calificaciones")
      .insert({ taqueria_id: otraTaqueria, ...calificacionDeA });

    expect(error?.code).toBe(PERMISO_DENEGADO);
  });
});
