// Runs one job in a dedicated Web Worker with progress and cancellation.
// Cancelling terminates the worker, which frees its memory immediately.
//
// Worker protocol (see src/workers/protocol.ts):
//   main → worker: the input message
//   worker → main: { type: "progress", value: 0–100 } | { type: "result", result } | { type: "error", message }

import type { WorkerMessage } from "@/workers/protocol";

export class CancelledError extends Error {
  constructor() {
    super("Cancelled");
    this.name = "CancelledError";
  }
}

/**
 * Main-thread fallback (browsers without worker support for a feature): the
 * job can't be interrupted, but cancelling rejects at once and its result is
 * dropped.
 */
export function runCancellable<T>(job: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) return Promise.reject(new CancelledError());
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new CancelledError());
    signal?.addEventListener("abort", onAbort, { once: true });
    job.then(resolve, reject).finally(() => signal?.removeEventListener("abort", onAbort));
  });
}

export interface RunOptions {
  signal?: AbortSignal;
  onProgress?: (percent: number) => void;
  transfer?: Transferable[];
}

export function runWorker<Input, Result>(
  createWorker: () => Worker,
  input: Input,
  { signal, onProgress, transfer = [] }: RunOptions = {},
): Promise<Result> {
  return new Promise<Result>((resolve, reject) => {
    if (signal?.aborted) return reject(new CancelledError());
    const worker = createWorker();
    const finish = () => {
      worker.terminate();
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      finish();
      reject(new CancelledError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    worker.onmessage = (event: MessageEvent<WorkerMessage<Result>>) => {
      const msg = event.data;
      if (msg.type === "progress") onProgress?.(msg.value);
      else if (msg.type === "result") {
        finish();
        resolve(msg.result);
      } else if (msg.type === "error") {
        finish();
        reject(new Error(msg.message));
      }
    };
    worker.onerror = (event) => {
      finish();
      reject(new Error(event.message || "The tool stopped unexpectedly."));
    };
    worker.postMessage(input, transfer);
  });
}
