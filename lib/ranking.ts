// Una taquería con sus agregados, tal como la necesita el ranking.
export type FilaRanking = {
  id: number;
  nombre: string;
  votos: number;
  // Vacío cuando la taquería no tiene votos.
  puntaje: number | null;
};

// Puntaje de mayor a menor; si empatan, más votos primero; si siguen empatadas, por nombre.
// Sin votos: al final, por nombre. "Pocos votos" es 1 o 2; con 0 se muestra "sin votos".
export function ordenarRanking(filas: FilaRanking[]) {
  return [...filas]
    .sort((a, b) => {
      if (a.puntaje === null || b.puntaje === null) {
        if (a.puntaje !== b.puntaje) return a.puntaje === null ? 1 : -1;
      } else if (a.puntaje !== b.puntaje) {
        return b.puntaje - a.puntaje;
      }
      if (a.votos !== b.votos) return b.votos - a.votos;
      return a.nombre.localeCompare(b.nombre, "es");
    })
    .map((fila) => ({ ...fila, pocosVotos: fila.votos > 0 && fila.votos < 3 }));
}
