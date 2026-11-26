# Security audit

## Phase 05 update (2026-11-27)

- **New runtime dependencies:** exifr 7.1.3 (MIT) and @jsquash/oxipng 2.3.0 (Apache-2.0, oxipng MIT). Exact pins. `npm audit`: 0 vulnerabilities. utif was tried and removed (D48).
- **Untrusted images.** The format comes from the file's bytes, never its name or reported type. A renamed non-image or a damaged image is refused when chosen. Size is checked (50 MP, 20,000 px per side) before any large canvas is made.
- **SVG.** Never inserted into the page. DOMParser reads only its size, and it is drawn through `<img>` from a Blob URL, where scripts don't run and external references don't load. The e2e test uses an SVG with a script and an external image, and checks that neither runs nor loads. Base64 to Image refuses SVG (D51).
- **Base64 input** is length-capped (28 million characters) and checked against the Base64 alphabet. Its format is read from the decoded bytes.
- **exifr** is given an ArrayBuffer, so it never fetches. Values are rendered as text by React (no HTML).
- **Clipboard.** Copy buttons only write, and only when clicked. Nothing reads the clipboard.
- **No persistence or transmission.** The shared e2e guard (`e2e/fixtures.ts`) runs on every image test in Chromium, Firefox and WebKit: no non-GET requests, nothing to other origins, no same-origin errors, and empty localStorage, sessionStorage, IndexedDB and Cache Storage at the end.
- **No eval.** `src/` still has no `eval`, `new Function`, `innerHTML` or `dangerouslySetInnerHTML`.

## Phase 04 update (2026-11-26)

PDF tools parse untrusted files, so this phase adds the most attack surface so far.

- **New runtime dependencies:** pdf-lib 1.17.1, pdfjs-dist 6.5.438, @neslinesli93/qpdf-wasm 0.3.1 (qpdf 12.2.0), fflate 0.8.3. `npm audit`: 0 vulnerabilities. All are pinned to exact versions.
- **pdf-lib is unmaintained** (last release 2021). It only builds and edits PDF objects and never executes content. Parse errors are caught and reported as "damaged". Watch for advisories, and consider the `@pdfme/pdf-lib` fork if one appears.
- **No embedded scripts run.** pdf.js is loaded without the scripting sandbox, annotation layer, form layer or XFA. QuickJS (its PDF JavaScript engine) is not shipped (D34). pdf-lib and qpdf don't execute PDF JavaScript. The info viewer only reports whether a file contains JavaScript.
- **No eval in our code.** A search of `src/` finds no `eval`, `new Function`, `innerHTML` or `dangerouslySetInnerHTML`. The one `new Function` string in the pdf.js worker is a false positive, a `FunctionBasedShading` identifier.
- **No external requests.** pdf.js data files are self-hosted at `/vendor/pdfjs/`. Auto-fetch, streaming and range requests are off. The e2e privacy guard fails any non-GET request, any request to another origin, and any same-origin 4xx/5xx response, in Chromium, Firefox and WebKit.
- **No persistence.** Files, file names, extracted text, passwords and outputs live only in memory. Storage stays empty after every PDF test, including IndexedDB. Passwords sit in React state and the worker message, and are dropped on reset. qpdf runs in a fresh WASM instance per job, with an in-memory file system, and its console output is discarded.
- **Resource limits.** Input over 1 GB is refused before reading. Canvas renders are capped at 16 MP. Duplicate copies are capped at 20. Image-to-PDF pages are capped at 14,400 pt. Each job runs in its own worker, which is terminated on cancel or finish.
- **Copied text.** "Copy text" writes to the clipboard only when the user clicks it, and never reads from it.

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
- A CI `npm audit` gate and static-analysis lint rules (`no-unsanitized`, eval detection). Still open: Phase 04 checked these manually (see above), but there's no automated gate yet.
- Cloudflare: confirm that script-injecting features are off (see `PRIVACY.md`).
