# Project status

_Last updated: 2026-11-26_

## Current phase

**Phase 0: Project setup and permanent instructions.** Complete. Ready for Phase 1.

## Completed tasks

- [x] Inspected workspace and git status
- [x] Recorded permanent requirements in the project instructions file
- [x] Rewrote `README.md` for AD Tools
- [x] Created `docs/PROJECT_STATUS.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `PRIVACY.md`, `LICENCES.md`
- [x] Defined the roadmap for phases 0–9

## Pending tasks

- [ ] Phase 1: audit and select open-source repositories and libraries
- [ ] Choose a project licence
- [ ] Decide whether the GitHub repo is renamed to `ad-tools` (needs owner permission)
- [ ] Clean up the broken `node_modules/` (see Known issues)

## Implemented features

None. No application code yet.

## Architectural decisions

| # | Decision | Reason |
|---|---|---|
| 1 | Static Vite build deployed as `dist/` contents to Virtualmin `public_html/` | Hard requirement. No server runtime. |
| 2 | All processing client-side in Web Workers + WASM, with ONNX Runtime Web for AI | Privacy requirement |
| 3 | Self-host WASM and models on our own origin. No runtime third-party CDN. | Simpler CSP and privacy guarantees |
| 4 | Tool registry with a status field. Only `stable` tools are visible. | "Never expose unfinished tools" |
| 5 | Apache `.htaccess` for SPA fallback, WASM MIME, caching, COOP/COEP, and CSP | Only server config available on static hosting |

## Known issues

- `node_modules/` contains **only empty directories (0 files)** and there is no `package.json` or `package-lock.json`. It looks like a leftover from an install that broke partway. It is unusable and git-ignored. Safe to delete; the folder names hint at earlier experiments (pdf-lib, pdfjs-dist, tesseract.js, onnxruntime-web, @ffmpeg/*, qrcode, vite, vitest, playwright). Left untouched pending owner confirmation.
- The git remote is `abrahamdanalvarez/AD-Tools`, but the requested name is `ad-tools`.

## Blockers

- None for Phase 1.
- To confirm before Phase 6: does the Virtualmin host allow `mod_headers` (COOP/COEP) for `SharedArrayBuffer`? Without it, ffmpeg.wasm and ONNX run single-threaded only.
- Before shipping ffmpeg tools: the licence of the `@ffmpeg/core` build (GPL risk).

## Test results

No tests yet. No code exists to test.

Environment: Node v24.12.0, npm 11.6.2.

## Next actions

1. Phase 1: search GitHub for client-side tool suites (PDF, image, media) to adopt or borrow from. Record licence, activity, architecture fit, and privacy behaviour (any uploads or telemetry).
2. Shortlist libraries per category with verified licences in `LICENCES.md`.
3. Pick the base: an adopted upstream or a fresh Vite + React + TS scaffold.
4. Choose the project licence based on the dependencies picked.
