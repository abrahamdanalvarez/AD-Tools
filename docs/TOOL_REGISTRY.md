# Tool registry

`src/registry/tools.ts` is the single source of truth for every tool. The homepage, categories, search, tool pages, static routes, sitemap, related tools and analytics IDs all read from it. There is no second list to maintain.

## Files

| File | Purpose |
|---|---|
| `src/registry/types.ts` | `ToolDefinition`, `ToolCategory`, `IconKey`, `ToolStatus` and related types |
| `src/registry/tools.ts` | The tool entries (spreads in `imageTools()` and `pdfTools()`), plus planned, hidden entries |
| `src/registry/image-tools.ts` | The 33 image tool entries, built with a `tool()` helper (shared privacy FAQ, notes and formats) and `pair()` for the six format-pair converters |
| `src/registry/pdf-tools.ts` | The 31 PDF tool entries, built with a small `tool()` helper that adds the shared privacy FAQ, notes and formats |
| `src/registry/categories.ts` | The 10 categories (name, description, icon) |
| `src/registry/registry.ts` | Queries: `visibleTools`, `toolBySlug`, `toolsInCategory`, `visibleCategories`, `popularTools`, `relatedTools`, `categoryById` |
| `src/registry/search.ts` | Local search (`searchTools`) |
| `src/components/icons.ts` | Maps `IconKey` strings to Lucide components |
| `src/tools/index.ts` | Maps tool IDs to their lazy-loaded React components. Every ID in `src/tools/pdf/ids.ts` maps to the one lazy `PdfToolPage`, and every ID in `src/tools/image/ids.ts` to `ImageToolPage`. |

Registry data is plain (icons are string keys, not components), so the Node build script `scripts/static-routes.ts` can import it.

## Visibility rule

A tool is shown **only** when `enabled === true` **and** `status === "verified"`. Anything else stays hidden everywhere: navigation, search, homepage, categories, related tools, routes and sitemap. A hidden tool's URL returns the 404 page.

A category is shown only if it has at least one visible tool.

`status` values:

| Status | Meaning |
|---|---|
| `planned` | Listed for planning. Not built. |
| `in-progress` | Being built. |
| `verified` | Works fully in the browser. Unit and e2e tests pass in Chromium, Firefox and WebKit. |

To switch off a verified tool (for example after a browser regression), set `enabled: false`.

## Fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | Stable. Used as the analytics `toolId` and the component key. Never reuse an ID. |
| `name` | string | Display name, title case. |
| `slug` | string | URL path: `/slug/`. Lowercase, digits and hyphens. Usually the same as `id`. |
| `category` | `ToolCategory` | One of `pdf`, `image`, `ai`, `video`, `audio`, `document`, `developer`, `text`, `productivity`, `file`. |
| `description` | string | One sentence for cards and search. |
| `icon` | `IconKey` | Must exist in `src/components/icons.ts`. |
| `keywords` | string[] | Search aliases, for example "png to jpg". |
| `engine` | string | What does the work, for example "Canvas API", "pdf-lib", "ONNX Runtime Web". |
| `processingMode` | `"main-thread"` \| `"web-worker"` | Heavy work must use a worker. |
| `inputFormats` / `outputFormats` | string[] | Lowercase extensions. Input formats set the file picker's `accept`. |
| `browsers` | `BrowserSupport` | Minimum Chrome, Edge, Firefox and Safari versions, plus optional `notes` shown on the tool page. |
| `maxFileSizeMB` | number | Recommended limit. Larger files show a warning, not a block. |
| `model` | `ModelDownload \| null` | AI model name, size, licence and URL (self-hosted). Shown as a one-time download. |
| `enabled` | boolean | Kill switch. |
| `status` | `ToolStatus` | See above. |
| `popular` | boolean | Shown in "Popular tools" on the homepage. |
| `seoTitle` | string | Under 70 characters, ends with "\| Privora". |
| `seoDescription` | string | Under 160 characters. |
| `related` | string[] | Tool IDs. Hidden ones are filtered out, and at most 3 are shown. |
| `limitations` | string[] | Honest limits, shown as "Good to know". |
| `steps` | string[] | Optional. "How to use" steps. |
| `faqs` | `{ q, a }[]` | Optional. Shown as "Questions". |

`src/registry/registry.test.ts` enforces the following:

- IDs and slugs are unique.
- Slugs are URL-safe and don't clash with site pages.
- Categories, icons and related IDs all exist.
- Every verified tool has a UI component, standard SEO text and formats.
- Models are self-hosted.
- Hidden tools never appear in visible lists, popular or related.

## Search

`searchTools(query)` runs entirely in the browser over visible tools. It matches name, keywords, category name and formats. Accents and punctuation are ignored, every term must match, and "to" is ignored in multi-word queries ("png to jpg"). Queries are never stored or sent anywhere, including analytics.

## Adding a tool

1. Add the entry to `tools.ts` with `status: "planned"` and `enabled: false`.
2. Build it in `src/tools/<id>/`. Keep the UI, worker, processing code and tests together. Use the shared sections in `src/components/tool/` (file picker, settings, progress, result, and so on) and `runWorker` / `runCancellable` from `src/lib/worker-bridge.ts`.
3. Register the component in `src/tools/index.ts` with `lazy()`.
4. Add an icon key to `src/components/icons.ts` if needed.
5. Write unit tests, and an e2e test that processes a real file, checks the output, and checks there are no non-GET or foreign requests and nothing in storage.
6. Run the e2e test in Chromium, Firefox and WebKit (add the spec to their `testMatch` in `playwright.config.ts`).
7. Only then set `status: "verified"` and `enabled: true`. The route, sitemap entry, homepage card and search result appear automatically on the next build.

