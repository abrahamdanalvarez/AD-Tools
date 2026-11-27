import type { ToolDefinition } from "@/registry/types";
import { FormToolPage } from "./page";
import { calcConfigs } from "./ui/calc";

export default function CalcToolPage({ tool }: { tool: ToolDefinition }) {
  return <FormToolPage tool={tool} configs={calcConfigs} />;
}
