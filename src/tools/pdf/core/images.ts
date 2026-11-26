import { degrees, PDFDocument, type PDFImage } from "pdf-lib";
import { PdfError } from "./errors";
import { savePdf } from "./load";

export interface PdfImageInput {
  bytes: Uint8Array;
  kind: "png" | "jpg";
}

export type PageSize = "fit" | "a4" | "letter";
export type PageOrientation = "auto" | "portrait" | "landscape";

export interface ImagesToPdfOptions {
  pageSize: PageSize;
  orientation: PageOrientation;
  /** Margin in points (1/72 inch). */
  margin: number;
}

const SIZES = { a4: [595.28, 841.89], letter: [612, 792] } as const;
/** PDF viewers cap pages at 200 inches. */
const MAX_PAGE = 14400;

/**
 * EXIF orientation of a JPEG (1–8), or 1 if absent. JPEGs are embedded as-is
 * (no re-encoding), so the rotation the camera recorded is applied when drawing.
 */
export function jpegOrientation(b: Uint8Array): number {
  if (b[0] !== 0xff || b[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 4 < b.length) {
    if (b[i] !== 0xff) return 1;
    const marker = b[i + 1];
    const len = (b[i + 2] << 8) | b[i + 3];
    if (marker === 0xe1 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66) {
      const t = i + 10; // TIFF header
      const le = b[t] === 0x49;
      const u16 = (o: number) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]);
      const u32 = (o: number) => (le ? u16(o) | (u16(o + 2) << 16) : (u16(o) << 16) | u16(o + 2));
      const ifd = t + u32(t + 4);
      const entries = u16(ifd);
      for (let e = 0; e < entries; e++) {
        const at = ifd + 2 + e * 12;
        if (at + 10 > b.length) return 1;
        if (u16(at) === 0x0112) {
          const v = u16(at + 8);
          return v >= 1 && v <= 8 ? v : 1;
        }
      }
      return 1;
    }
    if (marker === 0xda) return 1; // start of scan: no EXIF before image data
    i += 2 + len;
  }
  return 1;
}

/** One image per page. */
export async function imagesToPdf(
  images: PdfImageInput[],
  o: ImagesToPdfOptions,
  onProgress: (p: number) => void = () => {},
): Promise<Uint8Array> {
  if (images.length === 0) throw new PdfError("empty");
  const doc = await PDFDocument.create();
  for (let n = 0; n < images.length; n++) {
    const { bytes, kind } = images[n];
    let img: PDFImage;
    try {
      img = kind === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    } catch {
      throw new PdfError("image");
    }
    const orient = kind === "jpg" ? jpegOrientation(bytes) : 1;
    // Mirrored orientations (2, 4, 5, 7) are normalised by the UI before this point.
    const quarter = orient === 6 || orient === 8;
    const iw = quarter ? img.height : img.width;
    const ih = quarter ? img.width : img.height;

    let pw: number;
    let ph: number;
    if (o.pageSize === "fit") {
      const s = Math.min(1, (MAX_PAGE - 2 * o.margin) / Math.max(iw, ih));
      pw = iw * s + 2 * o.margin;
      ph = ih * s + 2 * o.margin;
    } else {
      const [a, b] = SIZES[o.pageSize];
      const landscape = o.orientation === "landscape" || (o.orientation === "auto" && iw > ih);
      [pw, ph] = landscape ? [b, a] : [a, b];
    }
    const page = doc.addPage([pw, ph]);
    const scale = Math.min((pw - 2 * o.margin) / iw, (ph - 2 * o.margin) / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const bx = (pw - dw) / 2;
    const by = (ph - dh) / 2;
    // Drawn size along the image's own axes.
    const w = quarter ? dh : dw;
    const h = quarter ? dw : dh;
    if (orient === 6) page.drawImage(img, { x: bx, y: by + dh, width: w, height: h, rotate: degrees(-90) });
    else if (orient === 8) page.drawImage(img, { x: bx + dw, y: by, width: w, height: h, rotate: degrees(90) });
    else if (orient === 3) page.drawImage(img, { x: bx + dw, y: by + dh, width: w, height: h, rotate: degrees(180) });
    else page.drawImage(img, { x: bx, y: by, width: w, height: h });
    onProgress(Math.round(((n + 1) / images.length) * 90));
  }
  return savePdf(doc);
}
