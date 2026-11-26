# Project status

_Last updated: 2026-11-26_

## Current phase

**Phase 04: Browser-based PDF tools.** Complete. Stopped for review. Phase 05 has not started.

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

## Pending tasks

- [ ] **Owner:** choose the project licence (MIT recommended)
- [ ] **Owner:** ffmpeg GPL decision before Phase 08
- [ ] **Owner:** repo and folder rename to `privora`
- [ ] **Owner:** review and approve the logo (`public/brand/`)
- [ ] **Owner:** contact email, GitHub visibility and legal pages (About, Privacy Policy, Terms, Cookies). Their footer links are hidden until then (D29).
- [ ] Add automated `npm audit` and security lint gates (checked by hand in Phase 04, see `SECURITY_AUDIT.md`)
- [ ] **Owner:** confirm you're comfortable shipping pdf.js's Liberation Sans fonts (GPL-2.0 with font exception, unmodified, see `LICENCES.md`)
- [ ] Later: OCR PDF (self-hosted Tesseract data, no caching of output) and PDF Annotation
- [ ] Favourites (tool IDs only, as allowed by `PRIVACY.md`) were not part of the Phase 03 spec. Not built yet.

## Verified tools

| Tool | Route | Verified in |
|---|---|---|
| Image Converter (PNG, JPG, WebP, GIF, BMP, AVIF in; PNG, JPG, WebP out) | `/image-converter/` | Chromium, Firefox, WebKit (Playwright 1.65.1, Windows) |
| 31 PDF tools (full list in `TOOL_REGISTRY.md`) | `/merge-pdf/`, `/split-pdf/`, … | Chromium, Firefox, WebKit (Playwright 1.65.1, Windows) |

Planned and hidden: OCR PDF, PDF Annotation, Remove Background.

## Known issues

- pdf-lib is unmaintained (last release 2021). It works and is tested, but watch for advisories (`SECURITY_AUDIT.md`).
- pdf-lib is bundled twice (about 420 kB each, lazy): once in the PDF worker and once on the page for previews, inspection and the compress fallback.
- Text tools (watermark, page numbers, add text) use the standard PDF fonts, so they accept Latin (WinAnsi) characters only. Other scripts get a clear error.
- Compress only helps PDFs with large JPEG photos. Text-only or vector PDFs barely shrink, and the tool says so.

- Node 24.12 locally. jsdom is pinned to 29.1.1 (D15). Upgrade Node to ≥ 24.15 when convenient.
- Several brand colours fail WCAG AA as text (accent 2.43, success 3.30, warning 2.15 on white; muted 4.24 and primary 3.90 on the dark background; border 1.23 for inputs). Handled with extra accessible tokens (D18). The brand hex values themselves are unchanged.
- Font subsets for all scripts (latin, latin-ext, cyrillic, greek, vietnamese) ship in `dist/`, about 360 kB total, but browsers only fetch the subsets a page uses.
- The git remote is still `abrahamdanalvarez/AD-Tools`.

## Blockers

- None for Phase 05.
- Before Phase 06: a permissively licensed background-removal model.
- Before Phase 08: the ffmpeg GPL decision, plus `mod_headers` and Cloudflare passing COOP/COEP through.

## Architectural decisions

See `DECISIONS.md` D1–D42. New this phase: D32 PDF libraries, D33 pdf.js legacy build, D34 self-hosted pdf.js assets and no scripting, D35 one config-driven PDF shell, D36 repair via pdf-lib, D37 unlock needs the real password, D38 photo-only compression, D39 OCR and annotation deferred, D40 visual vs digital signature, D41 qpdf Node stubs, D42 shared a11y fixes.

## Test results (2026-11-26, Node v24.12.0, npm 11.6.2)

| Command | Result |
|---|---|
| `npm audit` | 0 vulnerabilities |
| `npm run typecheck` | OK, no errors |
| `npm test` | 9 files, **68/68 passed** (Phase 03's 39, plus 26 PDF core tests, 2 qpdf tests and a registry check that PDF configs, IDs and entries match) |
| `npm run build` | OK, no warnings. "static routes: 34 pages, sitemap.xml, robots.txt, 404.html". "vendor assets: pdf.js cmaps, standard_fonts, iccs, wasm → /vendor/pdfjs/". Main JS 336.49 kB (104.77 kB gzip), CSS 41.63 kB (12.18 kB gzip). Lazy: PdfToolPage 57.47 kB (18.82 kB gzip), pdf.js 500.13 kB (152.68 kB gzip), pdf-lib 420.39 kB (175.82 kB gzip), pdf.js worker 1.33 MB, qpdf WASM 1.33 MB. `dist/` 5.3 MB in total, of which `vendor/pdfjs/` is 3.2 MB. |
| `npx playwright test` | **109/109 passed** in 1.5 min: 59 Chromium, 25 Firefox, 25 WebKit |

E2E added this phase (details in `TESTING.md`):

- **`pdf-tools.spec.ts` (21 tests × 3 browsers).** Every enabled PDF tool runs on synthetic files, and the download is checked: page order, text read back with pdf.js, rotation, image signatures, ZIP contents, metadata, encryption. Also wrong-password, non-PDF, damaged, scanned-PDF, cancel and start-over cases.
- **Privacy guard on every PDF test.** No non-GET requests, nothing to other origins, no same-origin 4xx/5xx, and local storage, session storage and IndexedDB are all empty at the end.
- **`pdf-a11y.spec.ts`.** axe WCAG 2.2 AA with 0 violations and no horizontal scroll, for the page picker, reorder screen, placement editor, signature tabs and result, at 1280 and 375 px, light and dark.

Problems found and fixed during the phase:

- **The qpdf WASM build can't repair files and reports encryption wrongly.** Repair moved to pdf-lib (D36). Encryption is detected with pdf-lib (D37).
- **The pdf.js modern build needs very new JS features.** Switched to the legacy build (D33).
- **axe contrast failures** (alert text 4.37, inactive tabs 4.34), and a **131 px horizontal overflow** on the mobile signature page (D42).
- **Firefox named thumbnails "Page 2 Page 2".** Thumbnails inside labelled buttons are now hidden from assistive tech.
- **The encrypted-file inspection failed** on files with object streams, and a broken catalog threw an untyped error. Both now give clear messages.

Screenshots of the home, split, sign and mobile dark delete pages were reviewed by eye.

## Next development task

**Phase 05** (see `ROADMAP.md`). Wait for owner approval to start.
