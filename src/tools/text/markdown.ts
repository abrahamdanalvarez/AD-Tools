// Markdown to safe HTML. marked converts the text; DOMPurify removes scripts,
// event handlers, forms, frames, SVG and styles. Images that would load from a
// website are replaced by their alt text, so a preview never makes a request.
import type DOMPurifyType from "dompurify";

let purifier: typeof DOMPurifyType | null = null;

async function getPurifier() {
  if (purifier) return purifier;
  const { default: DOMPurify } = await import("dompurify");
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.hasAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
      node.setAttribute("referrerpolicy", "no-referrer");
    }
  });
  purifier = DOMPurify;
  return DOMPurify;
}

export interface RenderedMarkdown {
  fragment: DocumentFragment;
  html: string;
  /** Remote images replaced by their alt text. */
  blockedImages: number;
}

/** Only embedded raster images can be shown: they need no network request. */
const SAFE_IMAGE = /^data:image\/(png|jpeg|gif|webp|avif|bmp);base64,/i;

export async function renderMarkdown(markdown: string): Promise<RenderedMarkdown> {
  const [{ marked }, DOMPurify] = await Promise.all([import("marked"), getPurifier()]);
  const raw = marked.parse(markdown, { gfm: true, async: false });
  const fragment = DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select", "option", "video", "audio", "source", "track", "picture", "iframe", "object", "embed", "link", "meta", "base"],
    FORBID_ATTR: ["style", "srcset", "ping", "poster", "background", "formaction", "action", "id", "name"],
    ALLOW_DATA_ATTR: false,
    RETURN_DOM_FRAGMENT: true,
  });
  let blockedImages = 0;
  for (const img of Array.from(fragment.querySelectorAll("img"))) {
    if (SAFE_IMAGE.test(img.getAttribute("src") ?? "")) continue;
    blockedImages++;
    const note = document.createElement("span");
    note.className = "blocked-image";
    note.textContent = `[Image not loaded: ${img.getAttribute("alt") || "no description"}]`;
    img.replaceWith(note);
  }
  const box = document.createElement("div");
  box.appendChild(fragment.cloneNode(true));
  return { fragment, html: box.innerHTML, blockedImages };
}

/** A complete, standalone HTML file for download. */
export function htmlDocument(body: string, title: string): string {
  const esc = title.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc}</title>
<style>body{font-family:system-ui,sans-serif;line-height:1.6;max-width:46rem;margin:2rem auto;padding:0 1rem}pre{overflow:auto;background:#f5f5f5;padding:1rem}code{font-family:ui-monospace,monospace}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:.3rem .6rem}img{max-width:100%}</style>
</head>
<body>
${body}
</body>
</html>
`;
}
