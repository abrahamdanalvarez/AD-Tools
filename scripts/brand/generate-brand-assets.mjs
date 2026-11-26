// Generates every Privora logo, icon and social asset into public/.
// Run: node scripts/brand/generate-brand-assets.mjs
// SVGs are written directly; PNGs are rendered with Playwright (dev dependency).
// The wordmark is Plus Jakarta Sans Bold (OFL-1.1) converted to outlines, so the
// SVGs need no font at runtime.
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(import.meta.dirname, "../..");
const pub = join(root, "public");
const brandDir = join(pub, "brand");
const wordmark = JSON.parse(await readFile(join(import.meta.dirname, "wordmark.json"), "utf8"));

// ── Geometry (48-unit grid) ────────────────────────────────────────────────
// P monogram: round bowl, stem that ends in a soft shield point. The counter
// (the "inside" of the P) is filled with the accent colour: your file, kept
// inside the shield.
const P = "M12 9H25A10.5 10.5 0 0 1 25 30H19.5V33.5Q19.5 37 15.75 40Q12 37 12 33.5Z";
const COUNTER = "M19.5 15.5H24.5A4 4 0 0 1 24.5 23.5H19.5Z";
const P_BOX = { x: 12, y: 9, w: 23.5, h: 31 };

const palette = {
  light: { p: "#2563EB", counter: "#06B6D4", text: "#0F172A" },
  dark: { p: "#3B82F6", counter: "#22D3EE", text: "#F8FAFC" },
  tile: { bg: "#0F172A", p: "#3B82F6", counter: "#06B6D4" },
};

const mark = (c, transform = "") =>
  `<g${transform ? ` transform="${transform}"` : ""}><path fill="${c.p}" fill-rule="evenodd" d="${P} ${COUNTER}"/><path fill="${c.counter}" d="${COUNTER}"/></g>`;

const svg = (viewBox, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;

// Icon-only mark, transparent background.
const markSvg = (c) => svg("8 8.5 32 32", mark(c), "Privora");

// App icon / favicon: mark on a dark rounded tile (deliberately not a white P
// on blue, which reads as a parking sign).
// The mark is scaled up 15% inside the tile so it stays legible at 16px.
const tileSvg = (rx = 12) =>
  svg(
    "0 0 48 48",
    `<rect width="48" height="48" rx="${rx}" fill="${palette.tile.bg}"/>${mark(palette.tile, "translate(24 24.5) scale(1.15) translate(-23.75 -24.5)")}`,
    "Privora",
  );

// Horizontal lockup: mark + wordmark, mark centred on the cap height.
function horizontalSvg(c) {
  const s = 34 / P_BOX.h;
  const markW = P_BOX.w * s;
  const gap = 9;
  const top = wordmark.h / 2 - (P_BOX.h * s) / 2;
  const width = markW + gap + wordmark.w;
  const body =
    mark(c, `translate(0 ${top.toFixed(2)}) scale(${s.toFixed(4)}) translate(-${P_BOX.x} -${P_BOX.y})`) +
    `<path fill="${c.text}" d="${wordmark.d}" transform="translate(${(markW + gap).toFixed(2)} 0)"/>`;
  return svg(`0 ${top.toFixed(2)} ${width.toFixed(2)} ${(P_BOX.h * s).toFixed(2)}`, body, "Privora");
}

// Compact (stacked) lockup: mark above wordmark.
function compactSvg(c) {
  const s = 40 / P_BOX.h;
  const markW = P_BOX.w * s;
  const x = (wordmark.w - markW) / 2;
  const textY = 40 + 8;
  const body =
    mark(c, `translate(${x.toFixed(2)} 0) scale(${s.toFixed(4)}) translate(-${P_BOX.x} -${P_BOX.y})`) +
    `<path fill="${c.text}" d="${wordmark.d}" transform="translate(0 ${textY})"/>`;
  return svg(`0 0 ${wordmark.w} ${(textY + wordmark.h).toFixed(2)}`, body, "Privora");
}

// ── Write SVGs ─────────────────────────────────────────────────────────────
await mkdir(brandDir, { recursive: true });
const files = {
  "brand/privora-mark.svg": markSvg(palette.light),
  "brand/privora-mark-dark.svg": markSvg(palette.dark),
  "brand/privora-icon.svg": tileSvg(),
  "brand/privora-horizontal.svg": horizontalSvg(palette.light),
  "brand/privora-horizontal-dark.svg": horizontalSvg(palette.dark),
  "brand/privora-compact.svg": compactSvg(palette.light),
  "brand/privora-compact-dark.svg": compactSvg(palette.dark),
  "favicon.svg": tileSvg(),
};
for (const [name, content] of Object.entries(files)) await writeFile(join(pub, name), content);

// ── Render PNGs ────────────────────────────────────────────────────────────
const fontUrl = (pkg, file) =>
  pathToFileURL(join(root, "node_modules/@fontsource-variable", pkg, "files", file)).href;

const browser = await chromium.launch();
const work = join(tmpdir(), `privora-brand-${process.pid}`);
await mkdir(work, { recursive: true });

async function render(name, html, width, height, transparent = false) {
  const file = join(work, `${name.replace(/\W/g, "_")}.html`);
  await writeFile(file, `<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style></head><body>${html}</body></html>`);
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ omitBackground: transparent });
  await page.close();
  return buf;
}

