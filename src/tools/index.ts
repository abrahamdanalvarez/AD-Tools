import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ToolDefinition } from "@/registry/types";

export type ToolComponent = LazyExoticComponent<ComponentType<{ tool: ToolDefinition }>>;

/**
 * Tool ID → UI. Each tool is code-split, so its code (and any WASM or model)
 * loads only when that tool's page opens. Every verified tool in the registry
 * must have an entry here (enforced by registry.test.ts).
 */
export const toolComponents: Record<string, ToolComponent> = {
  "image-converter": lazy(() => import("./image-converter/ImageConverter")),
};
