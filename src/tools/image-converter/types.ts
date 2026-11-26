export type OutputType = "image/png" | "image/jpeg" | "image/webp";

export interface ConvertInput {
  file: Blob;
  type: OutputType;
  /** 0–1, used for JPEG and WebP. */
  quality: number;
}

export interface ConvertResult {
  blob: Blob;
  width: number;
  height: number;
}

export const outputs: { type: OutputType; ext: string; label: string; lossy: boolean }[] = [
  { type: "image/png", ext: "png", label: "PNG", lossy: false },
  { type: "image/jpeg", ext: "jpg", label: "JPG", lossy: true },
  { type: "image/webp", ext: "webp", label: "WebP", lossy: true },
];

export const errorMessages: Record<string, string> = {
  decode: "This image could not be opened. It may be damaged, or your browser may not support this format.",
  "encode-unsupported": "Your browser cannot create this format. Try PNG or JPG instead.",
  encode: "The image could not be converted. It may be too large for your browser.",
};
