# Project status

_Last updated: 2026-11-26_

## Current phase

**Phase 0: Project setup and permanent instructions.** Complete, including the rebrand to **Privora**. Ready for Phase 1.

## Completed tasks

- [x] Inspected workspace and git status
- [x] Recorded permanent requirements in the project instructions file
- [x] Rewrote `README.md`
- [x] Created `docs/PROJECT_STATUS.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `PRIVACY.md`, `LICENCES.md`
- [x] Defined the roadmap for phases 0–9
- [x] Rebranded from AD Tools to Privora across all existing docs and project instructions
- [x] Added `docs/BRAND.md` (identity, colours, typography, logo brief, homepage copy, SEO formats)

## Pending tasks

- [ ] Phase 1: audit and select open-source repositories and libraries
- [ ] Phase 2: build the logo set, favicon, and social image from the `BRAND.md` brief
- [ ] Choose a project licence
- [ ] Rename the GitHub repo `AD-Tools` → `privora` (needs owner permission)
- [ ] Rename the local folder `AD-Tools` → `privora` (owner action, see Known issues)
- [ ] Clean up the broken `node_modules/`

## Implemented features

None. No application code yet.

## Rebrand coverage

| Target | Result |
|---|---|
| Project instructions, README, docs | Updated to Privora |
| Brand config | New `docs/BRAND.md` |
| package.json / package-lock.json | Don't exist yet. Name will be `privora` when scaffolded. |
| App config, headings, nav, footer, metadata, SEO, OG, manifest, sitemap | Don't exist yet. Spec recorded in `BRAND.md` for Phases 3 and 8. |
| Logo assets, favicons, social image | Don't exist yet. Brief in `BRAND.md`, built in Phase 2. |
| Legal pages, analytics config | Don't exist yet (Phases 7 and 8) |
| Test descriptions | No tests yet |
| Production domain | Unchanged: tools.abrahamdan.com |

## Architectural decisions

| # | Decision | Reason |
|---|---|---|
| 1 | Static Vite build deployed as `dist/` contents to Virtualmin `public_html/` | Hard requirement. No server runtime. |
| 2 | All processing client-side in Web Workers + WASM, with ONNX Runtime Web for AI | Privacy requirement |
| 3 | Self-host WASM, models, and fonts on our own origin. No runtime third-party CDN. | Simpler CSP and privacy guarantees |
| 4 | Tool registry with a status field. Only `stable` tools are visible. | "Never expose unfinished tools" |
| 5 | Apache `.htaccess` for SPA fallback, WASM MIME, caching, COOP/COEP, and CSP | Only server config available on static hosting |
| 6 | Brand name is Privora. `BRAND.md` is the single source of truth for identity. | Rebrand, 2026-11-26 |

## Known issues

- `node_modules/` contains **only empty directories (0 files)** and there is no `package.json` or `package-lock.json`. It looks like a leftover from an install that broke partway. It is unusable and git-ignored. Safe to delete; left untouched pending owner confirmation.
- The git remote is `abrahamdanalvarez/AD-Tools`; the target name is `privora`. GitHub redirects old URLs after a rename. Afterwards, update the remote with `git remote set-url origin https://github.com/abrahamdanalvarez/privora.git`.
- The local folder is still `AD-Tools`. Renaming it is best done by the owner with the editor closed (open terminals and editor workspaces point at the old path).

## Blockers

- None for Phase 1.
- To confirm before Phase 6: does the Virtualmin host allow `mod_headers` (COOP/COEP) for `SharedArrayBuffer`? Without it, ffmpeg.wasm and ONNX run single-threaded only.
- Before shipping ffmpeg tools: the licence of the `@ffmpeg/core` build (GPL risk).

## Test results

No tests run. No code or build exists yet, so the rebrand needed no test or build check.

Environment: Node v24.12.0, npm 11.6.2.

## Next actions

1. Phase 1: search GitHub for client-side tool suites (PDF, image, media) to adopt or borrow from. Record licence, activity, architecture fit, and privacy behaviour (any uploads or telemetry).
2. Shortlist libraries per category with verified licences in `LICENCES.md`.
3. Pick the base: an adopted upstream or a fresh Vite + React + TS scaffold (`"name": "privora"`).
4. Choose the project licence based on the dependencies picked.
