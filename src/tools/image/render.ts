// Draws one decoded image with the requested edits and encodes the result.
// Runs in a worker (OffscreenCanvas) or, without it, on the page.
import { ImageError } from "./core/errors";
import { adjustPixels, blurPixels, type Adjust } from "./core/pixels";
import { fitsLimits, type Size } from "./core/size";

export type OutputType = "image/png" | "image/jpeg" | "image/webp";

export type Position = "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right";

export interface TextLayer {
  style: "watermark" | "meme";
  /** Watermark text, or the meme's top line. */
  text: string;
  /** Meme bottom line. */
  bottom?: string;
  position?: Position | "tile";
  /** Text height as a percentage of the image width. */
  size?: number;
  color?: string;
  /** 0–100 */
  opacity?: number;
}

export interface Recipe {
  /** Source rectangle, in pixels of the decoded (upright) image. */
  crop?: { x: number; y: number; width: number; height: number };
  rotate?: 0 | 90 | 180 | 270;
  flipH?: boolean;
  flipV?: boolean;
  /** Final size, after crop and rotation. */
  resize?: Size;
  adjust?: Adjust;
  /** Blur radius in output pixels. */
  blur?: number;
  /** Pixel block size in output pixels. */
  pixelate?: number;
  text?: TextLayer;
  type: OutputType;
  /** 0–1, for JPEG and WebP. */
  quality: number;
  /** Losslessly shrink PNG output with oxipng. */
  optimizePng?: boolean;
}

export interface Rendered {
  blob: Blob;
  width: number;
  height: number;
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type Ctx2d = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export function makeCanvas(width: number, height: number): AnyCanvas {
  return typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(width, height)
    : Object.assign(document.createElement("canvas"), { width, height });
}

export function context(canvas: AnyCanvas): Ctx2d {
  const ctx = canvas.getContext("2d", { willReadFrequently: false }) as Ctx2d | null;
  if (!ctx) throw new ImageError("encode");
  return ctx;
}

/** Feature check, not `instanceof HTMLCanvasElement`: that global doesn't exist in workers. */
export async function toBlob(canvas: AnyCanvas, type: string, quality?: number): Promise<Blob> {
  const blob =
    "convertToBlob" in canvas
      ? await canvas.convertToBlob({ type, quality })
      : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  if (!blob) throw new ImageError("encode");
  // Browsers silently fall back to PNG for formats they can't encode.
  if (blob.type !== type) throw new ImageError("encode-unsupported");
  return blob;
}

const POS: Record<Position, [number, number]> = {
  "top-left": [0, 0], top: [0.5, 0], "top-right": [1, 0],
  left: [0, 0.5], center: [0.5, 0.5], right: [1, 0.5],
  "bottom-left": [0, 1], bottom: [0.5, 1], "bottom-right": [1, 1],
};

function drawText(ctx: Ctx2d, w: number, h: number, t: TextLayer) {
  ctx.save();
  ctx.textBaseline = "middle";
  if (t.style === "meme") {
    // Classic meme captions: white capitals with a black outline, shrunk to fit the width.
    const lines = [
      { text: t.text, y: 0.1 },
      { text: t.bottom ?? "", y: 0.9 },
    ];
    for (const line of lines) {
      const text = line.text.trim().toUpperCase();
      if (!text) continue;
      let size = Math.round(h * 0.11);
      const font = (s: number) => `900 ${s}px Impact, Haettenschweiler, "Arial Black", "Arial Narrow Bold", sans-serif`;
      ctx.font = font(size);
      const maxW = w * 0.94;
      const measured = ctx.measureText(text).width;
      if (measured > maxW) size = Math.max(8, Math.floor((size * maxW) / measured));
      ctx.font = font(size);
      ctx.textAlign = "center";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(2, size / 8);
      ctx.strokeStyle = "#000000";
      ctx.fillStyle = "#ffffff";
      const y = line.y < 0.5 ? Math.max(size * 0.6, h * line.y) : Math.min(h - size * 0.6, h * line.y);
      ctx.strokeText(text, w / 2, y);
      ctx.fillText(text, w / 2, y);
    }
  } else {
    const size = Math.max(6, Math.round((w * (t.size ?? 5)) / 100));
    ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = t.color ?? "#ffffff";
    ctx.globalAlpha = (t.opacity ?? 50) / 100;
    const margin = size;
    if (t.position === "tile") {
      // Diagonal repeating text across the whole image.
      ctx.textAlign = "center";
      const tw = ctx.measureText(t.text).width + size * 3;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-Math.PI / 6);
      const span = Math.hypot(w, h);
      for (let y = -span / 2; y < span / 2; y += size * 4) {
        for (let x = -span / 2; x < span / 2; x += tw) ctx.fillText(t.text, x, y);
      }
    } else {
      const [fx, fy] = POS[t.position ?? "bottom-right"];
      ctx.textAlign = fx === 0 ? "left" : fx === 1 ? "right" : "center";
      const x = fx === 0 ? margin : fx === 1 ? w - margin : w / 2;
      const y = fy === 0 ? margin : fy === 1 ? h - margin : h / 2;
      // A soft shadow keeps light text readable on light photos.
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = size / 6;
      ctx.fillText(t.text, x, y);
    }
  }
  ctx.restore();
}

