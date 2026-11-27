import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ToolDefinition } from "@/registry/types";
import { aiToolIds } from "./ai/ids";
import { imageToolIds } from "./image/ids";
import { pdfToolIds } from "./pdf/ids";

export type ToolComponent = LazyExoticComponent<ComponentType<{ tool: ToolDefinition }>>;

const PdfToolPage = lazy(() => import("./pdf/PdfToolPage"));
const ImageToolPage = lazy(() => import("./image/ImageToolPage"));
const AiToolPage = lazy(() => import("./ai/AiToolPage"));

/**
 * Tool ID → UI. Each tool is code-split, so its code (and any WASM or model)
 * loads only when that tool's page opens. Every verified tool in the registry
 * must have an entry here (enforced by registry.test.ts).
 */
export const toolComponents: Record<string, ToolComponent> = {
  ...Object.fromEntries(pdfToolIds.map((id) => [id, PdfToolPage])),
  ...Object.fromEntries(imageToolIds.map((id) => [id, ImageToolPage])),
  ...Object.fromEntries(aiToolIds.map((id) => [id, AiToolPage])),
};
