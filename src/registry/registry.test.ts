import { describe, expect, it } from "vitest";
import { icons } from "@/components/icons";
import { toolComponents } from "@/tools";
import { categories, popularTools, relatedTools, tools, visibleCategories, visibleTools } from "./registry";
import type { ToolDefinition } from "./types";

const make = (id: string, over: Partial<ToolDefinition> = {}): ToolDefinition => ({
  ...tools[0],
  id,
  slug: id,
  ...over,
});

describe("tool registry integrity", () => {
  it("has unique ids and slugs", () => {
    expect(new Set(tools.map((t) => t.id)).size).toBe(tools.length);
    expect(new Set(tools.map((t) => t.slug)).size).toBe(tools.length);
  });

  it("uses URL-safe slugs that don't clash with site pages", () => {
    for (const t of tools) {
      expect(t.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(["credits", "assets", "brand", "404"]).not.toContain(t.slug);
    }
  });

  it("references real categories, icons and related tools", () => {
    const ids = new Set(tools.map((t) => t.id));
    for (const t of tools) {
      expect(categories.some((c) => c.id === t.category), t.id).toBe(true);
      expect(icons[t.icon], t.id).toBeDefined();
      for (const r of t.related) expect(ids.has(r), `${t.id} → ${r}`).toBe(true);
    }
    for (const c of categories) expect(icons[c.icon], c.id).toBeDefined();
  });

  it("gives every verified tool a UI, SEO text in the standard format and formats", () => {
    for (const t of visibleTools()) {
      expect(toolComponents[t.id], t.id).toBeDefined();
      expect(t.seoTitle).toBe(`${t.name} — Free & Private Online Tool | Privora`);
      expect(t.seoDescription.length).toBeGreaterThan(50);
      expect(t.seoDescription.length).toBeLessThanOrEqual(160);
      expect(t.inputFormats.length).toBeGreaterThan(0);
      expect(t.keywords.length).toBeGreaterThan(0);
    }
  });

  it("self-hosts every model", () => {
    for (const t of tools) if (t.model) expect(t.model.path.startsWith("/")).toBe(true);
  });
});

describe("visibility", () => {
  it("shows only enabled and verified tools", () => {
    const list = [
      make("a", { status: "planned", enabled: true }),
      make("b", { status: "in-progress", enabled: true }),
      make("c", { status: "verified", enabled: false }),
      make("d", { status: "verified", enabled: true }),
    ];
    expect(visibleTools(list).map((t) => t.id)).toEqual(["d"]);
  });

  it("hides categories without visible tools", () => {
    const visible = new Set(visibleTools().map((t) => t.category));
    expect(visibleCategories().map((c) => c.id)).toEqual(categories.filter((c) => visible.has(c.id)).map((c) => c.id));
  });

  it("never shows hidden tools as popular or related", () => {
    const visible = new Set(visibleTools().map((t) => t.id));
    for (const t of popularTools()) expect(visible.has(t.id)).toBe(true);
    for (const t of visibleTools()) for (const r of relatedTools(t)) expect(visible.has(r.id)).toBe(true);
  });
});

describe("PDF tools", () => {
  it("has a UI config for exactly the PDF tools listed in the tool map", async () => {
    const { pdfConfigs } = await import("@/tools/pdf/ui/configs");
    const { pdfToolIds } = await import("@/tools/pdf/ids");
    expect(Object.keys(pdfConfigs).sort()).toEqual([...pdfToolIds].sort());
    for (const id of pdfToolIds) expect(tools.some((t) => t.id === id), id).toBe(true);
  });
});
