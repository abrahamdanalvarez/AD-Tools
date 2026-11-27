import { describe, expect, it } from "vitest";
import { formatXml, jsonToXml, xmlToJson } from "./core/data";
import { renderMarkdown } from "./markdown";

describe("XML (DOMParser)", () => {
  it("formats XML and keeps the declaration, comments and CDATA", () => {
    const out = formatXml('<?xml version="1.0"?><a x="1&amp;2"><!-- c --><b>t</b><c><![CDATA[<raw>]]></c><d/></a>', "2");
    expect(out).toBe('<?xml version="1.0"?>\n<a x="1&amp;2">\n  <!-- c -->\n  <b>t</b>\n  <c>\n    <![CDATA[<raw>]]>\n  </c>\n  <d/>\n</a>\n');
    expect(formatXml("<a>\n  <b>1</b>\n</a>", "minify")).toBe("<a><b>1</b></a>");
    expect(() => formatXml("<a><b></a>", "2")).toThrow(/Invalid XML/);
  });

  it("converts XML and JSON both ways", () => {
    const json = xmlToJson('<list kind="x"><item>1</item><item>2</item><note lang="en">Hi</note></list>', "2");
    expect(JSON.parse(json)).toEqual({ list: { "@kind": "x", item: ["1", "2"], note: { "@lang": "en", "#text": "Hi" } } });
    expect(jsonToXml(json, "2", "root")).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<list kind="x">\n  <item>1</item>\n  <item>2</item>\n  <note lang="en">Hi</note>\n</list>\n',
    );
    expect(jsonToXml('[{"1st name":"<A&B>"}]', "2", "people")).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<people>\n  <item>\n    <_1st_name>&lt;A&amp;B&gt;</_1st_name>\n  </item>\n</people>\n',
    );
  });
});

describe("Markdown preview", () => {
  it("renders Markdown and strips scripts, handlers, styles and remote images", async () => {
    const md = [
      "# Title",
      "Some **bold** and [a link](https://example.com).",
      '<script>alert(1)</script><img src="x" onerror="alert(1)">',
      "![remote](https://example.com/track.png)",
      '<a href="javascript:alert(1)">bad</a> <p style="background:url(https://example.com/x)">styled</p>',
      '<svg><image href="https://example.com/y"/></svg><iframe src="https://example.com"></iframe>',
      "![ok](data:image/png;base64,iVBORw0KGgo=)",
    ].join("\n\n");
    const { html, blockedImages } = await renderMarkdown(md);
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow" referrerpolicy="no-referrer">a link</a>');
    for (const bad of ["<script", "onerror", "javascript:", "style=", "<svg", "<iframe", "track.png"]) expect(html).not.toContain(bad);
    expect(html).toContain("[Image not loaded: remote]");
    expect(html).toContain('src="data:image/png;base64,');
    expect(blockedImages).toBe(2);
  });
});
