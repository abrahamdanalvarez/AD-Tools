// Colour parsing and conversion (sRGB). Pure, unit-tested.
import { InputError } from "./encode";

export interface Rgba {
  r: number;
  g: number;
  b: number;
  /** 0–1 */
  a: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

function num(s: string, scale: number): number {
  const t = s.trim();
  if (!/^-?\d*\.?\d+%?$/.test(t)) throw new InputError(`"${s}" isn't a number.`);
  return t.endsWith("%") ? (parseFloat(t) / 100) * scale : parseFloat(t);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

/** Accepts #rgb, #rgba, #rrggbb, #rrggbbaa (with or without #), rgb()/rgba(), hsl()/hsla(), or "r, g, b". */
export function parseColour(input: string): Rgba {
  const t = input.trim().toLowerCase();
  const hex = t.replace(/^#/, "");
  if (/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(hex)) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex;
    const v = (i: number) => parseInt(full.slice(i, i + 2), 16);
    return { r: v(0), g: v(2), b: v(4), a: full.length === 8 ? round(v(6) / 255, 3) : 1 };
  }
  const fn = t.match(/^(rgba?|hsla?)\((.*)\)$/);
  const body = fn ? fn[2] : /^[\d.\s,%]+$/.test(t) ? t : null;
  if (body === null) throw new InputError("Enter a colour as HEX (#ff8800), RGB (rgb(255, 136, 0)) or HSL (hsl(32, 100%, 50%)).");
  const parts = body.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3 || parts.length > 4) throw new InputError("A colour needs 3 values, plus an optional alpha.");
  const a = parts[3] !== undefined ? clamp(num(parts[3], 1), 0, 1) : 1;
  if (fn && fn[1].startsWith("hsl")) {
    const h = ((parseFloat(parts[0]) % 360) + 360) % 360;
    if (Number.isNaN(h)) throw new InputError(`"${parts[0]}" isn't a hue.`);
    const [r, g, b] = hslToRgb(h, clamp(num(parts[1], 100), 0, 100) / 100, clamp(num(parts[2], 100), 0, 100) / 100);
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
  }
  const [r, g, b] = parts.slice(0, 3).map((p) => num(p, 255));
  if ([r, g, b].some((v) => v < 0 || v > 255)) throw new InputError("RGB values go from 0 to 255.");
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a };
}

const hex2 = (v: number) => Math.round(v).toString(16).padStart(2, "0");

export function toHex({ r, g, b, a }: Rgba): string {
  return `#${hex2(r)}${hex2(g)}${hex2(b)}${a < 1 ? hex2(a * 255) : ""}`;
}

export function toRgb({ r, g, b, a }: Rgba): string {
  return a < 1 ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
}

export function hsl({ r, g, b }: Rgba): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B), min = Math.min(R, G, B), l = (max + min) / 2;
  if (max === min) return [0, 0, round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [round(h * 60), round(s * 100), round(l * 100)];
}

export function toHsl(c: Rgba): string {
  const [h, s, l] = hsl(c);
  return c.a < 1 ? `hsla(${h}, ${s}%, ${l}%, ${c.a})` : `hsl(${h}, ${s}%, ${l}%)`;
}

export function toHsv({ r, g, b }: Rgba): string {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B), d = max - Math.min(R, G, B);
  const h = d === 0 ? 0 : max === R ? ((G - B) / d + 6) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return `hsv(${round(h * 60)}, ${round(max ? (d / max) * 100 : 0)}%, ${round(max * 100)}%)`;
}

/** Naive CMYK (no colour profile): only a rough guide for print. */
export function toCmyk({ r, g, b }: Rgba): string {
  const k = 1 - Math.max(r, g, b) / 255;
  if (k === 1) return "cmyk(0%, 0%, 0%, 100%)";
  const c = (v: number) => round(((1 - v / 255 - k) / (1 - k)) * 100);
  return `cmyk(${c(r)}%, ${c(g)}%, ${c(b)}%, ${round(k * 100)}%)`;
}

/** WCAG 2 relative luminance and contrast ratio. */
export function luminance({ r, g, b }: Rgba): number {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: Rgba, b: Rgba): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return round((x + 0.05) / (y + 0.05), 2);
}
