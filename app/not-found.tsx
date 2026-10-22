import Link from "next/link";
import { Encabezado } from "@/components/taquimetro";

// Ruta que no existe. Es "no se encontró", no un error de consulta: por eso no usa Alerta.
// Las clases del enlace van aquí: este archivo corre en el servidor y no puede leer
// constantes de components/calificar.tsx, que es un módulo "use client".
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Encabezado />
      <main className="flex flex-col gap-4 px-4 py-6 lg:px-6">
        <p role="status" className="text-lg">
          No se encontró esta página.
        </p>
        <Link
          href="/"
          className="self-start rounded-sm font-semibold text-tinta underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
        >
          Ir al ranking
        </Link>
      </main>
    </div>
  );
}
