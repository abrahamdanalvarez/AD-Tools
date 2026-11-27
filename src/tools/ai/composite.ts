// Builds the final image from the original and the model's mask, on the page.
import { context, makeCanvas, toBlob, type OutputType } from "@/tools/image/render";
import type { Mask } from "./segment";

export type Background = { kind: "transparent" } | { kind: "colour"; colour: string } | { kind: "image"; image: ImageBitmap };

/** The mask as a canvas: white where the subject is, alpha from the model. */
function maskCanvas({ alpha, size }: Mask) {
  const canvas = makeCanvas(size, size);
  const ctx = context(canvas);
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < alpha.length; i++) {
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255;
    img.data[i * 4 + 3] = alpha[i];
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Draws `image` to cover a w×h area, centred and cropped (like CSS `object-fit: cover`). */
function drawCover(ctx: ReturnType<typeof context>, image: ImageBitmap, w: number, h: number) {
  const scale = Math.max(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/**
 * The subject on the chosen background, at the original size. With `maskOnly`,
 * a black-and-white mask instead (white = subject).
 */
export async function composite(bitmap: ImageBitmap, mask: Mask, bg: Background, type: OutputType, quality: number, maskOnly = false): Promise<Blob> {
  const { width: w, height: h } = bitmap;
  const m = maskCanvas(mask);
  const out = makeCanvas(w, h);
  const ctx = context(out);
  ctx.imageSmoothingQuality = "high";
  try {
    if (maskOnly) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(m, 0, 0, w, h);
    } else {
      // Subject: the original, kept only where the mask is opaque.
      const fg = makeCanvas(w, h);
      const fctx = context(fg);
      fctx.imageSmoothingQuality = "high";
      fctx.drawImage(bitmap, 0, 0);
      fctx.globalCompositeOperation = "destination-in";
      fctx.drawImage(m, 0, 0, w, h);
      if (bg.kind === "image") drawCover(ctx, bg.image, w, h);
      else if (bg.kind === "colour" || type === "image/jpeg") {
        // JPG has no transparency, so a transparent background becomes white.
        ctx.fillStyle = bg.kind === "colour" ? bg.colour : "#ffffff";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(fg, 0, 0);
      fg.width = fg.height = 0;
    }
    return await toBlob(out, type, quality);
  } finally {
    // Free the pixels now, not at garbage collection.
    out.width = out.height = m.width = m.height = 0;
  }
}
