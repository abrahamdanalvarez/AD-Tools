import type { Faq, IconKey, ToolDefinition } from "./types";

// Image tools (Phase 05). Decoding uses the browser's own image support;
// drawing and encoding use the Canvas API in a Web Worker (OffscreenCanvas),
// with oxipng (WASM) for lossless PNG optimisation. Everything runs on the device.

// Module workers (Firefox 114), Safari 16.4 (falls back to the page without OffscreenCanvas).
const browsers = { chrome: "111", edge: "111", firefox: "114", safari: "16.4" };

const privacyFaq: Faq = {
  q: "Are my images uploaded?",
  a: "No. Your browser opens and processes the image on your device. It is never sent to a server, and nothing is kept after you leave the page.",
};

const ALL_IN = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif", "svg", "ico"];
const OUT = ["png", "jpg", "webp"];

const webpNote = "WebP output needs a browser that can create WebP files (Chrome, Edge, Firefox). Some Safari versions can only read WebP, and the tool says so.";
const firstFrame = "Animated GIF, WebP and PNG files keep only their first frame. The tool warns you before it runs.";
const noMeta = "Saving a new image drops metadata such as camera details and location. Photos are turned upright first, using their orientation tag.";
const transparencyJpg = "JPG has no transparency, so transparent areas become white. The tool warns you when this applies.";
const canvasLimit = "Images over 50 megapixels are refused, and some phones fail sooner because of browser memory limits.";
const formats = "Reads PNG, JPG, WebP, GIF, BMP, AVIF, SVG and ICO. HEIC and TIFF aren't supported yet (Safari can open them, other browsers can't).";
const svgSafe = "SVG files are drawn as images, so any scripts or links to other websites inside them never run or load.";

interface Spec {
  id: string;
  name: string;
  icon: IconKey;
  description: string;
  seoDescription: string;
  keywords: string[];
  engine?: string;
  mode?: ToolDefinition["processingMode"];
  input?: string[];
  output?: string[];
  popular?: boolean;
  related: string[];
  limitations: string[];
  steps: string[];
  faqs?: Faq[];
  notes?: string;
}

const CANVAS = "Canvas API (OffscreenCanvas in a worker)";

const tool = (s: Spec): ToolDefinition => ({
  id: s.id,
  name: s.name,
  slug: s.id,
  category: "image",
  description: s.description,
  icon: s.icon,
  keywords: s.keywords,
  engine: s.engine ?? CANVAS,
  processingMode: s.mode ?? "web-worker",
  inputFormats: s.input ?? ALL_IN,
  outputFormats: s.output ?? OUT,
  browsers: s.notes ? { ...browsers, notes: s.notes } : browsers,
  maxFileSizeMB: 50,
  model: null,
  enabled: true,
  status: "verified",
  popular: s.popular ?? false,
  seoTitle: `${s.name} — Free & Private Online Tool | Privora`,
  seoDescription: s.seoDescription,
  related: s.related,
  limitations: s.limitations,
  steps: s.steps,
  faqs: [privacyFaq, ...(s.faqs ?? [])],
});

const seo = (what: string) => `${what} in your browser. Free, private and fast: your images are never uploaded.`;

/** JPG to PNG, PNG to WebP and the other fixed pairs. */
function pair(from: "jpg" | "png" | "webp", to: "jpg" | "png" | "webp"): ToolDefinition {
  const F = from === "webp" ? "WebP" : from.toUpperCase();
  const T = to === "webp" ? "WebP" : to.toUpperCase();
  const limits: string[] = [];
  if (to === "jpg" && from !== "jpg") limits.push(transparencyJpg);
  if (from !== "jpg") limits.push(firstFrame);
  if (to === "webp") limits.push(webpNote);
  limits.push(noMeta);
  return tool({
    id: `${from}-to-${to}`,
    name: `${F} to ${T}`,
    icon: "image-convert",
    description: `Convert ${F} images to ${T}${to === "png" ? ", losslessly" : ""}.`,
    seoDescription: seo(`Convert ${F} to ${T}`),
    keywords: [`${from} to ${to}`, `convert ${from} to ${to}`, `${from} ${to} converter`, `${F} to ${T} online`],
    input: from === "jpg" ? ["jpg", "jpeg"] : [from],
    output: [to],
    notes: to === "webp" ? webpNote : undefined,
    related: ["image-converter", "image-compressor", "batch-image-converter"],
    limitations: limits,
    steps: [`Choose a ${F} image.`, ...(to === "png" ? [] : ["Pick the quality."]), `Select Convert to ${T}.`, `Download the ${T} file.`],
    faqs:
      to === "png"
        ? [{ q: "Is the PNG better quality?", a: `PNG is lossless, so nothing more is lost when saving. It can't restore detail that ${F} compression already removed, and the file is usually larger.` }]
        : [{ q: "What quality should I pick?", a: "80–90% looks the same as the original for most photos. Lower values make smaller files with visible blur or blocks." }],
  });
}

