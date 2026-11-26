/// <reference lib="webworker" />
import { post } from "@/workers/protocol";
import { renderImage, type Recipe } from "./render";

self.onmessage = async (event: MessageEvent<{ bitmap: ImageBitmap; recipe: Recipe; oxipngUrl: string }>) => {
  const { bitmap, recipe, oxipngUrl } = event.data;
  try {
    post.result(await renderImage(bitmap, recipe, oxipngUrl, post.progress));
  } catch (err) {
    post.error(err instanceof Error ? err.message : "unknown");
  }
};
