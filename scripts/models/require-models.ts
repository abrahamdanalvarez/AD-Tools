// Vite build plugin: stops the build when the self-hosted AI model is missing,
// so dist/ never ships a background remover without its model.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { birefnet, modelFile } from "../../src/tools/ai/model.ts";

export function requireModels(): Plugin {
  return {
    name: "privora-require-models",
    apply: "build",
    configResolved(config) {
      const file = resolve(config.publicDir, "models", modelFile(birefnet));
      if (!existsSync(file)) throw new Error(`The AI model is missing (public/models/${modelFile(birefnet)}). Run: npm run fetch-models`);
    },
  };
}
