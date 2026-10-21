import { afterAll, describe, expect, it } from "vitest";
import { borrarUsuario, crearUsuario, sesionComo, sinSesion, type UsuarioDePrueba } from "./ayudantes";

// Usuarios que siguen vivos; si la prueba falla a la mitad, afterAll los borra.
const vivos: UsuarioDePrueba[] = [];

afterAll(async () => {
  await Promise.all(vivos.map(borrarUsuario));
});

describe("ayudantes de prueba", () => {
  it("crea a A, B y C, abre sus sesiones y los borra", async () => {
    const usuarios = await Promise.all((["A", "B", "C"] as const).map(crearUsuario));
    vivos.push(...usuarios);

    for (const usuario of usuarios) {
      const cliente = await sesionComo(usuario);
      const { data } = await cliente.auth.getUser();
      expect(data.user?.id).toBe(usuario.id);
    }

    const { data: anonimo } = await sinSesion().auth.getSession();
    expect(anonimo.session).toBeNull();

    for (const usuario of vivos.splice(0)) {
      await borrarUsuario(usuario);
      // Ya borrado, no puede abrir sesión.
      await expect(sesionComo(usuario)).rejects.toThrow();
    }
  });
});
