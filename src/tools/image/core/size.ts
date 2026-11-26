/** Largest canvas Privora creates. Browsers fail above about 16–270 MP depending on the engine and device. */
export const MAX_PIXELS = 50_000_000;
export const MAX_SIDE = 20_000;

export interface Size {
  width: number;
  height: number;
}

export type ResizeMode = "fit" | "exact" | "percent";

export interface Resize {
  mode: ResizeMode;
  width: number;
  height: number;
  percent: number;
}

/** Output size. "fit" keeps the aspect ratio inside width × height (either may be 0 = any). */
export function resizedSize(src: Size, r: Resize): Size {
  let { width, height } = src;
  if (r.mode === "percent") {
    width = (src.width * r.percent) / 100;
    height = (src.height * r.percent) / 100;
  } else if (r.mode === "exact") {
    width = r.width;
    height = r.height;
  } else {
    const scale = Math.min(r.width ? r.width / src.width : Infinity, r.height ? r.height / src.height : Infinity);
    if (Number.isFinite(scale)) {
      width = src.width * scale;
      height = src.height * scale;
    }
  }
  return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
}

export const fitsLimits = ({ width, height }: Size) =>
  width >= 1 && height >= 1 && width <= MAX_SIDE && height <= MAX_SIDE && width * height <= MAX_PIXELS;
