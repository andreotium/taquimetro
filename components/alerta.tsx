import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";

// Error visible: ícono, fondo rosado y texto oscuro, para no confundirse con el rojo salsa.
export function Alerta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p
      role="alert"
      className={`flex items-start gap-2 rounded-md border border-error-borde bg-error-fondo px-3 py-2 font-medium text-error ${className}`}
    >
      <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
