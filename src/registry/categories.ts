import {
  AudioLines,
  BrainCircuit,
  Clapperboard,
  CodeXml,
  FileText,
  FileType,
  Image,
  ListChecks,
  Type,
  type LucideIcon,
} from "lucide-react";
import type { ToolCategory } from "./types";

export interface CategoryInfo {
  id: ToolCategory;
  name: string;
  description: string;
  icon: LucideIcon;
}

export const categories: CategoryInfo[] = [
  { id: "pdf", name: "PDF", description: "Merge, split, compress and convert PDFs.", icon: FileText },
  { id: "image", name: "Image", description: "Resize, convert, compress and crop images.", icon: Image },
  { id: "ai", name: "On-device AI", description: "Background removal and more, run locally.", icon: BrainCircuit },
  { id: "audio", name: "Audio", description: "Convert and trim audio files.", icon: AudioLines },
  { id: "video", name: "Video", description: "Convert, trim and extract from video.", icon: Clapperboard },
  { id: "document", name: "Document", description: "Convert between document formats.", icon: FileType },
  { id: "developer", name: "Developer", description: "Format, encode, decode and generate.", icon: CodeXml },
  { id: "text", name: "Text", description: "Count, compare and transform text.", icon: Type },
  { id: "productivity", name: "Productivity", description: "Everyday helpers like QR codes.", icon: ListChecks },
];
