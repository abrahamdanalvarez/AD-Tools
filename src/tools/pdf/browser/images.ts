import { extensionOf } from "@/lib/files";
import { jpegOrientation, type PdfImageInput } from "../core/images";

/**
 * Prepare an image for embedding. JPG and PNG are used as-is (no quality
 * loss). Other formats (WebP, GIF, BMP, AVIF) and mirrored-EXIF JPEGs are
 * decoded by the browser and re-encoded: PNG when they have transparency,
 * otherwise high-quality JPEG to keep the PDF small.
 */
export async function normalizeImage(file: File): Promise<PdfImageInput> {
  const ext = extensionOf(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (isPng && ext === "png") return { bytes, kind: "png" };
  if (isJpg && (ext === "jpg" || ext === "jpeg") && [1, 3, 6, 8].includes(jpegOrientation(bytes))) return { bytes, kind: "jpg" };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: file.type || undefined }));
  } catch {
    throw new Error("image");
  }
  const canvas = Object.assign(document.createElement("canvas"), { width: bitmap.width, height: bitmap.height });
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let transparent = false;
  for (let i = 3; i < data.length; i += 4)
    if (data[i] < 255) {
      transparent = true;
      break;
    }
  const type = transparent ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.92));
  canvas.width = canvas.height = 0;
  if (!blob) throw new Error("image");
  return { bytes: new Uint8Array(await blob.arrayBuffer()), kind: transparent ? "png" : "jpg" };
}
