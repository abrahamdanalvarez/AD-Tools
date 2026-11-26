# Repository audit (Phase 01)

_Audited 2026-11-26. Licence data comes from the GitHub API and the files in each repository. Code was reviewed in an isolated scratch folder. Nothing from these repositories was copied into Privora._

## Summary

| Repository | Licence | Stack | Fully client-side | Size | Verdict |
|---|---|---|---|---|---|
| [akash098p/OpenDocs-Studio](https://github.com/akash098p/OpenDocs-Studio) | **None** (no LICENSE file; GitHub API `license: null`) | React 19, Vite 5, Tailwind 3, Zustand | Mostly | ~8.2k lines, 113 commits, 1 star | **Rejected: no licence.** Reference only. |
| [alam00000/bentopdf](https://github.com/alam00000/bentopdf) | AGPL-3.0-only + paid commercial licence | Vanilla TS, Lit, Vite, many WASM libraries | Yes | 244 MB repo, ~16k stars | **Not adopted.** It would make Privora AGPL and isn't React. Reference only. |
| [ethereaglehq/privatools](https://github.com/ethereaglehq/privatools) | MIT | React 18, Vite, Tailwind, Radix/shadcn, Python backend | **No.** 38 of ~237 tools are client-only, and none of the PDF tools are | ~106k frontend lines, 1,742 commits | **Not adopted as a base.** MIT code may be reused selectively with attribution. |
| [CorentinTh/it-tools](https://github.com/CorentinTh/it-tools) | GPL-3.0 | Vue 3 | Yes | ~41k stars | **Not adopted.** GPL and Vue (would mean a framework migration). |

**Selected foundation: a fresh Privora scaffold** (React 19 + TypeScript + Vite 8 + Tailwind 4 + shadcn/ui config + Lucide). Chosen by the owner on 2026-11-26. See `DECISIONS.md` D10.

## OpenDocs-Studio

- **Licence:** the README says "MIT — free for personal and commercial use", but there is no LICENSE file, no copyright holder line, and no `license` field in `package.json`. GitHub reports no licence. Under the project rules ("no licence granting reuse rights → do not incorporate"), **no code is used.**
- **What it would take:** the author adds a proper `LICENSE` file. If that happens, re-evaluate. The architecture is the closest match to Privora.
- **Architecture:** React SPA with `react-router-dom` and a tool registry (`src/tools/registry.ts`, 29 tools). Processors are split by domain (`pdfProcessors.ts`, `imageProcessors.ts`, `textProcessors.ts`). Static Vite build with a Vercel config.
- **Privacy problems found (code review):**
  - `@imgly/background-removal` loads its model and WASM from `https://staticimgly.com/...` at runtime, which is a third-party request.
  - `@imgly/background-removal` is AGPL-3.0 (with a commercial option), and so are its model files. That's a licence conflict.
  - `src/store/fileManagerStore.ts` uses Zustand `persist` (default: `localStorage`) to store a **document list, including names and `saveDocumentContent` content**. That breaks the "never persist file names or content" rule.
  - Theme in `localStorage`. Allowed.
- **Dependencies of note:** `pdf-lib` (MIT), `pdfjs-dist` (Apache-2.0), `jspdf` (MIT), `jszip` (MIT/GPL dual, MIT chosen), `onnxruntime-web` (MIT), `@pdfsmaller/pdf-encrypt`/`pdf-decrypt` (licence to check if used).
- **Tool functionality:** not runtime-tested, because the code is unlicensed and won't be used. The registry lists 12 image, 12 PDF and 5 text tools.

## bentopdf

- **Licence:** AGPL-3.0-only. A commercial licence is sold for closed-source use. Adopting it means Privora must be AGPL-3.0 and publish its complete source, with notices left intact. The commercial licence forbids redistributing source and other things.
- **Strengths:** a mature, fully browser-based PDF suite. Documented static hosting (`STATIC-HOSTING.md`). Strong security tooling (CodeQL, `no-unsanitized` lint, `npm audit` gate).
- **Problems for Privora:** not React. A very large build pipeline (blog, i18n page generation, SEO scripts, compression, obfuscation). A `VITE_USE_CDN=true` production mode loads assets from a CDN. The build uses POSIX-only env syntax. Heavy WASM dependencies include LibreOffice WASM (MPL/LGPL), qpdf-wasm (Apache-2.0), wasm-vips (LGPL) and PDFium.
- **Use:** functional reference only. **Don't copy any code** unless the owner later accepts AGPL-3.0.

## privatools

- **Licence:** MIT, © 2026 PrivaTools. Safe to reuse with attribution.
- **Architecture:** hybrid. A Python backend (`backend/`, Docker, `requirements.txt`) does most processing. Clerk accounts, API keys, rate limits. The frontend is about 106k lines and 804 files.
- **Client-side coverage:** `clientOnly: true` on 38 tools in `data/non-pdf-tools.ts`. None of the 109 tools in `data/tools.ts` (PDF) are client-only.
- **Privacy problems (code review):** analytics beacon to `/api/analytics/hit`. "Bring your own key" AI sends content to remote LLM providers (OpenAI, Groq, OpenRouter and others). `password-breach-check` calls an external breach API. `useFormPersist` and `useHistory` (local persistence of inputs and history). BYOK key store. OPFS model cache (allowed for models).
- **Use:** the client-only developer and text tools are good references, or can be copied with attribution. The server-backed tools are excluded.

## it-tools

- **Licence:** GPL-3.0. Copying code would make Privora GPL. Vue 3.
- **Use:** functional reference for developer tools only. Implement independently.

## Retrieval and history

No upstream was adopted, so there's no upstream git history to keep. Privora's own history continues from `df7afa6 Initial commit`.
