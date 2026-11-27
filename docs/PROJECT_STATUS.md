# Project status

_Last updated: 2026-11-27_

## Current phase

**Phase 06: Local AI processing and background removal.** Complete. Stopped for review. Phase 07 has not started.

## Completed tasks

### Phase 00
- [x] Rules, README, and docs (architecture, roadmap, privacy, licences, decisions)

### Phase 01
- [x] Repository audit. A fresh scaffold was selected (D10).
- [x] React 19 + TS 7 + Vite 8 + Tailwind 4 foundation, pinned dependencies, unit and e2e tests

### Phase 02
- [x] Original P-monogram logo (shield-point stem, accent counter) with a generator script
- [x] Logo set: horizontal, compact (stacked), icon-only mark, app tile, each in light and dark
- [x] Favicon (SVG + ICO 16/32/48), Apple touch icon, PWA icons (192, 512, maskable), social image (1200×630)
- [x] `manifest.webmanifest`, Open Graph and Twitter metadata, canonical, theme-color
- [x] Centralised design tokens (CSS variables → Tailwind `@theme`), light and accessible dark palettes
- [x] Self-hosted fonts: Plus Jakarta Sans, Inter, JetBrains Mono (OFL-1.1)
- [x] Theme: system default, explicit toggle, pre-paint bootstrap with no flash
- [x] Shared components: buttons, input/label, select, tabs, dialog, alert (error/warning/success/info), progress, spinner, skeleton, badge, card, tool card, category card, empty state, privacy indicators, header (skip link, desktop and mobile nav), footer
- [x] Branded homepage (hero, privacy indicators, category grid marked "Coming soon", privacy section, footer attribution)
- [x] Dev-only component gallery at `/#styleguide` (verified absent from `dist/`)
- [x] `docs/BRANDING.md` (`BRAND.md` merged into it). Updated `LICENCES.md`, `DECISIONS.md` (D17–D24), `ARCHITECTURE.md`, `SECURITY_AUDIT.md`, `THIRD_PARTY_NOTICES.md`.

### Phase 03
- [x] Central tool registry (`src/registry/tools.ts`) with every required field. Visible only when enabled and verified.
- [x] Local search ("Find a tool...") by name, keywords, category, formats and aliases. Queries are never stored or sent.
- [x] Homepage: hero, search, privacy indicators, popular tools, categories (only those with working tools), how it works (4 steps), privacy section, footer
- [x] Shared tool layout: breadcrumbs, privacy notice, "Choose file" plus drag and drop, formats, settings, progress, cancel, preview, download, start over, instructions, limitations, FAQs, related tools
- [x] Web Worker bridge with progress and cancel, plus an on-page fallback
- [x] Static routes: real `/<slug>/index.html` per tool, `/credits/`, `404.html`, `sitemap.xml`, `robots.txt`, each with its own title, description, canonical and Open Graph tags
- [x] Open-source credits page. Footer shows only links with a real page.
- [x] First verified tool: Image Converter
- [x] `docs/TOOL_REGISTRY.md` (new). Updated `ARCHITECTURE.md`, `DECISIONS.md` (D25–D31, D12 superseded).

### Phase 04
- [x] Libraries evaluated: pdf-lib (MIT), pdf.js (Apache-2.0, legacy build), qpdf WASM (Apache-2.0 / ISC), fflate (MIT). BentoPDF (AGPL-3.0) used as a reference only. tesseract.js deferred (D32–D33, D39).
- [x] 31 PDF tools verified and enabled:
  - Priority 1: Merge, Split, Compress, Rotate, Reorder, Delete and Extract pages, PDF to JPG/PNG, JPG/PNG/Image to PDF.
  - Priority 2: Duplicate pages, Reverse order, Watermark, Page numbers, Add text, Add image, Visual signature, Flatten, Metadata editor and remover.
  - Priority 3: Extract text, Extract images, Page counter, Preview, Information viewer, Metadata viewer, Password protect, Unlock, Repair.
- [x] Left disabled (`planned`, hidden): OCR PDF and PDF Annotation (D39).
- [x] One shared PDF shell (`src/tools/pdf/ui/`): choose or drop files, validation, settings, progress, cancel, preview, download (ZIP for several files), start over, errors, privacy notice, instructions (D35).
- [x] One worker for every PDF operation. Inputs are transferred, not copied. Cancel terminates the worker. 1 GB input cap, 16 MP canvas cap.
- [x] pdf.js hardened: self-hosted data files at `/vendor/pdfjs/`, no scripting (QuickJS not shipped), no annotation/form layers, no XFA, no streaming or range requests (D34).
- [x] Fidelity: text, links and structure are kept. Only PDF to JPG/PNG rasterises. Compress re-encodes JPEG photos only and says so (D38).
- [x] Visual signature is clearly labelled as not a cryptographic signature (D40).
- [x] Shared contrast and mobile-overflow fixes (D42).
- [x] Docs: `TESTING.md` (new), `TOOL_INVENTORY.md`, `TOOL_REGISTRY.md`, `ARCHITECTURE.md`, `DECISIONS.md` (D32–D42), `LICENCES.md`, `SECURITY_AUDIT.md`, `ROADMAP.md`, `THIRD_PARTY_NOTICES.md`, credits page.

