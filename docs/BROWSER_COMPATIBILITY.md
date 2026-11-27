# Browser compatibility

What each tool group needs from the browser, the minimum versions in the registry, and what was actually tested. Each tool's `browsers` field in the registry holds its own minimums, which are shown on the tool page.

## What was tested

| Engine | How | Result (2026-11-27) |
|---|---|---|
| Chromium | Playwright 1.65.1, Windows 10 | All specs pass |
| Firefox | Playwright 1.65.1, Windows 10 | All tool specs pass |
| WebKit | Playwright 1.65.1, Windows 10 | All tool specs pass |

Not tested: real Safari on macOS or iOS, Android browsers, real phones, and WebGPU on real GPU hardware (Playwright's browsers have no WebGPU adapter here). Playwright's WebKit on Windows is close to Safari but not the same: for example, it can encode WebP, and Safari can't.

## Minimum versions

| Tool group | Chrome / Edge | Firefox | Safari | Why |
|---|---|---|---|---|
| PDF tools | See each tool's registry entry | | | Module workers, WebAssembly (qpdf), pdf.js legacy build |
| Image tools | See each tool's registry entry | | | `createImageBitmap`, canvas encoding, module workers |
| AI tools | 111 | 114 | 16.4 | Module workers, WebAssembly SIMD, `DecompressionStream` |

## AI tools

| Feature | Behaviour |
|---|---|
| WebGPU (Chrome and Edge 113+, recent Safari and Firefox) | Used when `navigator.gpu.requestAdapter()` returns an adapter. Loads ONNX Runtime's WebGPU build (7.3 MB gzip). If the GPU session can't be created, the tool uses the CPU instead. Not tested on real hardware this phase. |
| CPU (WebAssembly) | Every other supported browser. Loads the CPU-only build (3.9 MB gzip). About 10 s per photo on a desktop CPU (Intel i5-9400) in Chromium, Firefox and WebKit. See `AI_MODELS.md`. |
| Threads | One thread until the site sends COOP/COEP headers (Phase 09). |
| Memory | About 1.84 GB at peak (native measurement). Devices with little memory, such as older phones, may fail. The tool then says the device ran out of memory. |
| No `DecompressionStream`, `Worker` or WebAssembly | The tool explains that this browser can't run the AI model (e2e tested by removing `DecompressionStream`). |
| Offline | Works once the model has loaded in the page. On a later visit, the browser's HTTP cache usually has it. |

## Known browser differences

- **Safari can't encode WebP.** WebP output isn't offered there, and the WebP converters say why.
- **Firefox opens downloaded `.webp` files in a new tab.** The download still works for the user. The e2e helper handles it (`TESTING.md`).
- **Fonts for meme and watermark text** come from the device, so the look varies.
