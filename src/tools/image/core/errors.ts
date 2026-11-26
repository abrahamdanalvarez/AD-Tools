/** Error codes thrown by the image tools. Workers pass only the code across. */
export const imageErrorMessages = {
  decode: "This image could not be opened. It may be damaged, or your browser may not support this format.",
  "too-large": "This image is too large to process safely in your browser. Try a smaller image.",
  "encode-unsupported": "Your browser can't create this format. Try PNG or JPG instead.",
  encode: "The image could not be created. It may be too large for your browser.",
  "no-metadata": "This image has no metadata to remove.",
  base64: "That isn't a valid image in Base64. Paste a data URL (data:image/png;base64,…) or plain Base64 of a PNG, JPG, WebP, GIF, BMP or ICO image.",
  "crop-empty": "The crop area is empty. Make it at least 1 pixel wide and tall.",
  size: "Enter a width and height between 1 and 20,000 pixels.",
  text: "Enter some text.",
  unknown: "Something went wrong while processing the image. Nothing was sent anywhere. Try again, or try a smaller image.",
} as const;

export type ImageErrorCode = keyof typeof imageErrorMessages;

export class ImageError extends Error {
  constructor(public code: ImageErrorCode) {
    super(code);
    this.name = "ImageError";
  }
}
