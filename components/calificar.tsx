"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { mensajeErrorEnvio } from "@/lib/auth";
import {
  guardarCalificacion,
  leerCalificacion,
  mensajeErrorGuardado,
  validarCalificacion,
  type Borrador,
  type CalificacionGuardada,
} from "@/lib/calificacion";
import type { EstadoConsulta } from "@/lib/consulta";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-talavera";
const botonPrincipal = `rounded-sm bg-talavera px-4 py-2 font-bold text-white disabled:opacity-60 ${foco}`;
// Opción de un grupo de radios: el input queda oculto y la etiqueta se pinta al elegirla.
const opcion = `flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-sm border border-linea px-3 font-bold tabular-nums has-checked:border-talavera has-checked:bg-talavera has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-talavera`;
const alerta = "rounded-sm bg-aviso-fondo px-3 py-2 font-bold text-aviso";

type Envio =
  | { estado: "inicio" }
  | { estado: "enviando" }
  | { estado: "enviado" }
  | { estado: "error"; mensaje: string };

// "Calificar" en el detalle. Sin sesión, abre el formulario de correo del enlace mágico.
// Con sesión, abre el formulario de calificación de esa taquería.
export function Calificar({ taqueriaId }: { taqueriaId: number }) {
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
        <FormularioCalificacion taqueriaId={taqueriaId} />
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
        <p role="alert" className={alerta}>
          {envio.mensaje}
        </p>
      )}
    </form>
  );
}

// Lee la calificación del usuario antes de mostrar el formulario: si existe, se edita.
function FormularioCalificacion({ taqueriaId }: { taqueriaId: number }) {
  // undefined mientras se lee.
  const [lectura, setLectura] = useState<EstadoConsulta<CalificacionGuardada> | undefined>(undefined);

  useEffect(() => {
    leerCalificacion(crearClienteNavegador(), taqueriaId).then(setLectura);
  }, [taqueriaId]);

  if (lectura === undefined) return <p className="text-tenue">Cargando tu calificación...</p>;

  // Sin formulario: un insert chocaría si la calificación sí existe y no se pudo leer.
  if (lectura.estado === "error") {
    return (
      <p role="alert" className={alerta}>
        No se pudo consultar tu calificación. Intenta de nuevo en un momento.
      </p>
    );
  }

  return <CamposCalificacion taqueriaId={taqueriaId} previa={lectura.estado === "ok" ? lectura.datos : null} />;
}

type Guardado =
  | { estado: "inicio" }
  | { estado: "guardando" }
  | { estado: "guardado" }
  | { estado: "error"; mensaje: string };

const criterios = [
  { campo: "salsa", nombre: "Salsa" },
  { campo: "tortilla", nombre: "Tortilla" },
  { campo: "carne", nombre: "Carne" },
] as const;

function CamposCalificacion({ taqueriaId, previa }: { taqueriaId: number; previa: CalificacionGuardada | null }) {
  const router = useRouter();
  // Después del primer insert ya hay fila: el siguiente guardado es un update.
  const [id, setId] = useState(previa?.id ?? null);
  const [borrador, setBorrador] = useState<Borrador>(
    previa
      ? {
          salsa: previa.salsa,
          tortilla: previa.tortilla,
          carne: previa.carne,
          precio: String(previa.precio),
          copia: previa.copia,
        }
      : { salsa: null, tortilla: null, carne: null, precio: "", copia: null },
  );
  const [guardado, setGuardado] = useState<Guardado>({ estado: "inicio" });

  // Al cambiar algo, el mensaje anterior ya no describe lo que hay en pantalla.
  function cambiar(parcial: Partial<Borrador>) {
    setBorrador((actual) => ({ ...actual, ...parcial }));
    if (guardado.estado !== "guardando") setGuardado({ estado: "inicio" });
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const validacion = validarCalificacion(borrador);
    if (!validacion.ok) {
      setGuardado({ estado: "error", mensaje: validacion.mensaje });
      return;
    }

    setGuardado({ estado: "guardando" });
    const resultado = await guardarCalificacion(crearClienteNavegador(), taqueriaId, id, validacion.datos);
    if (resultado.error) {
      setGuardado({ estado: "error", mensaje: mensajeErrorGuardado(resultado.error) });
      return;
    }

    setId(resultado.id);
    setGuardado({ estado: "guardado" });
    // Vuelve a pedir el ranking al servidor; la taquería elegida y este mensaje se conservan.
    router.refresh();
  }

  return (
    // noValidate: los mensajes salen de validarCalificacion y no del navegador.
    <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
      <h3 className="font-display text-xl font-bold">{id === null ? "Tu calificación" : "Edita tu calificación"}</h3>

      {criterios.map(({ campo, nombre }) => (
        <fieldset key={campo}>
          <legend className="mb-2 font-bold">{nombre}, del 1 al 5</legend>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className={opcion}>
                <input
                  type="radio"
                  name={campo}
                  value={n}
                  checked={borrador[campo] === n}
                  onChange={() => cambiar({ [campo]: n })}
                  className="sr-only"
                />
                {n}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-col gap-2">
        <label htmlFor="precio" className="font-bold">
          Precio por taco, de 5 a 150 pesos
        </label>
        <input
          id="precio"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={5}
          max={150}
          value={borrador.precio}
          onChange={(e) => cambiar({ precio: e.target.value })}
          className={`w-32 rounded-sm border border-linea bg-fondo px-3 py-2 tabular-nums ${foco}`}
        />
      </div>

      <fieldset>
        <legend className="mb-2 font-bold">¿Hay copia (doble tortilla)?</legend>
        <div className="flex gap-2">
          {([true, false] as const).map((valor) => (
            <label key={String(valor)} className={opcion}>
              <input
                type="radio"
                name="copia"
                checked={borrador.copia === valor}
                onChange={() => cambiar({ copia: valor })}
                className="sr-only"
              />
              {valor ? "Sí" : "No"}
            </label>
          ))}
        </div>
      </fieldset>

      <button type="submit" disabled={guardado.estado === "guardando"} className={`self-start ${botonPrincipal}`}>
        {guardado.estado === "guardando" ? "Guardando..." : "Guardar calificación"}
      </button>

      {guardado.estado === "guardado" && (
        <p role="status" className="text-lg font-bold">
          Calificación guardada
        </p>
      )}
      {guardado.estado === "error" && (
        <p role="alert" className={alerta}>
          {guardado.mensaje}
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
