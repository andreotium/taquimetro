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

// Nivel colonia: al elegir desde más lejos, el mapa se acerca hasta aquí.
export const zoomColonia = 15;

export type Movimiento = "saltar" | "volar" | "deslizar";

// Cómo llegar a la taquería elegida: "saltar" sin animar, "volar" acercándose a nivel colonia
// o "deslizar" conservando el zoom. Con el mapa oculto (0 × 0) siempre salta: flyTo divide entre
// el tamaño y con 0 calcula coordenadas NaN, y Leaflet lanza un error.
export function movimientoHacia({
  ancho,
  alto,
  zoom,
  sinMovimiento,
}: {
  ancho: number;
  alto: number;
  zoom: number;
  sinMovimiento: boolean;
}): Movimiento {
  if (sinMovimiento || ancho === 0 || alto === 0) return "saltar";
  return zoom < zoomColonia ? "volar" : "deslizar";
}
