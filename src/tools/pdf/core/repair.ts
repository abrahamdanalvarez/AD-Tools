import { PDFDocument } from "pdf-lib";
import { PdfError } from "./errors";
import { looksLikePdf, MAX_PDF_BYTES } from "./load";

/**
 * Rebuild a PDF's structure. pdf-lib reads every object it can find by
 * scanning the file (it doesn't rely on the cross-reference table), then
 * writes a fresh file with a correct table. This fixes broken offsets,
 * missing or damaged xref tables and truncated trailers. It can't restore
 * page content that is missing or corrupt.
 */
export async function repairPdf(bytes: Uint8Array): Promise<{ bytes: Uint8Array; pageCount: number }> {
  if (bytes.byteLength > MAX_PDF_BYTES) throw new PdfError("too-large");
  if (!looksLikePdf(bytes)) throw new PdfError("not-pdf");
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false, throwOnInvalidObject: false });
  } catch {
    throw new PdfError("damaged");
  }
  if (doc.isEncrypted) throw new PdfError("encrypted");
  const pageCount = doc.getPageCount();
  if (pageCount === 0) throw new PdfError("damaged");
  const out = await doc.save({ useObjectStreams: false });
  // The rebuilt file must open cleanly on its own.
  try {
    await PDFDocument.load(out, { updateMetadata: false, throwOnInvalidObject: true });
  } catch {
    throw new PdfError("damaged");
  }
  return { bytes: out, pageCount };
}
