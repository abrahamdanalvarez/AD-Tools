# Project status

_Last updated: 2026-11-26_

## Current phase

**Phase 01: Repository audit and setup.** Complete. Stopped for review. Phase 02 has not started.

## Completed tasks

### Phase 00
- [x] Rules, README, and docs (architecture, roadmap, privacy, licences, decisions, brand)

### Phase 01
- [x] Audited OpenDocs-Studio, bentopdf, privatools, it-tools: licence, architecture, client-side coverage, network, storage, telemetry (`REPOSITORY_AUDIT.md`)
- [x] Selected the foundation: a fresh scaffold (owner decision, D10)
- [x] Scaffolded React 19 + TS 7 + Vite 8 + Tailwind 4 + shadcn/ui config + Lucide
- [x] Typed tool registry that shows only verified tools
- [x] Removed the broken, empty `node_modules/` and installed pinned dependencies with a lockfile
- [x] `npm ci` verified from clean, `npm audit` shows 0 vulnerabilities
- [x] Dev server, production build, and plain static serving verified
- [x] Vitest unit tests and Playwright e2e tests (static serving, no foreign requests, empty storage)
- [x] `public/.htaccess` (WASM MIME, caching, `Options -Indexes`)
- [x] Docs: `REPOSITORY_AUDIT.md`, `TOOL_INVENTORY.md`, `SECURITY_AUDIT.md`, `LICENCES.md`, `DECISIONS.md` (D9–D16), `ARCHITECTURE.md`, `/THIRD_PARTY_NOTICES.md`

## Pending tasks

- [ ] **Owner:** choose the project licence (MIT recommended; `package.json` says `UNLICENSED` for now)
- [ ] **Owner:** decide on ffmpeg (`@ffmpeg/core` is GPL-2.0-or-later) before Phase 08
- [ ] **Owner:** rename the GitHub repo `AD-Tools` → `privora` and the local folder → `privora`
- [ ] Optional: ask the OpenDocs-Studio author to add a LICENSE file
- [ ] Add `npm audit` and security lint gates before Phase 04
- [ ] Phase 02: branding and design system

## Verified tools

None. The registry is empty by design.

## Known issues

- Node 24.12 locally. jsdom 30+ and parts of the newer toolchain want Node ≥ 24.15. jsdom is pinned to 29.1.1 (D15). Upgrade Node to the current 24 LTS when convenient.
- The first lockfile, built by two separate `npm install` runs, failed `npm ci` ("Missing @emnapi/wasi-threads"), a known npm quirk with optional native binaries. Fixed by regenerating the lockfile in one pass. If it ever recurs, delete `node_modules` and `package-lock.json` and run `npm install` once.
- The git remote is still `abrahamdanalvarez/AD-Tools`.

## Blockers

- None for Phase 02.
- Before Phase 06: a background-removal model with permissive weights (not imgly/AGPL) has to be found and verified.
- Before Phase 08: the ffmpeg GPL decision, plus `mod_headers` and Cloudflare passing COOP/COEP through.

## Architectural decisions

See `DECISIONS.md` D1–D16. New this phase: D10 fresh scaffold, D11 pinned stack, D12 relative base, D13 static-served e2e, D14 Tailwind source scope, D15 jsdom pin, D16 no AGPL/GPL dependencies by default.

## Test results (2026-11-26, Node v24.12.0, npm 11.6.2)

| Command | Result |
|---|---|
| `npm ci` (clean) | OK, 0 vulnerabilities |
| `npm audit` | 0 vulnerabilities |
| `npm run typecheck` | OK, no errors |
| `npm test` | 2 files, **3/3 passed** |
| `npm run build` | OK. `dist/index.html` 0.67 kB, CSS 5.43 kB (1.86 kB gzip), JS 223.62 kB (70.42 kB gzip), `.htaccess` included |
| `python -m http.server` on `dist/` | index 200, CSS 200 `text/css`, JS 200 `text/javascript`, relative asset paths |
| `npm run test:e2e` (Chromium) | **3/3 passed**: loads from static server, 0 foreign requests, all storage empty |
| `npm run dev` | 200 on `/` and `/src/main.tsx` |

## Next development task

**Phase 02: branding and design system.** Build the logo set, favicon and social image from `BRAND.md`. Self-host the fonts (`@fontsource-variable/*`, OFL-1.1). Add Tailwind 4 `@theme` tokens for the brand colours, light/dark mode, and the base shadcn/ui components. Wait for owner approval to start.
