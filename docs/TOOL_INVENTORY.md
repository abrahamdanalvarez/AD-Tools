# Tool inventory

_Phase 01, 2026-11-26._

Status key:
- **Verified:** shipped in Privora, tested, browser-only.
- **Approved:** cleared for implementation (browser-only, permissive libraries available).
- **Licence review:** needs a licence decision first.
- **Excluded:** needs remote processing or breaks the privacy rules.

## Privora (this repository)

| Tool | Status |
|---|---|
| None | No tools are implemented. The registry is empty, and only `verified` tools are shown. |

## Upstream tools reviewed

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
| 04 PDF | merge, split, rotate, delete/reorder/extract pages, images→PDF, PDF→images, watermark, page numbers, metadata strip, compress (image recompression), protect/unlock | pdf-lib (MIT), pdfjs-dist (Apache-2.0). Encryption library to be picked and verified. |
| 04 PDF | OCR | tesseract.js (Apache-2.0), self-hosted language data |
| 05 Image | convert, compress, resize, crop, rotate/flip, strip EXIF, watermark | Canvas / OffscreenCanvas, browser codecs |
| 06 AI | background removal | onnxruntime-web (MIT) plus a model with **permissive, verified weights** (not AGPL/non-commercial) |
| 07 Dev/text | see the privatools list above | Native APIs, small MIT libraries |
| 08 Audio/video | conversions, trim, extract audio | @ffmpeg/ffmpeg (MIT), but `@ffmpeg/core` is **GPL-2.0-or-later**: licence review |
