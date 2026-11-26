# Tool inventory

_Phase 01, 2026-11-26. Updated for Phase 04, 2026-11-26._

Status key:
- **Verified:** shipped in Privora, tested, browser-only.
- **Approved:** cleared for implementation (browser-only, permissive libraries available).
- **Licence review:** needs a licence decision first.
- **Excluded:** needs remote processing or breaks the privacy rules.

## Privora (this repository)

Only `verified` tools are shown. Each one passed unit tests and Playwright e2e tests in Chromium, Firefox and WebKit (see `TESTING.md`).

| Group | Tool | Status | Notes |
|---|---|---|---|
| Image | Image Converter | Verified | Phase 03 |
| PDF: organise | Merge, Split, Rotate, Reorder pages, Delete pages, Extract pages, Duplicate pages, Reverse page order | Verified | Text, links and page content are copied unchanged. Bookmarks and form fields are not carried into split or extracted files. |
| PDF: convert | PDF to JPG, PDF to PNG | Verified | Rasterises by design (chosen DPI, canvas capped at 16 MP). Multiple pages download as a ZIP. |
| PDF: convert | JPG to PDF, PNG to PDF, Image to PDF | Verified | JPG and PNG are embedded without re-encoding. WebP, GIF, BMP and AVIF are converted on a canvas first. EXIF orientation is honoured. |
| PDF: optimise | Compress PDF | Verified | Re-encodes large JPEG photos only (D38). Text stays selectable. Files without such photos barely shrink, and the tool says so. |
| PDF: edit | Watermark, Page numbers, Add text, Add image, Visual signature, Flatten | Verified | Standard 14 fonts only, so text is limited to Latin (WinAnsi) characters. The signature is an image, not a digital signature (D40). |
| PDF: metadata | Metadata editor, Metadata remover | Verified | The remover clears the Info dictionary and XMP streams. It cannot clean metadata embedded inside images. |
| PDF: extract | Extract text, Extract images | Verified | Text comes from the text layer, so scanned pages yield nothing (OCR is deferred). Images: JPEG and JPEG 2000 byte for byte, 8-bit Flate images as PNG. Others are counted as skipped. |
| PDF: inspect | Page counter, Preview, Information viewer, Metadata viewer | Verified | Read-only. Encrypted files report that they are encrypted. |
| PDF: security | Password protect, Unlock | Verified | qpdf, AES-256. Unlock needs the correct password (D37). |
| PDF: repair | Repair PDF | Verified | Rebuilds the cross-reference table and object structure. It cannot recover content that is truly missing. |
| PDF | OCR PDF | Planned, hidden | Needs self-hosted Tesseract data and a no-cache setup (D39) |
| PDF | PDF Annotation | Planned, hidden | Editor too large for this phase (D39) |
| AI | Remove Background | Planned, hidden | Phase 06 |

## Upstream tools reviewed

### BentoPDF (AGPL-3.0, reference only)

A client-side PDF toolkit, reviewed in Phase 04 for its feature set and library choices (pdf-lib, pdf.js, qpdf WASM). Its licence would require Privora to be AGPL, so none of its code is used (D32).

"Functional" here means code-reviewed only. None of these were run, because no upstream code was adopted. They become Privora tools only by being implemented and tested here.

### OpenDocs-Studio (unlicensed, reference only)

| Group | Tools | Browser-only | Notes |
|---|---|---|---|
| Image | convert, compress, background erase, crop/rotate, watermark, adjust, album, flip, strip EXIF, resize, batch rename, base64 | Yes, except background erase | Background erase uses AGPL `@imgly` with model files fetched from a CDN, so excluded in that form |
| PDF | compress, images→PDF, PDF→images, watermark, protect, unlock, split, merge, rotate, delete pages, reorder, page numbers | Yes | Built on pdf-lib/pdfjs (permissive) |
| Text | case convert, find/replace, word count, encoding, sort | Yes | |

### privatools (MIT): client-only tools

| Tools | Browser-only | Status for Privora |
|---|---|---|
| base64, case converter, color converter, cron parser, CSV↔JSON, env validator, .gitignore generator, GraphQL formatter, hash generator, JSON→CSV schema, JSON↔YAML, JSON/XML formatter, JWT decoder, lorem ipsum, Markdown→HTML, password generator, regex tester, semver bumper, SQL formatter, text diff, timestamp converter, URL encoder, UUID generator, word counter, YAML↔TOML, subtitle converter, AI token counter | Yes | Approved (Phase 07). Reuse with MIT attribution or rewrite. |
| Markdown→Word | Yes | Approved (Phase 08) |
| Remove background noise (RNNoise WASM) | Yes | Licence review (RNNoise is BSD-3-Clause; check the WASM build) |
| Transcribe audio, subtitle generator (Whisper on device) | Yes, if the model is self-hosted | Licence review (weights licence, model size) |
| Summarize PDF, translate PDF, subtitle translator | On-device model only | Licence review. The BYOK path is **excluded**. |
| Chat with PDF | Needs BYOK to a remote LLM | **Excluded** (remote inference) |
| Password breach check | Calls an external breach API | **Excluded** (external request with derived input) |
| Gemini watermark remover | Yes | **Excluded** (removing a provider's provenance watermark carries legal and ethical risk) |

The server-backed privatools tools (all 109 PDF tools plus the rest) are **excluded** in their upstream form.

## Approved for implementation (by phase)

| Phase | Tools | Libraries (licence) |
|---|---|---|
| 04 PDF | Done: 31 tools verified (see above) | pdf-lib (MIT), pdfjs-dist (Apache-2.0), qpdf WASM (Apache-2.0 / ISC), fflate (MIT) |
| Later | PDF OCR, PDF annotation (deferred from Phase 04) | tesseract.js (Apache-2.0), self-hosted language data |
| 05 Image | convert, compress, resize, crop, rotate/flip, strip EXIF, watermark | Canvas / OffscreenCanvas, browser codecs |
| 06 AI | background removal | onnxruntime-web (MIT) plus a model with **permissive, verified weights** (not AGPL/non-commercial) |
| 07 Dev/text | see the privatools list above | Native APIs, small MIT libraries |
| 08 Audio/video | conversions, trim, extract audio | @ffmpeg/ffmpeg (MIT), but `@ffmpeg/core` is **GPL-2.0-or-later**: licence review |
