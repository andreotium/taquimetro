import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ubicarTaquerias } from "../lib/mapa";

function taqueria(id: number, latitud: number | null, longitud: number | null) {
  return { id, latitud, longitud };
}

function ids(lista: { id: number }[]) {
  return lista.map((t) => t.id);
}

describe("ubicarTaquerias", () => {
  it("con latitud y longitud va al mapa, con su id", () => {
    const { conUbicacion, sinUbicacion } = ubicarTaquerias([taqueria(1, 19.43, -99.13), taqueria(2, 19.41, -99.16)]);

    expect(ids(conUbicacion)).toEqual([1, 2]);
    expect(sinUbicacion).toEqual([]);
  });

  it("sin latitud queda fuera del mapa", () => {
    const { conUbicacion, sinUbicacion } = ubicarTaquerias([taqueria(1, null, -99.13)]);

    expect(conUbicacion).toEqual([]);
    expect(ids(sinUbicacion)).toEqual([1]);
  });

  it("sin longitud queda fuera del mapa", () => {
    const { conUbicacion, sinUbicacion } = ubicarTaquerias([taqueria(1, 19.43, null)]);

    expect(conUbicacion).toEqual([]);
    expect(ids(sinUbicacion)).toEqual([1]);
  });

  it("una coordenada que no es número finito queda fuera del mapa", () => {
    const { conUbicacion, sinUbicacion } = ubicarTaquerias([taqueria(1, Number.NaN, -99.13)]);

    expect(conUbicacion).toEqual([]);
    expect(ids(sinUbicacion)).toEqual([1]);
  });

  it("las 20 taquerías de la semilla tienen ubicación dentro de CDMX", () => {
    // Columnas del CSV: #, nombre, alcaldía, latitud, longitud, ... (ver D11).
    const filas = readFileSync("supabase/seed/datos.csv", "utf8").trim().split(/\r?\n/).slice(1);
    const semilla = filas.map((linea) => {
      const [id, , , latitud, longitud] = linea.split(",");
      return taqueria(Number(id), Number(latitud), Number(longitud));
    });

    const { conUbicacion, sinUbicacion } = ubicarTaquerias(semilla);

    expect(conUbicacion).toHaveLength(20);
    expect(sinUbicacion).toEqual([]);
    // Caja aproximada de CDMX: atrapa latitud y longitud invertidas o con el signo cambiado.
    for (const t of conUbicacion) {
      expect(t.latitud).toBeGreaterThan(19.0);
      expect(t.latitud).toBeLessThan(19.6);
      expect(t.longitud).toBeGreaterThan(-99.4);
      expect(t.longitud).toBeLessThan(-98.9);
    }
  });
});
