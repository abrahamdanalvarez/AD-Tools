// Pixel operations on RGBA data. Plain loops instead of canvas `filter`,
// which Safari doesn't support, so every browser gives the same result.

export interface Adjust {
  /** -100…100, 0 = unchanged. */
  brightness: number;
  contrast: number;
  saturation: number;
  grayscale: boolean;
}

export const noAdjust: Adjust = { brightness: 0, contrast: 0, saturation: 0, grayscale: false };

export function adjustPixels(d: Uint8ClampedArray, a: Adjust) {
  const bright = (a.brightness / 100) * 255;
  const c = a.contrast / 100;
  const contrast = c >= 0 ? 1 + c * 3 : 1 + c; // up to 4×, down to flat grey
  const sat = a.grayscale ? 0 : 1 + a.saturation / 100;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    // Rec. 709 luma weights.
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = y + (r - y) * sat;
    g = y + (g - y) * sat;
    b = y + (b - y) * sat;
    d[i] = (r - 128) * contrast + 128 + bright;
    d[i + 1] = (g - 128) * contrast + 128 + bright;
    d[i + 2] = (b - 128) * contrast + 128 + bright;
  }
}

/** Box blur, three passes (close to a Gaussian). Radius in pixels. */
export function blurPixels(d: Uint8ClampedArray, w: number, h: number, radius: number) {
  const r = Math.max(1, Math.round(radius / 2));
  const tmp = new Uint8ClampedArray(d.length);
  for (let pass = 0; pass < 3; pass++) {
    boxPass(d, tmp, w, h, r, 4, w * 4); // horizontal
    boxPass(tmp, d, h, w, r, w * 4, 4); // vertical
  }
}

/** One 1-D box pass: `n` lines of `len` pixels, stepping `step` bytes along a line and `line` bytes between lines. */
function boxPass(src: Uint8ClampedArray, dst: Uint8ClampedArray, len: number, n: number, r: number, step: number, line: number) {
  const size = 2 * r + 1;
  for (let l = 0; l < n; l++) {
    const base = l * line;
    for (let ch = 0; ch < 4; ch++) {
      // Edges repeat the first and last pixel.
      const at = (k: number) => src[base + Math.min(len - 1, Math.max(0, k)) * step + ch];
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += at(k);
      for (let x = 0; x < len; x++) {
        dst[base + x * step + ch] = sum / size;
        sum += at(x + r + 1) - at(x - r);
      }
    }
  }
}

export function hasTransparency(d: Uint8ClampedArray): boolean {
  for (let i = 3; i < d.length; i += 4) if (d[i] < 255) return true;
  return false;
}

export const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

/**
 * Dominant colours by median cut (split at the range midpoint). Ignores transparent pixels and samples at
 * most ~40,000 pixels, so large images stay fast.
 */
export function palette(d: Uint8ClampedArray, count: number): string[] {
  const step = Math.max(1, Math.floor(d.length / 4 / 40_000)) * 4;
  let boxes: number[][][] = [[]];
  for (let i = 0; i < d.length; i += step) if (d[i + 3] >= 128) boxes[0].push([d[i], d[i + 1], d[i + 2]]);
  if (boxes[0].length === 0) return [];
  while (boxes.length < count) {
    // Split the box with the widest colour range along that channel.
    let best = -1, bestRange = 0, bestCh = 0, mid = 0;
    boxes.forEach((box, bi) => {
      if (box.length < 2) return;
      for (let ch = 0; ch < 3; ch++) {
        let lo = 255, hi = 0;
        for (const p of box) {
          if (p[ch] < lo) lo = p[ch];
          if (p[ch] > hi) hi = p[ch];
        }
        if (hi - lo > bestRange) [best, bestRange, bestCh, mid] = [bi, hi - lo, ch, (lo + hi) / 2];
      }
    });
    if (best < 0) break;
    // Split at the middle of the colour range, so a large area of one colour isn't mixed into the next.
    const box = boxes[best];
    boxes = [...boxes.slice(0, best), box.filter((p) => p[bestCh] < mid), box.filter((p) => p[bestCh] >= mid), ...boxes.slice(best + 1)];
  }
  return boxes
    .sort((p, q) => q.length - p.length)
    .map((box) => {
      const avg = [0, 1, 2].map((ch) => Math.round(box.reduce((s, p) => s + p[ch], 0) / box.length));
      return hex(avg[0], avg[1], avg[2]);
    });
}
