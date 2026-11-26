import type { JpegEncoder } from "../core/compress";

/**
 * Remove APP1 (EXIF/XMP) segments. PDF viewers ignore EXIF orientation inside
 * PDFs, but browsers apply it when decoding, which would rotate the image.
 */
export function stripApp1(jpeg: Uint8Array): Uint8Array {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return jpeg;
  const keep: Uint8Array[] = [jpeg.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= jpeg.length && jpeg[i] === 0xff) {
    const marker = jpeg[i + 1];
    if (marker === 0xda) break; // start of scan: the rest is image data
    const len = (jpeg[i + 2] << 8) | jpeg[i + 3];
    if (marker !== 0xe1) keep.push(jpeg.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  keep.push(jpeg.subarray(i));
  const out = new Uint8Array(keep.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of keep) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const hasOffscreen = () => typeof OffscreenCanvas !== "undefined";

/** Canvas-based JPEG re-encoder. Works in a worker (OffscreenCanvas) or on the page. */
export const browserJpegEncoder: JpegEncoder = async (jpeg, maxSide, quality) => {
  const bitmap = await createImageBitmap(new Blob([stripApp1(jpeg) as BlobPart], { type: "image/jpeg" }));
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = hasOffscreen() ? new OffscreenCanvas(width, height) : Object.assign(document.createElement("canvas"), { width, height });
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob =
    "convertToBlob" in canvas
      ? await canvas.convertToBlob({ type: "image/jpeg", quality })
      : await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  if (!blob || blob.type !== "image/jpeg") return null;
  return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
};
