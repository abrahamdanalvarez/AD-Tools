// Pure conversions between pixels and model tensors (unit-tested in Node).

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/** RGBA pixels → planar RGB float tensor [1, 3, h, w], normalised with ImageNet mean and std. */
export function toTensor(rgba: Uint8ClampedArray, pixels: number): Float32Array {
  const out = new Float32Array(3 * pixels);
  for (let c = 0; c < 3; c++) {
    const scale = 1 / (255 * STD[c]);
    const shift = MEAN[c] / STD[c];
    const plane = c * pixels;
    for (let i = 0; i < pixels; i++) out[plane + i] = rgba[i * 4 + c] * scale - shift;
  }
  return out;
}

/** Model logits → alpha (0–255) through a sigmoid. */
export function toAlpha(logits: Float32Array): Uint8ClampedArray {
  const out = new Uint8ClampedArray(logits.length);
  for (let i = 0; i < logits.length; i++) out[i] = 255 / (1 + Math.exp(-logits[i]));
  return out;
}

/** Hex SHA-256 of some bytes (Web Crypto, available on the page, in workers and in Node). */
export async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}
