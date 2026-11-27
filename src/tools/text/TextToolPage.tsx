import type { ToolDefinition } from "@/registry/types";
import { FormToolPage } from "./page";
import { textConfigs } from "./ui/text";

export default function TextToolPage({ tool }: { tool: ToolDefinition }) {
  return <FormToolPage tool={tool} configs={textConfigs} />;
}
