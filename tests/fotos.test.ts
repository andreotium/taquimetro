import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { borrarFoto, leerFotos, mensajeErrorFoto, rutaNueva, subirFoto, validarArchivo } from "../lib/fotos";
import { borrarFotosDe, borrarUsuario, crearUsuario, sesionComo, type UsuarioDePrueba } from "./ayudantes";

const cincoMB = 5 * 1024 * 1024;
const mensajeTipo = "Solo se aceptan fotos JPG o PNG.";
const mensajeTamano = "La foto pesa más de 5 MB. Elige una más ligera.";

describe("validarArchivo", () => {
  it("acepta JPG y PNG y da su extensión", () => {
    expect(validarArchivo({ type: "image/jpeg", size: 1000 })).toEqual({ ok: true, extension: "jpg" });
    expect(validarArchivo({ type: "image/png", size: 1000 })).toEqual({ ok: true, extension: "png" });
  });

  it("rechaza otros tipos, aunque pesen poco", () => {
    for (const type of ["image/gif", "text/plain", ""]) {
      expect(validarArchivo({ type, size: 1000 })).toEqual({ ok: false, mensaje: mensajeTipo });
    }
  });

  it("acepta exactamente 5 MB y rechaza un byte más", () => {
    expect(validarArchivo({ type: "image/png", size: cincoMB }).ok).toBe(true);
    expect(validarArchivo({ type: "image/png", size: cincoMB + 1 })).toEqual({ ok: false, mensaje: mensajeTamano });
  });
});

describe("rutaNueva", () => {
  it("va en la carpeta del usuario, termina en la extensión y no se repite", () => {
    const primera = rutaNueva("usuario-1", "jpg");
    const segunda = rutaNueva("usuario-1", "jpg");

    expect(primera.split("/")[0]).toBe("usuario-1");
    expect(primera).toMatch(/^usuario-1\/[^/]+\.jpg$/);
    expect(primera).not.toBe(segunda);
  });
});

describe("mensajeErrorFoto", () => {
  it("con 413 o 415 del bucket, explica el tamaño o el tipo", () => {
    expect(mensajeErrorFoto({ statusCode: "413" }, "subir")).toBe(mensajeTamano);
    expect(mensajeErrorFoto({ statusCode: "415" }, "subir")).toBe(mensajeTipo);
  });

  it("con 403 del bucket o 42501 de la tabla, pide volver a entrar", () => {
    const mensaje = "Tu sesión venció. Recarga la página y vuelve a entrar con tu correo.";
    expect(mensajeErrorFoto({ statusCode: "403" }, "subir")).toBe(mensaje);
    expect(mensajeErrorFoto({ code: "42501" }, "borrar")).toBe(mensaje);
  });

  it("sin código (falla de red), pide revisar la conexión", () => {
    expect(mensajeErrorFoto({}, "subir")).toBe("No se pudo enviar. Revisa tu conexión e intenta de nuevo.");
  });

  it("con cualquier otro código, da el mensaje general de cada acción", () => {
    expect(mensajeErrorFoto({ code: "PGRST116" }, "subir")).toBe(
      "No se pudo subir la foto. Intenta de nuevo en un momento.",
    );
    expect(mensajeErrorFoto({ code: "PGRST116" }, "borrar")).toBe(
      "No se pudo borrar la foto. Intenta de nuevo en un momento.",
    );
  });
});

// Usuarios que siguen vivos; afterAll borra sus archivos y luego a ellos (las filas se van en cascada).
const vivos: UsuarioDePrueba[] = [];

let usuarioA: UsuarioDePrueba;
let clienteA: SupabaseClient<Database>;
let clienteB: SupabaseClient<Database>;
let taqueria: number;

// Storage solo revisa el tipo que declara quien sube, no el contenido: bastan unos bytes.
const png = () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });

async function fotosDeA() {
  const lectura = await leerFotos(clienteA, taqueria);
  expect(lectura.estado).not.toBe("error");
  return lectura.estado === "ok" ? lectura.datos.filter((f) => f.user_id === usuarioA.id) : [];
}

beforeAll(async () => {
  const [a, b] = await Promise.all((["A", "B"] as const).map(crearUsuario));
  vivos.push(a, b);
  usuarioA = a;
  [clienteA, clienteB] = await Promise.all([sesionComo(a), sesionComo(b)]);

  // La cuarta taquería por id: las tres primeras y las dos últimas ya las usan otros archivos de prueba.
  const { data, error } = await clienteA.from("taquerias").select("id").order("id").range(3, 3).single();
  expect(error).toBeNull();
  taqueria = data!.id;
});

// Primero los archivos, porque no se van en cascada; los usuarios se borran aunque eso falle.
afterAll(async () => {
  try {
    await Promise.all(vivos.map(borrarFotosDe));
  } finally {
    await Promise.all(vivos.map(borrarUsuario));
  }
});

describe("leer, subir y borrar contra Supabase", () => {
  it("sin fotos de A, no aparece ninguna suya", async () => {
    expect(await fotosDeA()).toEqual([]);
  });

  it("A sube un PNG y aparece en la lista con su URL pública", async () => {
    const ruta = rutaNueva(usuarioA.id, "png");
    expect(await subirFoto(clienteA, taqueria, ruta, png())).toEqual({ error: null });

    const fotos = await fotosDeA();
    expect(fotos).toHaveLength(1);
    expect(fotos[0].ruta).toBe(ruta);
    expect(fotos[0].url).toContain(`/fotos/${ruta}`);
  });

  it("si la validación se salta, el bucket rechaza un .txt con el mensaje de tipo", async () => {
    const texto = new Blob(["hola"], { type: "text/plain" });
    const { error } = await subirFoto(clienteA, taqueria, rutaNueva(usuarioA.id, "txt"), texto);

    expect(error).not.toBeNull();
    expect(mensajeErrorFoto(error!, "subir")).toBe(mensajeTipo);
    expect(await fotosDeA()).toHaveLength(1);
  });

  it("B no puede borrar la foto de A", async () => {
    const [foto] = await fotosDeA();
    const { error } = await borrarFoto(clienteB, foto);

    expect(error).not.toBeNull();
    expect(await fotosDeA()).toEqual([foto]);
  });

  it("A borra su foto: sale de la lista y de su carpeta", async () => {
    const [foto] = await fotosDeA();
    expect(await borrarFoto(clienteA, foto)).toEqual({ error: null });

    expect(await fotosDeA()).toEqual([]);
    const { data, error } = await clienteA.storage.from("fotos").list(usuarioA.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
