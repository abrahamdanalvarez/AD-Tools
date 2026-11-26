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

**Shipped in `dist/`:** react 19.3.1 (MIT), react-dom 19.3.1 (MIT), scheduler 0.28.0 (MIT), lucide-react 1.81.0 (ISC), clsx 2.1.1 (MIT), tailwind-merge 3.7.1 (MIT), class-variance-authority 0.7.1 (Apache-2.0), plus the Tailwind CSS 4.3.5 generated CSS (MIT).

**Dev only, not shipped:** 126 packages in total: MIT 138, Apache-2.0 29, MPL-2.0 12 (lightningcss build tooling), ISC 3, BSD-2/3-Clause 4, 0BSD 2, MIT-0 2, BlueOak-1.0.0 2, CC0-1.0 1. (Counts include nested lockfile entries.) Nothing here imposes obligations on the deployed site.

## Library candidates for later phases (verified via npm registry, 2026-11-26)

| Package | Version | Licence | Notes |
|---|---|---|---|
| pdf-lib | 1.17.1 | MIT | Unmaintained since 2021, but stable. Consider the `@pdfme/pdf-lib` fork. |
| pdfjs-dist | 6.5.438 | Apache-2.0 | NOTICE file to check when added |
| tesseract.js | 7.0.0 | Apache-2.0 | Caches language data in IndexedDB by default (allowed). OCR output must not be cached. |
| onnxruntime-web | 1.31.1 | MIT | |
| @ffmpeg/ffmpeg / @ffmpeg/util | 0.12.15 / 0.12.2 | MIT | |
| @ffmpeg/core | 0.12.10 | **GPL-2.0-or-later** | **Blocker for a non-GPL project.** Options: GPL the project, build an LGPL-only core, or skip ffmpeg. |
| qrcode | 1.5.4 | MIT | |
| fflate | 0.8.3 | MIT | |
| @imgly/background-removal | | AGPL-3.0 | **Rejected** |

## AI models

Check the code licence **and** the weights' redistribution rights separately. Self-hosting means redistributing.

| Model | Use | Source | Weights licence | Redistribution OK | Status |
|---|---|---|---|---|---|
| None selected | | | | | |

## Fonts (verified via npm registry)

| Font | Package | Licence | Status |
|---|---|---|---|
| Plus Jakarta Sans | @fontsource-variable/plus-jakarta-sans 5.3.0 | OFL-1.1 | verified (not installed until Phase 02) |
| Inter | @fontsource-variable/inter 5.3.0 | OFL-1.1 | verified (not installed until Phase 02) |
| JetBrains Mono | @fontsource-variable/jetbrains-mono 5.3.0 | OFL-1.1 | verified (not installed until Phase 02) |
