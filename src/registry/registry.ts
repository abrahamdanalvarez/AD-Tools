import { categories } from "./categories.ts";
import { tools } from "./tools.ts";
import type { CategoryInfo, ToolDefinition } from "./types";

export { categories, tools };

/** A tool is public only when it is enabled and verified. */
export const isVisible = (tool: ToolDefinition) => tool.enabled && tool.status === "verified";

export function visibleTools(list: ToolDefinition[] = tools): ToolDefinition[] {
  return list.filter(isVisible);
}

export function toolBySlug(slug: string): ToolDefinition | undefined {
  return visibleTools().find((t) => t.slug === slug);
}

export function toolsInCategory(id: CategoryInfo["id"]): ToolDefinition[] {
  return visibleTools().filter((t) => t.category === id);
}

/** Only categories that contain at least one visible tool. */
export function visibleCategories(): CategoryInfo[] {
  return categories.filter((c) => toolsInCategory(c.id).length > 0);
}

export function popularTools(): ToolDefinition[] {
  return visibleTools().filter((t) => t.popular);
}

export function relatedTools(tool: ToolDefinition): ToolDefinition[] {
  const byId = new Map(visibleTools().map((t) => [t.id, t]));
  const explicit = tool.related.map((id) => byId.get(id)).filter((t): t is ToolDefinition => !!t);
  const sameCategory = toolsInCategory(tool.category).filter((t) => t.id !== tool.id && !tool.related.includes(t.id));
  return [...explicit, ...sameCategory].slice(0, 3);
}

export function categoryById(id: CategoryInfo["id"]): CategoryInfo {
  return categories.find((c) => c.id === id)!;
}
