// @vitest-environment node
import init, { optimise } from "@jsquash/oxipng/codec/pkg/squoosh_oxipng.js";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { tinyJpg } from "@/tools/pdf/core/fixtures";
import { jpegOrientation } from "@/tools/pdf/core/images";
import { encodePng } from "@/tools/pdf/core/png";
import { decodeBase64Image } from "../ui/Base64ToImage";
import { isAnimated, pngChunks, sniff } from "./formats";
import { encodeIco } from "./ico";
import { stripMetadata } from "./metadata";
import { adjustPixels, blurPixels, hasTransparency, noAdjust, palette } from "./pixels";
import { fitsLimits, resizedSize } from "./size";

const bytes = (...parts: (number[] | string)[]) =>
  Uint8Array.from(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

/** A JPEG with an EXIF APP1 (orientation 6), an IPTC APP13 and a comment before the image data. */
function jpegWithMetadata(): Uint8Array {
  const jpg = tinyJpg();
  const exif = bytes([0xff, 0xe1, 0, 34], "Exif\0\0", "MM\0*", [0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0]);
  const iptc = bytes([0xff, 0xed, 0, 12], "Photoshop!");
  const com = bytes([0xff, 0xfe, 0, 8], "secret");
  return new Uint8Array([...jpg.subarray(0, 2), ...exif, ...iptc, ...com, ...jpg.subarray(2)]);
}

function pngChunk(type: string, data: number[]): number[] {
  // CRC isn't checked by the stripper, so zeros are fine here.
  return [0, 0, 0, data.length, ...[...type].map((c) => c.charCodeAt(0)), ...data, 0, 0, 0, 0];
}

const gradient = (w: number, h: number) => {
  const px = new Uint8Array(w * h * 3);
  for (let i = 0; i < px.length; i++) px[i] = (i * 7) % 256;
  return encodePng(w, h, 3, px);
};

describe("format detection", () => {
  it("detects formats by their bytes, not their names", () => {
    expect(sniff(tinyJpg())).toBe("jpeg");
    expect(sniff(gradient(2, 2))).toBe("png");
    expect(sniff(bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 "))).toBe("webp");
    expect(sniff(bytes("GIF89a", [0, 0, 0, 0, 0, 0]))).toBe("gif");
    expect(sniff(bytes([0, 0, 0, 0x18], "ftypheic", [0, 0, 0, 0]))).toBe("heic");
    expect(sniff(bytes([0, 0, 0, 0x18], "ftypavif", [0, 0, 0, 0]))).toBe("avif");
    expect(sniff(bytes('<?xml version="1.0"?>\n<!-- x -->\n<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBe("svg");
    expect(sniff(bytes("hello, this is not an image"))).toBeNull();
  });

  it("detects animation in GIF, WebP and PNG", () => {
    const frame = [0x21, 0xf9, 0x04, 0, 10, 0, 0, 0, 0x2c];
    expect(isAnimated(bytes("GIF89a", [1, 0, 1, 0, 0, 0, 0], frame, [0, 0, 0], frame), "gif")).toBe(true);
    expect(isAnimated(bytes("GIF89a", [1, 0, 1, 0, 0, 0, 0], frame), "gif")).toBe(false);
    expect(isAnimated(bytes("RIFF", [0, 0, 0, 0], "WEBPVP8X", [10, 0, 0, 0, 0x02]), "webp")).toBe(true);
    expect(isAnimated(bytes("RIFF", [0, 0, 0, 0], "WEBPVP8X", [10, 0, 0, 0, 0x10]), "webp")).toBe(false);
    const png = gradient(2, 2);
    const apng = new Uint8Array([...png.subarray(0, 33), ...pngChunk("acTL", [0, 0, 0, 2, 0, 0, 0, 0]), ...png.subarray(33)]);
    expect(isAnimated(apng, "png")).toBe(true);
    expect(isAnimated(png, "png")).toBe(false);
  });
});

describe("metadata removal", () => {
  it("strips JPEG metadata losslessly but keeps the orientation", () => {
    const input = jpegWithMetadata();
    expect(jpegOrientation(input)).toBe(6);
    const out = stripMetadata(input)!;
    const text = new TextDecoder("latin1").decode(out.bytes);
    expect(text).not.toContain("Photoshop");
    expect(text).not.toContain("secret");
    expect(jpegOrientation(out.bytes)).toBe(6);
    expect(out.removed).toBeGreaterThan(0);
    // The image data (from the start-of-scan marker on) is byte for byte the same.
    const scan = (b: Uint8Array) => b.subarray(b.findIndex((v, i) => v === 0xff && b[i + 1] === 0xda));
    expect(scan(out.bytes)).toEqual(scan(tinyJpg()));
  });

  it("strips PNG text chunks and WebP EXIF/XMP chunks", () => {
    const png = gradient(2, 2);
    const withText = new Uint8Array([...png.subarray(0, 33), ...pngChunk("tEXt", [...bytes("Author\0Ada")]), ...png.subarray(33)]);
    const out = stripMetadata(withText)!;
    expect([...pngChunks(out.bytes)].map((c) => c.type)).toEqual(["IHDR", "IDAT", "IEND"]);
    expect(out.bytes).toEqual(png);

    const webp = bytes("RIFF", [0, 0, 0, 0], "WEBP", "VP8X", [10, 0, 0, 0, 0x08, 0, 0, 0, 0, 0, 0, 0, 0, 0], "VP8 ", [2, 0, 0, 0, 1, 2], "EXIF", [3, 0, 0, 0, 9, 9, 9, 0]);
    const clean = stripMetadata(webp)!;
    expect(new TextDecoder("latin1").decode(clean.bytes)).not.toContain("EXIF");
    expect(clean.bytes[20] & 0x08).toBe(0); // EXIF flag cleared
    expect(new DataView(clean.bytes.buffer).getUint32(4, true)).toBe(clean.bytes.length - 8);
  });

  it("reports when there is nothing to remove", () => {
    expect(stripMetadata(gradient(2, 2))!.removed).toBe(0);
    expect(stripMetadata(bytes("GIF89a", [0, 0, 0, 0, 0, 0]))).toBeNull();
  });
});

describe("pixels", () => {
  it("adjusts brightness, contrast, saturation and grayscale", () => {
    const px = () => new Uint8ClampedArray([200, 100, 50, 255]);
    let d = px();
    adjustPixels(d, { ...noAdjust, grayscale: true });
    expect(d[0]).toBe(d[1]);
    expect(d[1]).toBe(d[2]);
    d = px();
    adjustPixels(d, { ...noAdjust, brightness: 20 });
    expect([...d]).toEqual([251, 151, 101, 255]);
    d = px();
    adjustPixels(d, noAdjust);
    expect([...d]).toEqual([...px()]);
  });

  it("blurs without changing flat areas", () => {
    const flat = new Uint8ClampedArray(4 * 4 * 4).fill(120);
    blurPixels(flat, 4, 4, 4);
    expect(flat.every((v) => v === 120)).toBe(true);
    const dot = new Uint8ClampedArray(5 * 5 * 4);
    dot[(2 * 5 + 2) * 4] = 255;
    blurPixels(dot, 5, 5, 2);
    expect(dot[(2 * 5 + 2) * 4]).toBeLessThan(255);
    expect(dot[(2 * 5 + 3) * 4]).toBeGreaterThan(0);
  });

  it("finds transparency and dominant colours", () => {
    expect(hasTransparency(new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 254]))).toBe(true);
    expect(hasTransparency(new Uint8ClampedArray([0, 0, 0, 255]))).toBe(false);
    const d = new Uint8ClampedArray(100 * 4);
    for (let i = 0; i < 100; i++) d.set(i < 70 ? [255, 0, 0, 255] : [0, 0, 255, 255], i * 4);
    expect(palette(d, 2)).toEqual(["#ff0000", "#0000ff"]);
  });
});

describe("sizes, icons and Base64", () => {
  it("computes output sizes", () => {
    const src = { width: 4000, height: 3000 };
    expect(resizedSize(src, { mode: "percent", percent: 50, width: 0, height: 0 })).toEqual({ width: 2000, height: 1500 });
    expect(resizedSize(src, { mode: "fit", percent: 0, width: 1920, height: 1920 })).toEqual({ width: 1920, height: 1440 });
    expect(resizedSize(src, { mode: "fit", percent: 0, width: 800, height: 0 })).toEqual({ width: 800, height: 600 });
    expect(resizedSize(src, { mode: "exact", percent: 0, width: 100, height: 100 })).toEqual({ width: 100, height: 100 });
    expect(fitsLimits({ width: 10_000, height: 10_000 })).toBe(false);
  });

  it("writes a valid ICO directory", () => {
    const a = gradient(16, 16), b = gradient(32, 32);
    const ico = encodeIco([{ size: 16, png: a }, { size: 32, png: b }]);
    const v = new DataView(ico.buffer);
    expect([v.getUint16(0, true), v.getUint16(2, true), v.getUint16(4, true)]).toEqual([0, 1, 2]);
    expect(sniff(ico)).toBe("ico");
    const off = v.getUint32(6 + 16 + 12, true);
    expect(ico.subarray(off, off + b.length)).toEqual(b);
  });

  it("decodes Base64 images by their bytes and refuses SVG and junk", () => {
    const png = gradient(2, 2);
    const b64 = Buffer.from(png).toString("base64");
    expect(decodeBase64Image(`data:image/png;base64,${b64}`)!.format).toBe("png");
    expect(decodeBase64Image(` ${b64.slice(0, 20)}\n${b64.slice(20)} `)!.bytes).toEqual(png);
    expect(decodeBase64Image(`data:image/png;base64,${Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>").toString("base64")}`)).toBeNull();
    expect(decodeBase64Image("not base64 at all!")).toBeNull();
  });
});

describe("oxipng", () => {
  it("optimises a PNG losslessly", async () => {
    const require = createRequire(import.meta.url);
    await init(readFileSync(require.resolve("@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm")));
    const png = encodePng(64, 64, 3, new Uint8Array(64 * 64 * 3).fill(200));
    const out = optimise(png, 2, false, true);
    expect(sniff(out)).toBe("png");
    expect(out.length).toBeLessThanOrEqual(png.length);
  });
});
