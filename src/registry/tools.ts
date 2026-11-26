import { imageTools } from "./image-tools.ts";
import { pdfTools } from "./pdf-tools.ts";
import type { BrowserSupport, ToolDefinition } from "./types";

// The single source of truth for every Privora tool. Homepage, navigation,
// search, routes, sitemap, related tools and analytics IDs all read from here.
// See docs/TOOL_REGISTRY.md before adding or changing an entry.

// Module workers (Firefox 114), OffscreenCanvas 2D (Safari 16.4), modern CSS (Chrome/Edge 111).
export const modernBrowsers: BrowserSupport = { chrome: "111", edge: "111", firefox: "114", safari: "16.4" };

export const tools: ToolDefinition[] = [
  ...imageTools(),
  ...pdfTools(),

  // ── Planned (hidden until verified) ─────────────────────────────────────
  planned("annotate-pdf", "PDF Annotation", "pdf", "highlighter", "Highlight, underline and comment on PDF pages.", ["pdf"], ["pdf"], "pdf-lib + pdf.js", ["annotate pdf", "highlight pdf", "comment pdf"]),
  planned("ocr-pdf", "OCR PDF", "pdf", "scan-text", "Make scanned PDFs searchable with on-device text recognition.", ["pdf"], ["pdf", "txt"], "tesseract.js", ["ocr", "scanned pdf", "searchable pdf"]),
  planned("heic-to-jpg", "HEIC to JPG", "image", "image-convert", "Convert iPhone HEIC photos to JPG.", ["heic", "heif"], ["jpg"], "libheif (LGPL-3.0), pending a licence decision", ["heic to jpg", "iphone photo converter"]),
  planned("heic-to-png", "HEIC to PNG", "image", "image-convert", "Convert iPhone HEIC photos to PNG.", ["heic", "heif"], ["png"], "libheif (LGPL-3.0), pending a licence decision", ["heic to png"]),
  planned("image-ocr", "Image OCR", "image", "scan-text", "Copy the text out of a photo or screenshot with on-device text recognition.", ["png", "jpg", "jpeg", "webp"], ["txt"], "tesseract.js", ["ocr", "image to text", "extract text from image"]),
  planned("remove-background", "Remove Background", "ai", "eraser", "Remove the background from a photo using on-device AI.", ["png", "jpg", "jpeg", "webp"], ["png"], "ONNX Runtime Web", ["background remover", "transparent background", "cut out"]),
];

function planned(
  id: string,
  name: string,
  category: ToolDefinition["category"],
  icon: ToolDefinition["icon"],
  description: string,
  inputFormats: string[],
  outputFormats: string[],
  engine: string,
  keywords: string[],
): ToolDefinition {
  return {
    id, name, slug: id, category, description, icon, keywords, engine,
    processingMode: "web-worker", inputFormats, outputFormats, browsers: modernBrowsers,
    maxFileSizeMB: 100, model: null, enabled: false, status: "planned", popular: false,
    seoTitle: `${name} — Free & Private Online Tool | Privora`, seoDescription: description,
    related: [], limitations: [],
  };
}
