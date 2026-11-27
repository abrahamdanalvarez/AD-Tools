import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { ToolDefinition } from "@/registry/types";
import { aiToolIds } from "./ai/ids";
import { fileToolIds } from "./file/ids";
import { imageToolIds } from "./image/ids";
import { pdfToolIds } from "./pdf/ids";
import { calcToolIds, devToolIds, textToolIds } from "./text/ids";

export type ToolComponent = LazyExoticComponent<ComponentType<{ tool: ToolDefinition }>>;

const PdfToolPage = lazy(() => import("./pdf/PdfToolPage"));
const ImageToolPage = lazy(() => import("./image/ImageToolPage"));
const AiToolPage = lazy(() => import("./ai/AiToolPage"));
const DevToolPage = lazy(() => import("./text/DevToolPage"));
const TextToolPage = lazy(() => import("./text/TextToolPage"));
const CalcToolPage = lazy(() => import("./text/CalcToolPage"));
const FileToolPage = lazy(() => import("./file/FileToolPage"));

/**
 * Tool ID → UI. Each tool is code-split, so its code (and any WASM or model)
 * loads only when that tool's page opens. Every verified tool in the registry
 * must have an entry here (enforced by registry.test.ts).
 */
export const toolComponents: Record<string, ToolComponent> = {
  ...Object.fromEntries(pdfToolIds.map((id) => [id, PdfToolPage])),
  ...Object.fromEntries(imageToolIds.map((id) => [id, ImageToolPage])),
  ...Object.fromEntries(aiToolIds.map((id) => [id, AiToolPage])),
  ...Object.fromEntries(devToolIds.map((id) => [id, DevToolPage])),
  ...Object.fromEntries(textToolIds.map((id) => [id, TextToolPage])),
  ...Object.fromEntries(calcToolIds.map((id) => [id, CalcToolPage])),
  ...Object.fromEntries(fileToolIds.map((id) => [id, FileToolPage])),
};
