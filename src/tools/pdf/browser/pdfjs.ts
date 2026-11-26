// pdf.js (Apache-2.0) for rendering pages and reading text. The legacy build
// is used because the modern one needs very recent browsers. pdf.js parses in
// its own Web Worker. Hardening:
// - all data files (CMaps, fonts, ICC, WASM) come from our origin (vendor-assets.ts)
// - no scripting sandbox, no annotation/form layers: embedded JavaScript never runs
// - XFA is off; nothing is streamed or range-fetched (pdf.js 6 has no eval-based code path)
import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfjsModule = typeof import("pdfjs-dist");
let lib: Promise<PdfjsModule> | null = null;

const VENDOR = "/vendor/pdfjs/";

export function loadPdfjs(): Promise<PdfjsModule> {
  lib ??= Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs") as Promise<PdfjsModule>,
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]).then(([m, worker]) => {
    m.GlobalWorkerOptions.workerSrc = worker.default;
    return m;
  });
  return lib;
}

/** Thrown as Error("encrypted") / Error("damaged") so the shared messages apply. */
export async function openDocument(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({
    // pdf.js transfers the buffer to its worker: give it a copy.
    data: bytes.slice(),
    cMapUrl: `${VENDOR}cmaps/`,
    standardFontDataUrl: `${VENDOR}standard_fonts/`,
    iccUrl: `${VENDOR}iccs/`,
    wasmUrl: `${VENDOR}wasm/`,
    enableXfa: false,
    disableAutoFetch: true,
    disableStream: true,
    disableRange: true,
    stopAtErrors: false,
  } as Parameters<PdfjsModule["getDocument"]>[0]);
  // No password prompt: encrypted files get a clear message instead.
  task.onPassword = () => {
    void task.destroy();
  };
  try {
    return await task.promise;
  } catch (e) {
    const name = (e as Error)?.name ?? "";
    throw new Error(name === "PasswordException" || task.destroyed ? "encrypted" : "damaged");
  }
}

/** Browsers refuse or crash on very large canvases (Safari: ~16.7 MP). */
export const MAX_CANVAS_PIXELS = 16_000_000;

export interface Rendered {
  canvas: HTMLCanvasElement;
  /** True when the requested resolution was reduced to stay under the canvas limit. */
  reduced: boolean;
}

/** Render one page (1-based) at `scale` (1 = 72 DPI), on a white background. */
export async function renderPage(doc: PDFDocumentProxy, pageNumber: number, scale: number, canvas = document.createElement("canvas")): Promise<Rendered> {
  const page = await doc.getPage(pageNumber);
  let viewport = page.getViewport({ scale });
  const pixels = viewport.width * viewport.height;
  const reduced = pixels > MAX_CANVAS_PIXELS;
  if (reduced) viewport = page.getViewport({ scale: scale * Math.sqrt(MAX_CANVAS_PIXELS / pixels) });
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  await page.render({ canvas, viewport, background: "#ffffff" }).promise;
  page.cleanup();
  return { canvas, reduced };
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("unknown"))), type, quality),
  );
}

/** Plain text of every page, in reading order as stored in the file. */
export async function extractText(doc: PDFDocumentProxy, onPage: (n: number) => void = () => {}, signal?: AbortSignal): Promise<string[]> {
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    if (signal?.aborted) break;
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    let text = "";
    for (const item of content.items) {
      if ("str" in item) text += item.str + (item.hasEOL ? "\n" : "");
    }
    pages.push(text.trim());
    page.cleanup();
    onPage(n);
  }
  return pages;
}
