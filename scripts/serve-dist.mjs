// Minimal static file server for dist/. No dependencies and no SPA fallback.
// It mimics plain Apache: directory → index.html, "/dir" → 301 "/dir/",
// unknown path → 404.html with status 404. That proves every route exists as
// a real file.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve("dist");
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".onnx": "application/octet-stream",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
};

const isDir = async (p) => (await stat(p).catch(() => null))?.isDirectory() ?? false;

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  const path = decodeURIComponent(url.pathname);
  let file = normalize(join(root, path));
  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  if (!path.endsWith("/") && (await isDir(file))) {
    res.writeHead(301, { Location: `${path}/${url.search}` }).end();
    return;
  }
  if (await isDir(file)) file = join(file, "index.html");
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    const body = await readFile(join(root, "404.html")).catch(() => "Not found");
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }).end(body);
  }
}).listen(port, "127.0.0.1", () => console.log(`dist/ on http://127.0.0.1:${port}`));
