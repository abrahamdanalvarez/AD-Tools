// Registry data must stay plain (no React, no path aliases) so build scripts
// (static routes, sitemap) can import it in Node.

export type ToolCategory =
  | "pdf"
  | "image"
  | "ai"
  | "video"
  | "audio"
  | "document"
  | "developer"
  | "text"
  | "productivity"
  | "file";

/** Keys into src/components/icons.ts. */
export type IconKey =
  | "file-text"
  | "image"
  | "brain"
  | "video"
  | "audio"
  | "file-type"
  | "code"
  | "type"
  | "list-checks"
  | "folder"
  | "image-convert"
  | "merge"
  | "split"
  | "minimize"
  | "eraser"
  | "rotate"
  | "list-ordered"
  | "trash"
  | "file-output"
  | "file-image"
  | "image-plus"
  | "copy"
  | "arrow-down-up"
  | "stamp"
  | "hash"
  | "text-cursor"
  | "signature"
  | "layers"
  | "tags"
  | "file-x"
  | "scan-text"
  | "images"
  | "file-digit"
  | "eye"
  | "info"
  | "lock"
  | "lock-open"
  | "wrench"
  | "highlighter"
  | "file-search"
  | "crop"
  | "flip"
  | "sliders"
  | "sun"
  | "contrast"
  | "droplet"
  | "droplets"
  | "pipette"
  | "palette"
  | "grid"
  | "smile"
  | "scaling"
  | "binary"
  | "columns"
  | "app-window"
  | "sun-moon"
  | "image-minus"
  | "braces"
  | "file-code"
  | "link"
  | "key-round"
  | "key"
  | "shuffle"
  | "qr-code"
  | "scan-line"
  | "link-2"
  | "clock"
  | "calendar"
  | "table"
  | "regex"
  | "blend"
  | "square-stack"
  | "case-sensitive"
  | "arrow-up-az"
  | "arrow-left-right"
  | "replace"
  | "sparkles"
  | "diff"
  | "timer"
  | "pilcrow"
  | "notebook-pen"
  | "ruler"
  | "percent"
  | "calendar-range"
  | "cake"
  | "hourglass"
  | "landmark"
  | "heart-pulse"
  | "hand-coins"
  | "tag"
  | "hard-drive"
  | "file-archive"
  | "shield-check"
  | "whole-word"
  | "case-upper"
  | "case-lower"
  | "list-x"
  | "list-minus"
  | "text-quote"
  | "sheet"
  | "database"
  | "calculator"
  | "brush";

/**
 * planned: not started · in-progress: being built · verified: finished,
 * tested, and runs entirely in the browser. Only enabled + verified tools are
 * ever shown, routed, searched or listed in the sitemap.
 */
export type ToolStatus = "planned" | "in-progress" | "verified";

/** Where the work runs. Every option is on the user's device. */
export type ProcessingMode = "main-thread" | "web-worker";

export interface BrowserSupport {
  chrome: string;
  edge: string;
  firefox: string;
  safari: string;
  notes?: string;
}

export interface ModelDownload {
  /** Approximate one-time download, in MB. */
  sizeMB: number;
  /** Path on our own origin. Models are always self-hosted. */
  path: string;
  licence: string;
}

export interface Faq {
  q: string;
  a: string;
}

export interface ToolDefinition {
  /** Stable ID. Also the analytics identifier. Never change it once published. */
  id: string;
  name: string;
  /** URL path segment: the tool lives at /<slug>/. */
  slug: string;
  category: ToolCategory;
  description: string;
  icon: IconKey;
  /** Search terms, including alternative names. */
  keywords: string[];
  /** Library or browser API that does the processing. */
  engine: string;
  processingMode: ProcessingMode;
  /** File extensions without dots, lowercase. */
  inputFormats: string[];
  outputFormats: string[];
  browsers: BrowserSupport;
  /** Recommended maximum input size, in MB. Larger files show a warning. */
  maxFileSizeMB: number;
  model: ModelDownload | null;
  enabled: boolean;
  status: ToolStatus;
  popular: boolean;
  seoTitle: string;
  seoDescription: string;
  /** IDs of related tools. Only visible ones are shown. */
  related: string[];
  limitations: string[];
  /** Short "how to use" steps shown on the tool page. */
  steps?: string[];
  faqs?: Faq[];
}

export interface CategoryInfo {
  id: ToolCategory;
  name: string;
  description: string;
  icon: IconKey;
}
