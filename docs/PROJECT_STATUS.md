# Project status

_Last updated: 2026-11-26_

## Current phase

**Phase 03: Application foundation and tool registry.** Complete. Stopped for review. Phase 04 has not started.

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

## Pending tasks

- [ ] **Owner:** choose the project licence (MIT recommended)
- [ ] **Owner:** ffmpeg GPL decision before Phase 08
- [ ] **Owner:** repo and folder rename to `privora`
- [ ] **Owner:** review and approve the logo (`public/brand/`)
- [ ] **Owner:** contact email, GitHub visibility and legal pages (About, Privacy Policy, Terms, Cookies). Their footer links are hidden until then (D29).
- [ ] Add `npm audit` and security lint gates before Phase 04
- [ ] Favourites (tool IDs only, as allowed by `PRIVACY.md`) were not part of the Phase 03 spec. Not built yet.

## Verified tools

| Tool | Route | Verified in |
|---|---|---|
| Image Converter (PNG, JPG, WebP, GIF, BMP, AVIF in; PNG, JPG, WebP out) | `/image-converter/` | Chromium, Firefox, WebKit (Playwright 1.65.1, Windows) |

Planned and hidden: Merge PDF, Split PDF, Compress PDF, Remove Background.

## Known issues

- Node 24.12 locally. jsdom is pinned to 29.1.1 (D15). Upgrade Node to ≥ 24.15 when convenient.
- Several brand colours fail WCAG AA as text (accent 2.43, success 3.30, warning 2.15 on white; muted 4.24 and primary 3.90 on the dark background; border 1.23 for inputs). Handled with extra accessible tokens (D18). The brand hex values themselves are unchanged.
- Font subsets for all scripts (latin, latin-ext, cyrillic, greek, vietnamese) ship in `dist/`, about 360 kB total, but browsers only fetch the subsets a page uses.
- The git remote is still `abrahamdanalvarez/AD-Tools`.

## Blockers

- None for Phase 04.
- Before Phase 06: a permissively licensed background-removal model.
- Before Phase 08: the ffmpeg GPL decision, plus `mod_headers` and Cloudflare passing COOP/COEP through.

## Architectural decisions

See `DECISIONS.md` D1–D31. New this phase: D25 `base: "/"` (supersedes D12), D26 static route files, D27 plain registry data, D28 one real tool, D29 hidden footer links, D30 on-page fallback for workers, D31 cross-browser tool e2e.

## Test results (2026-11-26, Node v24.12.0, npm 11.6.2)

| Command | Result |
|---|---|
| `npm audit` | 0 vulnerabilities |
| `npm run typecheck` | OK, no errors |
| `npm test` | 7 files, **39/39 passed** (registry integrity, search, route resolver, static route generation, worker bridge, homepage and tool page rendering, theme storage) |
| `npm run build` | OK, no warnings. "static routes: 3 pages, sitemap.xml, robots.txt, 404.html". Main JS 304.51 kB (95.68 kB gzip), CSS 37.17 kB (11.38 kB gzip), Image Converter chunk 90.61 kB (31.42 kB gzip, lazy), worker 1.03 kB |
| `npx playwright test` | **42/42 passed**: 34 Chromium, 4 Firefox, 4 WebKit |

E2E covers:

- **Routing:** direct visits and refreshes, the trailing-slash 301, 404 for unknown and hidden tools, per-page metadata, sitemap.
- **Image Converter (all 3 browsers):** a real PNG to JPG conversion with a JPEG signature check on the download. No non-GET or foreign requests, and storage stays empty. WebP is offered only when the browser can encode it. A `.txt` file is rejected, and a damaged image shows an error.
- **Design checks:** home, tool, credits and 404 pages × desktop/mobile × light/dark, with 0 axe WCAG 2.2 AA violations and no horizontal scroll. Also the theme toggle, skip link and mobile menu.

Problems found and fixed during the phase:

- **WebKit conversion failed.** `OffscreenCanvas` is missing there, so I added an on-page fallback (D30).
- **The fallback then broke the worker in Chromium and Firefox.** An `instanceof HTMLCanvasElement` check threw in the worker. It's now a feature check.
- **One axe failure** for `aria-controls` pointing at a missing list.

Screenshots (`test-results/`) were reviewed by eye.

## Next development task

**Phase 04: PDF tools** (see `ROADMAP.md`). Wait for owner approval to start.
