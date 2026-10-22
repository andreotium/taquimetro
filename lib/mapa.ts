type ConCoordenadas = { latitud: number | null; longitud: number | null };

export type Ubicada<T> = T & { latitud: number; longitud: number };

// Separa las taquerías que se pueden poner en el mapa de las que no tienen ubicación.
// Sin coordenadas es "no se encontró", no un error: el mapa lo dice aparte.
export function ubicarTaquerias<T extends ConCoordenadas>(taquerias: T[]) {
  const conUbicacion: Ubicada<T>[] = [];
  const sinUbicacion: T[] = [];

  for (const t of taquerias) {
    if (Number.isFinite(t.latitud) && Number.isFinite(t.longitud)) {
      conUbicacion.push(t as Ubicada<T>);
    } else {
      sinUbicacion.push(t);
    }
  }

  return { conUbicacion, sinUbicacion };
}
