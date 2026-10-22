"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AvisoEnlaceVencido } from "@/components/calificar";
import { Detalle, EtiquetaPocosVotos, textoVotos, type Taqueria } from "@/components/detalle";
import { agruparAvisos } from "@/lib/agrupar";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

type Pestana = "ranking" | "mapa";

const foco = "focus-visible:outline-2 focus-visible:outline-talavera";

export function Encabezado() {
  return (
    <header className="border-b border-linea px-4 py-4 lg:px-6">
      <h1 className="font-display text-2xl font-bold">Taquímetro</h1>
      <p className="text-tenue">Las taquerías de CDMX, ordenadas por quienes comen ahí.</p>
    </header>
  );
}

// Página completa cuando no hay ranking que mostrar: "no hay datos" o "no se pudo consultar".
export function Aviso({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Encabezado />
      <main className="px-4 py-6 lg:px-6">
        <p role="status" className="text-lg">
          {mensaje}
        </p>
      </main>
    </div>
  );
}

// En computadora: ranking, mapa y detalle en tres columnas.
// En celular: pestañas "Ranking" y "Mapa"; el detalle ocupa toda la vista.
export function Taquimetro({ taquerias }: { taquerias: Taqueria[] }) {
  const [elegidaId, setElegidaId] = useState<number | null>(null);
  const [pestana, setPestana] = useState<Pestana>("ranking");
  const elegida = taquerias.find((t) => t.id === elegidaId) ?? null;
  const router = useRouter();

  // Tiempo real (D8): solo agregados_taqueria, nunca calificaciones. Un voto reescribe las
  // 20 filas de agregados, así que los avisos se agrupan y el ranking se pide una sola vez.
  // router.refresh() conserva la taquería elegida: elegidaId es estado de este componente.
  useEffect(() => {
    const supabase = crearClienteNavegador();
    const { avisar, cancelar } = agruparAvisos(() => router.refresh(), 500);
    let conectado = false;

    const canal = supabase
      .channel("agregados")
      .on("postgres_changes", { event: "*", schema: "public", table: "agregados_taqueria" }, avisar)
      .subscribe((estado) => {
        if (estado === "SUBSCRIBED") {
          // Al reconectar se pudieron perder avisos: se pide el ranking otra vez.
          if (conectado) avisar();
          conectado = true;
        } else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT") {
          // Sin tiempo real la página sigue con los últimos datos; supabase-js reintenta solo.
          console.warn("Tiempo real desconectado; el ranking se actualizará al reconectar.");
        }
      });

    return () => {
      cancelar();
      supabase.removeChannel(canal);
    };
  }, [router]);

  // Solo aplica en celular; en computadora las tres columnas siempre se ven.
  const enCelular = elegida
    ? { ranking: "hidden", mapa: "hidden", detalle: "block" }
    : pestana === "ranking"
      ? { ranking: "block", mapa: "hidden", detalle: "hidden" }
      : { ranking: "hidden", mapa: "flex", detalle: "hidden" };

  function elegir(id: number) {
    setElegidaId(id);
    // En celular el detalle reemplaza la lista: se abre desde arriba.
    window.scrollTo({ top: 0 });
  }

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Encabezado />
      <AvisoEnlaceVencido />

      {!elegida && (
        <div role="tablist" className="flex border-b border-linea lg:hidden">
          {(["ranking", "mapa"] as const).map((p) => (
            <button
              key={p}
              id={`pestana-${p}`}
              type="button"
              role="tab"
              aria-selected={pestana === p}
              aria-controls={`panel-${p}`}
              onClick={() => setPestana(p)}
              className={`flex-1 py-3 font-bold ${foco} focus-visible:-outline-offset-2 ${
                pestana === p ? "text-talavera shadow-[inset_0_-3px_0_var(--color-talavera)]" : "text-tenue"
              }`}
            >
              {p === "ranking" ? "Ranking" : "Mapa"}
            </button>
          ))}
        </div>
      )}

      <main className="flex flex-1 flex-col lg:grid lg:min-h-0 lg:grid-cols-[400px_1fr_400px]">
        <section
          id="panel-ranking"
          role="tabpanel"
          aria-labelledby="pestana-ranking"
          className={`${enCelular.ranking} lg:block lg:overflow-y-auto lg:border-r lg:border-linea`}
        >
          <h2 className="hidden px-6 pt-5 pb-2 font-display text-lg font-bold lg:block">Ranking</h2>
          <ol>
            {taquerias.map((t, i) => (
              <li key={t.id} className="border-b border-linea">
                <button
                  type="button"
                  onClick={() => elegir(t.id)}
                  aria-current={t.id === elegidaId ? "true" : undefined}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-superficie lg:px-6 ${foco} focus-visible:-outline-offset-2 ${
                    t.id === elegidaId ? "bg-superficie shadow-[inset_4px_0_0_var(--color-talavera)]" : ""
                  }`}
                >
                  <span className="w-6 shrink-0 pt-0.5 text-right tabular-nums text-tenue">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-semibold leading-snug">{t.nombre}</span>
                    {t.alcaldia && <span className="block text-sm text-tenue">{t.alcaldia}</span>}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {!t.agregadosEncontrados ? (
                      <span className="pt-0.5 text-sm text-tenue">Sin datos</span>
                    ) : t.puntaje === null ? (
                      <span className="pt-0.5 text-sm text-tenue">Sin votos</span>
                    ) : (
                      <>
                        <span className="font-display text-lg font-bold tabular-nums">{t.puntaje.toFixed(2)}</span>
                        <span className="text-sm text-tenue">{textoVotos(t.votos)}</span>
                        {t.pocosVotos && <EtiquetaPocosVotos />}
                      </>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        {/* El mapa llega en la fase 8; por ahora solo se reserva su espacio. */}
        <section
          id="panel-mapa"
          role="tabpanel"
          aria-labelledby="pestana-mapa"
          className={`${enCelular.mapa} min-h-80 flex-1 items-center justify-center bg-superficie p-6 lg:flex`}
        >
          <p className="text-tenue">Aquí irá el mapa de las taquerías.</p>
        </section>

        <section
          aria-label="Detalle"
          className={`${enCelular.detalle} px-4 py-6 lg:block lg:overflow-y-auto lg:border-l lg:border-linea lg:px-8`}
        >
          {/* La key reinicia el detalle (formulario, mensajes y fotos) al cambiar de taquería. */}
          {elegida ? (
            <Detalle key={elegida.id} taqueria={elegida} onVolver={() => setElegidaId(null)} />
          ) : (
            <p className="text-tenue">Elige una taquería del ranking para ver su detalle.</p>
          )}
        </section>
      </main>
    </div>
  );
}
