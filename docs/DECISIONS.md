# Decisions

Append-only log. New decisions get the next number. Superseded ones are marked, not deleted.

| # | Date | Decision | Reason | Status |
|---|---|---|---|---|
| D1 | 2026-11-26 | Static Vite build. The contents of `dist/` are uploaded to Apache `public_html/` (Virtualmin). | Hard requirement. No runtime server. | Accepted |
| D2 | 2026-11-26 | All processing client-side in Web Workers + WASM. AI via ONNX Runtime Web (WebGPU → WASM fallback). | Privacy: files never leave the device. | Accepted |
| D3 | 2026-11-26 | Self-host WASM, models and fonts on our origin. No runtime third-party CDN. | Simpler CSP, no third-party requests, privacy guarantee. | Accepted |
| D4 | 2026-11-26 | A typed tool registry with a status field. Only verified tools are visible. | "Never present placeholders as functional tools." | Accepted |
| D5 | 2026-11-26 | Server behaviour (SPA fallback, WASM MIME, caching, COOP/COEP, CSP) via `.htaccess` in `dist/`. | The only server config available on static hosting. | Accepted |
| D6 | 2026-11-26 | Brand name is Privora (replaces AD Tools). `BRAND.md` is the source of truth. | Owner rebrand. | Accepted |
| D7 | 2026-11-26 | Roadmap restructured into phases 00–11. | Owner Phase 00 spec. | Accepted (replaces the 0–9 plan) |
| D8 | 2026-11-26 | Analytics is off by default, behind a no-op adapter with a fixed event enum. | Privacy. Owner approval needed before enabling. | Accepted |
| D9 | 2026-11-26 | OpenDocs-Studio is the preferred upstream candidate, pending a Phase 01 audit. | Owner preference. Not yet verified. | **Rejected:** no licence (see `REPOSITORY_AUDIT.md`) |
| D10 | 2026-11-26 | Foundation is a fresh Privora scaffold, not a fork. Upstreams are references. MIT code may be reused with attribution. | No candidate was licensed, client-side, React-based and maintainable all at once. Keeps the licence choice open. Owner choice. | Accepted |
| D11 | 2026-11-26 | Stack pinned: React 19.3, Vite 8.3, TypeScript 7.0, Tailwind 4.3 (`@tailwindcss/vite`), shadcn/ui config (new-york, slate, Lucide), Vitest 5, Playwright 1.65, all exact versions. | Latest stable releases. Exact pins make `npm ci` reproducible. | Accepted |
| D12 | 2026-11-26 | Vite `base: "./"` (relative asset paths). | `dist/` works in any `public_html` folder without config. | Accepted |
| D13 | 2026-11-26 | E2E runs against `dist/` served by a dependency-free static server (`scripts/serve-dist.mjs`). It checks for no foreign requests and empty storage. | Proves the build needs only static hosting, and tests the privacy rules from day one. | Accepted |
| D14 | 2026-11-26 | Tailwind scans only `src/` (`source(".")`). | It was picking up classes from docs and local files, which made the CSS bigger. | Accepted |
| D15 | 2026-11-26 | jsdom pinned to 29.1.1, not 31. | jsdom 30+ needs Node ≥ 24.15, but the local Node is 24.12. Test-only. | Accepted (revisit after a Node upgrade) |
| D16 | 2026-11-26 | Reject `@imgly/background-removal` and any AGPL/GPL dependency unless the owner picks a compatible project licence. | Keeps the licence choice open. | Accepted |
