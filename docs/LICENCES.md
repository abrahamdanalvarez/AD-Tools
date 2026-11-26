# Licences

Every dependency, adopted upstream repository, and AI model must be listed here with a **verified** licence and any required attribution before it ships.

Status values: `verified` (checked against the source repo or package) · `unverified` (not yet checked, must not ship).

## Project licence

Not yet chosen. It must be compatible with every adopted dependency (see the GPL note below). Decide in Phase 1.

## Dependencies

None installed yet. No `package.json` exists.

## Candidates to verify (Phase 1)

Common client-side libraries for this project. All licences are **unverified** until checked.

| Package | Purpose | Expected licence | Notes |
|---|---|---|---|
| pdf-lib | PDF create/edit | MIT | |
| pdfjs-dist | PDF render/text | Apache-2.0 | |
| tesseract.js / tesseract.js-core | OCR | Apache-2.0 | Language data is cached in IndexedDB by default. That's allowed (public data), but OCR output must not be cached. |
| onnxruntime-web | AI inference | MIT | |
| @ffmpeg/ffmpeg / @ffmpeg/util | Audio/video | MIT | Wrapper only |
| @ffmpeg/core | ffmpeg WASM build | GPL-2.0+ likely (bundles GPL codecs such as x264) | **Licence risk.** It may force GPL obligations on distribution. Check the build config or use an LGPL build. |
| qrcode | QR generation | MIT | |
| fflate / pako | Zip/deflate | MIT / MIT+Zlib | |

## AI models

None selected. Each model needs its weights licence verified separately from its code. Many background-removal models are non-commercial or AGPL. Record the source URL, licence, and attribution here.

| Model | Use | Source | Weights licence | Status |
|---|---|---|---|---|

## Attribution

None required yet.
