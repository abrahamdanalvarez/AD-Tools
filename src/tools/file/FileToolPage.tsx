import type { ToolDefinition } from "@/registry/types";
import { PdfToolShell } from "@/tools/pdf/ui/shell";
import { fileConfigs } from "./configs";

/** One code-split entry for the file tools and the QR code reader. */
export default function FileToolPage({ tool }: { tool: ToolDefinition }) {
  const config = fileConfigs[tool.id];
  if (!config) throw new Error(`No file tool config for ${tool.id}`);
  return <PdfToolShell key={tool.id} tool={tool} config={config} />;
}
