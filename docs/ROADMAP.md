# Roadmap

Each phase ends with `PROJECT_STATUS.md` updated and real test results recorded. A tool ships only when it is finished, tested, and runs fully client-side.

| Phase | Name | Goal |
|---|---|---|
| 0 | Project setup and permanent instructions | Requirements, docs, and status tracking in place. |
| 1 | GitHub repository audit and selection | Find open-source client-side tool suites and libraries to adopt or reuse. Verify licences and privacy behaviour. Pick the base architecture. |
| 2 | Branding and design system | Build the Privora identity from `BRAND.md`: SVG logo set, favicon, social image, self-hosted fonts, Tailwind + shadcn/ui tokens with light/dark modes. |
| 3 | Homepage, navigation and tool registry | App shell, routing, a typed tool registry that hides unfinished tools, search, and categories. |
| 4 | PDF tools | Merge, split, compress, rotate, reorder, extract, protect/unlock, convert, OCR. |
| 5 | Image tools and AI background removal | Convert, resize, compress, crop. On-device background removal (ONNX Runtime Web / WebGPU) with a verified model licence. |
| 6 | Audio, video and additional utilities | ffmpeg.wasm conversions, trimming, extraction. Text, developer, and productivity utilities (QR, hashing, JSON, etc.). |
| 7 | Privacy, security and analytics | CSP and security headers via static `.htaccess`, a storage audit, a network-egress audit, optional privacy-safe analytics. |
| 8 | SEO, legal pages and optimisation | Meta tags, sitemap, structured data, privacy policy, terms, licences page, performance budgets, lazy loading of WASM/models. |
| 9 | Final testing, build and deployment preparation | Full Vitest + Playwright runs, `npm ci && npm run build` check, `dist/` upload checklist for Virtualmin. |

## Out of scope (permanently)

Anything that needs a backend, server-side processing or inference, external processing APIs, paid AI APIs, cloud storage, accounts, or a database.
