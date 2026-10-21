import { describe, expect, it } from "vitest";
import { destinoRegreso, mensajeErrorEnvio } from "../lib/auth";

const origen = "http://localhost:3000";

describe("destinoRegreso", () => {
  it("con código, lleva a / del mismo sitio", () => {
    const destino = destinoRegreso(`${origen}/auth/callback?code=abc`);

    expect(destino.href).toBe(`${origen}/`);
  });

  it("ignora next con otro sitio", () => {
    const destino = destinoRegreso(`${origen}/auth/callback?code=abc&next=https://ejemplo.com`);

    expect(destino.href).toBe(`${origen}/`);
  });

  it("ignora next que empieza con //", () => {
    const destino = destinoRegreso(`${origen}/auth/callback?code=abc&next=//ejemplo.com`);

    expect(destino.href).toBe(`${origen}/`);
  });

  it("ignora next con una ruta del mismo sitio", () => {
    const destino = destinoRegreso(`${origen}/auth/callback?code=abc&next=/otra`);

    expect(destino.href).toBe(`${origen}/`);
  });

  it("conserva el origen de producción", () => {
    const destino = destinoRegreso("https://taquimetro.vercel.app/auth/callback?code=abc");

    expect(destino.href).toBe("https://taquimetro.vercel.app/");
  });

  it("si falló, lleva a /?login=error del mismo sitio", () => {
    const destino = destinoRegreso(`${origen}/auth/callback?code=abc`, true);

    expect(destino.href).toBe(`${origen}/?login=error`);
  });

  it("si falló, también ignora next y solo deja login", () => {
    const destino = destinoRegreso(`${origen}/auth/callback?code=abc&next=https://ejemplo.com`, true);

    expect(destino.origin).toBe(origen);
    expect(destino.pathname).toBe("/");
    expect([...destino.searchParams.keys()]).toEqual(["login"]);
  });
});

describe("mensajeErrorEnvio", () => {
  const limite = "Ya se enviaron varios enlaces. Espera unos minutos e intenta de nuevo.";
  const generico = "No se pudo enviar el enlace. Intenta de nuevo en un momento.";

  it("con el código de límite de correos, pide esperar", () => {
    expect(mensajeErrorEnvio({ code: "over_email_send_rate_limit", status: 429 })).toBe(limite);
  });

  it("con estado 429 sin código, pide esperar", () => {
    expect(mensajeErrorEnvio({ status: 429 })).toBe(limite);
  });

  it("con cualquier otro error, da el mensaje general", () => {
    expect(mensajeErrorEnvio({ code: "unexpected_failure", status: 500 })).toBe(generico);
  });

  it("sin código ni estado (falla de red), da el mensaje general", () => {
    expect(mensajeErrorEnvio({})).toBe(generico);
  });
});
