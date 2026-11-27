// Runs the segmentation model with ONNX Runtime Web. Stays alive between
// images, so the model loads once; the page terminates it to cancel or free memory.
import type { InferenceSession } from "onnxruntime-web";
import { post } from "@/workers/protocol";
import { toAlpha } from "./tensor";

export type SegmentRequest =
  | { type: "load"; model: ArrayBuffer; size: number }
  | { type: "run"; input: Float32Array };

export type Backend = "webgpu" | "wasm";

type Ort = typeof import("onnxruntime-web");
let ort: Ort;
let session: InferenceSession;
let size = 0;

/** True when the browser offers a WebGPU adapter (Chrome, Edge, newer Safari and Firefox). */
async function hasWebGpu(): Promise<boolean> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  return !!(await gpu.requestAdapter().catch(() => null));
}

async function load(model: ArrayBuffer): Promise<Backend> {
  const webgpu = await hasWebGpu();
  // The WebGPU build also contains the CPU (WASM) backend; the CPU-only build is smaller.
  ort = webgpu ? await import("onnxruntime-web/webgpu") : await import("onnxruntime-web/wasm");
  ort.env.logLevel = "error";
  const bytes = new Uint8Array(model);
  if (webgpu) {
    try {
      session = await ort.InferenceSession.create(bytes, { executionProviders: ["webgpu"], graphOptimizationLevel: "all" });
      return "webgpu";
    } catch {
      // Some GPUs or drivers can't run every operation: use the CPU instead.
    }
  }
  session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all", enableMemPattern: false, enableCpuMemArena: false });
  return "wasm";
}

self.onmessage = async (event: MessageEvent<SegmentRequest>) => {
  const msg = event.data;
  try {
    if (msg.type === "load") {
      size = msg.size;
      post.result(await load(msg.model));
      return;
    }
    const input = new ort.Tensor("float32", msg.input, [1, 3, size, size]);
    const out = await session.run({ [session.inputNames[0]]: input });
    input.dispose();
    const logits = out[session.outputNames[0]];
    const alpha = toAlpha((await logits.getData()) as Float32Array);
    for (const t of Object.values(out)) t.dispose();
    post.result(alpha, [alpha.buffer]);
  } catch (err) {
    const text = String((err as Error)?.message ?? err);
    post.error(/memory|alloc|OOM|out of range/i.test(text) ? "ai-memory" : msg.type === "load" ? "ai-load" : "ai-run");
  }
};
