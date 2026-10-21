import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agruparAvisos } from "../lib/agrupar";

describe("agruparAvisos", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("20 avisos seguidos (un voto) corren la acción una sola vez", () => {
    const accion = vi.fn();
    const { avisar } = agruparAvisos(accion, 500);

    for (let i = 0; i < 20; i++) avisar();
    expect(accion).toHaveBeenCalledTimes(0);

    vi.advanceTimersByTime(500);
    expect(accion).toHaveBeenCalledTimes(1);
  });

  it("un aviso después de que ya corrió abre otra ventana", () => {
    const accion = vi.fn();
    const { avisar } = agruparAvisos(accion, 500);

    avisar();
    vi.advanceTimersByTime(500);
    avisar();
    vi.advanceTimersByTime(500);

    expect(accion).toHaveBeenCalledTimes(2);
  });

  it("cancelar antes de tiempo evita que la acción corra", () => {
    const accion = vi.fn();
    const { avisar, cancelar } = agruparAvisos(accion, 500);

    avisar();
    cancelar();
    vi.advanceTimersByTime(500);

    expect(accion).toHaveBeenCalledTimes(0);
  });
});
