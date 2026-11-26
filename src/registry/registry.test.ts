import { describe, expect, it } from "vitest";
import { tools, visibleTools } from "./registry";
import type { ToolDefinition } from "./types";

const make = (id: string, status: ToolDefinition["status"]): ToolDefinition => ({
  id,
  name: id,
  category: "pdf",
  description: "",
  status,
});

describe("tool registry", () => {
  it("only exposes verified tools", () => {
    const list = [make("a", "planned"), make("b", "in-progress"), make("c", "verified")];
    expect(visibleTools(list).map((t) => t.id)).toEqual(["c"]);
  });

  it("has unique tool ids", () => {
    const ids = tools.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
