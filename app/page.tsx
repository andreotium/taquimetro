import { Suspense } from "react";
import { Taquimetro } from "@/components/taquimetro";
import { ordenarRanking } from "@/lib/ranking";
import { crearClienteServidor } from "@/lib/supabase/servidor";

// Lee las cookies, así que con cacheComponents debe ir dentro de <Suspense>.
async function Ranking() {
  const supabase = await crearClienteServidor();
  const [taquerias, agregados] = await Promise.all([
    supabase.from("taquerias").select("id, nombre, alcaldia"),
    supabase
      .from("agregados_taqueria")
      .select(
        "taqueria_id, votos, puntaje_bayesiano, prom_salsa, prom_tortilla, prom_carne, precio_promedio, porcentaje_copia",
      ),
  ]);

  // Los tres mensajes de error completos llegan en la tarea 4.4.
  if (taquerias.error || agregados.error) return <p className="p-6">No se pudo consultar el ranking.</p>;

  const agregadoPorId = new Map(agregados.data.map((a) => [a.taqueria_id, a]));
  const filas = ordenarRanking(
    taquerias.data.map((t) => {
      const a = agregadoPorId.get(t.id);
      return {
        id: t.id,
        nombre: t.nombre,
        alcaldia: t.alcaldia,
        votos: a?.votos ?? 0,
        puntaje: a?.puntaje_bayesiano ?? null,
        promSalsa: a?.prom_salsa ?? null,
        promTortilla: a?.prom_tortilla ?? null,
        promCarne: a?.prom_carne ?? null,
        precioPromedio: a?.precio_promedio ?? null,
        porcentajeCopia: a?.porcentaje_copia ?? null,
      };
    }),
  );

  return <Taquimetro taquerias={filas} />;
}

export default function Home() {
  return (
    <Suspense fallback={<p className="p-6 text-tenue">Cargando el ranking...</p>}>
      <Ranking />
    </Suspense>
  );
}
