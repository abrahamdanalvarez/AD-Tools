import type { ToolDefinition } from "@/registry/types";
import { PdfToolShell } from "@/tools/pdf/ui/shell";
import Base64ToImage from "./ui/Base64ToImage";
import { imageConfigs } from "./ui/configs";

/** One code-split entry for every image tool; the registry ID picks the config. */
export default function ImageToolPage({ tool }: { tool: ToolDefinition }) {
  if (tool.id === "base64-to-image") return <Base64ToImage tool={tool} />;
  const config = imageConfigs[tool.id];
  if (!config) throw new Error(`No image tool config for ${tool.id}`);
  return <PdfToolShell key={tool.id} tool={tool} config={config} />;
}
