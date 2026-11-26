import type { CategoryInfo } from "./types";

export const categories: CategoryInfo[] = [
  { id: "pdf", name: "PDF Tools", description: "Merge, split, compress and convert PDFs.", icon: "file-text" },
  { id: "image", name: "Image Tools", description: "Convert, resize, compress and crop images.", icon: "image" },
  { id: "ai", name: "AI Tools", description: "Background removal and more, run on your device.", icon: "brain" },
  { id: "video", name: "Video Tools", description: "Convert, trim and extract from video.", icon: "video" },
  { id: "audio", name: "Audio Tools", description: "Convert and trim audio files.", icon: "audio" },
  { id: "document", name: "Document Tools", description: "Convert between document formats.", icon: "file-type" },
  { id: "developer", name: "Developer Tools", description: "Format, encode, decode and generate.", icon: "code" },
  { id: "text", name: "Text Tools", description: "Count, compare and transform text.", icon: "type" },
  { id: "productivity", name: "Productivity Tools", description: "Everyday helpers like QR codes.", icon: "list-checks" },
  { id: "file", name: "File Tools", description: "Zip, unzip and inspect files.", icon: "folder" },
];
