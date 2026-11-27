import { useEffect } from "react";
import type { ToolDefinition } from "@/registry/types";
import { releaseRegex } from "./regex";
import { FormToolShell, type AnyFormTool } from "./ui/shell";

/** Renders one tool from a group's configs. Leaving the page stops the regex worker, if one ran. */
export function FormToolPage({ tool, configs }: { tool: ToolDefinition; configs: Record<string, AnyFormTool> }) {
  useEffect(() => releaseRegex, []);
  const config = configs[tool.id];
  if (!config) throw new Error(`No tool config for ${tool.id}`);
  return <FormToolShell key={tool.id} tool={tool} config={config} />;
}
