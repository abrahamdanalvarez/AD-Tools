# Architecture

> The foundation was set up in Phase 01 (fresh scaffold, `DECISIONS.md` D10–D16). The app shell and registry UI arrive in Phase 03.

## Current state (Phase 01)

| Item | Location |
|---|---|
| Entry | `index.html` → `src/main.tsx` → `src/app/App.tsx` (minimal shell) |
| Registry | `src/registry/` (`types.ts`, `registry.ts`; only `verified` tools are visible) |
| Styles | `src/index.css` (Tailwind 4, scans `src/` only) |
| shadcn/ui | `components.json` and the `cn()` helper in `src/lib/utils.ts`. Components are added per tool. |
| Apache rules | `public/.htaccess` → copied to `dist/` (WASM MIME, caching, no directory listing) |
| Unit tests | `src/**/*.test.ts(x)`, Vitest + jsdom |
| E2E tests | `e2e/`, Playwright against `dist/` served by `scripts/serve-dist.mjs` |
| Build | `npm run build` = `tsc --noEmit && vite build` → `dist/` (relative `./` asset paths) |

## Constraints

- **Static only.** The output is `dist/` from `vite build`, and its contents are uploaded to `public_html/`. No server code at runtime.
- **Client-side processing.** All file work happens in the browser on the user's CPU, GPU and RAM.
- **No egress of user data.** The only network requests are for our own static assets (JS, CSS, WASM, models, fonts), plus approved analytics events if enabled.
- **Single maintainer.** Few, well-maintained dependencies and a flat structure.

## Hosting

| Layer | Detail |
|---|---|
| Server | Ubuntu VPS, Virtualmin, Apache (static files only) |
| DNS / edge | Cloudflare, HTTPS |
| Docroot | `public_html/` ← contents of `dist/` |
| Server config | `.htaccess` shipped in `dist/` (from `public/`) |

`.htaccess` responsibilities:

- SPA fallback to `index.html` (if path routing is used)
- `AddType application/wasm .wasm`
- Long cache for hashed assets, no-cache for `index.html`
- COOP/COEP (`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`) for `SharedArrayBuffer` (multi-threaded ffmpeg.wasm and ONNX). This needs `mod_headers`.
- CSP and security headers (Phase 09)

Cloudflare notes: make sure it passes the COOP/COEP/CSP headers through. Turn off script-injecting features (Rocket Loader, auto Web Analytics, Zaraz, email obfuscation). Watch the 100 MB per-file upload and cache limits for large models.

## Planned stack

| Concern | Choice |
|---|---|
| UI | React + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS + shadcn/ui, Lucide icons |
| Heavy compute | WebAssembly in Web Workers |
| AI inference | ONNX Runtime Web (WebGPU, falling back to WASM) |
| Unit tests | Vitest |
| E2E tests | Playwright |

## Planned shape

```
src/
  app/          shell, routing, layout, theme
  tools/        one folder per tool (UI + worker + tests)
  registry/     typed tool registry (id, category, status, route, lazy loader)
  lib/          shared helpers (file I/O, download, worker bridge, analytics adapter)
  workers/      shared worker infrastructure
public/
  models/       self-hosted AI models
  wasm/         self-hosted WASM binaries
  fonts/        self-hosted fonts
  .htaccess
```

### Principles

1. **Lazy load per tool.** A tool's WASM or model loads only when it is opened.
2. **Workers for heavy work.** Data moves via `postMessage` and transferables, never storage.
3. **The registry gates visibility.** Only `status: "verified"` tools appear in navigation, search, and the sitemap.
4. **Self-host everything.** No third-party CDN at runtime.
5. **Output = download.** Blob/object URLs are revoked after use.
6. **Analytics adapter is a no-op by default.** A single module, with the event enum defined in `PRIVACY.md`.