**A new PDF tool** needs no new component: add a config to `src/tools/pdf/ui/configs.tsx` (settings, validation and the `PdfOp` to run), its ID to `src/tools/pdf/ids.ts`, an operation to `src/tools/pdf/ops.ts` if none fits, and an entry in `pdf-tools.ts`. A unit test checks that configs, IDs and registry entries match.

**A new image tool** works the same way: a config in `src/tools/image/ui/configs.tsx` (reusing `PdfToolShell`), its ID in `src/tools/image/ids.ts`, and an entry in `image-tools.ts`. Pixel work goes in a `Recipe` for `renderImage` (`src/tools/image/render.ts`), which runs in `image.worker.ts`. Viewers set `outputFormats: []` and return a result `node` instead of a file.

## Current tools

| ID | Category | Status | Engine |
|---|---|---|---|
| `image-converter` | image | **verified** | Canvas API (OffscreenCanvas in a worker) |
| `jpg-to-png`, `png-to-jpg`, `jpg-to-webp`, `png-to-webp`, `webp-to-jpg`, `webp-to-png` | image | **verified** | Canvas API (OffscreenCanvas in a worker) |
| `image-compressor`, `batch-image-compressor` | image | **verified** | Canvas API + oxipng (WASM) |
| `image-resizer`, `image-cropper`, `image-rotator`, `image-flipper` | image | **verified** | Canvas API (OffscreenCanvas in a worker) |
| `remove-image-metadata` | image | **verified** | Lossless byte editing (no re-encoding) |
| `add-watermark-to-image`, `blur-image`, `pixelate-image`, `grayscale-image`, `adjust-image-brightness`, `adjust-image-contrast`, `adjust-image-saturation`, `image-colour-adjustment`, `meme-generator` | image | **verified** | Canvas API, pixel loops (no canvas `filter`) |
| `image-metadata-viewer` | image | **verified** | exifr |
| `image-info` | image | **verified** | Browser image decoding + exifr |
| `image-colour-picker`, `colour-palette-generator`, `image-to-base64`, `base64-to-image`, `image-comparison` | image | **verified** | Canvas API / FileReader |
| `favicon-generator` | image | **verified** | Canvas API + own PNG-in-ICO writer |
| `batch-image-converter`, `batch-image-resizer` | image | **verified** | Canvas API, one file at a time, ZIP via fflate |
| `heic-to-jpg`, `heic-to-png` | image | planned | libheif (LGPL-3.0), pending a licence decision (D47) |
| `image-ocr` | image | planned | tesseract.js (deferred with OCR PDF, D39) |
| `merge-pdf` | pdf | **verified** | pdf-lib |
| `split-pdf` | pdf | **verified** | pdf-lib |
| `rotate-pdf` | pdf | **verified** | pdf-lib |
| `reorder-pdf-pages` | pdf | **verified** | pdf-lib |
| `delete-pdf-pages` | pdf | **verified** | pdf-lib |
| `extract-pdf-pages` | pdf | **verified** | pdf-lib |
| `duplicate-pdf-pages` | pdf | **verified** | pdf-lib |
| `reverse-pdf-pages` | pdf | **verified** | pdf-lib |
| `pdf-to-jpg` | pdf | **verified** | pdf.js (canvas render) |
| `pdf-to-png` | pdf | **verified** | pdf.js (canvas render) |
| `jpg-to-pdf` | pdf | **verified** | pdf-lib (JPG/PNG embedded as-is; other formats via canvas) |
| `png-to-pdf` | pdf | **verified** | pdf-lib (JPG/PNG embedded as-is; other formats via canvas) |
| `image-to-pdf` | pdf | **verified** | pdf-lib (JPG/PNG embedded as-is; other formats via canvas) |
| `compress-pdf` | pdf | **verified** | pdf-lib + canvas JPEG re-encode |
| `add-watermark-to-pdf` | pdf | **verified** | pdf-lib (pdf.js for the placement preview) |
| `add-page-numbers-to-pdf` | pdf | **verified** | pdf-lib (pdf.js for the placement preview) |
| `add-text-to-pdf` | pdf | **verified** | pdf-lib (pdf.js for the placement preview) |
| `add-image-to-pdf` | pdf | **verified** | pdf-lib (pdf.js for the placement preview) |
| `sign-pdf` | pdf | **verified** | pdf-lib (pdf.js for the placement preview) |
| `flatten-pdf` | pdf | **verified** | pdf-lib (pdf.js for the placement preview) |
| `pdf-metadata-editor` | pdf | **verified** | pdf-lib |
| `remove-pdf-metadata` | pdf | **verified** | pdf-lib |
| `extract-pdf-text` | pdf | **verified** | pdf.js text layer |
| `extract-pdf-images` | pdf | **verified** | pdf-lib (raw JPEG/JPEG 2000 streams, PNG for 8-bit Flate images) |
| `pdf-page-counter` | pdf | **verified** | pdf-lib |
| `pdf-info` | pdf | **verified** | pdf-lib |
| `pdf-metadata-viewer` | pdf | **verified** | pdf-lib |
| `pdf-preview` | pdf | **verified** | pdf.js |
| `protect-pdf` | pdf | **verified** | qpdf WASM (AES-256) |
| `unlock-pdf` | pdf | **verified** | qpdf WASM (AES-256) |
| `repair-pdf` | pdf | **verified** | pdf-lib lenient parse and re-save |
| `ocr-pdf` | pdf | planned | tesseract.js (D39) |
| `annotate-pdf` | pdf | planned | to be decided (D39) |
| `remove-background` | ai | planned | ONNX Runtime Web |
