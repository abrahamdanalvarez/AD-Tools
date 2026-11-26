/** An .ico file holding PNG images (supported by every current browser and Windows Vista+). */
export function encodeIco(images: { size: number; png: Uint8Array }[]): Uint8Array {
  const header = 6 + images.length * 16;
  const out = new Uint8Array(header + images.reduce((n, i) => n + i.png.length, 0));
  const v = new DataView(out.buffer);
  v.setUint16(2, 1, true); // type: icon
  v.setUint16(4, images.length, true);
  let offset = header;
  images.forEach(({ size, png }, i) => {
    const e = 6 + i * 16;
    out[e] = size >= 256 ? 0 : size; // 0 means 256
    out[e + 1] = size >= 256 ? 0 : size;
    v.setUint16(e + 4, 1, true); // colour planes
    v.setUint16(e + 6, 32, true); // bits per pixel
    v.setUint32(e + 8, png.length, true);
    v.setUint32(e + 12, offset, true);
    out.set(png, offset);
    offset += png.length;
  });
  return out;
}
