import { Suspense } from "react";
import { ordenarRanking } from "@/lib/ranking";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Lee las cookies, así que con cacheComponents debe ir dentro de <Suspense>.
async function Ranking() {
  const supabase = await crearClienteServidor();
  const [taquerias, agregados] = await Promise.all([
    supabase.from("taquerias").select("id, nombre"),
    supabase.from("agregados_taqueria").select("taqueria_id, votos, puntaje_bayesiano"),
  ]);

  // Los tres mensajes de error completos llegan en la tarea 4.4.
  if (taquerias.error || agregados.error) return <p>No se pudo consultar el ranking.</p>;

  const agregadoPorId = new Map(agregados.data.map((a) => [a.taqueria_id, a]));
  const filas = ordenarRanking(
    taquerias.data.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      votos: agregadoPorId.get(t.id)?.votos ?? 0,
      puntaje: agregadoPorId.get(t.id)?.puntaje_bayesiano ?? null,
    })),
  );

  return (
    <ol>
      {filas.map((f) => (
        <li key={f.id}>
          {f.nombre}: {f.puntaje === null ? "sin votos" : `${f.puntaje.toFixed(2)} (${f.votos} votos)`}
          {f.pocosVotos && " · pocos votos"}
        </li>
      ))}
    </ol>
  );
}

export default function Home() {
  return (
    <main>
      <h1>Taquímetro</h1>
      <Suspense fallback={<p>Cargando...</p>}>
        <Ranking />
      </Suspense>
    </main>
  );
}
