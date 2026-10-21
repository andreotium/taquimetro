import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Modo "test": carga .env.test.local. El prefijo vacío trae todas las variables, no solo las VITE_*.
    env: loadEnv("test", process.cwd(), ""),
    // Si un filtro no encuentra pruebas, `npm run test` no falla.
    passWithNoTests: true,
  },
});