export async function renderImage(bitmap: ImageBitmap, r: Recipe, oxipngUrl?: string, onProgress: (p: number) => void = () => {}): Promise<Rendered> {
  try {
    const src = r.crop ?? { x: 0, y: 0, width: bitmap.width, height: bitmap.height };
    if (src.width < 1 || src.height < 1) throw new ImageError("crop-empty");
    const quarter = r.rotate === 90 || r.rotate === 270;
    const upright = quarter ? { width: src.height, height: src.width } : { width: src.width, height: src.height };
    const out = r.resize ?? upright;
    if (!fitsLimits(out)) throw new ImageError("too-large");
    const { width: w, height: h } = out;
    const canvas = makeCanvas(w, h);
    const ctx = context(canvas);
    onProgress(20);
    if (r.type === "image/jpeg") {
      // JPG has no transparency: transparent areas go on white, not black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.imageSmoothingQuality = "high";
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(((r.rotate ?? 0) * Math.PI) / 180);
    ctx.scale(r.flipH ? -1 : 1, r.flipV ? -1 : 1);
    // Drawn size before rotation.
    const dw = quarter ? h : w;
    const dh = quarter ? w : h;
    ctx.drawImage(bitmap, src.x, src.y, src.width, src.height, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
    bitmap.close();
    onProgress(45);

    const adjust = r.adjust;
    const pixelWork = (adjust && (adjust.brightness || adjust.contrast || adjust.saturation || adjust.grayscale)) || (r.blur ?? 0) > 0;
    if (pixelWork) {
      const img = ctx.getImageData(0, 0, w, h);
      if (r.blur) blurPixels(img.data, w, h, r.blur);
      if (adjust) adjustPixels(img.data, adjust);
      ctx.putImageData(img, 0, 0);
    }
    if (r.pixelate && r.pixelate > 1) {
      const sw = Math.max(1, Math.round(w / r.pixelate));
      const sh = Math.max(1, Math.round(h / r.pixelate));
      const small = makeCanvas(sw, sh);
      context(small).drawImage(canvas, 0, 0, sw, sh);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(small, 0, 0, w, h);
      small.width = small.height = 0;
    }
    if (r.text) drawText(ctx, w, h, r.text);
    onProgress(70);

    let blob = await toBlob(canvas, r.type, r.quality);
    canvas.width = canvas.height = 0; // free the pixels now, not at garbage collection
    if (r.type === "image/png" && r.optimizePng && oxipngUrl) {
      const { default: init, optimise } = await import("@jsquash/oxipng/codec/pkg/squoosh_oxipng.js");
      await init(oxipngUrl);
      const smaller = optimise(new Uint8Array(await blob.arrayBuffer()), 2, false, true);
      if (smaller.length < blob.size) blob = new Blob([smaller as BlobPart], { type: "image/png" });
    }
    onProgress(100);
    return { blob, width: w, height: h };
  } catch (err) {
    bitmap.close();
    if (err instanceof ImageError) throw err;
    throw new ImageError("encode");
  }
}
