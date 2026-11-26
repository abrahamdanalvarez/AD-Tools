import { describe, expect, it } from "vitest";
import { searchTools } from "./search";
import { tools } from "./tools";
import type { ToolDefinition } from "./types";

const all = tools.map((t) => ({ ...t, enabled: true, status: "verified" as const }));
const ids = (q: string, list: ToolDefinition[] = all) => searchTools(q, list).map((t) => t.id);

describe("searchTools", () => {
  it("returns nothing for an empty query", () => {
    expect(ids("   ")).toEqual([]);
  });

  it("matches by name, case- and accent-insensitive", () => {
    expect(ids("image conv")[0]).toBe("image-converter");
    expect(ids("IMAGÉ")[0]).toBe("image-converter");
  });

  it("matches keywords and alternative names", () => {
    expect(ids("combine pdf")[0]).toBe("merge-pdf");
    expect(ids("transparent background")[0]).toBe("remove-background");
  });

  it("matches file formats", () => {
    expect(ids("webp")).toContain("image-converter");
    expect(ids("png to jpg")[0]).toBe("image-converter");
  });

  it("matches categories", () => {
    expect(ids("pdf tools")).toEqual(expect.arrayContaining(["merge-pdf", "split-pdf", "compress-pdf"]));
    expect(ids("ai")).toContain("remove-background");
  });

  it("requires every term to match", () => {
    expect(ids("merge webp")).toEqual([]);
  });

  it("only searches visible tools by default", () => {
    const visible = searchTools("pdf").map((t) => t.id);
    expect(visible).not.toContain("merge-pdf");
  });
});
