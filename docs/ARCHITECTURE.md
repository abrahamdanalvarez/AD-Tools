# Architecture

> Phase 0 draft. Concrete structure is decided in Phase 1 (upstream selection) and Phase 3 (shell and registry).

## Constraints

- **Static only.** The output is `dist/` from `vite build`, uploaded to Virtualmin `public_html/`. No server code.
- **Client-side processing.** All file work happens in the browser.
- **No network egress of user data.** The only network requests are for the app's own static assets (JS, CSS, WASM, models).
- **Single maintainer.** Prefer few, well-maintained dependencies and a flat structure.

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
  lib/          shared helpers (file I/O, download, worker bridge)
  workers/      shared worker infrastructure
public/
  models/       self-hosted AI models (cached allowed)
  wasm/         self-hosted WASM binaries (cached allowed)
```

### Principles

1. **Lazy load per tool.** Each tool and its WASM/model loads only when opened, which keeps first load small.
2. **Workers for heavy work.** Keeps the UI responsive. Data moves via `postMessage` or transferables, never storage.
3. **Registry gates visibility.** Only tools with `status: "stable"` appear in navigation, search, and the sitemap.
4. **Self-host assets.** WASM and models are served from our own origin, with no third-party CDN fetches at runtime. This keeps the privacy and CSP story simple.
5. **Output = download.** Results are given to the user as Blob/object URLs and revoked after use.

## Hosting notes (Virtualmin / Apache)

- An SPA fallback via `.htaccess` (rewrite to `index.html`) is needed if client-side routing uses paths. Hash routing or pre-rendered routes avoid this.
- Correct MIME for `.wasm` (`application/wasm`) and long cache headers for hashed assets, via `.htaccess`.
- `SharedArrayBuffer` (multi-threaded ffmpeg.wasm and ONNX WASM threads) needs the COOP/COEP headers `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, which can be set in `.htaccess` if `mod_headers` is enabled. Must be confirmed on the host.
- CSP and security headers also go in `.htaccess` (Phase 7).

## Open decisions

See `PROJECT_STATUS.md` → Architectural decisions / Blockers.
