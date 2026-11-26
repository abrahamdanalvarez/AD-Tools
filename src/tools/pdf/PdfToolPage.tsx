import type { ToolDefinition } from "@/registry/types";
import { pdfConfigs } from "./ui/configs";
import { PdfToolShell } from "./ui/shell";

/** One code-split entry for every PDF tool; the registry ID picks the config. */
export default function PdfToolPage({ tool }: { tool: ToolDefinition }) {
  const config = pdfConfigs[tool.id];
  if (!config) throw new Error(`No PDF tool config for ${tool.id}`);
  return <PdfToolShell key={tool.id} tool={tool} config={config} />;
}
