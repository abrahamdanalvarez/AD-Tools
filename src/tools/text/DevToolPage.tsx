import type { ToolDefinition } from "@/registry/types";
import { FormToolPage } from "./page";
import { devConfigs } from "./ui/dev";

export default function DevToolPage({ tool }: { tool: ToolDefinition }) {
  return <FormToolPage tool={tool} configs={devConfigs} />;
}
