import type { ComponentType } from "react";
import { ArrowLeft, Banknote, Beef, Flame, Layers, MapPin } from "lucide-react";
import { Calificar, foco } from "@/components/calificar";
import { Fotos } from "@/components/fotos";
import { IconoTortilla } from "@/components/icono-taco";
import type { FilaRanking } from "@/lib/ranking";

// Sirve para los íconos de Lucide y para los propios de components/icono-taco.tsx.
type Icono = ComponentType<{ size?: number; className?: string }>;

// Una fila del ranking con todo lo que muestra el detalle.
export type Taqueria = FilaRanking & {
  alcaldia: string | null;
  latitud: number | null;
  longitud: number | null;
  promSalsa: number | null;
  promTortilla: number | null;
  promCarne: number | null;
  precioPromedio: number | null;
  porcentajeCopia: number | null;
  pocosVotos: boolean;
  // Falso si falta su fila en agregados_taqueria: es "no se encontró", no "sin votos".
  agregadosEncontrados: boolean;
};

// Sin decimales si el precio es entero ($25); con dos si no ($25.50).
function textoPrecio(precio: number) {
  const decimales = Number.isInteger(precio) ? 0 : 2;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(precio);
}

export function textoVotos(votos: number) {
  return votos === 1 ? "1 voto" : `${votos} votos`;
}

// Etiqueta gris y discreta: avisa sin competir con el puntaje.
function EtiquetaPocosVotos() {
  return (
    <span className="rounded-full border border-linea bg-superficie px-2 py-0.5 text-xs font-medium text-tenue">
      Pocos votos
    </span>
  );
}

// Medidor horizontal de 1 a 5: la pieza que da nombre al taquímetro.
function Medidor({ nombre, Icono, valor }: { nombre: string; Icono: Icono; valor: number | null }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold">
          <Icono size={18} className="text-tenue" />
          {nombre}
        </span>
        <span className="tabular-nums text-tenue">
          {valor === null ? "Sin datos" : `${valor.toFixed(1)} de 5`}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-linea" aria-hidden>
        {valor !== null && (
          <div className="h-full rounded-full bg-salsa" style={{ width: `${(valor / 5) * 100}%` }} />
        )}
      </div>
    </div>
  );
}

// Dato compacto: etiqueta chica arriba; abajo, el valor grande y la unidad chica.
function Dato({
  Icono,
  nombre,
  valor,
  unidad,
}: {
  Icono: Icono;
  nombre: string;
  valor: string | null;
  unidad: string;
}) {
  return (
    <div className="rounded-lg bg-superficie px-4 py-3">
      <dt className="flex items-center gap-1.5 text-sm text-tenue">
        <Icono size={16} />
        {nombre}
      </dt>
      <dd className="mt-1 flex flex-col">
        {valor === null ? (
          <span className="text-lg font-semibold">Sin datos</span>
        ) : (
          <>
            <span className="text-3xl font-bold tracking-tight whitespace-nowrap tabular-nums">{valor}</span>
            <span className="text-sm text-tenue">{unidad}</span>
          </>
        )}
      </dd>
    </div>
  );
}

// Tacómetro: medio círculo que se llena en rojo salsa según el puntaje, con el número en medio.
function Tacometro({ puntaje }: { puntaje: number }) {
  const arco = "M 15 100 A 85 85 0 0 1 185 100";
  return (
    <div role="img" aria-label={`Puntaje ${puntaje.toFixed(2)} de 5`} className="relative w-52">
      <svg viewBox="0 0 200 108" className="w-full" aria-hidden>
        <path d={arco} fill="none" strokeWidth={14} strokeLinecap="round" className="stroke-linea" />
        <path
          d={arco}
          fill="none"
          strokeWidth={14}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${(puntaje / 5) * 100} 100`}
          className="stroke-salsa motion-safe:transition-[stroke-dasharray] motion-safe:duration-500"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="text-5xl leading-none font-bold tracking-tight tabular-nums">{puntaje.toFixed(2)}</span>
        <span className="mt-1 text-sm text-tenue">de 5</span>
      </div>
    </div>
  );
}

export function Detalle({ taqueria, onVolver }: { taqueria: Taqueria; onVolver?: () => void }) {
  const t = taqueria;

  return (
    <article className="flex flex-col gap-8 motion-safe:animate-aparecer">
      {onVolver && (
        <button
          type="button"
          onClick={onVolver}
          className={`-ml-1 flex items-center gap-1.5 self-start rounded-md px-1 font-semibold text-tinta lg:hidden ${foco}`}
        >
          <ArrowLeft size={18} aria-hidden />
          Volver al ranking
        </button>
      )}

      <header>
        <h2 className="text-3xl font-bold leading-tight tracking-tight">{t.nombre}</h2>
        {t.alcaldia && (
          <p className="mt-2 flex items-center gap-1.5 text-tenue">
            <MapPin size={18} aria-hidden />
            {t.alcaldia}
          </p>
        )}
      </header>

      <Calificar taqueriaId={t.id} />

      {!t.agregadosEncontrados ? (
        <p role="status" className="text-lg">
          No se encontraron los votos ni los promedios de esta taquería.
        </p>
      ) : (
        <Resumen taqueria={t} />
      )}

      <Fotos taqueriaId={t.id} nombre={t.nombre} />
    </article>
  );
}

function Resumen({ taqueria: t }: { taqueria: Taqueria }) {
  return (
    <>
      {t.puntaje === null ? (
        <p className="text-lg">Sin votos todavía.</p>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Tacometro puntaje={t.puntaje} />
          <p className="flex items-center gap-2">
            <span className="font-semibold">{textoVotos(t.votos)}</span>
            {t.pocosVotos && <EtiquetaPocosVotos />}
          </p>
        </div>
      )}

      <section className="flex flex-col gap-5" aria-label="Promedios">
        <Medidor nombre="Salsa" Icono={Flame} valor={t.promSalsa} />
        <Medidor nombre="Tortilla" Icono={IconoTortilla} valor={t.promTortilla} />
        <Medidor nombre="Carne" Icono={Beef} valor={t.promCarne} />
      </section>

      <dl className="grid grid-cols-2 gap-3">
        <Dato
          Icono={Banknote}
          nombre="Precio"
          valor={t.precioPromedio === null ? null : textoPrecio(t.precioPromedio)}
          unidad="por taco, en promedio"
        />
        {/* Layers: dos capas, doble tortilla. */}
        <Dato
          Icono={Layers}
          nombre="Copia"
          valor={t.porcentajeCopia === null ? null : `${Math.round(t.porcentajeCopia)} %`}
          unidad="dicen que hay"
        />
      </dl>
    </>
  );
}
