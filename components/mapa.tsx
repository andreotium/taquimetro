"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Taqueria } from "@/components/detalle";
import { ubicarTaquerias } from "@/lib/mapa";

// Leaflet pinta los círculos como atributos SVG, que no leen variables CSS:
// son los mismos valores de --color-talavera y --color-fondo de app/globals.css.
const talavera = "#2546a8";
const fondo = "#ffffff";

const centroCdmx: [number, number] = [19.4326, -99.1332];

// En celular el mapa nace oculto (display: none) y Leaflet mide 0 × 0.
// Al cambiar el tamaño del contenedor se le pide que vuelva a medir.
function AjustarTamano() {
  const map = useMap();

  useEffect(() => {
    const observador = new ResizeObserver(() => map.invalidateSize());
    observador.observe(map.getContainer());
    return () => observador.disconnect();
  }, [map]);

  return null;
}

type Props = {
  taquerias: Taqueria[];
  elegidaId: number | null;
  onElegir: (id: number) => void;
};

// Los círculos no reciben foco con teclado; el ranking es la vía accesible al mismo detalle.
export function Mapa({ taquerias, elegidaId, onElegir }: Props) {
  const { conUbicacion, sinUbicacion } = ubicarTaquerias(taquerias);
  // La elegida va al final para que se dibuje encima de las demás.
  const enOrden = [...conUbicacion].sort((a, b) => Number(a.id === elegidaId) - Number(b.id === elegidaId));
  const limites = conUbicacion.map((t): [number, number] => [t.latitud, t.longitud]);

  return (
    <div className="flex flex-1 flex-col">
      <MapContainer
        {...(limites.length > 0 ? { bounds: limites, boundsOptions: { padding: [24, 24] } } : { center: centroCdmx, zoom: 11 })}
        className="isolate min-h-0 flex-1"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <AjustarTamano />
        {enOrden.map((t) => {
          const elegida = t.id === elegidaId;
          return (
            <CircleMarker
              key={t.id}
              center={[t.latitud, t.longitud]}
              radius={elegida ? 11 : 8}
              pathOptions={{
                color: elegida ? fondo : talavera,
                weight: 2,
                fillColor: talavera,
                fillOpacity: elegida ? 1 : 0.6,
              }}
              eventHandlers={{ click: () => onElegir(t.id) }}
            >
              <Tooltip>{t.nombre}</Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {sinUbicacion.length > 0 && (
        <p role="status" className="px-4 py-2 text-sm text-tenue lg:px-6">
          {sinUbicacion.length === 1
            ? "1 taquería sin ubicación no aparece en el mapa."
            : `${sinUbicacion.length} taquerías sin ubicación no aparecen en el mapa.`}
        </p>
      )}
    </div>
  );
}
