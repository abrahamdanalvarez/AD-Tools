/** Error codes thrown by the PDF core. Workers pass only the code across. */
export type PdfErrorCode =
  | "not-pdf"
  | "encrypted"
  | "damaged"
  | "empty"
  | "range"
  | "chars"
  | "no-forms"
  | "no-images"
  | "wrong-password"
  | "password-required"
  | "not-encrypted"
  | "no-text"
  | "image"
  | "too-large"
  | "unknown";

export class PdfError extends Error {
  constructor(public code: PdfErrorCode) {
    super(code);
    this.name = "PdfError";
  }
}

export const pdfErrorMessages: Record<PdfErrorCode, string> = {
  "not-pdf": "This file isn't a PDF. Choose a file that ends in .pdf and opens in a PDF reader.",
  encrypted: "This PDF is password protected. Remove the password with Unlock PDF first, then try again.",
  damaged: "This PDF is damaged and could not be read. Try Repair PDF first.",
  empty: "This PDF has no pages.",
  range: "Check the page numbers. Use numbers and ranges such as 1-3, 5, within the document's page count.",
  chars:
    "The text contains characters the built-in PDF fonts can't show (for example emoji or non-Latin scripts). Use Latin letters, numbers and common punctuation.",
  "no-forms": "This PDF has no form fields to flatten.",
  "no-images": "No extractable images were found in this PDF.",
  "wrong-password": "That password is not correct for this PDF.",
  "password-required": "Enter a password.",
  "not-encrypted": "This PDF isn't password protected, so there's nothing to unlock.",
  "no-text":
    "No selectable text was found. This PDF may contain scanned pages (pictures of text), which need OCR. OCR isn't available in Privora yet.",
  image: "One of the images could not be read. Make sure it opens in your image viewer.",
  "too-large": "This file is too large to process safely in your browser.",
  unknown: "Something went wrong while processing the PDF. Nothing was sent anywhere. Try again, or try a smaller file.",
};

/** Convert anything thrown (including across a worker boundary) to a message. */
export function messageFor(err: unknown): string {
  const code = err instanceof Error ? err.message : "";
  return pdfErrorMessages[code as PdfErrorCode] ?? pdfErrorMessages.unknown;
}

export function codeOf(err: unknown): PdfErrorCode {
  const code = err instanceof Error ? err.message : "";
  return code in pdfErrorMessages ? (code as PdfErrorCode) : "unknown";
}
