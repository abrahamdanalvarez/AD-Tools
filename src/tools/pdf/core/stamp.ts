import { degrees, rgb, StandardFonts, type PDFDocument, type PDFFont, type PDFImage } from "pdf-lib";
import { PdfError } from "./errors";
import { originForCentre, toUserSpace, visualOf } from "./geometry";
import { openPdf, savePdf } from "./load";

export type FontName = "helvetica" | "helvetica-bold" | "times" | "courier";
const fonts: Record<FontName, StandardFonts> = {
  helvetica: StandardFonts.Helvetica,
  "helvetica-bold": StandardFonts.HelveticaBold,
  times: StandardFonts.TimesRoman,
  courier: StandardFonts.Courier,
};

/** "#rrggbb" → pdf-lib colour. */
export function hexColor(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const n = m ? parseInt(m[1], 16) : 0;
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Width of text, or "chars" if a standard (WinAnsi) font can't encode it. */
function widthOf(font: PDFFont, text: string, size: number): number {
  try {
    return font.widthOfTextAtSize(text, size);
  } catch {
    throw new PdfError("chars");
  }
}

function targets(doc: PDFDocument, indexes?: number[]) {
  const pages = doc.getPages();
  const list = indexes ?? pages.map((_, i) => i);
  if (list.length === 0 || list.some((i) => i < 0 || i >= pages.length)) throw new PdfError("range");
  return [...new Set(list)].map((i) => ({ page: pages[i], index: i }));
}

export interface WatermarkOptions {
  text: string;
  /** 0 = auto: fit about 70% of the page width. */
  size: number;
  opacity: number;
  angle: number;
  color: string;
  pages?: number[];
}

export async function addWatermark(bytes: Uint8Array, o: WatermarkOptions): Promise<Uint8Array> {
  const text = o.text.trim();
  if (!text) throw new PdfError("chars");
  const doc = await openPdf(bytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const { page } of targets(doc, o.pages)) {
    const v = visualOf(page);
    const unit = widthOf(font, text, 1);
    const diagonal = Math.abs(o.angle) % 180 === 0 ? v.width : Math.hypot(v.width, v.height);
    const size = o.size > 0 ? o.size : Math.max(8, Math.min(200, (diagonal * 0.7) / unit));
    const w = unit * size;
    const h = font.heightAtSize(size, { descender: false });
    const origin = originForCentre(v.width / 2, v.height / 2, w, h, o.angle);
    const at = toUserSpace(page, origin.x, origin.y);
    page.drawText(text, {
      x: at.x,
      y: at.y,
      size,
      font,
      color: hexColor(o.color),
      opacity: o.opacity,
      rotate: degrees(o.angle + at.rotate),
    });
  }
  return savePdf(doc);
}

export type NumberPosition = "bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right" | "top-left";
export type NumberFormat = "n" | "page-n" | "page-n-of-total" | "n-of-total";

export interface PageNumberOptions {
  position: NumberPosition;
  format: NumberFormat;
  start: number;
  size: number;
  margin: number;
  pages?: number[];
}

export function numberLabel(format: NumberFormat, n: number, total: number): string {
  switch (format) {
    case "page-n":
      return `Page ${n}`;
    case "page-n-of-total":
      return `Page ${n} of ${total}`;
    case "n-of-total":
      return `${n} / ${total}`;
    default:
      return `${n}`;
  }
}

export async function addPageNumbers(bytes: Uint8Array, o: PageNumberOptions): Promise<Uint8Array> {
  const doc = await openPdf(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const list = targets(doc, o.pages);
  const total = list.length + o.start - 1;
  list.forEach(({ page }, k) => {
    const label = numberLabel(o.format, o.start + k, total);
    const v = visualOf(page);
    const w = widthOf(font, label, o.size);
    const [vert, horiz] = o.position.split("-") as ["top" | "bottom", "left" | "center" | "right"];
    const vx = horiz === "left" ? o.margin : horiz === "right" ? v.width - o.margin - w : (v.width - w) / 2;
    const vy = vert === "bottom" ? o.margin : v.height - o.margin - o.size;
    const at = toUserSpace(page, vx, vy);
    page.drawText(label, { x: at.x, y: at.y, size: o.size, font, color: rgb(0.1, 0.1, 0.1), rotate: degrees(at.rotate) });
  });
  return savePdf(doc);
}

/** Placement as fractions of the visible page, measured from its top-left corner. */
export interface Placement {
  page: number;
  x: number;
  y: number;
}

export interface TextOptions extends Placement {
  text: string;
  size: number;
  font: FontName;
  color: string;
}

export async function addText(bytes: Uint8Array, o: TextOptions): Promise<Uint8Array> {
  const lines = o.text.replace(/\r/g, "").split("\n");
  if (!o.text.trim()) throw new PdfError("chars");
  const doc = await openPdf(bytes);
  const [{ page }] = targets(doc, [o.page]);
  const font = await doc.embedFont(fonts[o.font]);
  const v = visualOf(page);
  const lineHeight = o.size * 1.2;
  lines.forEach((line, i) => {
    widthOf(font, line, o.size);
    const vx = o.x * v.width;
    const vy = v.height - o.y * v.height - o.size - i * lineHeight;
    const at = toUserSpace(page, vx, vy);
    page.drawText(line, { x: at.x, y: at.y, size: o.size, font, color: hexColor(o.color), rotate: degrees(at.rotate) });
  });
  return savePdf(doc);
}

export interface ImageOptions extends Placement {
  /** Width as a fraction of the visible page width. Height follows the image's aspect ratio. */
  width: number;
  image: Uint8Array;
  kind: "png" | "jpg";
}

export async function addImage(bytes: Uint8Array, o: ImageOptions): Promise<Uint8Array> {
  const doc = await openPdf(bytes);
  const [{ page }] = targets(doc, [o.page]);
  let img: PDFImage;
  try {
    img = o.kind === "png" ? await doc.embedPng(o.image) : await doc.embedJpg(o.image);
  } catch {
    throw new PdfError("image");
  }
  const v = visualOf(page);
  const width = o.width * v.width;
  const height = (width * img.height) / img.width;
  const vx = o.x * v.width;
  const vy = v.height - o.y * v.height - height;
  const at = toUserSpace(page, vx, vy);
  page.drawImage(img, { x: at.x, y: at.y, width, height, rotate: degrees(at.rotate) });
  return savePdf(doc);
}
