"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { mensajeErrorEnvio } from "@/lib/auth";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-talavera";
const botonPrincipal = `rounded-sm bg-talavera px-4 py-2 font-bold text-white disabled:opacity-60 ${foco}`;

type Envio =
  | { estado: "inicio" }
  | { estado: "enviando" }
  | { estado: "enviado" }
  | { estado: "error"; mensaje: string };

// "Calificar" en el detalle. Sin sesión, abre el formulario de correo del enlace mágico.
// Con sesión, abre el espacio donde irá el formulario de calificación (tarea 5.2).
export function Calificar() {
  // undefined mientras se lee la sesión; null si no hay.
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const supabase = crearClienteNavegador();
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva));
    return () => data.subscription.unsubscribe();
  }, []);

  if (sesion === undefined) return null;

  return (
    <section className="flex flex-col gap-4 border-t border-linea pt-6" aria-label="Calificar">
      {sesion && <p className="text-tenue">Sesión iniciada como {sesion.user.email}</p>}

      {!abierto ? (
        <button type="button" onClick={() => setAbierto(true)} className={`self-start ${botonPrincipal}`}>
          Calificar
        </button>
      ) : sesion ? (
        <p>El formulario de calificación llega en la siguiente tarea.</p>
      ) : (
        <FormularioCorreo />
      )}
    </section>
  );
}

function FormularioCorreo() {
  const [correo, setCorreo] = useState("");
  const [envio, setEnvio] = useState<Envio>({ estado: "inicio" });

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnvio({ estado: "enviando" });

    const supabase = crearClienteNavegador();
    const { error } = await supabase.auth.signInWithOtp({
      email: correo,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setEnvio(error ? { estado: "error", mensaje: mensajeErrorEnvio(error) } : { estado: "enviado" });
  }

  if (envio.estado === "enviado") {
    return (
      <p role="status" className="text-lg font-bold">
        Te enviamos un enlace a tu correo. Ábrelo en este mismo navegador para iniciar sesión.
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <label htmlFor="correo" className="font-bold">
        Para calificar, entra con tu correo
      </label>
      <input
        id="correo"
        type="email"
        required
        autoComplete="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        className={`rounded-sm border border-linea bg-fondo px-3 py-2 ${foco}`}
      />
      <button type="submit" disabled={envio.estado === "enviando"} className={`self-start ${botonPrincipal}`}>
        {envio.estado === "enviando" ? "Enviando..." : "Enviar enlace"}
      </button>
      {envio.estado === "error" && (
        <p role="alert" className="rounded-sm bg-aviso-fondo px-3 py-2 font-bold text-aviso">
          {envio.mensaje}
        </p>
      )}
    </form>
  );
}

// La URL no avisa cambios que importen aquí: no hay nada a qué suscribirse.
function sinSuscripcion() {
  return () => {};
}

// Se lee una sola vez al cargar, antes de quitar el parámetro de la URL.
let loginFallido: boolean | null = null;

function leerLoginFallido() {
  loginFallido ??= new URLSearchParams(window.location.search).get("login") === "error";
  return loginFallido;
}

// Aviso cuando la ruta de regreso no pudo iniciar la sesión (llega como /?login=error).
// Va bajo el encabezado porque al volver a / no hay taquería elegida ni detalle en pantalla.
export function AvisoEnlaceVencido() {
  // En el servidor no hay URL del navegador: no se muestra hasta leerla en el cliente.
  const visible = useSyncExternalStore(sinSuscripcion, leerLoginFallido, () => false);

  useEffect(() => {
    if (!visible) return;
    // Quita el parámetro para que el aviso no reaparezca al recargar.
    const url = new URL(window.location.href);
    url.searchParams.delete("login");
    window.history.replaceState(null, "", url);
  }, [visible]);

  if (!visible) return null;

  return (
    <p role="alert" className="bg-aviso-fondo px-4 py-3 font-bold text-aviso lg:px-6">
      El enlace venció o ya se usó. Pide uno nuevo.
    </p>
  );
}
