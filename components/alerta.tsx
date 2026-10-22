import type { ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";

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

// Aviso de estado ("Foto subida", "Calificación guardada"): caja gris con palomita, para que no parezca título.
export function Confirmacion({ children }: { children: ReactNode }) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 self-start rounded-md bg-superficie px-3 py-2 text-sm font-medium text-tinta ring-1 ring-linea"
    >
      <CircleCheck size={18} className="shrink-0 text-tenue" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
