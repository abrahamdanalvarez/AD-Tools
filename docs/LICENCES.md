# Licences

Every dependency, adopted upstream repository, AI model, and font must be listed here with a **verified** licence and its required attribution before it ships. Attribution for shipped components goes in `/THIRD_PARTY_NOTICES.md`.

Status: `verified` (checked against the package or repo) · `unverified` (not checked, must not ship).

## Project licence

**Not yet chosen.** `package.json` says `"license": "UNLICENSED"` until the owner decides. Every current dependency is permissive, so any licence (MIT, Apache-2.0, proprietary) remains possible. **Recommendation: MIT.** Adding AGPL code (bentopdf, `@imgly/background-removal`) or GPL code (it-tools, `@ffmpeg/core`) would change this.

## Upstream repositories

| Repository | Licence | Status | Use |
|---|---|---|---|
| akash098p/OpenDocs-Studio | None (README claims MIT, no LICENSE file) | verified: unlicensed | **Do not copy.** Reference only. |
| alam00000/bentopdf | AGPL-3.0-only / commercial | verified | Reference only |
| ethereaglehq/privatools | MIT © 2026 PrivaTools | verified | Selective reuse with attribution allowed |
| CorentinTh/it-tools | GPL-3.0 | verified | Reference only |

## Installed dependencies (verified from `package-lock.json`, 2026-11-26)

