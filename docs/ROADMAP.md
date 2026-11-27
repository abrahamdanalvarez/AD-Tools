# Roadmap

Each phase ends with `PROJECT_STATUS.md` updated, real test results recorded, and a stop for review. A tool ships only when it is finished, tested, and runs fully in the browser.

| Phase | Name | Goal |
|---|---|---|
| 00 | Project initialization | Rules, docs, status tracking, decision log. |
| 01 | Repository audit and setup | Audit [OpenDocs-Studio](https://github.com/akash098p/OpenDocs-Studio) and alternatives for licence, security, privacy (uploads, telemetry, third-party requests), functionality, and code quality. Adopt or scaffold a base. `npm ci && npm run build` must produce `dist/`. |
| 02 | Branding and design system | Logo set, favicon, social image, self-hosted fonts, Tailwind + shadcn/ui tokens, light/dark modes (see `BRANDING.md`). |
| 03 | Application foundation and tool registry | App shell, routing, layout, a typed tool registry that hides unverified tools, search, categories, favourites, and the worker bridge. |
| 04 | PDF tools | Merge, split, compress, rotate, reorder, extract, protect/unlock, convert, OCR. **Done: 31 tools. OCR and annotation deferred (D39).** |
| 05 | Image tools | Convert, resize, compress, crop, metadata stripping. **Done: 33 tools. HEIC (licence) and OCR deferred (D47, D39).** |
| 06 | AI background removal and local AI tools | ONNX Runtime Web (WebGPU with WASM fallback), self-hosted models with verified redistribution rights. **Done: AI Background Remover and AI Subject Mask (BiRefNet_lite, 512 × 512, 8-bit). Upscaler, semantic segmentation and image OCR not shipped (D64).** |
| 07 | Developer, text and productivity tools | JSON/YAML, encoders, hashing, QR, text utilities, etc. **Done: 68 tools (36 developer, 19 text, 10 productivity, 3 file).** |
| 08 | Audio, video and document tools | ffmpeg.wasm conversions, trimming, extraction, document conversion. |
| 09 | Privacy, security and analytics | CSP and security headers (`.htaccess`), network-egress and storage audits, an optional analytics adapter (off by default). |
| 10 | SEO, accessibility and legal pages | Metadata, OG, sitemap, structured data, WCAG 2.2 AA, privacy policy, terms, licences page. |
| 11 | Final testing and deployment preparation | Full Vitest + Playwright runs, a clean-build check, a performance pass, and a `dist/` → `public_html/` checklist. |

## Permanently out of scope

Anything that needs a backend, server-side processing or inference, external processing APIs, paid APIs, cloud storage, accounts, or a database.
