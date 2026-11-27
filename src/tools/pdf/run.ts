import qpdfWasmUrl from "@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url";
import { runCancellable, runWorker } from "@/lib/worker-bridge";
import type { OpResult, PdfOp } from "./ops";

const createWorker = () => new Worker(new URL("./pdf.worker.ts", import.meta.url), { type: "module" });

/** Ops that need canvas encoding inside the worker. */
const needsOffscreen = new Set<PdfOp["op"]>(["compress"]);

export interface JobOptions {
  signal?: AbortSignal;
  onProgress?: (p: number) => void;
  /** Replaces the progress label (for example "Downloading the AI model…"); progress is undefined when unknown. */
  onStatus?: (label: string, progress?: number) => void;
}

/** Distributes Omit over the union so each op keeps its own fields. */
type WithoutWasm<T> = T extends { wasmUrl: string } ? Omit<T, "wasmUrl"> : T;
export type PdfOpRequest = WithoutWasm<PdfOp>;

/**
 * Run one PDF operation in a fresh Web Worker (terminated afterwards, which
 * frees its memory). Input buffers are transferred, not copied, so callers
 * must not reuse them.
 */
export async function runPdf(request: PdfOpRequest, { signal, onProgress }: JobOptions = {}): Promise<OpResult> {
  const input = (request.op === "protect" || request.op === "unlock" ? { ...request, wasmUrl: qpdfWasmUrl } : request) as PdfOp;
  const transfer: ArrayBuffer[] = [];
  if ("file" in input) transfer.push(input.file.buffer as ArrayBuffer);
  if ("files" in input) for (const f of input.files) transfer.push(f.buffer as ArrayBuffer);
  if ("images" in input) for (const i of input.images) transfer.push(i.bytes.buffer as ArrayBuffer);
  if ("options" in input && "image" in input.options) transfer.push(input.options.image.buffer as ArrayBuffer);

  if (needsOffscreen.has(input.op) && typeof OffscreenCanvas === "undefined") {
    const { runOp } = await import("./ops");
    return runCancellable(runOp(input, onProgress ?? (() => {})), signal);
  }
  return runWorker<PdfOp, OpResult>(createWorker, input, { signal, onProgress, transfer: [...new Set(transfer)] });
}

export async function readBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}
