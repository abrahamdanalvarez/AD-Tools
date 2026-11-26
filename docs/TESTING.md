# Testing

How Privora is tested, and what a tool must pass before it is marked `verified`. Real results for each phase are recorded in `PROJECT_STATUS.md`.

## Commands

| Command | What it runs |
|---|---|
| `npm run typecheck` | `tsc --noEmit` over the app, scripts and e2e specs |
| `npm test` | Vitest unit tests (`src/**/*.test.ts(x)`, `scripts/**/*.test.ts`) |
| `npm run build` | Typecheck, then `vite build` into `dist/` |
| `npx playwright test` | E2E against the built `dist/`, served by `scripts/serve-dist.mjs` (mirrors the Apache rules). Run `npm run build` first. |
| `npm audit` | Known vulnerabilities in dependencies |

## Unit tests

- Default environment is jsdom. Pure engine code that needs real `Uint8Array`/WASM behaviour uses `// @vitest-environment node` (the PDF core, qpdf and image core tests).
- Registry tests check every entry's required fields, visibility, slugs and icons, and that every PDF config has a matching ID and registry entry.
- **PDF core** (`src/tools/pdf/core/core.test.ts`, `qpdf.test.ts`): range parsing; PDF detection by header; damaged-file errors; merge, split, extract, delete, reorder, reverse, duplicate and rotate; coordinates on rotated pages; watermark, page numbers and text as real text; WinAnsi limits; images to PDF (JPEG embedded byte for byte, EXIF orientation, A4); metadata edit and strip; flatten; image extraction; compress (shrinks photos, keeps text, returns the original when it can't help); repair of a broken cross-reference table; AES-256 protect and unlock, wrong and empty passwords.
- **Image core** (`src/tools/image/core/core.test.ts`): format sniffing from bytes; animation detection (GIF, WebP, APNG); lossless metadata stripping for JPEG, PNG and WebP (scan data compared byte for byte, orientation kept); pixel adjustments, blur and palette; resize maths and limits; ICO writing; Base64 decoding; oxipng shrinking a PNG.
- qpdf's Emscripten runtime sets `process.exitCode` in Node. The qpdf test resets it after each case so Vitest doesn't report a failure.

## Fixtures

All fixtures are synthetic. No real documents are used or committed.

- `src/tools/pdf/core/fixtures.ts` builds PDFs with pdf-lib: N pages, each with a unique width (200 + n points) and the text "Page N", so tests can check page order by width and by extracted text. Options add a title or a form field.
- `test-fixtures/tiny.jpg` (945 B) and `test-fixtures/photo.jpg` (169 KB, 800×500) were generated in Chromium from canvas drawings. PNGs are encoded in the test with `encodePng`.
- Damaged files are made in the test by cutting or overwriting bytes of a fixture.

## E2E tests (Playwright)

Chromium runs every spec. Firefox and WebKit run the tool specs (`image-converter.spec.ts`, `image-tools.spec.ts`, `pdf-tools.spec.ts`), set by `testMatch` in `playwright.config.ts`.

| Spec | Covers |
|---|---|
| `routing.spec.ts` | Direct visits and refreshes, trailing-slash 301, 404 for unknown and hidden tools, per-page metadata, sitemap |
| `static-build.spec.ts` | The built files themselves |
| `design-system.spec.ts` | Home, tool, credits and 404 pages: axe WCAG 2.2 AA, no horizontal scroll, theme toggle, skip link, mobile menu |
| `image-converter.spec.ts` | A real conversion with an output signature check, rejection and error states |
| `pdf-tools.spec.ts` | Every enabled PDF tool on real synthetic files, checking the downloaded output (see below) |
| `image-tools.spec.ts` | Every image tool on synthetic files: transparency, format pairs, animation warning, hostile SVG, batch ZIP names, compression, resize/crop/rotate/flip, metadata removal, effects, change settings, viewers, Base64 round trip, favicons, comparison, damaged and disguised files |
| `pdf-a11y.spec.ts` | axe and no horizontal scroll on interactive PDF and image states (page picker, reorder, placement editor, signature, crop editor, colour picker, before/after result) at 1280 and 375 px, light and dark |

### What the PDF e2e tests check

- **Output integrity.** Each download is opened again: page count and order (by page width), page text read back with pdf.js in Node, rotation values, JPEG/PNG signatures and pixel sizes, ZIP contents, metadata values, encryption state (the AES-256 method is checked in the qpdf unit test).
- **Fidelity.** Merged, compressed and edited files still have selectable text. JPG to PDF embeds the original JPEG bytes. Compress keeps text and reports when nothing could be saved.
- **Passwords.** Protect, then unlock fails with a wrong password and succeeds with the right one.
- **Errors.** A non-PDF renamed to `.pdf` is rejected. Damaged files are repaired or reported. Scanned (image-only) PDFs get a clear "no text" message.
- **Cancel and reset.** Cancel returns to the settings. Start over clears the file, results and previews.

### What the image e2e tests check

- **Output.** Format read from the downloaded bytes, pixel size, transparency kept or filled, pixels changed by effects, EXIF gone and orientation kept after metadata removal, ZIP entry names.
- **SVG safety.** A test SVG with a script and an external image: the script never runs and no request leaves the page.
- **Warnings.** The animated GIF and JPG-from-transparent warnings appear before running.

**Firefox and WebP downloads.** Firefox opens a downloaded `.webp` in a new tab instead of reporting a download, so `run()` in `e2e/fixtures.ts` captures the blob from the download link in Firefox, for WebP only. Every other case uses Playwright's download event.

### Privacy guard (every PDF and image test)

An automatic fixture in `e2e/fixtures.ts`, shared by `pdf-tools.spec.ts` and `image-tools.spec.ts`, fails the test when:

- any request is not a GET (no uploads of any kind),
- any request goes to another origin,
- any same-origin response is 400 or above (a missing vendor file, for example),
- `localStorage`, `sessionStorage` or IndexedDB holds anything at the end of the test.

`image-converter.spec.ts` checks the first two rules and storage.

## Verified means

A tool gets `status: "verified"` and `enabled: true` only after:

1. Its unit tests pass.
2. Its e2e test processes a real file and checks the output in Chromium, Firefox and WebKit.
3. The privacy guard passes.
4. Its interactive states pass axe with no horizontal scroll on mobile.

A tool that can't meet this stays `planned` and hidden.
