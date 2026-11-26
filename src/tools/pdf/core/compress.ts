import { PDFName, PDFNumber, PDFRawStream } from "pdf-lib";
import { openPdf, savePdf } from "./load";
import { collectImages } from "./xobjects";

/** Re-encodes one JPEG (browser canvas in practice). Returns null to keep the original. */
export type JpegEncoder = (
  jpeg: Uint8Array,
  maxSide: number,
  quality: number,
) => Promise<{ bytes: Uint8Array; width: number; height: number } | null>;

export type CompressLevel = "light" | "balanced" | "strong";

export const compressLevels: Record<CompressLevel, { quality: number; maxSide: number }> = {
  light: { quality: 0.85, maxSide: 3000 },
  balanced: { quality: 0.7, maxSide: 2000 },
  strong: { quality: 0.5, maxSide: 1400 },
};

export interface CompressResult {
  bytes: Uint8Array;
  imagesTotal: number;
  imagesRecompressed: number;
  /** True when no smaller version could be made, so the original is returned unchanged. */
  unchanged: boolean;
}

/**
 * Lossy compression for photos only: JPEG images are re-encoded (and
 * downscaled if very large). Text, fonts, vector graphics, links and
 * structure are not touched, so text stays selectable. The file is then
 * re-saved with compressed object streams.
 */
export async function compressPdf(
  bytes: Uint8Array,
  level: CompressLevel,
  encode: JpegEncoder,
  onProgress: (p: number) => void = () => {},
): Promise<CompressResult> {
  const doc = await openPdf(bytes);
  const { quality, maxSide } = compressLevels[level];
  const images = collectImages(doc);
  let recompressed = 0;
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const eligible =
      img.filter === "DCTDecode" &&
      img.bitsPerComponent === 8 &&
      (img.components === 1 || img.components === 3) &&
      !img.special &&
      img.stream.contents.length > 20 * 1024;
    if (eligible) {
      const result = await encode(img.stream.contents, maxSide, quality).catch(() => null);
      if (result && result.bytes.length < img.stream.contents.length * 0.9) {
        const dict = img.stream.dict;
        dict.set(PDFName.of("Width"), PDFNumber.of(result.width));
        dict.set(PDFName.of("Height"), PDFNumber.of(result.height));
        dict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
        dict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
        dict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
        dict.delete(PDFName.of("DecodeParms"));
        doc.context.assign(img.ref, PDFRawStream.of(dict, result.bytes));
        recompressed++;
      }
    }
    onProgress(Math.round(((i + 1) / Math.max(1, images.length)) * 85));
  }
  const out = await savePdf(doc);
  const unchanged = out.length >= bytes.length;
  return { bytes: unchanged ? bytes : out, imagesTotal: images.length, imagesRecompressed: recompressed, unchanged };
}
