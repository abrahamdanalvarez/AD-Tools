// Page side of background removal: downloads the model from our own origin
// (with progress and an integrity check), keeps it in memory, and runs it in
// a long-lived worker. Images and masks stay in memory and are never stored.
import { CancelledError } from "@/lib/worker-bridge";
import { context, makeCanvas } from "@/tools/image/render";
import type { WorkerMessage } from "@/workers/protocol";
import { birefnet, modelPath } from "./model";
import type { Backend, SegmentRequest } from "./segment.worker";
import { sha256, toTensor } from "./tensor";

export const aiErrorMessages = {
  "ai-unsupported": "This browser can't run the AI model. Use a recent version of Chrome, Edge, Firefox or Safari.",
  "ai-download": "The AI model couldn't be downloaded. Check your connection and try again. Your image was not sent anywhere.",
  "ai-corrupt": "The AI model download was incomplete or damaged. Try again. If it keeps happening, clear this site's cache.",
  "ai-load": "The AI model couldn't start in this browser. Try a recent version of Chrome, Edge, Firefox or Safari, or close other tabs to free memory.",
  "ai-memory": "Your device ran out of memory while running the AI model. Close other tabs or apps and try again.",
  "ai-run": "The AI model stopped unexpectedly. Try again, or try a smaller image.",
  "ai-background": "The background image couldn't be opened. Choose a PNG, JPG or WebP image.",
} as const;

export interface AiJob {
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  /** A status line for the progress bar, with a percentage when known. */
  onStatus?: (label: string, progress?: number) => void;
}

export interface Mask {
  alpha: Uint8ClampedArray;
  size: number;
  backend: Backend;
  seconds: number;
}

const MB = (n: number) => (n / 1e6).toFixed(0);

let model: Promise<ArrayBuffer> | null = null;
let worker: Worker | null = null;
let ready: Promise<Backend> | null = null;
/** Masks for images chosen on this page, so changing the background doesn't run the model again. */
const masks = new WeakMap<Blob, Mask>();

/** Frees the model session and its memory (on cancel, failure, and when leaving the tool). The downloaded bytes stay for a quick restart. */
export function releaseSegmenter() {
  worker?.terminate();
  worker = null;
  ready = null;
}

async function download({ signal, onProgress, onStatus }: AiJob): Promise<ArrayBuffer> {
  const fail = (code: keyof typeof aiErrorMessages) => (signal?.aborted ? new CancelledError() : new Error(code));
  let res: Response;
  try {
    res = await fetch(modelPath(birefnet), { signal });
  } catch {
    throw fail("ai-download");
  }
  if (!res.ok || !res.body) throw fail("ai-download");
  // Content-Length is the gzipped size (unless a proxy re-encoded the file).
  const total = Number(res.headers.get("Content-Length")) || birefnet.downloadMB * 1e6;
  const chunks: Uint8Array[] = [];
  const reader = res.body.getReader();
  let got = 0;
  let step = -1;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      const pct = Math.min(100, (got / total) * 100);
      // The label is read out by screen readers, so it changes every 10%; the bar moves with every chunk.
      if (Math.floor(pct / 10) !== step) {
        step = Math.floor(pct / 10);
        onStatus?.(`Downloading the AI model (${MB(got)} of ${MB(total)} MB)…`, pct);
      } else onProgress?.(pct);
    }
  } catch {
    throw fail("ai-download");
  }
  onStatus?.("Checking the AI model…");
  let blob = new Blob(chunks as BlobPart[]);
  chunks.length = 0;
  // Unzip, unless the server already sent it decoded (Content-Encoding: gzip): check for the gzip signature.
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  if (head[0] === 0x1f && head[1] === 0x8b) {
    try {
      blob = await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).blob();
    } catch {
      throw fail("ai-corrupt");
    }
  }
  const bytes = await blob.arrayBuffer();
  if (bytes.byteLength !== birefnet.bytes || (await sha256(bytes)) !== birefnet.sha256) throw fail("ai-corrupt");
  return bytes;
}

function getModel(job: AiJob): Promise<ArrayBuffer> {
  if (!model) {
    model = download(job);
    // A failed or cancelled download is retried next time.
    model.catch(() => (model = null));
  }
  return model;
}

/** One request to the worker. Cancelling terminates it, which also frees the model's memory. */
function call<T>(w: Worker, msg: SegmentRequest, transfer: Transferable[], signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const done = () => signal?.removeEventListener("abort", onAbort);
    const onAbort = () => {
      releaseSegmenter();
      reject(new CancelledError());
    };
    if (signal?.aborted) return onAbort();
    signal?.addEventListener("abort", onAbort, { once: true });
    w.onmessage = (event: MessageEvent<WorkerMessage<T>>) => {
      const m = event.data;
      if (m.type === "progress") return;
      done();
      if (m.type === "result") resolve(m.result);
      else {
        releaseSegmenter();
        reject(new Error(m.message));
      }
    };
    w.onerror = () => {
      done();
      releaseSegmenter();
      reject(new Error("ai-load"));
    };
    w.postMessage(msg, transfer);
  });
}

/** The model's input: the image stretched to a square, as the model was trained. */
function prepare(bitmap: ImageBitmap, size: number): Float32Array {
  const canvas = makeCanvas(size, size);
  const ctx = context(canvas);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  canvas.width = canvas.height = 0;
  return toTensor(data, size * size);
}

/** Alpha mask of the main subject, at the model's input size. */
export async function subjectMask(file: Blob, bitmap: ImageBitmap, job: AiJob = {}): Promise<Mask> {
  const cached = masks.get(file);
  if (cached) return cached;
  if (typeof WebAssembly !== "object" || typeof Worker === "undefined" || typeof DecompressionStream === "undefined") throw new Error("ai-unsupported");
  const { signal, onStatus } = job;
  onStatus?.("Getting the AI model ready…");
  const bytes = await getModel(job);
  if (!worker || !ready) {
    onStatus?.("Starting the AI model…");
    worker = new Worker(new URL("./segment.worker.ts", import.meta.url), { type: "module" });
    // The bytes are copied, not transferred, so the model can restart after a cancel without downloading again.
    ready = call<Backend>(worker, { type: "load", model: bytes, size: birefnet.inputSize }, [], signal);
  }
  const backend = await ready;
  onStatus?.(backend === "webgpu" ? "Removing the background (using your GPU)…" : "Removing the background (using your CPU, this can take a minute)…");
  const input = prepare(bitmap, birefnet.inputSize);
  const start = performance.now();
  const alpha = await call<Uint8ClampedArray>(worker!, { type: "run", input }, [input.buffer], signal);
  const mask = { alpha, size: birefnet.inputSize, backend, seconds: (performance.now() - start) / 1000 };
  masks.set(file, mask);
  return mask;
}
