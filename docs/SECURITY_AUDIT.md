# Security audit

## Phase 02 update (2026-11-26)

- New runtime dependencies: `radix-ui` (MIT) and three `@fontsource-variable` fonts (OFL-1.1). `npm audit`: 0 vulnerabilities.
- Fonts are self-hosted. The e2e test confirms 0 requests to other origins.
- The only browser storage use is `localStorage["privora-theme"]`, written only after an explicit toggle (tested in unit and e2e).
- No inline scripts or styles were added. The theme bootstrap is a static file (`/theme-init.js`), ready for a strict CSP in Phase 09.
- External link: the footer links to `https://abrahamdan.com` (a plain navigation link, no prefetch).

## Phase 01 baseline (2026-11-26)

### Dependencies

| Check | Result |
|---|---|
| `npm audit` | **0 vulnerabilities** (126 packages) |
| Runtime dependencies shipped in `dist/` | react, react-dom, scheduler, lucide-react, clsx, tailwind-merge, class-variance-authority. All MIT, ISC or Apache-2.0. |
| Versions | Exact pins in `package.json`, with a committed lockfile. `npm ci` verified from a clean `node_modules`. |
| Install scripts | No runtime dependency runs a postinstall script |

### Privacy and network (Playwright, against the production build)

| Check | Result |
|---|---|
| Requests to any origin other than the site | **None** |
| localStorage / sessionStorage / cookies / IndexedDB / Cache Storage after load | **All empty** |
| Third-party fonts, scripts, CDNs | None |

### Upstream code risks found (not adopted)

- OpenDocs-Studio: Zustand `persist` stores document names and content in `localStorage`. The background-removal model loads from a third-party CDN.
- privatools: an analytics beacon, BYOK requests to remote LLM providers, an external password-breach API, and persisted form input and history.

None of this code is in Privora.

### Open items

- CSP, security headers and COOP/COEP in `.htaccess`: Phase 09.
- A `npm audit` gate and static-analysis lint rules (`no-unsanitized`, eval detection): add before Phase 04, when tools start handling untrusted files.
- Cloudflare: confirm that script-injecting features are off (see `PRIVACY.md`).
