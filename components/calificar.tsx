"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Star, X } from "lucide-react";
import { Alerta, Confirmacion } from "@/components/alerta";
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

// foco, botonPrincipal y botonTexto también los usa components/fotos.tsx.
export const foco = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta";
// El rojo salsa se usa poco: el botón principal es uno de sus pocos lugares.
export const botonPrincipal = `inline-flex items-center gap-2 rounded-md bg-salsa px-4 py-2 font-semibold text-white hover:brightness-95 disabled:opacity-60 motion-safe:transition ${foco}`;
// Botón de texto para acciones secundarias, como "Cerrar sesión" o "Borrar" una foto.
export const botonTexto = `self-start rounded-sm text-sm font-semibold text-tinta underline underline-offset-4 disabled:opacity-60 ${foco}`;
// Opción de un grupo de radios: el input queda oculto y la etiqueta se pinta en tinta al elegirla.
const opcion = `flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-linea px-3 font-semibold tabular-nums hover:bg-superficie has-checked:border-tinta has-checked:bg-tinta has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-tinta motion-safe:transition-colors`;

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
  // undefined mientras se lee.
  const [lectura, setLectura] = useState<EstadoConsulta<CalificacionGuardada> | undefined>(undefined);
  const [errorSalida, setErrorSalida] = useState(false);
  const usuarioId = sesion?.user.id;

  useEffect(() => {
    const supabase = crearClienteNavegador();
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva));
    return () => data.subscription.unsubscribe();
  }, []);

  // Con sesión, se lee al abrir el detalle y no al tocar "Calificar": así el formulario sale al instante.
  // Depende del id del usuario y no de la sesión, que cambia de objeto cada vez que se renueva el token.
  useEffect(() => {
    if (!usuarioId) return;
    leerCalificacion(crearClienteNavegador(), taqueriaId).then(setLectura);
  }, [usuarioId, taqueriaId]);

  // scope "local": cierra solo este dispositivo. onAuthStateChange pone la sesión en null aquí y en Fotos.
  async function cerrarSesion() {
    const { error } = await crearClienteNavegador().auth.signOut({ scope: "local" });
    setErrorSalida(error !== null);
    if (!error) setAbierto(false);
  }

  if (sesion === undefined) return null;

  return (
    <section className="flex flex-col gap-4 border-t border-linea pt-6" aria-label="Calificar">
      {sesion && (
        <div className="flex flex-col gap-1">
          <p className="text-tenue">Sesión iniciada como {sesion.user.email}</p>
          <button type="button" onClick={cerrarSesion} className={botonTexto}>
            Cerrar sesión
          </button>
        </div>
      )}
      {errorSalida && <Alerta>No se pudo cerrar la sesión. Intenta de nuevo.</Alerta>}

      {!abierto ? (
        <button type="button" onClick={() => setAbierto(true)} className={`self-start ${botonPrincipal}`}>
          <Star size={18} aria-hidden />
          {/* Con sesión: al cerrarla, lectura conserva el valor anterior. Mientras se lee, "Calificar". */}
          {sesion && lectura?.estado === "ok" ? "Editar calificación" : "Calificar"}
        </button>
      ) : sesion ? (
        <FormularioCalificacion taqueriaId={taqueriaId} lectura={lectura} />
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
      <p role="status" className="text-lg font-semibold">
        Te enviamos un enlace a tu correo. Ábrelo en este mismo navegador para iniciar sesión.
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <label htmlFor="correo" className="font-semibold">
        Para calificar, entra con tu correo
      </label>
      <input
        id="correo"
        type="email"
        required
        autoComplete="email"
        value={correo}
        onChange={(e) => setCorreo(e.target.value)}
        className={`rounded-md border border-linea bg-fondo px-3 py-2 ${foco}`}
      />
      <button type="submit" disabled={envio.estado === "enviando"} className={`self-start ${botonPrincipal}`}>
        {envio.estado === "enviando" ? "Enviando..." : "Enviar enlace"}
      </button>
      {envio.estado === "error" && <Alerta>{envio.mensaje}</Alerta>}
    </form>
  );
}

// Espera la calificación del usuario antes de mostrar el formulario: si existe, se edita.
function FormularioCalificacion({
  taqueriaId,
  lectura,
}: {
  taqueriaId: number;
  lectura: EstadoConsulta<CalificacionGuardada> | undefined;
}) {
  if (lectura === undefined) return <p className="text-tenue">Cargando tu calificación...</p>;

  // Sin formulario: un insert chocaría si la calificación sí existe y no se pudo leer.
  if (lectura.estado === "error") {
    return <Alerta>No se pudo consultar tu calificación. Intenta de nuevo en un momento.</Alerta>;
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
      <div>
        <h3 className="text-xl font-semibold">{id === null ? "Tu calificación" : "Edita tu calificación"}</h3>
        <p className="mt-1 text-tenue">Califica del 1 al 5.</p>
      </div>

      {criterios.map(({ campo, nombre }) => (
        <fieldset key={campo}>
          <legend className="mb-2 font-semibold">{nombre}</legend>
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
        <label htmlFor="precio" className="font-semibold">
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
          className={`w-32 rounded-md border border-linea bg-fondo px-3 py-2 tabular-nums ${foco}`}
        />
      </div>

      <fieldset>
        <legend className="mb-2 font-semibold">¿Hay copia (doble tortilla)?</legend>
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

      {guardado.estado === "guardado" && <Confirmacion>Calificación guardada</Confirmacion>}
      {guardado.estado === "error" && <Alerta>{guardado.mensaje}</Alerta>}
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
  const [cerrado, setCerrado] = useState(false);

  useEffect(() => {
    if (!visible) return;
    // Quita el parámetro para que el aviso no reaparezca al recargar.
    const url = new URL(window.location.href);
    url.searchParams.delete("login");
    window.history.replaceState(null, "", url);
  }, [visible]);

  if (!visible || cerrado) return null;

  return (
    <div className="flex items-start gap-2 border-b border-linea px-4 py-3 lg:px-6">
      <Alerta className="flex-1">El enlace venció o ya se usó. Pide uno nuevo.</Alerta>
      <button
        type="button"
        onClick={() => setCerrado(true)}
        aria-label="Cerrar aviso"
        className={`flex size-11 shrink-0 items-center justify-center rounded-md text-tenue hover:bg-superficie ${foco}`}
      >
        <X size={20} aria-hidden />
      </button>
    </div>
  );
}
