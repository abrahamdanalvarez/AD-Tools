// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { birefnet, modelFile, modelPath } from "./model";
import { sha256, toAlpha, toTensor } from "./tensor";

describe("AI tensors", () => {
  it("normalises RGBA pixels into planar RGB with ImageNet mean and std", () => {
    // Two pixels: white and black (alpha ignored).
    const t = toTensor(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 0]), 2);
    expect(t).toHaveLength(6);
    expect(t[0]).toBeCloseTo((1 - 0.485) / 0.229, 5); // R plane, white
    expect(t[1]).toBeCloseTo(-0.485 / 0.229, 5); // R plane, black
    expect(t[2]).toBeCloseTo((1 - 0.456) / 0.224, 5); // G plane
    expect(t[5]).toBeCloseTo(-0.406 / 0.225, 5); // B plane, black
  });

  it("turns logits into alpha with a sigmoid", () => {
    expect([...toAlpha(new Float32Array([-20, 0, 20]))]).toEqual([0, 128, 255]);
  });

  it("hashes like Node's SHA-256", async () => {
    const bytes = new TextEncoder().encode("privora");
    expect(await sha256(bytes.buffer as ArrayBuffer)).toBe(createHash("sha256").update(bytes).digest("hex"));
  });

  it("names the model file after its hash, so a new model never hits an old cache", () => {
    expect(modelFile(birefnet)).toBe(`birefnet-lite-int8-${birefnet.sha256.slice(0, 8)}.onnx.gz`);
    expect(modelPath(birefnet)).toMatch(/^\/models\/birefnet-lite-int8-[0-9a-f]{8}\.onnx\.gz$/);
  });
});
