import { birefnet, modelPath } from "../tools/ai/model.ts";
import type { Faq, ToolDefinition } from "./types";

// AI tools (Phase 06). BiRefNet_lite runs in the browser with ONNX Runtime Web:
// WebGPU when available, otherwise WebAssembly on the CPU. The model is
// self-hosted on our origin and never sent anything.

// Module workers, WASM SIMD and DecompressionStream: Chrome/Edge 111, Firefox 114, Safari 16.4.
const browsers = {
  chrome: "111",
  edge: "111",
  firefox: "114",
  safari: "16.4",
  notes: "Fastest with WebGPU (Chrome and Edge 113+, recent Safari and Firefox). Other browsers use the CPU, which is slower but works the same.",
};

const privacyFaq: Faq = {
  q: "Is my image sent to an AI server?",
  a: "No. The AI model runs inside your browser, on your device. The only download is the model itself, from this website. Your image is never uploaded, and nothing is kept after you leave the page.",
};

const modelFaqs: Faq[] = [
  {
    q: `Why does it download ${birefnet.downloadMB} MB?`,
    a: "That's the AI model. Your browser downloads it once from this website and keeps it in its cache, so the next time is instant and works offline.",
  },
  {
    q: "Why is it slow on my computer?",
    a: "Without WebGPU, the model runs on your CPU, which can take up to a minute for each image. With WebGPU (Chrome or Edge, recent Safari and Firefox) it is usually much faster.",
  },
  {
    q: "Which AI model is used?",
    a: "BiRefNet lite by Peng Zheng and colleagues, released under the MIT licence. Privora stores its weights in 8 bits to make the download smaller.",
  },
];

const limits = [
  `The first use downloads the AI model (about ${birefnet.downloadMB} MB) from this website. It's cached afterwards.`,
  "On the CPU, each image can take up to a minute and needs about 2 GB of memory. Older phones may run out of memory.",
  "The AI works at 512 × 512 pixels and the mask is scaled to your image, so very fine details such as single hairs may be softened.",
  "It finds the main subject. Photos with several separate subjects or busy scenes may need touching up elsewhere.",
  "Animated GIF, WebP and PNG files keep only their first frame. The tool warns you before it runs.",
];

const model = { sizeMB: birefnet.downloadMB, path: modelPath(birefnet), licence: `BiRefNet_lite (${birefnet.licence})` };

const base = {
  category: "ai" as const,
  engine: "ONNX Runtime Web (WebGPU or WebAssembly) + BiRefNet_lite",
  processingMode: "web-worker" as const,
  inputFormats: ["png", "jpg", "jpeg", "webp", "avif", "bmp", "gif"],
  browsers,
  maxFileSizeMB: 50,
  model,
  enabled: true,
  status: "verified" as const,
};

export const aiTools = (): ToolDefinition[] => [
  {
    ...base,
    id: "remove-background",
    name: "AI Background Remover",
    slug: "remove-background",
    description: "Remove the background from a photo with on-device AI. Keep it transparent or add a colour or image.",
    icon: "eraser",
    keywords: [
      "remove background", "background remover", "remove bg", "transparent background", "cut out image", "erase background",
      "remove background from image", "photo background remover", "change background", "white background", "ai background removal",
    ],
    outputFormats: ["png", "jpg", "webp"],
    popular: true,
    seoTitle: "AI Background Remover — Free & Private Online Tool | Privora",
    seoDescription: "Remove image backgrounds with AI that runs in your browser. Free, no sign-up, and your photos are never uploaded.",
    related: ["ai-subject-mask", "image-cropper", "image-compressor"],
    limitations: limits,
    steps: [
      "Choose a photo or drop it onto the page.",
      "Pick a background: transparent, a solid colour or your own image.",
      "Select Remove background. The first time, the AI model downloads.",
      "Compare before and after, then download your image.",
    ],
    faqs: [privacyFaq, ...modelFaqs, { q: "Can I change the background afterwards?", a: "Yes. Select Change settings, pick another background or format, and run it again. The AI doesn't run a second time, so it's instant." }],
  },
  {
    ...base,
    id: "ai-subject-mask",
    name: "AI Subject Mask",
    slug: "ai-subject-mask",
    description: "Segment the main subject of a photo into a black-and-white mask with on-device AI.",
    icon: "contrast",
    keywords: ["image segmentation", "ai segmentation", "subject mask", "alpha mask", "foreground mask", "matte", "selection mask", "segment image"],
    outputFormats: ["png"],
    popular: false,
    seoTitle: "AI Subject Mask — Free & Private Online Tool | Privora",
    seoDescription: "Create a black-and-white subject mask from any photo with AI in your browser. Free and private: images are never uploaded.",
    related: ["remove-background", "image-cropper", "blur-image"],
    limitations: limits,
    steps: ["Choose a photo.", "Select Create mask. The first time, the AI model downloads.", "Download the mask: white is the subject, black is the background."],
    faqs: [privacyFaq, ...modelFaqs, { q: "What can I use the mask for?", a: "Use it as a layer mask or selection in an image editor, to edit the subject and the background separately." }],
  },
];
