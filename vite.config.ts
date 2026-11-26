/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { staticRoutes } from "./scripts/static-routes.ts";

export default defineConfig({
  // Root-absolute asset paths so nested pages (/image-converter/) load the same
  // bundle. The site is served from the domain root (tools.abrahamdan.com).
  base: "/",
  plugins: [react(), tailwindcss(), staticRoutes()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  worker: { format: "es" },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
  },
});