**Shipped in `dist/`:** react 19.3.1 (MIT), react-dom 19.3.1 (MIT), scheduler 0.28.0 (MIT), lucide-react 1.81.0 (ISC), clsx 2.1.1 (MIT), tailwind-merge 3.7.1 (MIT), class-variance-authority 0.7.1 (Apache-2.0), radix-ui 1.8.1 and its @radix-ui/* parts (MIT), @fontsource-variable/inter, plus-jakarta-sans, jetbrains-mono 5.3.0 (OFL-1.1), plus the Tailwind CSS 4.3.5 generated CSS (MIT).

**Phase 04 additions, shipped:**

| Package | Version | Licence | Notes |
|---|---|---|---|
| pdf-lib | 1.17.1 | MIT | Bundles @pdf-lib/standard-fonts 1.0.0 (MIT), @pdf-lib/upng 1.0.1 (MIT), pako 1.0.11 (MIT AND Zlib), tslib 2.9.1 (0BSD) |
| pdfjs-dist | 6.5.438 | Apache-2.0 | No NOTICE file in the package. Its data files ship in `dist/vendor/pdfjs/` with their own licence files: Adobe CMaps (BSD-3-Clause), Foxit fonts (BSD-style, PDFium), Liberation Sans (GPL-2.0 with font exception, unmodified, see below), ICC profile (CC0-1.0), OpenJPEG (BSD-2-Clause), JBIG2 (PDFium BSD-style, Apache-2.0 wrapper), qcms (MIT). QuickJS is not shipped. |
| @neslinesli93/qpdf-wasm | 0.3.1 | ISC | Wraps qpdf 12.2.0 (Apache-2.0) |
| fflate | 0.8.3 | MIT | |

**Phase 05 additions, shipped (verified from `node_modules`, 2026-11-27):**

| Package | Version | Licence | Notes |
|---|---|---|---|
| exifr | 7.1.3 | MIT © 2020 Mike Kovařík, Mutiny.cz | Metadata viewer and image info. Parses bytes only. |
| @jsquash/oxipng | 2.3.0 | Apache-2.0 | Only the single-thread codec (`codec/pkg`) is bundled. It wraps oxipng (MIT © 2016 Joshua Holmer, `codec/LICENSE.codec.md`). |
| wasm-feature-detect | 1.10.1 | Apache-2.0 | Installed as a dependency of @jsquash/oxipng. Not imported, so not shipped. |

Evaluated and not added: utif (MIT, TIFF; its globals don't bundle, D48), libheif-js (LGPL-3.0, HEIC; D47), @jsquash/webp and mozjpeg (D50), tesseract.js (OCR deferred, D39).

**Phase 06 additions, shipped (verified 2026-11-27):**

| Package / file | Version | Licence | Notes |
|---|---|---|---|
| onnxruntime-web | 1.31.1 | MIT © Microsoft Corporation | The npm package has no LICENSE file; the licence and ThirdPartyNotices.txt come from the official onnxruntime 1.31.1 release (PyPI wheel), shipped unmodified in `public/licences/`. Bundles onnxruntime-common 1.31.1 (MIT). Its WASM binaries contain third-party native code (Protocol Buffers BSD-3-Clause, Abseil Apache-2.0, Eigen MPL-2.0, ONNX MIT, SafeInt MIT, GSL MIT and others) covered by those notices. |
| onnxruntime-web dependencies not bundled | flatbuffers 25.9.23 (Apache-2.0), protobufjs 7.6.6 (BSD-3-Clause), long 5.3.2 (Apache-2.0), guid-typescript 1.0.9 (ISC), platform 1.3.6 (MIT) | | Installed with the package, but absent from the two ORT bundles Privora loads (checked by searching them). |
| BiRefNet_lite weights (ONNX, 512 × 512) | studioludens/birefnet-lite-512 revision 962e679 | MIT © 2024 ZhengPeng, © 2026 Studio Ludens V.O.F. | Weights quantised to 8 bits by Privora. Licence text in `public/licences/birefnet-LICENSE.txt`. Training-data caveat in `AI_MODELS.md`. |

**Dev only (not shipped):** Python packages for `scripts/models/quantize.py`: numpy 2.5.5 (BSD-3-Clause), onnx 1.23.2 (Apache-2.0), protobuf 7.36.2 (BSD-3-Clause), ml_dtypes 0.7.0 (Apache-2.0).

**Liberation Sans.** pdf.js uses these fonts to draw text in PDFs that rely on the standard Helvetica font without embedding it. They are served unmodified as separate files, with Red Hat's licence file beside them. That is distribution under GPL-2.0 (with its font exception), so the source must stay available: it is the TTF files themselves, and upstream at https://github.com/liberationfonts/liberation-fonts. This does not affect the licence of Privora's own code.

**Phase 02 dev additions:** @testing-library/user-event 14.6.13 (MIT), @axe-core/playwright 4.14.1 and axe-core (MPL-2.0, test-only, not shipped).

**Dev only, not shipped:** 126 packages in total: MIT 138, Apache-2.0 29, MPL-2.0 12 (lightningcss build tooling), ISC 3, BSD-2/3-Clause 4, 0BSD 2, MIT-0 2, BlueOak-1.0.0 2, CC0-1.0 1. (Counts include nested lockfile entries.) Nothing here imposes obligations on the deployed site.

## Library candidates for later phases (verified via npm registry, 2026-11-26)

| Package | Version | Licence | Notes |
|---|---|---|---|
| tesseract.js | 7.0.0 | Apache-2.0 | Caches language data in IndexedDB by default (allowed). OCR output must not be cached. |
| onnxruntime-web | 1.31.1 | MIT | |
| @ffmpeg/ffmpeg / @ffmpeg/util | 0.12.15 / 0.12.2 | MIT | |
| @ffmpeg/core | 0.12.10 | **GPL-2.0-or-later** | **Blocker for a non-GPL project.** Options: GPL the project, build an LGPL-only core, or skip ffmpeg. |
| qrcode | 1.5.4 | MIT | |
| @imgly/background-removal | | AGPL-3.0 | **Rejected** |

## AI models

Check the code licence **and** the weights' redistribution rights separately. Self-hosting means redistributing.

| Model | Use | Source | Weights licence | Redistribution OK | Status |
|---|---|---|---|---|---|
| BiRefNet_lite (8-bit weights) | Background removal, subject mask | `studioludens/birefnet-lite-512` @ 962e679 (from `ZhengPeng7/BiRefNet_lite`) | MIT | Yes (with notice) | verified, shipped. See `AI_MODELS.md` |

## Fonts (verified via npm registry)

| Font | Package | Licence | Status |
|---|---|---|---|
| Plus Jakarta Sans | @fontsource-variable/plus-jakarta-sans 5.3.0 | OFL-1.1 | verified, shipped (LICENSE read) |
| Inter | @fontsource-variable/inter 5.3.0 | OFL-1.1 | verified, shipped (LICENSE read) |
| JetBrains Mono | @fontsource-variable/jetbrains-mono 5.3.0 | OFL-1.1 | verified, shipped (LICENSE read) |

The logo wordmark uses Plus Jakarta Sans Bold glyph outlines (artwork made with the font, which OFL permits). They were generated once with opentype.js (MIT) in a scratch folder. Neither opentype.js nor the static font package is a project dependency.
