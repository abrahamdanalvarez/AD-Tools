export type ToolCategory =
  | "pdf"
  | "image"
  | "ai"
  | "audio"
  | "video"
  | "document"
  | "developer"
  | "text"
  | "productivity";

/**
 * Only "verified" tools are shown to users. A tool is verified when it is
 * finished, tested, and runs entirely in the browser.
 */
export type ToolStatus = "planned" | "in-progress" | "verified";

export interface ToolDefinition {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  status: ToolStatus;
}
