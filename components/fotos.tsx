"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Camera } from "lucide-react";
import { Alerta } from "@/components/alerta";
import { botonPrincipal, foco } from "@/components/calificar";
import type { EstadoConsulta } from "@/lib/consulta";
import { borrarFoto, leerFotos, mensajeErrorFoto, rutaNueva, subirFoto, validarArchivo, type Foto } from "@/lib/fotos";
import { crearClienteNavegador } from "@/lib/supabase/cliente";

type Envio =
  | { estado: "inicio" }
  | { estado: "enviando"; mensaje: string }
  | { estado: "hecho"; mensaje: string }
  | { estado: "error"; mensaje: string };

// Galería del detalle. Cualquiera la ve; con sesión se suben fotos y se borran las propias.
export function Fotos({ taqueriaId, nombre }: { taqueriaId: number; nombre: string }) {
  // undefined mientras se lee la sesión; null si no hay.
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined);
  // undefined mientras se leen las fotos.
  const [lectura, setLectura] = useState<EstadoConsulta<Foto[]> | undefined>(undefined);
  // Al cambiar, vuelve a leer las fotos después de subir o borrar.
  const [version, setVersion] = useState(0);
  const [envio, setEnvio] = useState<Envio>({ estado: "inicio" });

  useEffect(() => {
    const supabase = crearClienteNavegador();
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    leerFotos(crearClienteNavegador(), taqueriaId).then(setLectura);
  }, [taqueriaId, version]);

  async function subir(evento: ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    // Se limpia para que elegir el mismo archivo otra vez vuelva a disparar el cambio.
    evento.target.value = "";
    if (!archivo || !sesion) return;

    const validacion = validarArchivo(archivo);
    if (!validacion.ok) {
      setEnvio({ estado: "error", mensaje: validacion.mensaje });
      return;
    }

    setEnvio({ estado: "enviando", mensaje: "Subiendo..." });
    const ruta = rutaNueva(sesion.user.id, validacion.extension);
    const { error } = await subirFoto(crearClienteNavegador(), taqueriaId, ruta, archivo);
    setEnvio(error ? { estado: "error", mensaje: mensajeErrorFoto(error, "subir") } : { estado: "hecho", mensaje: "Foto subida" });
    setVersion((v) => v + 1);
  }

  async function borrar(foto: Foto) {
    setEnvio({ estado: "enviando", mensaje: "Borrando..." });
    const { error } = await borrarFoto(crearClienteNavegador(), foto);
    setEnvio(error ? { estado: "error", mensaje: mensajeErrorFoto(error, "borrar") } : { estado: "hecho", mensaje: "Foto borrada" });
    setVersion((v) => v + 1);
  }

  const enviando = envio.estado === "enviando";

  return (
    <section className="flex flex-col gap-4 border-t border-linea pt-6" aria-label="Fotos">
      <h3 className="text-xl font-semibold">Fotos</h3>

      {sesion === null && <p className="text-tenue">Para subir fotos, entra con tu correo desde Calificar.</p>}
      {sesion && (
        <div className="flex flex-col gap-2">
          {/* El input queda oculto y la etiqueta hace de botón. */}
          <label
            className={`self-start cursor-pointer has-disabled:cursor-default has-disabled:opacity-60 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-tinta ${botonPrincipal}`}
          >
            <Camera size={18} aria-hidden />
            {enviando ? envio.mensaje : "Subir foto"}
            <input
              type="file"
              accept="image/jpeg,image/png"
              disabled={enviando}
              onChange={subir}
              className="sr-only"
            />
          </label>
          <p className="text-sm text-tenue">JPG o PNG, hasta 5 MB.</p>
        </div>
      )}

      {envio.estado === "hecho" && (
        <p role="status" className="text-lg font-semibold">
          {envio.mensaje}
        </p>
      )}
      {envio.estado === "error" && <Alerta>{envio.mensaje}</Alerta>}

      {lectura === undefined ? (
        <p className="text-tenue">Cargando fotos...</p>
      ) : lectura.estado === "error" ? (
        <Alerta>No se pudieron consultar las fotos. Intenta de nuevo en un momento.</Alerta>
      ) : lectura.estado !== "ok" ? (
        // Una lista sin error nunca llega como null, así que aquí solo queda el caso vacío.
        <p>Todavía no hay fotos de esta taquería.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {lectura.datos.map((foto) => (
            <li key={foto.id} className="flex flex-col gap-1.5">
              {/* next/image pediría registrar el dominio de Supabase en next.config.ts; aquí no aporta. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.url}
                alt={`Foto de tacos en ${nombre}`}
                loading="lazy"
                className="aspect-square w-full rounded-md bg-superficie object-cover ring-1 ring-linea"
              />
              {/* La base vuelve a revisar que sea tuya; esto solo esconde el botón en las ajenas. */}
              {sesion && foto.user_id === sesion.user.id && (
                <button
                  type="button"
                  onClick={() => borrar(foto)}
                  disabled={enviando}
                  className={`self-start rounded-sm text-sm font-semibold text-tinta underline underline-offset-4 disabled:opacity-60 ${foco}`}
                >
                  Borrar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
