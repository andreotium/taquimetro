import { describe, expect, it } from "vitest";
import { estadoConsulta } from "../lib/consulta";

// Así llega un error de Supabase (PostgrestError).
const falla = {
  message: "TypeError: fetch failed",
  details: "",
  hint: "",
  code: "",
};

describe("estadoConsulta", () => {
  it("con filas, regresa ok y los datos", () => {
    const datos = [{ id: 1, nombre: "El Vilsito" }];

    expect(estadoConsulta({ data: datos, error: null })).toEqual({ estado: "ok", datos });
  });

  it("con una sola fila, regresa ok y la fila", () => {
    const fila = { taqueria_id: 7, votos: 0 };

    expect(estadoConsulta({ data: fila, error: null })).toEqual({ estado: "ok", datos: fila });
  });

  it("con un arreglo vacío, regresa vacío", () => {
    expect(estadoConsulta({ data: [], error: null })).toEqual({ estado: "vacio" });
  });

  it("sin datos y sin error, regresa no encontrado", () => {
    expect(estadoConsulta({ data: null, error: null })).toEqual({ estado: "no-encontrado" });
  });

  it("con error, regresa error", () => {
    expect(estadoConsulta({ data: null, error: falla })).toEqual({ estado: "error" });
  });

  it("el error gana aunque también lleguen datos", () => {
    expect(estadoConsulta({ data: [], error: falla })).toEqual({ estado: "error" });
  });
});
