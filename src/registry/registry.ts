import type { ToolDefinition } from "./types";

export const tools: ToolDefinition[] = [];

export function visibleTools(list: ToolDefinition[] = tools): ToolDefinition[] {
  return list.filter((tool) => tool.status === "verified");
}
