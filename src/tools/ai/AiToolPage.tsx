import { useEffect } from "react";
import type { ToolDefinition } from "@/registry/types";
import { PdfToolShell } from "@/tools/pdf/ui/shell";
import { aiConfigs } from "./configs";
import { releaseSegmenter } from "./segment";

/** One code-split entry for the AI tools. Leaving the page frees the model's memory. */
export default function AiToolPage({ tool }: { tool: ToolDefinition }) {
  useEffect(() => releaseSegmenter, []);
  const config = aiConfigs[tool.id];
  if (!config) throw new Error(`No AI tool config for ${tool.id}`);
  return <PdfToolShell key={tool.id} tool={tool} config={config} />;
}