### Phase 05
- [x] Libraries evaluated: exifr (MIT) and @jsquash/oxipng (Apache-2.0, oxipng MIT) added. squoosh evaluated through jSquash: only oxipng adopted, no WebP or JPEG codecs (D50). utif (TIFF) tried and removed (D48). libheif-js (HEIC, LGPL-3.0) deferred by owner decision (D47). tesseract.js deferred with OCR (D39).
- [x] 33 image tools verified and enabled:
  - Priority 1: Image Converter, JPG to PNG, PNG to JPG, JPG to WebP, PNG to WebP, WebP to JPG, WebP to PNG.
  - Priority 2: Compressor, Resizer, Cropper, Rotator, Flipper, Remove Image Metadata.
  - Priority 3: Watermark, Blur, Pixelate, Grayscale, Brightness, Contrast, Saturation, Colour Adjustment, Meme Generator.
  - Priority 4: Metadata Viewer, Information Viewer, Colour Picker, Palette Generator, Favicon Generator, Image to Base64, Base64 to Image, Image Comparison, Batch Converter, Batch Compression, Batch Resizer.
- [x] Left disabled (`planned`, hidden): HEIC to JPG, HEIC to PNG (D47), Image OCR (D39).
- [x] Formats: in PNG, JPG, WebP, GIF, BMP, AVIF, SVG, ICO; out PNG, JPG, WebP (ICO in the Favicon Generator). TIFF input and GIF/BMP/AVIF output are not possible in the browser without large codecs, and the docs say so (D48, D49).
- [x] Animation and transparency are never dropped silently: warnings before running (D53).
- [x] SVG is drawn only through `<img>`: no scripts, no external loads (D51).
- [x] Metadata removal without re-encoding for JPG, PNG and WebP, photos kept upright (D52).
- [x] UX: drag and drop, thumbnails and file info, settings, crop editor (pointer and keyboard), before/after slider, output size and savings, "Change settings", download or ZIP, start over, clear errors.
- [x] Memory: 50 MP and 20,000 px limits, one file at a time in batches, bitmaps closed, canvases freed, object URLs revoked.
- [x] The PDF shell is reused for image tools (D43). The Phase 03 `src/tools/image-converter/` folder is replaced by `src/tools/image/`.
- [x] Docs: `DECISIONS.md` (D43–D56), `TOOL_INVENTORY.md`, `TOOL_REGISTRY.md`, `TESTING.md`, `ARCHITECTURE.md`, `SECURITY_AUDIT.md`, `LICENCES.md`, `ROADMAP.md`, `THIRD_PARTY_NOTICES.md`, credits page.

### Phase 06
- [x] Candidates evaluated for runtime, code and **weights** licences, size and browser support: @imgly/background-removal (AGPL, rejected), ISNet and chenjindu's build (weights unlicensed, rejected), RMBG (non-commercial), MODNet (portraits only), BiRefNet full and BEN2 (too large), transformers.js (not needed). ONNX Runtime Web is used directly (D61).
- [x] Model: BiRefNet_lite (MIT), owner choice. The 1024 × 1024 export ran out of WebAssembly memory (`std::bad_alloc`, 6.4 GB peak), so the 512 × 512 export by Studio Ludens (MIT, same weights) is used (D68). Weights stored in 8 bits, 41 MB gzipped download (D58).
- [x] Model hosting: `npm run fetch-models` downloads the pinned file, checks its SHA-256, quantises it with pinned Python packages, checks the SHA-256 again, and writes `public/models/` (git-ignored). The build stops if the model is missing (D59). The browser checks size and SHA-256 before use (D60).
- [x] 2 AI tools verified and enabled: **AI Background Remover** (transparent, solid colour or own image; PNG, JPG, WebP) and **AI Subject Mask** (PNG).
- [x] Not shipped: AI Image Upscaler, multi-class segmentation, Image OCR (D64, `AI_MODELS.md`).
- [x] UX: choose or drop, preview, one-time download note with size, download progress, starting and removing labels, CPU or GPU and time shown, before/after slider, change background without re-running the AI, cancel, start over, clear errors (download failed, damaged, unsupported browser, out of memory, run failed, bad background image).
- [x] WebGPU when available, CPU (WASM) otherwise. Runtime and model load lazily. One persistent worker, terminated on cancel and when leaving the page (D62).
- [x] The exact AI privacy line on AI tool pages (D67).
- [x] Licences: ONNX Runtime LICENSE and ThirdPartyNotices, BiRefNet MIT notice (© 2024 ZhengPeng, © 2026 Studio Ludens V.O.F.) in `public/licences/`, credits page, `THIRD_PARTY_NOTICES.md`.
- [x] Docs: `AI_MODELS.md` and `BROWSER_COMPATIBILITY.md` (new), `DECISIONS.md` (D57–D68), `LICENCES.md`, `TESTING.md`, `ARCHITECTURE.md`, `TOOL_REGISTRY.md`, `TOOL_INVENTORY.md`, `SECURITY_AUDIT.md`, `ROADMAP.md`.

