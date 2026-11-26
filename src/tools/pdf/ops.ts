// Every PDF operation, as plain data in → bytes out. Runs inside the PDF Web
// Worker (pdf.worker.ts) or, where a browser lacks a needed worker feature,
// on the page. Nothing here touches the network or storage.
import type { CompressLevel } from "./core/compress";
import type { ImagesToPdfOptions, PdfImageInput } from "./core/images";
import type { PdfMetadata } from "./core/meta";
import type { Angle } from "./core/organize";
import type { ImageOptions, PageNumberOptions, TextOptions, WatermarkOptions } from "./core/stamp";

export type PdfOp =
  | { op: "inspect"; file: Uint8Array }
  | { op: "merge"; files: Uint8Array[] }
  | { op: "split"; file: Uint8Array; groups: number[][] }
  | { op: "extract"; file: Uint8Array; pages: number[] }
  | { op: "delete"; file: Uint8Array; pages: number[] }
  | { op: "rotate"; file: Uint8Array; angle: Angle; pages?: number[] }
  | { op: "reorder"; file: Uint8Array; order: number[] }
  | { op: "reverse"; file: Uint8Array }
  | { op: "duplicate"; file: Uint8Array; pages: number[]; copies: number }
  | { op: "images"; images: PdfImageInput[]; options: ImagesToPdfOptions }
  | { op: "watermark"; file: Uint8Array; options: WatermarkOptions }
  | { op: "numbers"; file: Uint8Array; options: PageNumberOptions }
  | { op: "text"; file: Uint8Array; options: TextOptions }
  | { op: "image"; file: Uint8Array; options: ImageOptions }
  | { op: "flatten"; file: Uint8Array }
  | { op: "set-meta"; file: Uint8Array; meta: PdfMetadata }
  | { op: "strip-meta"; file: Uint8Array }
  | { op: "extract-images"; file: Uint8Array }
  | { op: "compress"; file: Uint8Array; level: CompressLevel }
  | { op: "repair"; file: Uint8Array }
  | { op: "protect"; file: Uint8Array; password: string; wasmUrl: string }
  | { op: "unlock"; file: Uint8Array; password: string; wasmUrl: string };

export interface OpOutput {
  name?: string;
  bytes: Uint8Array;
}

export interface OpResult {
  outputs: OpOutput[];
  /** Op-specific details (page info, counts…). Never file contents. */
  data?: unknown;
}

const one = (bytes: Uint8Array): OpResult => ({ outputs: [{ bytes }] });

export async function runOp(input: PdfOp, onProgress: (p: number) => void): Promise<OpResult> {
  switch (input.op) {
    case "inspect": {
      const { inspectPdf } = await import("./core/meta");
      return { outputs: [], data: await inspectPdf(input.file) };
    }
    case "merge":
      return one(await (await import("./core/organize")).mergePdfs(input.files, onProgress));
    case "split": {
      const parts = await (await import("./core/organize")).splitPdf(input.file, input.groups, onProgress);
      return { outputs: parts.map((bytes) => ({ bytes })) };
    }
    case "extract":
      return one(await (await import("./core/organize")).extractPages(input.file, input.pages));
    case "delete":
      return one(await (await import("./core/organize")).deletePages(input.file, input.pages));
    case "rotate":
      return one(await (await import("./core/organize")).rotatePages(input.file, input.angle, input.pages));
    case "reorder":
      return one(await (await import("./core/organize")).reorderPages(input.file, input.order));
    case "reverse":
      return one(await (await import("./core/organize")).reversePages(input.file));
    case "duplicate":
      return one(await (await import("./core/organize")).duplicatePages(input.file, input.pages, input.copies));
    case "images":
      return one(await (await import("./core/images")).imagesToPdf(input.images, input.options, onProgress));
    case "watermark":
      return one(await (await import("./core/stamp")).addWatermark(input.file, input.options));
    case "numbers":
      return one(await (await import("./core/stamp")).addPageNumbers(input.file, input.options));
    case "text":
      return one(await (await import("./core/stamp")).addText(input.file, input.options));
    case "image":
      return one(await (await import("./core/stamp")).addImage(input.file, input.options));
    case "flatten":
      return one(await (await import("./core/meta")).flattenForms(input.file));
    case "set-meta":
      return one(await (await import("./core/meta")).setMetadata(input.file, input.meta));
    case "strip-meta":
      return one(await (await import("./core/meta")).stripMetadata(input.file));
    case "extract-images": {
      const r = await (await import("./core/extract-images")).extractImages(input.file, onProgress);
      return { outputs: r.images, data: { skipped: r.skipped } };
    }
    case "compress": {
      const [{ compressPdf }, { browserJpegEncoder }] = await Promise.all([import("./core/compress"), import("./browser/jpeg")]);
      const r = await compressPdf(input.file, input.level, browserJpegEncoder, onProgress);
      return {
        outputs: [{ bytes: r.bytes }],
        data: { imagesTotal: r.imagesTotal, imagesRecompressed: r.imagesRecompressed, unchanged: r.unchanged },
      };
    }
    case "repair": {
      const r = await (await import("./core/repair")).repairPdf(input.file);
      return { outputs: [{ bytes: r.bytes }], data: { pageCount: r.pageCount } };
    }
    case "protect":
    case "unlock": {
      const [{ default: factory }, qpdf] = await Promise.all([import("@neslinesli93/qpdf-wasm"), import("./core/qpdf")]);
      const f = factory as unknown as import("./core/qpdf").QpdfFactory;
      const fn = input.op === "protect" ? qpdf.protectPdf : qpdf.unlockPdf;
      return one(await fn(f, input.wasmUrl, input.file, input.password));
    }
  }
}
