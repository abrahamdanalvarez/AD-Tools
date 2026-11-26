import { describe, expect, it, vi } from "vitest";
import { CancelledError, runCancellable, runWorker } from "./worker-bridge";

describe("runCancellable", () => {
  it("passes results through", async () => {
    await expect(runCancellable(Promise.resolve(7))).resolves.toBe(7);
  });
  it("rejects immediately on cancel and drops the late result", async () => {
    const controller = new AbortController();
    const slow = new Promise((r) => setTimeout(() => r("late"), 50));
    const p = runCancellable(slow, controller.signal);
    controller.abort();
    await expect(p).rejects.toBeInstanceOf(CancelledError);
  });
});

/** Minimal fake Worker that replies with scripted messages. */
function fakeWorker(messages: unknown[], delay = 0) {
  const worker = {
    onmessage: null as ((e: MessageEvent) => void) | null,
    onerror: null as ((e: ErrorEvent) => void) | null,
    terminate: vi.fn(),
    postMessage: vi.fn(() => {
      messages.forEach((data, i) =>
        setTimeout(() => worker.onmessage?.({ data } as MessageEvent), delay * (i + 1)),
      );
    }),
  };
  return worker;
}

describe("runWorker", () => {
  it("reports progress, resolves with the result and terminates the worker", async () => {
    const w = fakeWorker([{ type: "progress", value: 50 }, { type: "result", result: 42 }]);
    const progress: number[] = [];
    const result = await runWorker(() => w as unknown as Worker, "in", { onProgress: (p) => progress.push(p) });
    expect(result).toBe(42);
    expect(progress).toEqual([50]);
    expect(w.terminate).toHaveBeenCalled();
  });

  it("rejects with the worker's error code", async () => {
    const w = fakeWorker([{ type: "error", message: "decode" }]);
    await expect(runWorker(() => w as unknown as Worker, "in")).rejects.toThrow("decode");
    expect(w.terminate).toHaveBeenCalled();
  });

  it("cancels: terminates the worker and rejects with CancelledError", async () => {
    const w = fakeWorker([{ type: "result", result: 1 }], 50);
    const controller = new AbortController();
    const promise = runWorker(() => w as unknown as Worker, "in", { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(CancelledError);
    expect(w.terminate).toHaveBeenCalled();
  });

  it("does not start when already cancelled", async () => {
    const create = vi.fn();
    const controller = new AbortController();
    controller.abort();
    await expect(runWorker(create, "in", { signal: controller.signal })).rejects.toBeInstanceOf(CancelledError);
    expect(create).not.toHaveBeenCalled();
  });
});
