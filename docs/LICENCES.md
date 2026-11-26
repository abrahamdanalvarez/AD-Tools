# Licences

Every dependency, adopted upstream repository, AI model, and font must be listed here with a **verified** licence and its required attribution before it ships.

Status: `verified` (checked against the source) · `unverified` (not checked, must not ship).

## Project licence

Not yet chosen. It must be compatible with the adopted upstream and dependencies (see the GPL note). Decide in Phase 01.

## Upstream candidates

| Repository | Licence | Status | Notes |
|---|---|---|---|
| [akash098p/OpenDocs-Studio](https://github.com/akash098p/OpenDocs-Studio) | Unknown | unverified | Preferred candidate. Phase 01 audit covers licence, security, privacy, and functionality. |

## Dependencies

None installed. No `package.json` exists yet.

## Library candidates (unverified)

| Package | Purpose | Expected licence | Notes |
|---|---|---|---|
| pdf-lib | PDF create/edit | MIT | |
| pdfjs-dist | PDF render/text | Apache-2.0 | |
| tesseract.js / -core | OCR | Apache-2.0 | Caches language data in IndexedDB by default (allowed). OCR output must not be cached. |
| onnxruntime-web | AI inference | MIT | |
| @ffmpeg/ffmpeg, @ffmpeg/util | Audio/video wrapper | MIT | |
| @ffmpeg/core | ffmpeg WASM build | Likely GPL-2.0+ (x264 etc.) | **Risk.** Check the build or use an LGPL build. |
| qrcode | QR | MIT | |
| fflate / pako | Zip/deflate | MIT / MIT+Zlib | |

## AI models

Check the code licence **and** the weights' redistribution rights separately. Self-hosting means redistributing. Many background-removal weights are non-commercial or AGPL.

| Model | Use | Source | Weights licence | Redistribution OK | Status |
|---|---|---|---|---|---|

## Fonts

| Font | Expected licence | Status |
|---|---|---|
| Plus Jakarta Sans | OFL-1.1 | unverified |
| Inter | OFL-1.1 | unverified |
| JetBrains Mono | OFL-1.1 | unverified |

## Attribution

None required yet.
