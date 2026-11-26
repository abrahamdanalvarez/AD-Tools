import type { BrowserSupport, ToolDefinition } from "./types";

// The single source of truth for every Privora tool. Homepage, navigation,
// search, routes, sitemap, related tools and analytics IDs all read from here.
// See docs/TOOL_REGISTRY.md before adding or changing an entry.

// Module workers (Firefox 114), OffscreenCanvas 2D (Safari 16.4), modern CSS (Chrome/Edge 111).
const modernBrowsers: BrowserSupport = { chrome: "111", edge: "111", firefox: "114", safari: "16.4" };

export const tools: ToolDefinition[] = [
  {
    id: "image-converter",
    name: "Image Converter",
    slug: "image-converter",
    category: "image",
    description: "Convert images between PNG, JPG and WebP.",
    icon: "image-convert",
    keywords: [
      "convert image", "png to jpg", "jpg to png", "webp to png", "png to webp", "jpg to webp", "webp to jpg",
      "change image format", "image format converter", "photo converter", "picture converter",
    ],
    engine: "Canvas API (OffscreenCanvas)",
    processingMode: "web-worker",
    inputFormats: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "avif"],
    outputFormats: ["png", "jpg", "webp"],
    browsers: {
      ...modernBrowsers,
      notes:
        "WebP output appears only if your browser can create WebP files (some Safari versions cannot). AVIF input depends on browser support. Some older browsers convert on the page instead of in the background, which works the same but may pause the page briefly for large images.",
    },
    maxFileSizeMB: 50,
    model: null,
    enabled: true,
    status: "verified",
    popular: true,
    seoTitle: "Image Converter — Free & Private Online Tool | Privora",
    seoDescription:
      "Convert images between PNG, JPG and WebP in your browser. Free, private and fast: your images are never uploaded.",
    related: ["remove-background", "compress-pdf"],
    limitations: [
      "Animated GIF and WebP files are converted using their first frame only.",
      "Converting removes image metadata such as camera details and location.",
      "Transparent areas become white when converting to JPG.",
      "Very large images (over about 16 megapixels on Safari) may fail because of browser canvas limits.",
    ],
    steps: [
      "Choose an image from your device or drop it onto the page.",
      "Pick the output format and, for JPG or WebP, the quality.",
      "Select Convert. The work happens in your browser.",
      "Download the converted image.",
    ],
    faqs: [
      {
        q: "Are my images uploaded?",
        a: "No. Your browser decodes and re-encodes the image on your device. Nothing is sent to a server.",
      },
      {
        q: "Why is WebP missing from the list?",
        a: "Your browser can read WebP images but cannot create them (this happens in some versions of Safari). Choose PNG or JPG instead.",
      },
      {
        q: "Does converting reduce quality?",
        a: "PNG is lossless. JPG and WebP are compressed using the quality you choose. Higher quality means larger files.",
      },
    ],
  },

  // ── Planned (hidden until verified) ─────────────────────────────────────
  planned("merge-pdf", "Merge PDF", "pdf", "merge", "Combine several PDFs into one file.", ["pdf"], ["pdf"], "pdf-lib", ["combine pdf", "join pdf"]),
  planned("split-pdf", "Split PDF", "pdf", "split", "Split a PDF into separate files or page ranges.", ["pdf"], ["pdf", "zip"], "pdf-lib", ["extract pages", "separate pdf"]),
  planned("compress-pdf", "Compress PDF", "pdf", "minimize", "Make PDF files smaller.", ["pdf"], ["pdf"], "pdf-lib + pdfjs-dist", ["reduce pdf size", "shrink pdf"]),
  planned("remove-background", "Remove Background", "ai", "eraser", "Remove the background from a photo using on-device AI.", ["png", "jpg", "jpeg", "webp"], ["png"], "ONNX Runtime Web", ["background remover", "transparent background", "cut out"]),
];

function planned(
  id: string,
  name: string,
  category: ToolDefinition["category"],
  icon: ToolDefinition["icon"],
  description: string,
  inputFormats: string[],
  outputFormats: string[],
  engine: string,
  keywords: string[],
): ToolDefinition {
  return {
    id, name, slug: id, category, description, icon, keywords, engine,
    processingMode: "web-worker", inputFormats, outputFormats, browsers: modernBrowsers,
    maxFileSizeMB: 100, model: null, enabled: false, status: "planned", popular: false,
    seoTitle: `${name} — Free & Private Online Tool | Privora`, seoDescription: description,
    related: [], limitations: [],
  };
}
