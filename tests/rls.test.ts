import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  borrarFotosDe,
  borrarUsuario,
  crearUsuario,
  sesionComo,
  sinSesion,
  type UsuarioDePrueba,
} from "./ayudantes";

// Código de Postgres para "permiso denegado". Se compara contra él para que un error
// de otro tipo (por ejemplo, una columna obligatoria vacía) no haga pasar la prueba.
const PERMISO_DENEGADO = "42501";

// Código de Postgres para "no cumple una restricción check"; aquí, el formato de fotos.ruta.
const RUTA_INVALIDA = "23514";

// Códigos HTTP con que Storage rechaza una subida; mismo propósito que PERMISO_DENEGADO.
const STORAGE_RLS = "403";
const STORAGE_TIPO = "415";
const STORAGE_TAMANO = "413";

const calificacionDeA = { salsa: 4, tortilla: 4, carne: 4, precio: 25, copia: true };

// Usuarios que siguen vivos; si la prueba falla a la mitad, afterAll los borra
// y sus calificaciones se van en cascada.
const vivos: UsuarioDePrueba[] = [];

let usuarioA: UsuarioDePrueba;
let usuarioB: UsuarioDePrueba;
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
  usuarioA = a;
  usuarioB = b;
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

// Primero los archivos, porque no se van en cascada; los usuarios se borran aunque eso falle.
afterAll(async () => {
  try {
    await Promise.all(vivos.map(borrarFotosDe));
  } finally {
    await Promise.all(vivos.map(borrarUsuario));
  }
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

describe("RLS de fotos", () => {
  let taqueriaDeFotos: number;
  let rutaDeA: string;
  let idFotoDeA: number;

  // Storage solo revisa el tipo que declara quien sube, no el contenido: bastan unos bytes.
  const png = () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
  const rutaEnCarpetaDeA = (extension: string) => `${usuarioA.id}/${randomUUID()}.${extension}`;

  // Se lista la carpeta en vez de usar exists(): con un archivo que no está, exists() da error 400.
  async function existeComoA(ruta: string) {
    const { data, error } = await clienteA.storage.from("fotos").list(usuarioA.id);
    expect(error).toBeNull();
    return data!.some((archivo) => `${usuarioA.id}/${archivo.name}` === ruta);
  }

  function codigoStorage(error: Error | null) {
    return error && "statusCode" in error ? error.statusCode : error;
  }

  async function filaDeFotoDeA() {
    const { data, error } = await clienteA.from("fotos").select("*").eq("id", idFotoDeA);
    expect(error).toBeNull();
    return data!;
  }

  beforeAll(async () => {
    // La tercera taquería por id: el trigger usa la primera, la calificación la segunda
    // y la RLS de calificaciones las dos últimas.
    const { data, error } = await clienteA.from("taquerias").select("id").order("id").range(2, 2).single();
    expect(error).toBeNull();
    taqueriaDeFotos = data!.id;
  });

  it("A puede subir y registrar una foto en su carpeta", async () => {
    rutaDeA = rutaEnCarpetaDeA("png");
    const { error: errorSubida } = await clienteA.storage.from("fotos").upload(rutaDeA, png());
    expect(errorSubida).toBeNull();

    const { data, error } = await clienteA
      .from("fotos")
      .insert({ taqueria_id: taqueriaDeFotos, ruta: rutaDeA })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data!.user_id).toBe(usuarioA.id);
    idFotoDeA = data!.id;
  });

  it("B no puede subir archivos a la carpeta de A", async () => {
    const ruta = rutaEnCarpetaDeA("png");
    const { error } = await clienteB.storage.from("fotos").upload(ruta, png());

    expect(codigoStorage(error)).toBe(STORAGE_RLS);
    expect(await existeComoA(ruta)).toBe(false);
  });

  it("B no puede borrar los archivos ni las filas de A", async () => {
    // Como en las tablas, RLS no da error: simplemente no encuentra nada que borrar.
    const { data: archivos, error: errorArchivo } = await clienteB.storage.from("fotos").remove([rutaDeA]);
    expect(errorArchivo).toBeNull();
    expect(archivos).toEqual([]);

    const { data: filas, error: errorFila } = await clienteB.from("fotos").delete().eq("id", idFotoDeA).select();
    expect(errorFila).toBeNull();
    expect(filas).toEqual([]);

    expect(await existeComoA(rutaDeA)).toBe(true);
    expect(await filaDeFotoDeA()).toHaveLength(1);
  });

  it("B no puede registrar en fotos una ruta de la carpeta de A", async () => {
    const { error } = await clienteB
      .from("fotos")
      .insert({ taqueria_id: taqueriaDeFotos, ruta: rutaEnCarpetaDeA("png") });

    expect(error?.code).toBe(PERMISO_DENEGADO);
  });

  // La política solo revisa la primera carpeta; la base además exige el formato que genera
  // rutaNueva(). Si alguna entrara, sería fila de B y se iría en cascada al borrarlo.
  it.each([
    ["con ..", () => `${usuarioB.id}/../${usuarioA.id}/${randomUUID()}.png`],
    ["que la app no genera", () => `${usuarioB.id}/foto.png`],
  ])("B no puede registrar en fotos una ruta %s", async (_, ruta) => {
    const { error } = await clienteB.from("fotos").insert({ taqueria_id: taqueriaDeFotos, ruta: ruta() });

    expect(error?.code).toBe(RUTA_INVALIDA);
  });

  // Los dos rechazos siguientes suben con la sesión de A a su propia carpeta,
  // para que el motivo sea el tipo o el tamaño y no RLS.
  it("el bucket rechaza un .txt", async () => {
    const ruta = rutaEnCarpetaDeA("txt");
    const { error } = await clienteA.storage
      .from("fotos")
      .upload(ruta, new Blob(["hola"], { type: "text/plain" }), { contentType: "text/plain" });

    expect(codigoStorage(error)).toBe(STORAGE_TIPO);
    expect(await existeComoA(ruta)).toBe(false);
  });

  it("el bucket rechaza un archivo de más de 5 MB", async () => {
    const ruta = rutaEnCarpetaDeA("png");
    const grande = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: "image/png" });
    const { error } = await clienteA.storage.from("fotos").upload(ruta, grande);

    expect(codigoStorage(error)).toBe(STORAGE_TAMANO);
    expect(await existeComoA(ruta)).toBe(false);
    // Subir 5 MB tarda más que los 5 segundos por defecto.
  }, 30_000);

  it("A puede borrar su foto y su fila", async () => {
    const { data: archivos, error: errorArchivo } = await clienteA.storage.from("fotos").remove([rutaDeA]);
    expect(errorArchivo).toBeNull();
    expect(archivos).toHaveLength(1);

    const { data: filas, error: errorFila } = await clienteA.from("fotos").delete().eq("id", idFotoDeA).select();
    expect(errorFila).toBeNull();
    expect(filas).toHaveLength(1);

    expect(await existeComoA(rutaDeA)).toBe(false);
    expect(await filaDeFotoDeA()).toEqual([]);
  });
});
