import { describe, expect, it } from "vitest";
import { pageList, sitemap, withMeta } from "./static-routes";

const template = `<title>Home</title>
<meta name="description" content="home desc" />
<link rel="canonical" href="https://tools.abrahamdan.com/" />
<meta property="og:title" content="Home" />
<meta property="og:description" content="home desc" />
<meta property="og:url" content="https://tools.abrahamdan.com/" />`;

describe("static routes", () => {
  it("lists home, every visible tool and static pages, but no planned tools", () => {
    const paths = pageList().map((p) => p.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/image-converter/");
    expect(paths).toContain("/credits/");
    expect(paths).toContain("/merge-pdf/");
    expect(paths).not.toContain("/ocr-pdf/");
  });

  it("writes per-page title, description, canonical and OG tags", () => {
    const html = withMeta(template, { path: "/x/", title: "X & Y", description: 'Say "hi"' });
    expect(html).toContain("<title>X &amp; Y</title>");
    expect(html).toContain('content="Say &quot;hi&quot;"');
    expect(html).toContain('href="https://tools.abrahamdan.com/x/"');
    expect(html).toContain('property="og:url" content="https://tools.abrahamdan.com/x/"');
  });

  it("marks noindex pages and drops their canonical", () => {
    const html = withMeta(template, { path: "/404.html", title: "Not found", description: "d", noindex: true });
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(html).not.toContain('rel="canonical"');
  });

  it("builds a sitemap with absolute URLs", () => {
    const xml = sitemap([{ path: "/", title: "", description: "" }, { path: "/a/", title: "", description: "" }]);
    expect(xml).toContain("<loc>https://tools.abrahamdan.com/</loc>");
    expect(xml).toContain("<loc>https://tools.abrahamdan.com/a/</loc>");
  });
});