export const imageTools = (): ToolDefinition[] => [
  // ── Conversion ──────────────────────────────────────────────────────────
  tool({
    id: "image-converter",
    name: "Image Converter",
    icon: "image-convert",
    description: "Convert images between PNG, JPG and WebP.",
    seoDescription: seo("Convert images between PNG, JPG and WebP"),
    keywords: [
      "convert image", "png to jpg", "jpg to png", "webp to png", "png to webp", "jpg to webp", "webp to jpg",
      "svg to png", "gif to png", "avif to jpg", "bmp to png", "ico to png",
      "image converter online", "change image format", "image format converter", "photo converter", "picture converter",
    ],
    popular: true,
    notes: `${webpNote} AVIF input depends on browser support.`,
    related: ["batch-image-converter", "image-compressor", "image-to-pdf"],
    limitations: [formats, firstFrame, transparencyJpg, noMeta, svgSafe, canvasLimit],
    steps: [
      "Choose an image from your device or drop it onto the page.",
      "Pick the output format and, for JPG or WebP, the quality.",
      "Select Convert. The work happens in your browser.",
      "Download the converted image.",
    ],
    faqs: [
      { q: "Why is WebP missing from the list?", a: "Your browser can read WebP images but can't create them (this happens in some versions of Safari). Choose PNG or JPG instead." },
      { q: "Does converting reduce quality?", a: "PNG is lossless. JPG and WebP are compressed using the quality you choose. Higher quality means larger files." },
      { q: "Can I convert to GIF, BMP, TIFF or ICO?", a: "Not here. Browsers can only create PNG, JPG and WebP. For icons, use the Favicon Generator, which makes .ico files." },
    ],
  }),
  pair("jpg", "png"),
  pair("png", "jpg"),
  pair("jpg", "webp"),
  pair("png", "webp"),
  pair("webp", "jpg"),
  pair("webp", "png"),

  // ── Optimisation ────────────────────────────────────────────────────────
  tool({
    id: "image-compressor",
    name: "Image Compressor",
    icon: "minimize",
    description: "Make JPG, PNG and WebP images smaller, with a before-and-after preview.",
    seoDescription: seo("Compress JPG, PNG and WebP images"),
    keywords: ["compress image", "reduce image size", "shrink photo", "optimize image", "compress jpg", "compress png", "image optimizer", "smaller image"],
    engine: `${CANVAS} + oxipng (WASM)`,
    popular: true,
    related: ["batch-image-compressor", "image-resizer", "image-converter"],
    limitations: [
      "JPG and WebP are re-encoded at the quality you choose, which is lossy. PNG is optimised losslessly, so it shrinks less.",
      "If the result isn't smaller, your original is kept and the tool tells you.",
      "Reducing the maximum size (for example to 1920 pixels) saves the most space.",
      noMeta,
      firstFrame,
    ],
    steps: ["Choose an image.", "Pick the format, quality and maximum size.", "Select Compress image.", "Compare before and after, then download."],
    faqs: [
      { q: "How much smaller will it get?", a: "Photos from phones and cameras often shrink by 50–80% at 75% quality, more if you reduce the size. Images that were already compressed shrink less." },
      { q: "Why didn't my PNG get much smaller?", a: "PNG keeps every pixel exactly, so there's a limit to how small it gets. Converting to JPG or WebP, or reducing the size, makes a much smaller file." },
    ],
  }),
  tool({
    id: "image-resizer",
    name: "Image Resizer",
    icon: "scaling",
    description: "Change an image's width and height in pixels or by percentage.",
    seoDescription: seo("Resize images by pixels or percentage"),
    keywords: ["resize image", "change image size", "image dimensions", "scale image", "make image smaller", "enlarge image", "resize photo"],
    related: ["batch-image-resizer", "image-cropper", "image-compressor"],
    limitations: ["Enlarging can't add detail, so big increases look soft.", "Very large reductions can look slightly less sharp in some browsers.", noMeta, firstFrame, canvasLimit],
    steps: ["Choose an image.", "Enter a new width and height, or a percentage.", "Select Resize image.", "Download the resized image."],
  }),
  tool({
    id: "image-cropper",
    name: "Image Cropper",
    icon: "crop",
    description: "Cut an image to the area you choose, freely or to a set shape.",
    seoDescription: seo("Crop images to any size or aspect ratio"),
    keywords: ["crop image", "cut image", "crop photo", "square crop", "trim image", "aspect ratio"],
    related: ["image-resizer", "image-rotator", "favicon-generator"],
    limitations: [noMeta, firstFrame],
    steps: ["Choose an image.", "Pick an aspect ratio, then drag the box or type exact numbers.", "Select Crop image.", "Download the cropped image."],
  }),
  tool({
    id: "image-rotator",
    name: "Image Rotator",
    icon: "rotate",
    description: "Turn an image 90° or 180°.",
    seoDescription: seo("Rotate images by 90 or 180 degrees"),
    keywords: ["rotate image", "turn image", "rotate photo", "rotate picture 90 degrees", "fix sideways photo"],
    related: ["image-flipper", "image-cropper", "rotate-pdf"],
    limitations: ["JPG and WebP are re-saved at high quality (92%), so a tiny amount of quality is lost.", noMeta, firstFrame],
    steps: ["Choose an image.", "Pick the direction.", "Select Rotate image.", "Download the rotated image."],
  }),
  tool({
    id: "image-flipper",
    name: "Image Flipper",
    icon: "flip",
    description: "Mirror an image horizontally or vertically.",
    seoDescription: seo("Flip or mirror images"),
    keywords: ["flip image", "mirror image", "flip photo horizontally", "reverse image", "mirror selfie"],
    related: ["image-rotator", "image-cropper", "image-converter"],
    limitations: ["JPG and WebP are re-saved at high quality (92%), so a tiny amount of quality is lost.", noMeta, firstFrame],
    steps: ["Choose an image.", "Pick horizontal, vertical or both.", "Select Flip image.", "Download the flipped image."],
  }),
  tool({
    id: "remove-image-metadata",
    name: "Remove Image Metadata",
    icon: "image-minus",
    description: "Strip EXIF, GPS location and other hidden data from photos, without losing quality.",
    seoDescription: seo("Remove EXIF and GPS metadata from photos"),
    keywords: ["remove exif", "strip metadata", "remove gps from photo", "delete photo location", "exif remover", "image privacy"],
    engine: "Lossless byte editing (no re-encoding)",
    mode: "main-thread",
    input: ["jpg", "jpeg", "png", "webp"],
    output: ["jpg", "png", "webp"],
    related: ["image-metadata-viewer", "image-info", "image-compressor"],
    limitations: [
      "Works on JPG, PNG and WebP. The image data is copied unchanged, so there's no quality loss.",
      "JPG photos keep only their orientation tag, so they still display the right way up.",
      "Colour profiles are kept, because removing them can change how colours look.",
    ],
    steps: ["Choose one or more photos.", "Select Remove metadata.", "Download the cleaned files (a ZIP if there are several)."],
    faqs: [{ q: "What gets removed?", a: "EXIF (camera, settings, date, GPS location), XMP, IPTC captions and credits, comments and PNG text. Use the Image Metadata Viewer to see what a photo contains." }],
  }),

  // ── Editing ─────────────────────────────────────────────────────────────
  tool({
    id: "add-watermark-to-image",
    name: "Image Watermark",
    icon: "stamp",
    description: "Add a text watermark to one or more images.",
    seoDescription: seo("Add a text watermark to images"),
    keywords: ["watermark image", "add watermark", "watermark photo", "copyright text on image", "protect photos"],
    related: ["add-watermark-to-pdf", "meme-generator", "batch-image-compressor"],
    limitations: ["Text watermarks only (no logo images yet).", "Uses your device's standard sans-serif font, so it can look slightly different between devices.", noMeta, firstFrame],
    steps: ["Choose one or more images.", "Type the text and pick its position, size, colour and opacity.", "Select Add watermark.", "Download the result."],
  }),
  tool({
    id: "blur-image",
    name: "Blur Image",
    icon: "droplets",
    description: "Soften a whole image with an adjustable blur.",
    seoDescription: seo("Blur images"),
    keywords: ["blur image", "blur photo", "soften image", "gaussian blur", "blurry background"],
    related: ["pixelate-image", "image-colour-adjustment", "image-cropper"],
    limitations: ["Blurs the whole image. Blurring only part of it (like faces) isn't supported yet: crop first, or use Pixelate.", noMeta, firstFrame],
    steps: ["Choose an image.", "Set the blur strength.", "Select Blur image.", "Compare and download."],
  }),
  tool({
    id: "pixelate-image",
    name: "Pixelate Image",
    icon: "grid",
    description: "Turn an image into large square pixels.",
    seoDescription: seo("Pixelate images"),
    keywords: ["pixelate image", "pixel art", "mosaic effect", "censor image", "8-bit photo"],
    related: ["blur-image", "grayscale-image", "image-resizer"],
    limitations: ["Pixelates the whole image.", noMeta, firstFrame],
    steps: ["Choose an image.", "Set the pixel size.", "Select Pixelate image.", "Compare and download."],
  }),
  tool({
    id: "grayscale-image",
    name: "Grayscale Image",
    icon: "sun-moon",
    description: "Make an image black and white.",
    seoDescription: seo("Convert images to black and white"),
    keywords: ["grayscale image", "black and white photo", "greyscale", "desaturate", "monochrome"],
    related: ["image-colour-adjustment", "adjust-image-saturation", "image-converter"],
    limitations: [noMeta, firstFrame],
    steps: ["Choose an image.", "Select Convert to grayscale.", "Compare and download."],
  }),
  tool({
    id: "adjust-image-brightness",
    name: "Brightness Adjustment",
    icon: "sun",
    description: "Make an image brighter or darker.",
    seoDescription: seo("Adjust image brightness"),
    keywords: ["brighten image", "darken image", "image brightness", "photo too dark", "lighten photo"],
    related: ["adjust-image-contrast", "image-colour-adjustment", "adjust-image-saturation"],
    limitations: [noMeta, firstFrame],
    steps: ["Choose an image.", "Move the brightness slider.", "Select Adjust brightness.", "Compare, change the settings if needed, and download."],
  }),
  tool({
    id: "adjust-image-contrast",
    name: "Contrast Adjustment",
    icon: "contrast",
    description: "Increase or reduce the contrast of an image.",
    seoDescription: seo("Adjust image contrast"),
    keywords: ["image contrast", "increase contrast", "reduce contrast", "photo contrast", "make image pop"],
    related: ["adjust-image-brightness", "image-colour-adjustment", "adjust-image-saturation"],
    limitations: [noMeta, firstFrame],
    steps: ["Choose an image.", "Move the contrast slider.", "Select Adjust contrast.", "Compare, change the settings if needed, and download."],
  }),
  tool({
    id: "adjust-image-saturation",
    name: "Saturation Adjustment",
    icon: "droplet",
    description: "Make colours more vivid or more muted.",
    seoDescription: seo("Adjust image saturation"),
    keywords: ["image saturation", "vivid colours", "mute colours", "colour intensity", "vibrance"],
    related: ["image-colour-adjustment", "grayscale-image", "adjust-image-contrast"],
    limitations: [noMeta, firstFrame],
    steps: ["Choose an image.", "Move the saturation slider.", "Select Adjust saturation.", "Compare, change the settings if needed, and download."],
  }),
  tool({
    id: "image-colour-adjustment",
    name: "Image Colour Adjustment",
    icon: "sliders",
    description: "Adjust brightness, contrast and saturation together.",
    seoDescription: seo("Adjust image brightness, contrast and saturation"),
    keywords: ["image colour adjustment", "image color adjustment", "photo editor", "colour correction", "edit photo colours"],
    related: ["adjust-image-brightness", "adjust-image-contrast", "adjust-image-saturation"],
    limitations: [noMeta, firstFrame],
    steps: ["Choose an image.", "Set brightness, contrast and saturation.", "Select Apply colour changes.", "Compare, change the settings if needed, and download."],
  }),
  tool({
    id: "meme-generator",
    name: "Meme Generator",
    icon: "smile",
    description: "Add classic top and bottom captions to your own image.",
    seoDescription: seo("Make memes from your own images"),
    keywords: ["meme generator", "make a meme", "meme maker", "caption image", "add text to image"],
    related: ["add-watermark-to-image", "image-cropper", "image-resizer"],
    limitations: ["Uses Impact where your device has it, and a similar bold font otherwise.", "Use your own images. No meme templates are included.", noMeta, firstFrame],
    steps: ["Choose an image.", "Type the top and bottom text.", "Select Make meme.", "Download your meme."],
  }),

  // ── Utilities ───────────────────────────────────────────────────────────
  tool({
    id: "image-metadata-viewer",
    name: "Image Metadata Viewer",
    icon: "file-search",
    description: "See the EXIF, GPS, IPTC and XMP data hidden in a photo.",
    seoDescription: seo("View EXIF and GPS metadata in photos"),
    keywords: ["exif viewer", "image metadata", "photo metadata", "view exif", "photo location", "camera settings"],
    engine: "exifr",
    mode: "main-thread",
    output: [],
    related: ["remove-image-metadata", "image-info", "image-colour-picker"],
    limitations: ["Reads JPG, PNG, AVIF and others. WebP and GIF metadata isn't read.", "Maker notes (private camera data) aren't shown."],
    steps: ["Choose an image.", "The metadata appears straight away, grouped by type."],
  }),
  tool({
    id: "image-info",
    name: "Image Information Viewer",
    icon: "info",
    description: "Check an image's format, dimensions, file size, transparency and camera.",
    seoDescription: seo("Check image dimensions, format and details"),
    keywords: ["image info", "image dimensions", "image size checker", "photo resolution", "check image format", "megapixels"],
    engine: "Browser image decoding + exifr",
    mode: "main-thread",
    output: [],
    related: ["image-metadata-viewer", "image-resizer", "image-compressor"],
    limitations: ["Transparency is checked on a reduced copy, so a few semi-transparent pixels can be missed."],
    steps: ["Choose an image.", "The details appear straight away."],
  }),
  tool({
    id: "image-colour-picker",
    name: "Image Colour Picker",
    icon: "pipette",
    description: "Click anywhere on an image to get the colour's HEX, RGB and HSL values.",
    seoDescription: seo("Pick colours from an image"),
    keywords: ["color picker from image", "colour picker", "eyedropper", "get hex from image", "image color code", "rgb from image"],
    mode: "main-thread",
    output: [],
    related: ["colour-palette-generator", "image-info", "image-metadata-viewer"],
    limitations: ["Very large images are scaled to 2000 pixels for picking, which averages the finest details."],
    steps: ["Choose an image.", "Click or tap a point, or use the arrow keys to move the picker.", "Copy the HEX, RGB or HSL value."],
  }),
  tool({
    id: "colour-palette-generator",
    name: "Colour Palette Generator",
    icon: "palette",
    description: "Find the main colours in an image.",
    seoDescription: seo("Generate a colour palette from an image"),
    keywords: ["color palette from image", "colour palette generator", "extract colors", "dominant colours", "image color scheme"],
    mode: "main-thread",
    output: [],
    related: ["image-colour-picker", "image-info", "image-colour-adjustment"],
    limitations: ["Colours are averaged from a reduced copy of the image (median cut), so tiny details may not get their own colour.", "Transparent areas are ignored."],
    steps: ["Choose an image.", "Pick how many colours you want.", "Select Generate palette.", "Copy the colour codes."],
  }),
  tool({
    id: "favicon-generator",
    name: "Favicon Generator",
    icon: "app-window",
    description: "Make favicon.ico and app icons for your website from one image.",
    seoDescription: seo("Create favicon.ico and website icons"),
    keywords: ["favicon generator", "favicon.ico", "create favicon", "website icon", "apple touch icon", "ico converter", "png to ico"],
    mode: "main-thread",
    output: ["ico", "png", "zip"],
    related: ["image-cropper", "image-resizer", "image-converter"],
    limitations: ["Works best with a square image of at least 512 × 512 pixels.", "The .ico file holds PNG images, which every current browser and Windows Vista or later support."],
    steps: ["Choose a square image (a logo works best).", "Pick a transparent or white background.", "Select Create favicons.", "Download the ZIP and add the HTML shown to your site."],
  }),
  tool({
    id: "image-to-base64",
    name: "Image to Base64",
    icon: "binary",
    description: "Turn an image into a Base64 data URL you can paste into HTML or CSS.",
    seoDescription: seo("Convert images to Base64 data URLs"),
    keywords: ["image to base64", "base64 encoder", "data url", "data uri", "embed image in html", "png to base64"],
    mode: "main-thread",
    output: ["txt"],
    related: ["base64-to-image", "image-compressor", "favicon-generator"],
    limitations: ["Base64 is about a third larger than the image file. It's best for small images such as icons."],
    steps: ["Choose an image.", "Copy the data URL, or just the Base64 part."],
  }),
  tool({
    id: "base64-to-image",
    name: "Base64 to Image",
    icon: "binary",
    description: "Turn a Base64 string or data URL back into an image file.",
    seoDescription: seo("Convert Base64 to an image file"),
    keywords: ["base64 to image", "base64 decoder", "data url to image", "decode base64 png", "base64 to jpg"],
    mode: "main-thread",
    input: ["txt"],
    output: ["png", "jpg", "webp", "gif", "bmp", "ico", "avif"],
    related: ["image-to-base64", "image-converter", "image-info"],
    limitations: ["Accepts PNG, JPG, WebP, GIF, BMP, ICO and AVIF data. SVG is refused, because SVG text can contain scripts.", "Up to about 20 MB of image data."],
    steps: ["Paste the Base64 text or data URL.", "Select Decode image.", "Check the preview and download."],
  }),
  tool({
    id: "image-comparison",
    name: "Image Comparison",
    icon: "columns",
    description: "Compare two images with a before-and-after slider.",
    seoDescription: seo("Compare two images side by side"),
    keywords: ["compare images", "image comparison slider", "before and after", "image diff", "spot the difference"],
    mode: "main-thread",
    output: [],
    related: ["image-compressor", "image-info", "image-colour-adjustment"],
    limitations: ["Images of different sizes are scaled to fit the same frame.", "Shows the images visually. It doesn't highlight pixel differences."],
    steps: ["Choose two images.", "Select Compare images.", "Drag the slider to compare them."],
  }),
  tool({
    id: "batch-image-converter",
    name: "Batch Image Conversion",
    icon: "images",
    description: "Convert many images to PNG, JPG or WebP at once.",
    seoDescription: seo("Convert many images at once"),
    keywords: ["batch convert images", "bulk image converter", "convert multiple images", "mass convert jpg", "batch png to jpg"],
    related: ["image-converter", "batch-image-compressor", "batch-image-resizer"],
    limitations: ["Images are processed one at a time to keep memory use low.", "Several results download together as a ZIP.", formats, firstFrame, transparencyJpg, noMeta],
    steps: ["Choose or drop several images.", "Pick the output format and quality.", "Select Convert.", "Download the ZIP."],
  }),
  tool({
    id: "batch-image-compressor",
    name: "Batch Image Compression",
    icon: "images",
    description: "Compress many images at once.",
    seoDescription: seo("Compress many images at once"),
    keywords: ["batch compress images", "bulk image compressor", "compress multiple photos", "reduce size of many images"],
    engine: `${CANVAS} + oxipng (WASM)`,
    related: ["image-compressor", "batch-image-resizer", "batch-image-converter"],
    limitations: ["Images are processed one at a time to keep memory use low.", "Images that can't be made smaller are kept as they were.", noMeta, firstFrame],
    steps: ["Choose or drop several images.", "Pick the format, quality and maximum size.", "Select Compress.", "Download the ZIP."],
  }),
  tool({
    id: "batch-image-resizer",
    name: "Batch Image Resizing",
    icon: "images",
    description: "Resize many images at once by percentage or to fit a size.",
    seoDescription: seo("Resize many images at once"),
    keywords: ["batch resize images", "bulk image resizer", "resize multiple images", "resize photos at once"],
    related: ["image-resizer", "batch-image-compressor", "batch-image-converter"],
    limitations: ["Images are processed one at a time to keep memory use low.", "With a width and height, each image is fitted inside that box and keeps its proportions.", noMeta, firstFrame],
    steps: ["Choose or drop several images.", "Pick a percentage, or a width and height to fit inside.", "Select Resize.", "Download the ZIP."],
  }),
];
