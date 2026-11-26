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
| D9 | 2026-11-26 | OpenDocs-Studio is the preferred upstream candidate, pending a Phase 01 audit. | Owner preference. Not yet verified. | Proposed |