## Pending tasks

- [ ] **Owner:** choose the project licence (MIT recommended)
- [ ] **Owner:** ffmpeg GPL decision before Phase 08
- [ ] **Owner:** repo and folder rename to `privora`
- [ ] **Owner:** review and approve the logo (`public/brand/`)
- [ ] **Owner:** contact email, GitHub visibility and legal pages (About, Privacy Policy, Terms, Cookies). Their footer links are hidden until then (D29).
- [ ] Add automated `npm audit` and security lint gates (checked by hand in Phase 04, see `SECURITY_AUDIT.md`)
- [ ] **Owner:** confirm you're comfortable shipping pdf.js's Liberation Sans fonts (GPL-2.0 with font exception, unmodified, see `LICENCES.md`)
- [ ] **Owner:** HEIC decision: ship libheif-js (LGPL-3.0, as a separate replaceable WASM file) or keep HEIC hidden (D47)
- [ ] Later: OCR PDF and Image OCR (self-hosted Tesseract data, no caching of output) and PDF Annotation
- [ ] **Owner:** commit Phase 06 (uncommitted in the working tree)
- [ ] **Owner:** read the BiRefNet training-data caveat (DIS5K non-commercial terms, `AI_MODELS.md`) before any commercial use
- [ ] **Owner:** on any machine that builds the site, install Python 3, run `pip install -r scripts/models/requirements.txt`, then `npm run fetch-models` once
- [ ] Test WebGPU on real GPU hardware, and the AI tools on real Safari and phones
- [ ] Later: a WebGPU-only high-detail (1024) mode, an upscaler, image OCR
- [ ] Favourites (tool IDs only, as allowed by `PRIVACY.md`) were not part of the Phase 03 spec. Not built yet.

## Verified tools

| Tool | Route | Verified in |
|---|---|---|
| AI Background Remover, AI Subject Mask | `/remove-background/`, `/ai-subject-mask/` | Chromium, Firefox, WebKit, CPU path (Playwright 1.65.1, Windows) |
| 33 image tools (full list in `TOOL_REGISTRY.md`) | `/image-converter/`, `/image-compressor/`, … | Chromium, Firefox, WebKit (Playwright 1.65.1, Windows) |
| 31 PDF tools (full list in `TOOL_REGISTRY.md`) | `/merge-pdf/`, `/split-pdf/`, … | Chromium, Firefox, WebKit (Playwright 1.65.1, Windows) |

Planned and hidden: OCR PDF, PDF Annotation, HEIC to JPG, HEIC to PNG, Image OCR.

## Known issues

- AI tools run at 512 × 512, so single hairs can be softened on large photos. On the CPU they take about 10 s per photo on a desktop and need about 1.84 GB of memory. Phones may be slow or run out of memory. WebGPU was not tested on real hardware.
- `dist/` is now 89 MB, mostly the model (41 MB) and the two ONNX Runtime WASM files (14.8 and 28.7 MB). Each file is under Cloudflare's 100 MB limit.
- Build and run Playwright from PowerShell. A build started from Git Bash (`/e/...` path) bundled React twice, and every page crashed.
- pdf-lib is unmaintained (last release 2021). It works and is tested, but watch for advisories (`SECURITY_AUDIT.md`).
- pdf-lib is bundled twice (about 420 kB each, lazy): once in the PDF worker and once on the page for previews, inspection and the compress fallback.
- Text tools (watermark, page numbers, add text) use the standard PDF fonts, so they accept Latin (WinAnsi) characters only. Other scripts get a clear error.
- Compress only helps PDFs with large JPEG photos. Text-only or vector PDFs barely shrink, and the tool says so.
- Safari can't encode WebP. WebP output isn't offered there, and the WebP converters explain why. Playwright's WebKit on Windows can encode WebP, so real Safari was not tested.
- `wasm-feature-detect` is installed as a dependency of @jsquash/oxipng but never imported or shipped.
- Meme text (Impact or a similar heavy font) and watermark text (the system UI font) use fonts installed on the device, so the look varies by device.

