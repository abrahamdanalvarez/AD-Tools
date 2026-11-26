// Format detection from the file's bytes, never its name.

export type ImageFormat = "jpeg" | "png" | "webp" | "gif" | "bmp" | "ico" | "avif" | "svg" | "heic" | "tiff";

const ascii = (b: Uint8Array, at: number, len: number) => String.fromCharCode(...b.subarray(at, at + len));

export function sniff(b: Uint8Array): ImageFormat | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (ascii(b, 1, 3) === "PNG" && b[0] === 0x89) return "png";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp";
  if (ascii(b, 0, 4) === "GIF8") return "gif";
  if (ascii(b, 0, 2) === "BM") return "bmp";
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return "ico";
  if (ascii(b, 0, 4) === "II*\0" || ascii(b, 0, 4) === "MM\0*") return "tiff";
  if (ascii(b, 4, 4) === "ftyp") {
    const brand = ascii(b, 8, 4);
    if (brand === "avif" || brand === "avis") return "avif";
    if (/^(heic|heix|hevc|hevx|mif1|msf1)$/.test(brand)) return "heic";
  }
  // SVG is text: look for an <svg root near the start (after any XML prolog or comments).
  const head = new TextDecoder().decode(b.subarray(0, 1024)).replace(/^﻿/, "");
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s>]/i.test(head)) return "svg";
  return null;
}

export const formatLabel: Record<ImageFormat, string> = {
  jpeg: "JPG",
  png: "PNG",
  webp: "WebP",
  gif: "GIF",
  bmp: "BMP",
  ico: "ICO",
  avif: "AVIF",
  svg: "SVG",
  heic: "HEIC",
  tiff: "TIFF",
};

export const mimeOf: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  svg: "image/svg+xml",
  heic: "image/heic",
  tiff: "image/tiff",
};

/**
 * True for animated GIF, WebP and PNG (APNG). Converting keeps only the first
 * frame, so the tools say so instead of silently dropping the animation.
 */
export function isAnimated(b: Uint8Array, format: ImageFormat | null): boolean {
  if (format === "gif") {
    // Count image descriptors that follow a graphic control extension block.
    let frames = 0;
    // shortcut: a byte scan, not a full GIF parse; could misfire on rare pixel data, upgrade if users report it.
    for (let i = 0; i < b.length - 8 && frames < 2; i++) {
      if (b[i] === 0x21 && b[i + 1] === 0xf9 && b[i + 2] === 0x04 && b[i + 7] === 0x00 && (b[i + 8] === 0x2c || b[i + 8] === 0x21)) frames++;
    }
    return frames > 1;
  }
  if (format === "webp") return ascii(b, 12, 4) === "VP8X" && (b[20] & 0x02) !== 0;
  if (format === "png") {
    for (const chunk of pngChunks(b)) {
      if (chunk.type === "acTL") return true;
      if (chunk.type === "IDAT") return false;
    }
  }
  return false;
}

export interface PngChunk {
  type: string;
  start: number;
  end: number;
}

/** Chunks of a PNG: start/end cover the whole chunk (length, type, data, CRC). */
export function* pngChunks(b: Uint8Array): Generator<PngChunk> {
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let at = 8;
  while (at + 12 <= b.length) {
    const len = view.getUint32(at);
    const end = at + 12 + len;
    if (end > b.length) return;
    yield { type: ascii(b, at + 4, 4), start: at, end };
    at = end;
  }
}
