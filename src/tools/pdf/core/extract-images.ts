import { unzlibSync } from "fflate";
import { PDFDict, PDFName, PDFNumber, type PDFDocument } from "pdf-lib";
import { PdfError } from "./errors";
import { openPdf } from "./load";
import { encodePng, pngFromIdat } from "./png";
import { collectImages, type ImageObject } from "./xobjects";

export interface ExtractedImage {
  name: string;
  bytes: Uint8Array;
}

export interface ExtractImagesResult {
  images: ExtractedImage[];
  /** Images found but stored in a form this tool can't export losslessly. */
  skipped: number;
}

/** Refuse images whose raw pixels would need more than this much memory. */
const MAX_RAW_BYTES = 200 * 1024 * 1024;

function predictorParams(img: ImageObject) {
  const parms = img.stream.dict.lookupMaybe(PDFName.of("DecodeParms"), PDFDict);
  if (!parms) return null;
  const get = (k: string, d: number) => {
    const v = parms.lookup(PDFName.of(k));
    return v instanceof PDFNumber ? v.asNumber() : d;
  };
  return { predictor: get("Predictor", 1), colors: get("Colors", 1), bpc: get("BitsPerComponent", 8), columns: get("Columns", 1) };
}

function exportOne(img: ImageObject): ExtractedImage["bytes"] | null {
  const raw = img.stream.contents;
  // JPEG and JPEG 2000 data are complete image files already: copied byte for byte.
  if (img.filter === "DCTDecode") return raw;
  if (img.filter === "JPXDecode") return raw;
  const ch = img.components;
  if (img.filter !== "FlateDecode" || img.bitsPerComponent !== 8 || (ch !== 1 && ch !== 3) || img.special) return null;
  if (img.width * img.height * ch > MAX_RAW_BYTES) return null;
  const p = predictorParams(img);
  if (p && p.predictor >= 10) {
    // PNG predictors: the stream already is a PNG IDAT payload.
    if (p.colors !== ch || p.bpc !== 8 || p.columns !== img.width) return null;
    return pngFromIdat(img.width, img.height, ch, raw);
  }
  if (p && p.predictor !== 1) return null; // TIFF predictor: not supported
  const pixels = unzlibSync(raw);
  if (pixels.length < img.width * img.height * ch) return null;
  return encodePng(img.width, img.height, ch, pixels);
}

const extFor = (img: ImageObject) => (img.filter === "DCTDecode" ? "jpg" : img.filter === "JPXDecode" ? "jp2" : "png");

export async function extractImages(bytes: Uint8Array, onProgress: (p: number) => void = () => {}): Promise<ExtractImagesResult> {
  const doc: PDFDocument = await openPdf(bytes);
  const found = collectImages(doc);
  if (found.length === 0) throw new PdfError("no-images");
  const images: ExtractedImage[] = [];
  let skipped = 0;
  const perPage = new Map<number, number>();
  found.forEach((img, i) => {
    let out: Uint8Array | null = null;
    try {
      out = exportOne(img);
    } catch {
      out = null;
    }
    if (out) {
      const n = (perPage.get(img.page) ?? 0) + 1;
      perPage.set(img.page, n);
      images.push({ name: `page-${img.page}-image-${n}.${extFor(img)}`, bytes: out });
    } else skipped++;
    onProgress(Math.round(((i + 1) / found.length) * 90));
  });
  if (images.length === 0) throw new PdfError("no-images");
  return { images, skipped };
}
