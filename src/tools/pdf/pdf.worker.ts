/// <reference lib="webworker" />
import { post } from "@/workers/protocol";
import { codeOf } from "./core/errors";
import { runOp, type PdfOp } from "./ops";

self.onmessage = async (event: MessageEvent<PdfOp>) => {
  try {
    const result = await runOp(event.data, post.progress);
    // Hand the output buffers back without copying them.
    post.result(result, [...new Set(result.outputs.map((o) => o.bytes.buffer as ArrayBuffer))]);
  } catch (err) {
    post.error(codeOf(err));
  }
};
