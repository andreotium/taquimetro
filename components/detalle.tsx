import { Calificar } from "@/components/calificar";
import { Fotos } from "@/components/fotos";
import type { FilaRanking } from "@/lib/ranking";

// Una fila del ranking con todo lo que muestra el detalle.
export type Taqueria = FilaRanking & {
  alcaldia: string | null;
  promSalsa: number | null;
  promTortilla: number | null;
  promCarne: number | null;
  precioPromedio: number | null;
  porcentajeCopia: number | null;
  pocosVotos: boolean;
  // Falso si falta su fila en agregados_taqueria: es "no se encontró", no "sin votos".
  agregadosEncontrados: boolean;
};

const pesos = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function textoVotos(votos: number) {
  return votos === 1 ? "1 voto" : `${votos} votos`;
}

export function EtiquetaPocosVotos() {
  return (
    <span className="rounded-sm bg-aviso-fondo px-1.5 py-0.5 text-xs font-bold text-aviso">
      Pocos votos
    </span>
  );
}

// Medidor horizontal de 1 a 5: la pieza que da nombre al taquímetro.
function Medidor({ nombre, valor }: { nombre: string; valor: number | null }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-bold">{nombre}</span>
        <span className="tabular-nums text-tenue">
          {valor === null ? "Sin datos" : `${valor.toFixed(1)} de 5`}
        </span>
      </div>
      <div className="mt-1.5 h-3 overflow-hidden rounded-sm bg-superficie ring-1 ring-linea" aria-hidden>
        {valor !== null && (
          <div className="h-full bg-maiz" style={{ width: `${(valor / 5) * 100}%` }} />
        )}
      </div>
    </div>
  );
}

export function Detalle({ taqueria, onVolver }: { taqueria: Taqueria; onVolver?: () => void }) {
  const t = taqueria;

  return (
    <article className="flex flex-col gap-8">
      {onVolver && (
        <button
          type="button"
          onClick={onVolver}
          className="self-start rounded-sm font-bold text-talavera underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-talavera lg:hidden"
        >
          Volver al ranking
        </button>
      )}

      <header>
        <h2 className="font-display text-3xl font-bold leading-tight">{t.nombre}</h2>
        {t.alcaldia && <p className="mt-1 text-tenue">{t.alcaldia}</p>}
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
        <div className="flex items-end gap-4">
          <p className="font-display text-7xl font-bold leading-none tabular-nums">
            {t.puntaje.toFixed(2)}
          </p>
          <div className="flex flex-col items-start gap-1 pb-1">
            <span className="text-tenue">puntaje de 5</span>
            <span className="font-bold">{textoVotos(t.votos)}</span>
            {t.pocosVotos && <EtiquetaPocosVotos />}
          </div>
        </div>
      )}

      <section className="flex flex-col gap-5" aria-label="Promedios">
        <Medidor nombre="Salsa" valor={t.promSalsa} />
        <Medidor nombre="Tortilla" valor={t.promTortilla} />
        <Medidor nombre="Carne" valor={t.promCarne} />
      </section>

      <dl className="grid grid-cols-2 gap-4 border-t border-linea pt-6">
        <div>
          <dt className="text-tenue">Precio promedio</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums">
            {t.precioPromedio === null ? "Sin datos" : `${pesos.format(t.precioPromedio)} por taco`}
          </dd>
        </div>
        <div>
          <dt className="text-tenue">Dicen que hay copia</dt>
          <dd className="mt-1 text-xl font-bold tabular-nums">
            {t.porcentajeCopia === null ? "Sin datos" : `${Math.round(t.porcentajeCopia)} %`}
          </dd>
        </div>
      </dl>
    </>
  );
}
