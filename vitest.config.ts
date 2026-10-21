import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Modo "test": carga .env.test.local. El prefijo vacío trae todas las variables, no solo las VITE_*.
    env: loadEnv("test", process.cwd(), ""),
    // Mientras no haya pruebas (tarea 2.1), `npm run test` no debe fallar.
    passWithNoTests: true,
  },
});
