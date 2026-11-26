import { degrees, PDFDocument } from "pdf-lib";
import { PdfError } from "./errors";
import { openPdf, savePdf } from "./load";

export interface NamedPdf {
  name: string;
  bytes: Uint8Array;
}

/** New document that keeps the source's descriptive metadata (title, author…). */
async function derive(src: PDFDocument): Promise<PDFDocument> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const title = src.getTitle();
  if (title) doc.setTitle(title);
  const author = src.getAuthor();
  if (author) doc.setAuthor(author);
  const subject = src.getSubject();
  if (subject) doc.setSubject(subject);
  const keywords = src.getKeywords();
  if (keywords) doc.setKeywords(keywords.split(/\s*,\s*|\s+/).filter(Boolean));
  const creator = src.getCreator();
  if (creator) doc.setCreator(creator);
  const producer = src.getProducer();
  if (producer) doc.setProducer(producer);
  return doc;
}

async function copyInto(dst: PDFDocument, src: PDFDocument, indexes: number[]) {
  const pages = await dst.copyPages(src, indexes);
  for (const p of pages) dst.addPage(p);
}

function assertPages(indexes: number[], count: number) {
  if (indexes.length === 0 || indexes.some((i) => !Number.isInteger(i) || i < 0 || i >= count)) throw new PdfError("range");
}

/** Pages from several PDFs, in the order given. */
export async function mergePdfs(files: Uint8Array[], onProgress: (p: number) => void = () => {}): Promise<Uint8Array> {
  if (files.length === 0) throw new PdfError("empty");
  let out: PDFDocument | null = null;
  for (let i = 0; i < files.length; i++) {
    const src = await openPdf(files[i]);
    out ??= await derive(src);
    await copyInto(out, src, src.getPageIndices());
    onProgress(Math.round(((i + 1) / files.length) * 90));
  }
  return savePdf(out!);
}

/** One output document per group of page indexes. */
export async function splitPdf(bytes: Uint8Array, groups: number[][], onProgress: (p: number) => void = () => {}) {
  const src = await openPdf(bytes);
  const count = src.getPageCount();
  if (groups.length === 0) throw new PdfError("range");
  const out: Uint8Array[] = [];
  for (let i = 0; i < groups.length; i++) {
    assertPages(groups[i], count);
    const doc = await derive(src);
    await copyInto(doc, src, groups[i]);
    out.push(await savePdf(doc));
    onProgress(Math.round(((i + 1) / groups.length) * 95));
  }
  return out;
}

/** Groups of `size` pages: [0..size-1], [size..]… */
export function everyNPages(count: number, size: number): number[][] {
  if (!Number.isInteger(size) || size < 1) throw new PdfError("range");
  const groups: number[][] = [];
  for (let start = 0; start < count; start += size)
    groups.push(Array.from({ length: Math.min(size, count - start) }, (_, k) => start + k));
  return groups;
}

/** A new document with just these pages, in this order. */
export async function extractPages(bytes: Uint8Array, indexes: number[]): Promise<Uint8Array> {
  const src = await openPdf(bytes);
  assertPages(indexes, src.getPageCount());
  const doc = await derive(src);
  await copyInto(doc, src, indexes);
  return savePdf(doc);
}

/** Remove pages in place, so everything else in the file is kept. */
export async function deletePages(bytes: Uint8Array, indexes: number[]): Promise<Uint8Array> {
  const doc = await openPdf(bytes);
  const count = doc.getPageCount();
  const unique = [...new Set(indexes)];
  assertPages(unique, count);
  if (unique.length >= count) throw new PdfError("range");
  for (const i of unique.sort((a, b) => b - a)) doc.removePage(i);
  return savePdf(doc);
}

export type Angle = 90 | 180 | 270;

/** Rotate pages clockwise, adding to any rotation they already have. */
export async function rotatePages(bytes: Uint8Array, angle: Angle, indexes?: number[]): Promise<Uint8Array> {
  const doc = await openPdf(bytes);
  const pages = doc.getPages();
  const targets = indexes ?? pages.map((_, i) => i);
  assertPages(targets, pages.length);
  for (const i of new Set(targets)) {
    const page = pages[i];
    page.setRotation(degrees((((page.getRotation().angle + angle) % 360) + 360) % 360));
  }
  return savePdf(doc);
}

/**
 * Put pages in a new order. `order` lists every page index exactly once.
 * Done in place, so links, forms and bookmarks stay attached to their pages.
 */
export async function reorderPages(bytes: Uint8Array, order: number[]): Promise<Uint8Array> {
  const doc = await openPdf(bytes);
  const count = doc.getPageCount();
  if (order.length !== count || new Set(order).size !== count) throw new PdfError("range");
  assertPages(order, count);
  const pages = doc.getPages();
  for (let i = count - 1; i >= 0; i--) doc.removePage(i);
  order.forEach((from, to) => doc.insertPage(to, pages[from]));
  return savePdf(doc);
}

export const reversePages = async (bytes: Uint8Array) => {
  const count = (await openPdf(bytes)).getPageCount();
  return reorderPages(
    bytes,
    Array.from({ length: count }, (_, i) => count - 1 - i),
  );
};

/** Insert a copy of each chosen page right after it, `copies` times. */
export async function duplicatePages(bytes: Uint8Array, indexes: number[], copies = 1): Promise<Uint8Array> {
  const doc = await openPdf(bytes);
  const unique = [...new Set(indexes)];
  assertPages(unique, doc.getPageCount());
  if (!Number.isInteger(copies) || copies < 1 || copies > 20) throw new PdfError("range");
  // Work from the end so earlier indexes stay valid.
  for (const i of unique.sort((a, b) => b - a)) {
    const dupes = await doc.copyPages(doc, Array(copies).fill(i));
    dupes.forEach((p, k) => doc.insertPage(i + 1 + k, p));
  }
  return savePdf(doc);
}
