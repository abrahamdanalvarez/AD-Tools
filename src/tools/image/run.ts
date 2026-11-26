import oxipngUrl from "@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm?url";
import { runCancellable, runWorker } from "@/lib/worker-bridge";
import type { JobOptions } from "@/tools/pdf/run";
import { decodeImage } from "./decode";
import { renderImage, type Recipe, type Rendered } from "./render";

const createWorker = () => new Worker(new URL("./image.worker.ts", import.meta.url), { type: "module" });

/**
 * Decode on the page, then draw and encode in a fresh worker (terminated
 * afterwards, which frees its memory). The bitmap is transferred, not copied.
 * Without OffscreenCanvas the same code runs on the page.
 */
export async function runImage(file: Blob, recipe: Recipe, { signal, onProgress }: JobOptions = {}, svgScale = 1): Promise<Rendered> {
  const bitmap = await runCancellable(decodeImage(file, svgScale), signal);
  if (typeof OffscreenCanvas === "undefined") return runCancellable(renderImage(bitmap, recipe, oxipngUrl, onProgress), signal);
  return runWorker(createWorker, { bitmap, recipe, oxipngUrl }, { signal, onProgress, transfer: [bitmap] });
}
