import { describe, expect, it } from "vitest";
import { resolveRoute } from "./routes";

describe("resolveRoute", () => {
  it("resolves home", () => {
    expect(resolveRoute("/").kind).toBe("home");
    expect(resolveRoute("/index.html").kind).toBe("home");
  });

  it("resolves verified tools with or without a trailing slash", () => {
    for (const path of ["/image-converter/", "/image-converter"]) {
      const route = resolveRoute(path);
      expect(route.kind).toBe("tool");
      if (route.kind === "tool") expect(route.tool.id).toBe("image-converter");
    }
  });

  it("does not route planned tools", () => {
    expect(resolveRoute("/merge-pdf/").kind).toBe("not-found");
  });

  it("resolves static pages and unknown paths", () => {
    expect(resolveRoute("/credits/").kind).toBe("credits");
    expect(resolveRoute("/nope/").kind).toBe("not-found");
    expect(resolveRoute("/image-converter/extra/").kind).toBe("not-found");
  });
});
