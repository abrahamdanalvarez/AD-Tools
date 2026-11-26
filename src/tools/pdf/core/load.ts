import { PDFDocument } from "pdf-lib";
import { PdfError } from "./errors";

/** Hard ceiling. Beyond this, browsers routinely run out of memory. */
export const MAX_PDF_BYTES = 1024 * 1024 * 1024;

/** A PDF must start with "%PDF-" within its first 1024 bytes (PDF 32000-1 §7.5.2 tolerance). */
export function looksLikePdf(bytes: Uint8Array): boolean {
  const head = bytes.subarray(0, 1024);
  for (let i = 0; i + 4 < head.length; i++) {
    if (head[i] === 0x25 && head[i + 1] === 0x50 && head[i + 2] === 0x44 && head[i + 3] === 0x46 && head[i + 4] === 0x2d)
      return true;
  }
  return false;
}

export interface OpenOptions {
  /** Allow encrypted files through (only for inspection, never for editing). */
  allowEncrypted?: boolean;
}

/**
 * Validate and parse a PDF. pdf-lib never runs embedded JavaScript and never
 * fetches external resources. Metadata is left as it was (no "pdf-lib" producer).
 */
export async function openPdf(bytes: Uint8Array, { allowEncrypted = false }: OpenOptions = {}): Promise<PDFDocument> {
  if (bytes.byteLength > MAX_PDF_BYTES) throw new PdfError("too-large");
  if (!looksLikePdf(bytes)) throw new PdfError("not-pdf");
  let doc: PDFDocument;
  let pages: number;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    // Reading the page tree catches broken catalogs early, before any tool runs.
    pages = doc.isEncrypted ? 1 : doc.getPageCount();
  } catch {
    throw new PdfError("damaged");
  }
  if (doc.isEncrypted && !allowEncrypted) throw new PdfError("encrypted");
  if (pages === 0) throw new PdfError("empty");
  return doc;
}

/** Serialise with object streams (smaller files). */
export function savePdf(doc: PDFDocument): Promise<Uint8Array> {
  return doc.save({ useObjectStreams: true, updateFieldAppearances: false });
}
