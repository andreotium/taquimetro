"use client";

import "leaflet/dist/leaflet.css";
import { divIcon } from "leaflet";
import { Crown } from "lucide-react";
import { useEffect, useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Taqueria } from "@/components/detalle";
import { IconoTaco } from "@/components/icono-taco";
import { movimientoHacia, ubicarTaquerias, zoomColonia } from "@/lib/mapa";

const centroCdmx: [number, number] = [19.4326, -99.1332];
const margen: [number, number] = [24, 24];

// Leaflet recibe el marcador como texto HTML: los íconos se convierten una sola vez.
// Los estilos (.marcador y sus variantes) están en app/globals.css.
const svgTaco = renderToStaticMarkup(<IconoTaco />);
const svgCorona = renderToStaticMarkup(<Crown aria-hidden />);

// El #1 lleva la corona adentro en lugar del taco.
function crearIcono(elegida: boolean, primero: boolean) {
  const tamano = elegida ? 40 : 30;
  const clases = ["marcador", primero && "marcador-primero", elegida && "marcador-elegido"].filter(Boolean).join(" ");
  return divIcon({
    className: "",
    html: `<span class="${clases}">${primero ? svgCorona : svgTaco}</span>`,
    iconSize: [tamano, tamano],
    tooltipAnchor: [0, -tamano / 2],
  });
}

// Un ícono nuevo en cada render haría que Leaflet rehiciera el marcador: se crean las cuatro variantes una vez.
const iconos = {
  normal: crearIcono(false, false),
  primero: crearIcono(false, true),
  elegida: crearIcono(true, false),
  elegidaPrimero: crearIcono(true, true),
};

function icono(elegida: boolean, primero: boolean) {
  if (elegida) return primero ? iconos.elegidaPrimero : iconos.elegida;
  return primero ? iconos.primero : iconos.normal;
}

function prefiereSinMovimiento() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Al elegir una taquería, el mapa se desliza hasta ella. Si se ve desde lejos, además se acerca
// a nivel colonia; si ya está cerca, conserva el zoom. Con movimiento reducido o con el mapa
// oculto en celular, salta sin animar (ver movimientoHacia en lib/mapa.ts).
function SeguirElegida({ elegida }: { elegida: [number, number] | null }) {
  const map = useMap();
  const lat = elegida?.[0];
  const lng = elegida?.[1];

  useEffect(() => {
    if (lat === undefined || lng === undefined) return;
    const tamano = map.getSize();
    const zoom = Math.max(map.getZoom(), zoomColonia);
    switch (
      movimientoHacia({ ancho: tamano.x, alto: tamano.y, zoom: map.getZoom(), sinMovimiento: prefiereSinMovimiento() })
    ) {
      case "saltar":
        map.setView([lat, lng], zoom, { animate: false });
        break;
      case "volar":
        map.flyTo([lat, lng], zoom, { duration: 0.6 });
        break;
      case "deslizar":
        map.panTo([lat, lng], { duration: 0.5 });
        break;
    }
  }, [map, lat, lng]);

  return null;
}

// En celular el mapa nace oculto (display: none) y Leaflet mide 0 × 0: encuadra mal y queda
// en el zoom máximo. Al cambiar el tamaño del contenedor se le pide que vuelva a medir y,
// si venía de estar oculto, que vuelva a encuadrar las taquerías.
function AjustarTamano({ limites }: { limites: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    const observador = new ResizeObserver(() => {
      const antes = map.getSize();
      map.invalidateSize();
      const estabaOculto = antes.x === 0 || antes.y === 0;
      const ahora = map.getSize();
      if (estabaOculto && ahora.x > 0 && ahora.y > 0 && limites.length > 0) {
        map.fitBounds(limites, { padding: margen, animate: false });
      }
    });
    observador.observe(map.getContainer());
    return () => observador.disconnect();
  }, [map, limites]);

  return null;
}

type Props = {
  taquerias: Taqueria[];
  elegidaId: number | null;
  onElegir: (id: number) => void;
};

// Los marcadores no reciben foco con teclado; el ranking es la vía accesible al mismo detalle.
export function Mapa({ taquerias, elegidaId, onElegir }: Props) {
  // Memorizados: AjustarTamano vuelve a observar el contenedor solo si cambian las taquerías.
  const { conUbicacion, sinUbicacion } = useMemo(() => ubicarTaquerias(taquerias), [taquerias]);
  const limites = useMemo(
    () => conUbicacion.map((t): [number, number] => [t.latitud, t.longitud]),
    [conUbicacion],
  );
  const elegida = conUbicacion.find((t) => t.id === elegidaId);
  // taquerias llega ordenada: la primera es el #1 solo si ya tiene votos.
  const primeroId = taquerias[0]?.puntaje != null ? taquerias[0].id : null;

  return (
    <div className="flex flex-1 flex-col">
      <MapContainer
        {...(limites.length > 0 ? { bounds: limites, boundsOptions: { padding: margen } } : { center: centroCdmx, zoom: 11 })}
        className="isolate min-h-0 flex-1"
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <AjustarTamano limites={limites} />
        <SeguirElegida elegida={elegida ? [elegida.latitud, elegida.longitud] : null} />
        {conUbicacion.map((t) => {
          const esElegida = t.id === elegidaId;
          const esPrimero = t.id === primeroId;
          return (
            <Marker
              key={t.id}
              position={[t.latitud, t.longitud]}
              icon={icono(esElegida, esPrimero)}
              keyboard={false}
              // La elegida se dibuja encima de las demás, y el #1 encima del resto.
              zIndexOffset={esElegida ? 1000 : esPrimero ? 500 : 0}
              eventHandlers={{ click: () => onElegir(t.id) }}
            >
              <Tooltip direction="top">{t.nombre}</Tooltip>
            </Marker>
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
