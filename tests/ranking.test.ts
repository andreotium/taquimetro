import { describe, expect, it } from "vitest";
import { ordenarRanking, type FilaRanking } from "../lib/ranking";

function fila(nombre: string, votos: number, puntaje: number | null): FilaRanking {
  return { id: nombre.length, nombre, votos, puntaje };
}

function nombres(filas: FilaRanking[]) {
  return ordenarRanking(filas).map((f) => f.nombre);
}

describe("ordenarRanking", () => {
  it("1 voto de 5 queda debajo de 80 votos de 4.6", () => {
    // Puntajes con m = 4 y C = 3, como en la base:
    // 1 voto de 5:     (1·5 + 3·4) / (1 + 3)   = 4.25
    // 80 votos de 4.6: (80·4.6 + 3·4) / (80 + 3) ≈ 4.58
    const filas = [fila("Un voto", 1, 4.25), fila("Ochenta", 80, 380 / 83)];

    expect(nombres(filas)).toEqual(["Ochenta", "Un voto"]);
  });

  it("con el mismo puntaje, va primero la de más votos", () => {
    const filas = [fila("Pocos", 4, 4.3), fila("Muchos", 9, 4.3)];

    expect(nombres(filas)).toEqual(["Muchos", "Pocos"]);
  });

  it("con el mismo puntaje y los mismos votos, van por nombre", () => {
    const filas = [fila("Tacos Zeta", 5, 4.1), fila("El Árbol", 5, 4.1), fila("Doña Ñeca", 5, 4.1)];

    expect(nombres(filas)).toEqual(["Doña Ñeca", "El Árbol", "Tacos Zeta"]);
  });

  it("las que no tienen votos van al final y en orden alfabético", () => {
    const filas = [
      fila("Tacos Pepe", 0, null),
      fila("Zeta", 2, 3.9),
      fila("Álvaro", 0, null),
      fila("Bravo", 6, 4.4),
    ];

    expect(nombres(filas)).toEqual(["Bravo", "Zeta", "Álvaro", "Tacos Pepe"]);
  });

  it('marca "pocos votos" con 1 y 2 votos, pero no con 0 ni con 3', () => {
    const filas = [fila("Cero", 0, null), fila("Uno", 1, 4), fila("Dos", 2, 4.1), fila("Tres", 3, 4.2)];

    const marcas = Object.fromEntries(ordenarRanking(filas).map((f) => [f.nombre, f.pocosVotos]));

    expect(marcas).toEqual({ Cero: false, Uno: true, Dos: true, Tres: false });
  });

  it("no modifica el arreglo de entrada", () => {
    const filas = [fila("Bravo", 1, 3.5), fila("Alfa", 9, 4.5)];

    ordenarRanking(filas);

    expect(filas.map((f) => f.nombre)).toEqual(["Bravo", "Alfa"]);
  });
});