- Node 24.12 locally. jsdom is pinned to 29.1.1 (D15). Upgrade Node to ≥ 24.15 when convenient.
- Several brand colours fail WCAG AA as text (accent 2.43, success 3.30, warning 2.15 on white; muted 4.24 and primary 3.90 on the dark background; border 1.23 for inputs). Handled with extra accessible tokens (D18). The brand hex values themselves are unchanged.
- Font subsets for all scripts (latin, latin-ext, cyrillic, greek, vietnamese) ship in `dist/`, about 360 kB total, but browsers only fetch the subsets a page uses.
- The git remote is still `abrahamdanalvarez/AD-Tools`.

## Blockers

- None for Phase 07.
- Before Phase 08: the ffmpeg GPL decision, plus `mod_headers` and Cloudflare passing COOP/COEP through.

## Architectural decisions

See `DECISIONS.md` D1–D68. New this phase: D57 BiRefNet_lite, D58 8-bit weights and gzip, D59 fetch script, D60 hashed name and integrity check, D61 ONNX Runtime Web directly, D62 persistent worker and mask cache, D63 HTTP cache only, D64 subject mask shipped (upscaler and OCR not), D65 ONNX Runtime notices, D66 status labels, D67 AI privacy line, D68 the 512 × 512 export.

## Test results (2026-11-27, Node v24.12.0, npm 11.6.2, Playwright 1.65.1, Windows 10, Intel i5-9400)

| Command | Result |
|---|---|
| `npm audit` | 0 vulnerabilities |
| `npm run typecheck` | OK, no errors |
| `npm test` | 11 files, **85/85 passed** (Phase 05's 80, plus 4 AI helper tests and 1 AI registry test) |
| `npm run fetch-models` | Downloaded the pinned 512 export (SHA-256 matched), "quantised 127 weights: 176.8 MB -> 44.6 MB", wrote `public/models/birefnet-lite-int8-c64e1a89.onnx.gz` (40,880,751 bytes) with the expected SHA-256. A second run prints "Model is up to date". |
| `npm run build` | OK. "static routes: 68 pages, sitemap.xml, robots.txt, 404.html". Main JS 367.49 kB (113.94 kB gzip), CSS 44.55 kB (12.58 kB gzip). Lazy: AiToolPage 8.27 kB (3.70 kB gzip), ONNX Runtime CPU WASM 14,848.85 kB (3,878.24 kB gzip), WebGPU WASM 28,747.73 kB (7,279.10 kB gzip). `dist/` total 89.2 MB. |
| `npx playwright test` | **171/171 passed** in 3.6 min across Chromium, Firefox and WebKit |

E2E added this phase (details in `TESTING.md`):

- **`ai-tools.spec.ts` (3 tests × 3 browsers)** with the real model on the CPU path: failed download, progress labels, transparent PNG, solid colour JPG, own background image, a 4000 × 3000 image while offline, exactly one real model download, cancel and re-run, subject mask, damaged model, unsupported browser. The shared privacy guard runs on every test.
- **`pdf-a11y.spec.ts`** also covers the AI background settings and result: axe WCAG 2.2 AA with 0 violations and no horizontal scroll at 1280 and 375 px, light and dark.

Measured (details in `AI_MODELS.md`): CPU inference 9.1–10.2 s per photo in Chromium, Firefox and WebKit. Native peak memory 1.84 GB. Masks vs the float32 1024 model: IoU 0.9927–0.9975.

Problems found and fixed during the phase:

- **The 1024 × 1024 model ran out of WebAssembly memory** (`std::bad_alloc` in `OrtRun`). Its deformable convolutions create 822 MB tensors (6.4 GB peak). Switched to the 512 × 512 export (D68).
- **Quantisation first missed most MatMul weights**, because they also feed `Identity` nodes. Those consumers are now ignored when choosing the axis.
- **The ONNX Runtime GitHub repository returned 404**, so its LICENSE and ThirdPartyNotices came from the official 1.31.1 wheel (D65).
- **A build from Git Bash bundled React twice**, and every page crashed (`Cannot read properties of null (reading 'useEffect')`). Builds from PowerShell are correct. Recorded under Known issues.

Cutouts of three photos were reviewed by eye.

## Next development task

**Phase 07: Developer, text and productivity tools** (see `ROADMAP.md`). Wait for owner approval to start.
