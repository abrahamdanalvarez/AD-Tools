// Lossless metadata removal: the image data is copied byte for byte and only
// metadata blocks are dropped, so there is no quality loss.
import { jpegOrientation } from "@/tools/pdf/core/images";
import { pngChunks, sniff } from "./formats";

export interface Stripped {
  bytes: Uint8Array;
  /** Bytes of metadata removed (0 = nothing found, input returned). */
  removed: number;
}

const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

/** A minimal EXIF block holding only the orientation, so photos stay upright. */
function orientationApp1(orientation: number): Uint8Array {
  // "Exif\0\0" + big-endian TIFF header + one IFD entry (0x0112, SHORT, 1).
  const body = [0x45, 0x78, 0x69, 0x66, 0, 0, 0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0];
  const len = body.length + 2;
  return Uint8Array.from([0xff, 0xe1, len >> 8, len & 0xff, ...body]);
}

/** JPEG: drops EXIF/XMP (APP1), APP3–APP13 (IPTC and others), APP15 and comments. Keeps JFIF, the ICC colour profile and Adobe colour info. */
function stripJpeg(b: Uint8Array): Stripped {
  const keep: Uint8Array[] = [b.subarray(0, 2)];
  const orientation = jpegOrientation(b);
  let removed = 0;
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) throw new Error("decode");
    const marker = b[i + 1];
    if (marker === 0xda) break; // start of scan: the rest is image data
    const end = i + 2 + ((b[i + 2] << 8) | b[i + 3]);
    if (end > b.length) throw new Error("decode");
    const drop = marker === 0xe1 || (marker >= 0xe3 && marker <= 0xed) || marker === 0xef || marker === 0xfe;
    if (drop) removed += end - i;
    else keep.push(b.subarray(i, end));
    i = end;
  }
  keep.push(b.subarray(i));
  // After JFIF (APP0) when present, as decoders expect APP0 first.
  if (orientation !== 1) keep.splice(keep[1]?.[1] === 0xe0 ? 2 : 1, 0, orientationApp1(orientation));
  // The minimal orientation block replaces part of what was removed.
  return { bytes: concat(keep), removed: orientation !== 1 ? Math.max(0, removed - 36) : removed };
}

const PNG_META = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

/** PNG: drops text, EXIF and time chunks. Keeps colour (iCCP, sRGB, gAMA, cHRM) and pixel density. */
function stripPng(b: Uint8Array): Stripped {
  const keep: Uint8Array[] = [b.subarray(0, 8)];
  let removed = 0;
  for (const c of pngChunks(b)) {
    if (PNG_META.has(c.type)) removed += c.end - c.start;
    else keep.push(b.subarray(c.start, c.end));
  }
  return { bytes: concat(keep), removed };
}

/** WebP: drops EXIF and XMP chunks and clears their flags. Keeps the ICC profile and animation. */
function stripWebp(b: Uint8Array): Stripped {
  const keep: Uint8Array[] = [];
  let removed = 0;
  const view = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let at = 12;
  while (at + 8 <= b.length) {
    const type = String.fromCharCode(...b.subarray(at, at + 4));
    const size = view.getUint32(at + 4, true);
    const end = Math.min(b.length, at + 8 + size + (size & 1));
    if (type === "EXIF" || type === "XMP ") removed += end - at;
    else keep.push(b.subarray(at, end));
    at = end;
  }
  if (!removed) return { bytes: b, removed: 0 };
  const body = concat(keep);
  if (String.fromCharCode(...body.subarray(0, 4)) === "VP8X") body[8] &= ~0x0c; // EXIF and XMP flags
  const out = concat([b.subarray(0, 12), body]);
  new DataView(out.buffer).setUint32(4, out.length - 8, true);
  return { bytes: out, removed };
}

/** Returns null for formats this can't clean losslessly. */
export function stripMetadata(b: Uint8Array): Stripped | null {
  const format = sniff(b);
  if (format === "jpeg") return stripJpeg(b);
  if (format === "png") return stripPng(b);
  if (format === "webp") return stripWebp(b);
  return null;
}
