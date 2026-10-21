import { Suspense } from "react";
import { Aviso, Taquimetro } from "@/components/taquimetro";
import { estadoConsulta } from "@/lib/consulta";
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

  const estadoTaquerias = estadoConsulta(taquerias);
  const estadoAgregados = estadoConsulta(agregados);

  if (estadoTaquerias.estado === "error" || estadoAgregados.estado === "error") {
    return <Aviso mensaje="No se pudo consultar el ranking. Intenta de nuevo en un momento." />;
  }
  // Una lista sin error nunca llega como null, así que aquí solo queda el caso vacío.
  if (estadoTaquerias.estado !== "ok") {
    return <Aviso mensaje="No hay datos: todavía no hay taquerías en el ranking." />;
  }

  // Sin filas de agregados, cada taquería queda como "no se encontró" en su detalle.
  const listaAgregados = estadoAgregados.estado === "ok" ? estadoAgregados.datos : [];
  const agregadoPorId = new Map(listaAgregados.map((a) => [a.taqueria_id, a]));
  const filas = ordenarRanking(
    estadoTaquerias.datos.map((t) => {
      const a = agregadoPorId.get(t.id);
      return {
        id: t.id,
        nombre: t.nombre,
        alcaldia: t.alcaldia,
        agregadosEncontrados: a !== undefined,
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
