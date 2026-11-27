/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { requireModels } from "./scripts/models/require-models.ts";
import { staticRoutes } from "./scripts/static-routes.ts";
import { qpdfNodeStubs, vendorAssets } from "./scripts/vendor-assets.ts";

export default defineConfig({
  // Root-absolute asset paths so nested pages (/image-converter/) load the same
  // bundle. The site is served from the domain root (tools.abrahamdan.com).
  base: "/",
  plugins: [qpdfNodeStubs(), react(), tailwindcss(), staticRoutes(), vendorAssets(), requireModels()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  worker: { format: "es", plugins: () => [qpdfNodeStubs()] },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    // pdf.js (~500 kB) loads only on PDF tool pages, never on the homepage.
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
  },
});
