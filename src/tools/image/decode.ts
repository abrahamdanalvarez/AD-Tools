// Decoding runs on the page (it needs <img> for SVG and as a fallback). The
// decoded bitmap is then transferred to a worker for the pixel work.
import { ImageError } from "./core/errors";
import { formatLabel, isAnimated, sniff, type ImageFormat } from "./core/formats";
import { hasTransparency } from "./core/pixels";
import { fitsLimits, type Size } from "./core/size";
import { context, makeCanvas } from "./render";

/** Size an SVG asks for: width/height in px, else its viewBox, else 300 × 150 like browsers. */
function svgSize(root: Element): Size {
  const px = (v: string | null) => (v && /^\s*[\d.]+\s*(px)?\s*$/.test(v) ? parseFloat(v) : 0);
  const vb = (root.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  const vbw = vb.length === 4 && vb[2] > 0 ? vb[2] : 0;
  const vbh = vb.length === 4 && vb[3] > 0 ? vb[3] : 0;
  let width = px(root.getAttribute("width"));
  let height = px(root.getAttribute("height"));
  if (!width && !height) [width, height] = vbw ? [vbw, vbh] : [300, 150];
  else if (!width) width = vbw ? (height * vbw) / vbh : height;
  else if (!height) height = vbw ? (width * vbh) / vbw : width;
  return { width, height };
}

async function viaImg(blob: Blob, size?: Size): Promise<ImageBitmap> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const s = size ?? { width: img.naturalWidth, height: img.naturalHeight };
    if (!s.width || !s.height) throw new ImageError("decode");
    if (!fitsLimits(s)) throw new ImageError("too-large");
    const canvas = makeCanvas(Math.round(s.width), Math.round(s.height));
    context(canvas).drawImage(img, 0, 0, canvas.width, canvas.height);
    const bitmap = await createImageBitmap(canvas);
    canvas.width = canvas.height = 0;
    return bitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * SVG is only ever loaded as an image (<img>), where browsers run no scripts
 * and fetch no external resources. It is never inserted into the page.
 */
async function decodeSvg(file: Blob, scale: number): Promise<ImageBitmap> {
  const doc = new DOMParser().parseFromString(await file.text(), "image/svg+xml");
  const root = doc.documentElement;
  if (root.nodeName !== "svg") throw new ImageError("decode");
  const size = svgSize(root);
  const target = { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
  // Explicit pixel size: Firefox can't draw SVGs without one.
  root.setAttribute("width", String(target.width));
  root.setAttribute("height", String(target.height));
  if (!root.hasAttribute("viewBox")) root.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
  const blob = new Blob([new XMLSerializer().serializeToString(doc)], { type: "image/svg+xml" });
  return viaImg(blob, target);
}

export async function decodeImage(file: Blob, svgScale = 1): Promise<ImageBitmap> {
  const head = new Uint8Array(await file.slice(0, 1024).arrayBuffer());
  try {
    if (sniff(head) === "svg") return await decodeSvg(file, svgScale);
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      bitmap = await viaImg(file);
    }
    if (!fitsLimits(bitmap)) {
      bitmap.close();
      throw new ImageError("too-large");
    }
    return bitmap;
  } catch (err) {
    throw err instanceof ImageError ? err : new ImageError("decode");
  }
}

export interface ImageInfo {
  format: ImageFormat | null;
  label: string;
  width: number;
  height: number;
  animated: boolean;
  /** Has (partly) transparent pixels, checked on a downscaled copy. */
  alpha: boolean;
}

const MAY_HAVE_ALPHA = new Set<ImageFormat | null>(["png", "webp", "gif", "ico", "avif", "svg", "bmp", null]);

export async function inspectImage(file: File): Promise<ImageInfo> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = sniff(bytes);
  const bitmap = await decodeImage(file);
  const { width, height } = bitmap;
  let alpha = false;
  if (MAY_HAVE_ALPHA.has(format)) {
    const scale = Math.min(1, 256 / Math.max(width, height));
    const c = makeCanvas(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
    const ctx = context(c);
    ctx.drawImage(bitmap, 0, 0, c.width, c.height);
    alpha = hasTransparency(ctx.getImageData(0, 0, c.width, c.height).data);
    c.width = c.height = 0;
  }
  bitmap.close();
  return { format, label: format ? formatLabel[format] : file.type.replace("image/", "").toUpperCase() || "Image", width, height, animated: isAnimated(bytes, format), alpha };
}
