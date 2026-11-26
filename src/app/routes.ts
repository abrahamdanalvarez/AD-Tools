import { toolBySlug } from "@/registry/registry";
import type { ToolDefinition } from "@/registry/types";

export type Route =
  | { kind: "home" }
  | { kind: "credits" }
  | { kind: "tool"; tool: ToolDefinition }
  | { kind: "not-found" };

/** Maps a URL path to a page. Each route also exists as a static HTML file in dist/. */
export function resolveRoute(pathname: string): Route {
  const clean = "/" + pathname.split("/").filter(Boolean).join("/");
  if (clean === "/" || clean === "/index.html") return { kind: "home" };
  if (clean === "/credits") return { kind: "credits" };
  const segments = clean.slice(1).split("/");
  if (segments.length === 1) {
    const tool = toolBySlug(segments[0]);
    if (tool) return { kind: "tool", tool };
  }
  return { kind: "not-found" };
}
