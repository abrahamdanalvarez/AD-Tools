// Page side of the regex worker: one worker reused between runs, terminated
// and replaced when a run takes too long (catastrophic backtracking).
import { InputError } from "./core/encode";
import type { RegexRequest, RegexResult } from "./core/regex";

const TIMEOUT_MS = 2000;
let worker: Worker | null = null;
let queue: Promise<unknown> = Promise.resolve();

function run(req: RegexRequest): Promise<RegexResult> {
  worker ??= new Worker(new URL("./regex.worker.ts", import.meta.url), { type: "module" });
  const w = worker;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      w.terminate();
      if (worker === w) worker = null;
      reject(new InputError("This pattern took more than 2 seconds and was stopped. It may backtrack too much (for example (a+)+). Try a simpler pattern."));
    }, TIMEOUT_MS);
    w.onmessage = (e: MessageEvent<{ ok: boolean; result?: RegexResult; error?: string }>) => {
      clearTimeout(timer);
      if (e.data.ok) resolve(e.data.result!);
      else reject(new InputError(e.data.error!));
    };
    w.onerror = () => {
      clearTimeout(timer);
      w.terminate();
      if (worker === w) worker = null;
      reject(new InputError("The pattern couldn't be run."));
    };
    w.postMessage(req);
  });
}

/** Runs are queued so a slow one can't receive another's result. */
export function runRegex(req: RegexRequest): Promise<RegexResult> {
  const next = queue.then(() => run(req));
  queue = next.catch(() => undefined);
  return next;
}

export function releaseRegex() {
  worker?.terminate();
  worker = null;
}
