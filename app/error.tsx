"use client";

import { RotateCw } from "lucide-react";
import { Alerta } from "@/components/alerta";
import { botonPrincipal } from "@/components/calificar";
import { Encabezado } from "@/components/taquimetro";

// Error inesperado al mostrar la página. En Next 16.4 recibe retry(): vuelve a pedir y a pintar la página.
export default function Error({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Encabezado />
      <main className="flex flex-col gap-4 px-4 py-6 lg:px-6">
        <Alerta className="text-lg">No se pudo cargar la página. Intenta de nuevo en un momento.</Alerta>
        <button type="button" onClick={() => retry()} className={`self-start ${botonPrincipal}`}>
          <RotateCw size={18} aria-hidden />
          Intentar de nuevo
        </button>
      </main>
    </div>
  );
}
