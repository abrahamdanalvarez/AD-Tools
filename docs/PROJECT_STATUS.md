# Project status

_Last updated: 2026-11-27_

## Current phase

**Phase 05: Browser-based image tools.** Complete. Stopped for review. Phase 06 has not started.

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
- [ ] **Owner:** commit Phase 05 (uncommitted in the working tree)
- [ ] Favourites (tool IDs only, as allowed by `PRIVACY.md`) were not part of the Phase 03 spec. Not built yet.

## Verified tools

| Tool | Route | Verified in |
|---|---|---|
| 33 image tools (full list in `TOOL_REGISTRY.md`) | `/image-converter/`, `/image-compressor/`, … | Chromium, Firefox, WebKit (Playwright 1.65.1, Windows) |
| 31 PDF tools (full list in `TOOL_REGISTRY.md`) | `/merge-pdf/`, `/split-pdf/`, … | Chromium, Firefox, WebKit (Playwright 1.65.1, Windows) |

Planned and hidden: OCR PDF, PDF Annotation, HEIC to JPG, HEIC to PNG, Image OCR, Remove Background.

## Known issues

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

- None for Phase 06 code work.
- Before Phase 06: a permissively licensed background-removal model.
- Before Phase 08: the ffmpeg GPL decision, plus `mod_headers` and Cloudflare passing COOP/COEP through.

## Architectural decisions

See `DECISIONS.md` D1–D56. New this phase: D43 image tools reuse the PDF shell, D44 decode on the page and render in a worker, D45 pixel loops instead of canvas `filter`, D46 oxipng for PNG, D47 HEIC deferred, D48 no TIFF input, D49 PNG/JPG/WebP output only, D50 no WebP/JPEG codec WASM, D51 SVG only through `<img>`, D52 lossless metadata removal, D53 animation and transparency warnings, D54 one-at-a-time batches, D55 "Change settings", D56 exifr.

## Test results (2026-11-27, Node v24.12.0, npm 11.6.2, Playwright 1.65.1)

| Command | Result |
|---|---|
| `npm audit` | 0 vulnerabilities |
| `npm run typecheck` | OK, no errors |
| `npm test` | 10 files, **80/80 passed** (Phase 04's 68, plus 12 image core tests) |
| `npm run build` | OK, no warnings. "static routes: 66 pages, sitemap.xml, robots.txt, 404.html". Main JS 362.33 kB (112.14 kB gzip), CSS 43.79 kB (12.47 kB gzip). Lazy: ImageToolPage 44.77 kB (16.35 kB gzip), image worker 4.55 kB, exifr 75.03 kB (26.52 kB gzip), oxipng WASM 164.17 kB (76.76 kB gzip), PdfToolPage 39.55 kB (13.27 kB gzip). Sum of all file sizes in `dist/`: 8.1 MB, of which `assets/` 5.1 MB and `vendor/pdfjs/` 3.2 MB. |
| `npx playwright test` | **158/158 passed** in 2.2 min across Chromium, Firefox and WebKit |

E2E added this phase (details in `TESTING.md`):

- **`image-tools.spec.ts` (15 tests × 3 browsers).** Every enabled image tool runs on synthetic files, and the output is checked from its bytes: format, size, transparency, pixels, EXIF and orientation, ZIP names. Also animated GIF, hostile SVG, damaged and disguised files.
- **Shared privacy guard** (`e2e/fixtures.ts`), now used by the PDF and image specs: no non-GET requests, nothing to other origins, no same-origin 4xx/5xx, all storage empty.
- **`pdf-a11y.spec.ts`** also covers the crop editor, colour picker and before/after result: axe WCAG 2.2 AA with 0 violations and no horizontal scroll at 1280 and 375 px, light and dark.

Problems found and fixed during the phase:

- **Firefox opens downloaded `.webp` files in a new tab** and reports no download event. The app is fine. The e2e helper captures the blob in Firefox for WebP only.
- **The colour picker could read a blank canvas** if clicked before the image was drawn (an intermittent WebKit failure). Clicks are now ignored until the image is drawn.
- **Base64 data URLs used the type the system reported** (sometimes `application/octet-stream`). They now use the type read from the bytes.
- **The palette mixed a large area of one colour into the next.** The median cut now splits at the middle of the colour range.

Screenshots of the cropper, compressor result (desktop) and colour picker (mobile, dark) were reviewed by eye.

## Next development task

**Phase 06: AI background removal and local AI tools** (see `ROADMAP.md`). Needs a background-removal model with permissive, verified weights. Wait for owner approval to start.
