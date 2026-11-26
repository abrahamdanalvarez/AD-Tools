# Project status

_Last updated: 2026-11-26_

## Current phase

**Phase 00: Project initialization.** Complete. Stopped for review. Phase 01 has not started.

## Completed tasks

- [x] Inspected workspace and git status
- [x] Concise permanent rules in the project instructions file. Details moved to `docs/`.
- [x] `README.md` (Privora)
- [x] `docs/ARCHITECTURE.md`: constraints, hosting (Virtualmin, Apache, Cloudflare), `.htaccess` duties, planned layout
- [x] `docs/ROADMAP.md`: phases 00–11
- [x] `docs/PRIVACY.md`: expanded never-persist list, allowed storage, analytics event spec (off by default), audit checks
- [x] `docs/LICENCES.md`: upstream candidate, library, model, and font tables
- [x] `docs/DECISIONS.md`: decision log D1–D9
- [x] `docs/BRAND.md`: identity, tokens, copy, SEO (from the rebrand)

## Pending tasks

- [ ] Phase 01: audit OpenDocs-Studio and alternatives, then adopt or scaffold a base
- [ ] Choose a project licence
- [ ] Rename the GitHub repo `AD-Tools` → `privora` (owner permission)
- [ ] Rename the local folder `AD-Tools` → `privora` (owner action)
- [ ] Delete the broken `node_modules/` (owner confirmation)

## Verified tools

None. No tool has been implemented or verified.

## Known issues

- `node_modules/` contains only empty directories (0 files). There's no `package.json` or lockfile. It is unusable and git-ignored.
- The git remote is still `abrahamdanalvarez/AD-Tools`. After renaming it on GitHub, run `git remote set-url origin https://github.com/abrahamdanalvarez/privora.git`.
- The local folder is still `AD-Tools`. Rename it with the editor closed.

## Blockers

- None for Phase 01.
- Before Phase 08: confirm the host allows `mod_headers` (COOP/COEP) and that Cloudflare passes those headers through. Without them, ffmpeg.wasm and ONNX run single-threaded.
- Before Phase 08: the `@ffmpeg/core` licence (GPL risk).

## Architectural decisions

See `DECISIONS.md` (D1–D9). D9 (OpenDocs-Studio as the upstream) is still only proposed.

## Test results

No tests run. No code exists yet.
Environment: Node v24.12.0, npm 11.6.2.

## Next development task

**Phase 01: repository audit and setup.** Audit [OpenDocs-Studio](https://github.com/akash098p/OpenDocs-Studio) for licence, security (dependencies, `npm audit`), privacy (uploads, telemetry, third-party requests, storage use), how many tools are really client-side, architecture fit with the stack, and maintainability. Compare it with alternatives, then recommend adopting it, forking parts, or a fresh scaffold. Wait for owner approval before setting anything up.
