export type WorkerMessage<Result> =
  | { type: "progress"; value: number }
  | { type: "result"; result: Result }
  | { type: "error"; message: string };

/** Helpers for worker scripts. */
export const post = {
  progress: (value: number) => self.postMessage({ type: "progress", value } satisfies WorkerMessage<never>),
  result: <R>(result: R, transfer: Transferable[] = []) =>
    self.postMessage({ type: "result", result } satisfies WorkerMessage<R>, { transfer }),
  error: (message: string) => self.postMessage({ type: "error", message } satisfies WorkerMessage<never>),
};
