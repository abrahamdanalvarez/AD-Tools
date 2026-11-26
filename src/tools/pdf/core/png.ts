import { zlibSync } from "fflate";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(parts: Uint8Array[]): number {
  let c = 0xffffffff;
  for (const p of parts) for (let i = 0; i < p.length; i++) c = CRC_TABLE[(c ^ p[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  const name = new TextEncoder().encode(type);
  out.set(name, 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32([name, data]));
  return out;
}

/**
 * Build a PNG from an already zlib-compressed IDAT payload (PNG-filtered rows).
 * channels: 1 = gray, 3 = RGB, 4 = RGBA. 8 bits per channel.
 */
export function pngFromIdat(width: number, height: number, channels: 1 | 3 | 4, idat: Uint8Array): Uint8Array {
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = channels === 1 ? 0 : channels === 3 ? 2 : 6;
  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** PNG from raw, unfiltered 8-bit pixels. */
export function encodePng(width: number, height: number, channels: 1 | 3 | 4, pixels: Uint8Array): Uint8Array {
  const stride = width * channels;
  const rows = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y++) rows.set(pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  return pngFromIdat(width, height, channels, zlibSync(rows, { level: 6 }));
}
