import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  guardarCalificacion,
  leerCalificacion,
  mensajeErrorGuardado,
  validarCalificacion,
  type Borrador,
} from "../lib/calificacion";
import { borrarUsuario, crearUsuario, sesionComo, type UsuarioDePrueba } from "./ayudantes";

const valido: Borrador = { salsa: 4, tortilla: 3, carne: 5, precio: "25", copia: true };

const mensajeCriterios = "Elige del 1 al 5 para salsa, tortilla y carne.";
const mensajeCopia = "Indica si hay copia.";
const mensajePrecio = "El precio por taco debe estar entre 5 y 150 pesos.";

describe("validarCalificacion", () => {
  it("acepta una calificación completa y convierte el precio a número", () => {
    expect(validarCalificacion(valido)).toEqual({
      ok: true,
      datos: { salsa: 4, tortilla: 3, carne: 5, precio: 25, copia: true },
    });
  });

  it("acepta los límites: precio 5 y 150, criterios en 1 y 5", () => {
    for (const precio of ["5", "150"]) {
      expect(validarCalificacion({ ...valido, precio }).ok).toBe(true);
    }
    expect(validarCalificacion({ ...valido, salsa: 1, tortilla: 5, carne: 1 }).ok).toBe(true);
  });

  it("acepta precio con decimales", () => {
    const resultado = validarCalificacion({ ...valido, precio: "25.5" });

    expect(resultado.ok && resultado.datos.precio).toBe(25.5);
  });

  it("rechaza precio fuera de rango, vacío o que no es número", () => {
    for (const precio of ["4.99", "150.01", "", "  ", "abc"]) {
      expect(validarCalificacion({ ...valido, precio })).toEqual({ ok: false, mensaje: mensajePrecio });
    }
  });

  it("rechaza un criterio sin elegir o fuera de 1 a 5", () => {
    for (const salsa of [null, 0, 6]) {
      expect(validarCalificacion({ ...valido, salsa })).toEqual({ ok: false, mensaje: mensajeCriterios });
    }
  });

  it("rechaza copia sin elegir", () => {
    expect(validarCalificacion({ ...valido, copia: null })).toEqual({ ok: false, mensaje: mensajeCopia });
  });
});

describe("mensajeErrorGuardado", () => {
  it("con 23514 (la base rechazó un valor), explica los rangos", () => {
    expect(mensajeErrorGuardado({ code: "23514" })).toBe(
      "La base rechazó los valores: el precio va de 5 a 150 pesos y cada criterio del 1 al 5.",
    );
  });

  it("sin código (falla de red), pide revisar la conexión", () => {
    expect(mensajeErrorGuardado({ code: "" })).toBe("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
    expect(mensajeErrorGuardado({})).toBe("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
  });

  it("con 42501 (permiso denegado), pide volver a entrar", () => {
    expect(mensajeErrorGuardado({ code: "42501" })).toBe(
      "Tu sesión venció. Recarga la página y vuelve a entrar con tu correo.",
    );
  });

  it("con 23505 (ya existía), pide recargar para editarla", () => {
    expect(mensajeErrorGuardado({ code: "23505" })).toBe(
      "Ya tenías una calificación de esta taquería. Recarga la página para editarla.",
    );
  });

  it("con cualquier otro código, da el mensaje general", () => {
    expect(mensajeErrorGuardado({ code: "PGRST116" })).toBe(
      "No se pudo guardar la calificación. Intenta de nuevo en un momento.",
    );
  });
});

// Usuarios que siguen vivos; afterAll los borra y sus calificaciones se van en cascada.
const vivos: UsuarioDePrueba[] = [];

let cliente: SupabaseClient<Database>;
let taqueria: number;

beforeAll(async () => {
  const usuario = await crearUsuario("A");
  vivos.push(usuario);
  cliente = await sesionComo(usuario);

  // La segunda taquería: tests/trigger.test.ts usa la primera y tests/rls.test.ts las dos últimas.
  const { data, error } = await cliente.from("taquerias").select("id").order("id").range(1, 1).single();
  expect(error).toBeNull();
  taqueria = data!.id;
});

afterAll(async () => {
  await Promise.all(vivos.map(borrarUsuario));
});

describe("leer y guardar contra Supabase", () => {
  it("sin calificación previa, la lectura da no-encontrado", async () => {
    expect(await leerCalificacion(cliente, taqueria)).toEqual({ estado: "no-encontrado" });
  });

  it("crea la calificación y luego la edita: queda una sola fila con los valores nuevos", async () => {
    const primera = { salsa: 2, tortilla: 2, carne: 2, precio: 20, copia: false };
    const creada = await guardarCalificacion(cliente, taqueria, null, primera);
    expect(creada.error).toBeNull();

    const leida = await leerCalificacion(cliente, taqueria);
    expect(leida.estado).toBe("ok");
    const fila = leida.estado === "ok" ? leida.datos : null;
    expect(fila?.id).toBe(creada.id);

    const nueva = { salsa: 5, tortilla: 4, carne: 3, precio: 32.5, copia: true };
    const editada = await guardarCalificacion(cliente, taqueria, fila!.id, nueva);
    expect(editada).toEqual({ id: fila!.id, error: null });

    const { data, error } = await cliente
      .from("calificaciones")
      .select("id, salsa, tortilla, carne, precio, copia")
      .eq("taqueria_id", taqueria);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect({ ...data![0], precio: Number(data![0].precio) }).toEqual({ id: fila!.id, ...nueva });
  });

  it("si la validación se salta, la base rechaza un precio de 200 con 23514", async () => {
    const leida = await leerCalificacion(cliente, taqueria);
    const id = leida.estado === "ok" ? leida.datos.id : null;

    const { error } = await guardarCalificacion(cliente, taqueria, id, {
      salsa: 3,
      tortilla: 3,
      carne: 3,
      precio: 200,
      copia: false,
    });

    expect(error?.code).toBe("23514");
  });
});
