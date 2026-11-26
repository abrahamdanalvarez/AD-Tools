/// <reference lib="webworker" />
// Decodes and re-encodes one image entirely inside this worker.
import { post } from "@/workers/protocol";
import { convertImage } from "./convert";
import type { ConvertInput, ConvertResult } from "./types";

self.onmessage = async (event: MessageEvent<ConvertInput>) => {
  const { file, type, quality } = event.data;
  try {
    const result = await convertImage(file, type, quality, post.progress);
    post.result<ConvertResult>(result);
  } catch (err) {
    post.error(err instanceof Error ? err.message : "encode");
  }
};
