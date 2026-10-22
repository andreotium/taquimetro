"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Crown, Star } from "lucide-react";
import { Alerta } from "@/components/alerta";
import { AvisoEnlaceVencido, foco } from "@/components/calificar";
import { Detalle, textoVotos, type Taqueria } from "@/components/detalle";
import { IconoTaco } from "@/components/icono-taco";
import { agruparAvisos } from "@/lib/agrupar";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

type Pestana = "ranking" | "mapa";

// Leaflet usa window al cargarse: el mapa se importa solo en el navegador, sin prerender.
const Mapa = dynamic(() => import("@/components/mapa").then((m) => m.Mapa), {
  ssr: false,
  loading: () => <p className="m-auto text-tenue">Cargando el mapa...</p>,
});

// Sin resumen (cuando no hay ranking) el encabezado muestra solo el logo.
export function Encabezado({ resumen }: { resumen?: { taquerias: number; votos: number } }) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-linea px-4 py-3 lg:px-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-salsa text-white">
          <IconoTaco size={24} />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Taquímetro</h1>
          <p className="hidden text-sm text-tenue lg:block">Las taquerías de CDMX, ordenadas por quienes comen ahí.</p>
        </div>
      </div>
      {resumen && (
        <p className="text-right text-sm text-tenue tabular-nums">
          {resumen.taquerias === 1 ? "1 taquería" : `${resumen.taquerias} taquerías`} · {textoVotos(resumen.votos)}
        </p>
      )}
    </header>
  );
}

// Página completa cuando no hay ranking que mostrar: "no hay datos" (neutral) o "no se pudo consultar" (error).
export function Aviso({ mensaje, error = false }: { mensaje: string; error?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Encabezado />
      <main className="px-4 py-6 lg:px-6">
        {error ? (
          <Alerta className="text-lg">{mensaje}</Alerta>
        ) : (
          <p role="status" className="text-lg">
            {mensaje}
          </p>
        )}
      </main>
    </div>
  );
}

// #1 con corona dorada; #2 y #3 con el número en un círculo; los demás, solo el número.
// Sin votos no hay podio: el orden es alfabético y solo se muestra el número.
function Lugar({ lugar, conVotos }: { lugar: number; conVotos: boolean }) {
  if (lugar === 1 && conVotos) {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center text-dorado">
        <Crown size={22} className="fill-dorado/20" aria-label="Primer lugar" />
      </span>
    );
  }
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm tabular-nums ${
        lugar <= 3 && conVotos ? "border border-tenue/50 font-semibold text-tinta" : "text-tenue"
      }`}
    >
      {lugar}
    </span>
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
    // En computadora, si se eligió desde el mapa, la lista baja hasta la fila. Si ya se ve, no se mueve;
    // en celular la lista está oculta y no hace nada.
    document.getElementById(`fila-${id}`)?.scrollIntoView({ block: "nearest" });
  }

  const resumen = { taquerias: taquerias.length, votos: taquerias.reduce((suma, t) => suma + t.votos, 0) };

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <Encabezado resumen={resumen} />
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
              className={`flex-1 py-3 font-semibold ${foco} focus-visible:-outline-offset-2 ${
                pestana === p ? "text-tinta shadow-[inset_0_-2px_0_var(--color-tinta)]" : "text-tenue"
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
          <h2 className="hidden px-6 pt-5 pb-2 text-sm font-semibold tracking-wide text-tenue uppercase lg:block">
            Ranking
          </h2>
          <ol>
            {taquerias.map((t, i) => (
              <li key={t.id} id={`fila-${t.id}`} className="border-b border-linea">
                <button
                  type="button"
                  onClick={() => elegir(t.id)}
                  aria-current={t.id === elegidaId ? "true" : undefined}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left lg:px-6 ${foco} focus-visible:-outline-offset-2 motion-safe:transition-colors ${
                    t.id === elegidaId
                      ? "bg-salsa-suave shadow-[inset_3px_0_0_var(--color-salsa)]"
                      : "hover:bg-superficie"
                  }`}
                >
                  <Lugar lugar={i + 1} conVotos={t.puntaje !== null} />
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="block font-semibold leading-snug">{t.nombre}</span>
                    {t.alcaldia && <span className="block text-sm text-tenue">{t.alcaldia}</span>}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {!t.agregadosEncontrados ? (
                      <span className="pt-1 text-sm text-tenue">Sin datos</span>
                    ) : t.puntaje === null ? (
                      <span className="pt-1 text-sm text-tenue">Sin votos</span>
                    ) : (
                      <>
                        <span className="flex items-center gap-1 rounded-full bg-superficie px-2.5 py-0.5 font-semibold tabular-nums ring-1 ring-linea">
                          <Star size={14} className="fill-tinta" aria-hidden />
                          {t.puntaje.toFixed(2)}
                        </span>
                        <span className="text-sm whitespace-nowrap text-tenue">
                          {textoVotos(t.votos)}
                          {t.pocosVotos && " · pocos votos"}
                        </span>
                      </>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="panel-mapa"
          role="tabpanel"
          aria-labelledby="pestana-mapa"
          className={`${enCelular.mapa} min-h-[60dvh] flex-1 flex-col bg-superficie lg:flex lg:min-h-0`}
        >
          <Mapa taquerias={taquerias} elegidaId={elegidaId} onElegir={elegir} />
        </section>

        {/* relative: los inputs sr-only (absolute) quedan dentro de esta columna y no estiran la página. */}
        <section
          aria-label="Detalle"
          className={`${enCelular.detalle} relative px-4 py-6 lg:block lg:overflow-y-auto lg:border-l lg:border-linea lg:px-8`}
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
