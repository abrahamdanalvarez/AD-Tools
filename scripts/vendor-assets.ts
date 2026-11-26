// Vite plugin: self-hosts the data files pdf.js loads on demand (CMaps for
// CJK text, the 14 standard fonts, ICC colour profiles and image-decoder WASM).
// They are copied into dist/vendor/pdfjs/ at build time and served from
// node_modules in dev, so pdf.js never fetches anything from another origin.
import { cp, readFile, stat } from "node:fs/promises";
import { join, normalize, resolve } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

const PDFJS_DIRS = ["cmaps", "standard_fonts", "iccs", "wasm"] as const;
export const PDFJS_PUBLIC_PATH = "/vendor/pdfjs/";

/**
 * QuickJS is pdf.js's engine for running a PDF's embedded JavaScript. Privora
 * never enables scripting, so the engine is neither shipped nor served.
 */
const shipped = (path: string) => !/quickjs/i.test(path);

export function vendorAssets(): Plugin {
  let config: ResolvedConfig;
  const source = () => resolve(config.root, "node_modules/pdfjs-dist");
  return {
    name: "privora-vendor-assets",
    configResolved(c) {
      config = c;
    },
    configureServer(server) {
      server.middlewares.use(PDFJS_PUBLIC_PATH, async (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? "/").split("?")[0]);
        const dir = rel.split("/")[1];
        const file = normalize(join(source(), rel));
        if (!(PDFJS_DIRS as readonly string[]).includes(dir) || !file.startsWith(source()) || !shipped(file)) return next();
        try {
          if (!(await stat(file)).isFile()) return next();
          res.setHeader("Content-Type", file.endsWith(".wasm") ? "application/wasm" : "application/octet-stream");
          res.end(await readFile(file));
        } catch {
          next();
        }
      });
    },
    async closeBundle() {
      if (config.command !== "build") return;
      const out = resolve(config.root, config.build.outDir, PDFJS_PUBLIC_PATH.slice(1));
      for (const dir of PDFJS_DIRS) await cp(join(source(), dir), join(out, dir), { recursive: true, filter: shipped });
      console.log(`vendor assets: pdf.js ${PDFJS_DIRS.join(", ")} → ${PDFJS_PUBLIC_PATH}`);
    },
  };
}

/**
 * qpdf's Emscripten loader has a Node.js branch that requires fs, path and
 * crypto. That branch never runs in a browser, so those imports resolve to an
 * empty module instead of Vite's "externalized" shim (and its warnings).
 */
export function qpdfNodeStubs(): Plugin {
  const STUB = "\0privora-empty-node-builtin";
  return {
    name: "privora-qpdf-node-stubs",
    enforce: "pre",
    resolveId(id, importer) {
      if (["fs", "path", "crypto"].includes(id) && importer?.includes("qpdf-wasm")) return STUB;
      return null;
    },
    load(id) {
      return id === STUB ? "export default {};" : null;
    },
  };
}