const full = (size, inner, bg = palette.tile.bg) =>
  `<div style="width:${size}px;height:${size}px;background:${bg};display:grid;place-items:center">${inner}</div>`;
const markAt = (px) =>
  `<svg width="${px}" height="${px}" viewBox="8 8.5 32 32">${mark(palette.tile)}</svg>`;

// Full-bleed square icons (iOS and Android apply their own masks).
const png = {
  "apple-touch-icon.png": await render("apple", full(180, markAt(150)), 180, 180),
  "brand/icon-192.png": await render("i192", full(192, markAt(160)), 192, 192),
  "brand/icon-512.png": await render("i512", full(512, markAt(426)), 512, 512),
  // Maskable: keep the mark inside the 80% safe zone.
  "brand/icon-maskable-512.png": await render("mask", full(512, markAt(300)), 512, 512),
};

// Favicon.ico: rounded tile at 16/32/48, PNG-in-ICO.
const icoSizes = [16, 32, 48];
const icoPngs = [];
for (const size of icoSizes) {
  icoPngs.push(await render(`ico${size}`, `<img src="data:image/svg+xml;base64,${Buffer.from(tileSvg()).toString("base64")}" width="${size}" height="${size}" style="display:block">`, size, size, true));
}
png["favicon.ico"] = buildIco(icoSizes, icoPngs);

// Social sharing image, 1200×630.
const ogHtml = `
<style>
  @font-face{font-family:Jakarta;src:url(${fontUrl("plus-jakarta-sans", "plus-jakarta-sans-latin-wght-normal.woff2")}) format("woff2");font-weight:200 800}
  @font-face{font-family:Inter;src:url(${fontUrl("inter", "inter-latin-wght-normal.woff2")}) format("woff2");font-weight:100 900}
  .og{width:1200px;height:630px;box-sizing:border-box;padding:72px 80px;background:#F8FAFC;display:flex;flex-direction:column;justify-content:space-between;font-family:Inter;color:#0F172A;border-bottom:12px solid #2563EB}
  h1{font-family:Jakarta;font-weight:700;font-size:68px;line-height:1.08;letter-spacing:-0.02em;margin:0 0 20px}
  p{font-size:30px;color:#475569;margin:0}
  .chips{display:flex;gap:14px;flex-wrap:wrap}
  .chip{display:flex;align-items:center;gap:10px;font-size:22px;font-weight:500;padding:12px 18px;border:1px solid #E2E8F0;background:#fff;border-radius:999px}
  .dot{width:10px;height:10px;border-radius:50%;background:#16A34A}
  .row{display:flex;justify-content:space-between;align-items:center}
  .domain{font-size:24px;font-weight:600;color:#1D4ED8}
</style>
<div class="og">
  <div class="row">${horizontalSvg(palette.light).replace("<svg ", '<svg height="52" ')}<span class="domain">tools.abrahamdan.com</span></div>
  <div><h1>Powerful tools.<br>Private by design.</h1><p>All the tools. None of the uploads.</p></div>
  <div class="chips">${["100% on-device processing", "Zero file uploads", "No account required"].map((t) => `<span class="chip"><span class="dot"></span>${t}</span>`).join("")}</div>
</div>`;
png["brand/og-image.png"] = await render("og", ogHtml, 1200, 630);

for (const [name, buf] of Object.entries(png)) await writeFile(join(pub, name), buf);
await browser.close();
await rm(work, { recursive: true, force: true });
console.log("Wrote:", [...Object.keys(files), ...Object.keys(png)].join(", "));

function buildIco(sizes, images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((img, i) => {
    const e = 6 + i * 16;
    header.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], e);
    header.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(img.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += img.length;
  });
  return Buffer.concat([header, ...images]);
}
