import type { ConvertResult, OutputType } from "./types";

/** True where canvas work can run inside a Web Worker. */
export const offscreenSupported = () => typeof OffscreenCanvas !== "undefined";

/**
 * Decode and re-encode one image. Runs in a worker (OffscreenCanvas) or, in
 * browsers without OffscreenCanvas, on the page with a regular canvas.
 * Throws Error("decode" | "encode" | "encode-unsupported").
 */
export async function convertImage(
  file: Blob,
  type: OutputType,
  quality: number,
  onProgress: (percent: number) => void = () => {},
): Promise<ConvertResult> {
  onProgress(10);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("decode");
  }
  const { width, height } = bitmap;
  let blob: Blob | null;
  try {
    onProgress(50);
    const canvas = offscreenSupported()
      ? new OffscreenCanvas(width, height)
      : Object.assign(document.createElement("canvas"), { width, height });
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
    if (!ctx) throw new Error("no-context");
    if (type === "image/jpeg") {
      // JPG has no transparency: put transparent pixels on white, not black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    onProgress(75);
    // Feature check, not `instanceof HTMLCanvasElement`: that global doesn't exist in workers.
    blob =
      "convertToBlob" in canvas
        ? await canvas.convertToBlob({ type, quality })
        : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  } catch {
    throw new Error("encode");
  }
  // Browsers silently fall back to PNG for formats they cannot encode.
  if (!blob) throw new Error("encode");
  if (blob.type !== type) throw new Error("encode-unsupported");
  onProgress(100);
  return { blob, width, height };
}
