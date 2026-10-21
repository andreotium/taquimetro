// Junta los avisos que llegan casi al mismo tiempo para correr la acción una sola vez.
// El primer aviso abre una ventana de `espera` ms; los que llegan dentro de ella no hacen nada.
// La ventana es fija (no se reinicia con cada aviso), así la acción corre aunque sigan llegando.
export function agruparAvisos(accion: () => void, espera: number) {
  let pendiente: ReturnType<typeof setTimeout> | null = null;

  return {
    avisar() {
      if (pendiente !== null) return;
      pendiente = setTimeout(() => {
        pendiente = null;
        accion();
      }, espera);
    },
    cancelar() {
      if (pendiente !== null) clearTimeout(pendiente);
      pendiente = null;
    },
  };
}
