# Project status

_Last updated: 2026-11-26_

## Current phase

**Phase 02: Branding and design system.** Complete. Stopped for review. Phase 03 has not started.

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

## Pending tasks

- [ ] **Owner:** choose the project licence (MIT recommended)
- [ ] **Owner:** ffmpeg GPL decision before Phase 08
- [ ] **Owner:** repo and folder rename to `privora`
- [ ] **Owner:** review and approve the logo (`public/brand/`)
- [ ] Add `npm audit` and security lint gates before Phase 04
- [ ] Phase 03: application foundation and tool registry

## Verified tools

None. Categories show "Coming soon" and are not links.

## Known issues

- Node 24.12 locally. jsdom is pinned to 29.1.1 (D15). Upgrade Node to ≥ 24.15 when convenient.
- Several brand colours fail WCAG AA as text (accent 2.43, success 3.30, warning 2.15 on white; muted 4.24 and primary 3.90 on the dark background; border 1.23 for inputs). Handled with extra accessible tokens (D18). The brand hex values themselves are unchanged.
- Font subsets for all scripts (latin, latin-ext, cyrillic, greek, vietnamese) ship in `dist/`, about 360 kB total, but browsers only fetch the subsets a page uses.
- The git remote is still `abrahamdanalvarez/AD-Tools`.

## Blockers

- None for Phase 03.
- Before Phase 06: a permissively licensed background-removal model.
- Before Phase 08: the ffmpeg GPL decision, plus `mod_headers` and Cloudflare passing COOP/COEP through.

## Architectural decisions

See `DECISIONS.md` D1–D24. New this phase: D17 logo, D18 accessible tokens, D19 theme storage, D20 Radix/shadcn components, D21 asset generator, D22 dev gallery, D23 axe in e2e, D24 BRANDING.md merge.

## Test results (2026-11-26, Node v24.12.0, npm 11.6.2)

| Command | Result |
|---|---|
| `npm audit` | 0 vulnerabilities |
| `npm run typecheck` | OK, no errors |
| `npm test` | 3 files, **9/9 passed** (homepage content, privacy indicators, no unfinished tools exposed, footer, theme storage, registry) |
| `npm run build` | OK. JS 273.31 kB (86.24 kB gzip), CSS 34.11 kB (10.71 kB gzip), plus font subsets and brand assets |
| `npm run test:e2e` (Chromium) | **11/11 passed**: static load, 0 foreign requests, empty storage on load, brand assets and metadata served, light/dark × desktop (1280)/mobile (375) with correct theme, no horizontal scroll and **0 axe WCAG 2.2 AA violations**, theme toggle stores only `privora-theme` and persists after reload, skip link is the first tab stop, mobile menu opens and closes |
| `python -m http.server` on `dist/` | 200 with correct content types for the page, ICO, SVG, `theme-init.js`, manifest, OG PNG |

On the first run, axe flagged 9 contrast failures: the "Coming soon" badges at 4.34:1. These were fixed by switching to an outlined badge before the final run.

Screenshots (desktop and mobile, light and dark) were reviewed by eye. They're generated in `test-results/` on each e2e run.

## Next development task

**Phase 03: application foundation and tool registry.** Routing (static-host friendly), the tool page layout, registry-driven navigation and search, favourites (tool IDs only), and the Web Worker bridge. Wait for owner approval to start.
