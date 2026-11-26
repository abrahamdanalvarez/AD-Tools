// Synthetic PDFs for tests. Every page has a unique width (200 + page number)
// and the text "Page N", so tests can tell exactly which page ended up where.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { encodePng } from "./png";

export const pageWidth = (n: number) => 200 + n;

export async function makePdf(pages = 3, opts: { title?: string; form?: boolean } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let n = 1; n <= pages; n++) {
    const page = doc.addPage([pageWidth(n), 300]);
    page.drawText(`Page ${n}`, { x: 20, y: 250, size: 18, font });
  }
  if (opts.title) {
    doc.setTitle(opts.title);
    doc.setAuthor("Test Author");
  }
  if (opts.form) {
    const field = doc.getForm().createTextField("name");
    field.setText("Ada");
    field.addToPage(doc.getPage(0), { x: 20, y: 100, width: 150, height: 24 });
  }
  return doc.save();
}

/** Page widths in order: identifies pages after reordering, splitting, etc. */
export async function widths(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((p) => Math.round(p.getWidth()));
}

/** 2×2 PNG: red, green / blue, white. */
export const tinyPng = encodePng(2, 2, 3, Uint8Array.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]));

const fixture = (name: string) => new Uint8Array(readFileSync(fileURLToPath(new URL(`./test-fixtures/${name}`, import.meta.url))));
/** 30×20 baseline JPEG, made by Chromium's encoder. */
export const tinyJpg = () => fixture("tiny.jpg");
/** 800×500 noisy JPEG at quality 0.92: something compression can shrink. */
export const photoJpg = () => fixture("photo.jpg");

/** Insert an EXIF APP1 segment carrying only an orientation tag. */
export function withOrientation(jpg: Uint8Array, orientation: number): Uint8Array {
  // "Exif" + two zero bytes + big-endian TIFF header + IFD with one entry (0x0112, SHORT, 1, value)
  const tiff = [0x4d, 0x4d, 0, 42, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, 0, 0, 0, 0];
  const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
  const len = payload.length + 2;
  const seg = [0xff, 0xe1, len >> 8, len & 255, ...payload];
  return Uint8Array.from([...jpg.subarray(0, 2), ...seg, ...jpg.subarray(2)]);
}
