# Tool registry

`src/registry/tools.ts` is the single source of truth for every tool. The homepage, categories, search, tool pages, static routes, sitemap, related tools and analytics IDs all read from it. There is no second list to maintain.

## Files

| File | Purpose |
|---|---|
| `src/registry/types.ts` | `ToolDefinition`, `ToolCategory`, `IconKey`, `ToolStatus` and related types |
| `src/registry/tools.ts` | The tool entries |
| `src/registry/categories.ts` | The 10 categories (name, description, icon) |
| `src/registry/registry.ts` | Queries: `visibleTools`, `toolBySlug`, `toolsInCategory`, `visibleCategories`, `popularTools`, `relatedTools`, `categoryById` |
| `src/registry/search.ts` | Local search (`searchTools`) |
| `src/components/icons.ts` | Maps `IconKey` strings to Lucide components |
| `src/tools/index.ts` | Maps tool IDs to their lazy-loaded React components |

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

## Current tools

| ID | Category | Status | Engine |
|---|---|---|---|
| `image-converter` | image | **verified** | Canvas API (OffscreenCanvas in a worker, canvas fallback) |
| `merge-pdf` | pdf | planned | pdf-lib |
| `split-pdf` | pdf | planned | pdf-lib |
| `compress-pdf` | pdf | planned | pdf-lib + pdfjs-dist |
| `remove-background` | ai | planned | ONNX Runtime Web |
