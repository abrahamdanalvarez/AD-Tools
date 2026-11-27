# AI models

Every AI model Privora ships: where it comes from, its licence, what was checked, and how it is built and served. A model ships only when its **weights** have an explicit licence that allows commercial use and redistribution. A permissive code licence is not enough.

## Shipped

### BiRefNet lite (background removal, subject mask)

| Item | Detail |
|---|---|
| Used by | AI Background Remover (`remove-background`), AI Subject Mask (`ai-subject-mask`) |
| Model | BiRefNet_lite (Swin-T backbone), Peng Zheng, Dehong Gao, Deng-Ping Fan, Li Liu, Jorma Laaksonen, Wanli Ouyang, Nicu Sebe. Paper: "Bilateral Reference for High-Resolution Dichotomous Image Segmentation" (CAAI AIR 2024). |
| Weights licence | **MIT**, © 2024 ZhengPeng. Stated on the author's model card (`ZhengPeng7/BiRefNet_lite`, `license: mit`) and in the code repository's LICENSE (`ZhengPeng7/BiRefNet`). The ONNX export adds © 2026 Studio Ludens V.O.F., also MIT, and its card explicitly allows serving the files to run in users' browsers. Commercial use, modification and redistribution allowed with the notice. |
| Source file | `studioludens/birefnet-lite-512`, `onnx/model.onnx` at revision `962e67969ec6acec9c19fab76acee4f5e22e990c` (MIT). A 512 × 512 export of the weights above, made with PyTorch 2.0.1 and a patched deformable-convolution exporter; its card reports a zero-pixel difference from the PyTorch model. 191,877,254 bytes, SHA-256 `1cb0fb360dadd15af77c639085d77a9df67db0c64315560c3de005f676345ac2`. |
| Why 512 | The 1024 × 1024 export (`onnx-community/BiRefNet_lite-ONNX` @ de15b22) was tried first. Its deformable convolutions create intermediate tensors of 822 MB each, and native ONNX Runtime peaked at 6.4 GB. In the browser it failed with `std::bad_alloc`, because WebAssembly memory is limited to 4 GB. The 512 export peaks at 1.84 GB natively (ONNX Runtime 1.31.1, CPU, one thread, memory pattern and arena off). |
| Our change | `scripts/models/quantize.py` stores the 127 Conv and MatMul weight tensors as int8 with one scale per output channel (176.8 MB → 44.6 MB; the file shrinks from 192 MB to 60 MB), each followed by a `DequantizeLinear`. Activations stay float32. Deterministic: the same inputs and pinned packages give the same file. |
| Shipped file | `/models/birefnet-lite-int8-c64e1a89.onnx.gz`: 40,880,751 bytes gzipped, 59,616,685 bytes unzipped, SHA-256 (unzipped) `c64e1a89654d726f16de3343e7d11d3407c6343a0ffd30bed99238ace35372a6`. The hash prefix in the name makes caching safe. |
| Input / output | `input_image` float32 [1, 3, 512, 512], RGB normalised with ImageNet mean and std; `output_image` float32 [1, 1, 512, 512] logits (sigmoid gives the mask). |
| Quality check | Three photos (cat, dog, apple; public Wikimedia images, not committed), masks scaled to the photo size. Shipped 8-bit 512 vs float32 512: mask IoU 0.9997, 0.9994, 0.9999; mean absolute difference ≤ 0.0002. Shipped 8-bit 512 vs float32 1024 (the full-resolution reference): IoU 0.9965, 0.9927, 0.9975; mean absolute difference ≤ 0.0032, all on edges. Cutouts were reviewed by eye. |
| Attribution | `THIRD_PARTY_NOTICES.md`, the credits page, and `/licences/birefnet-LICENSE.txt` shipped with the site. |

**Training data (owner risk to note).** The author lists the general-use lite model's training sets as DIS5K-TR, DIS-TEs, DUTS, HRSOD, UHRSD, HRS10K, P3M-10k and TR-humans. Some of these datasets have their own terms. DIS5K's terms, for example, say the dataset is for non-commercial research and forbid commercial use "even after copying, editing, processing or any operations". The weights themselves are released under MIT by their author. Whether dataset terms carry over to trained weights is legally unsettled. Almost every open segmentation model shares this situation (the alternatives below were trained on the same datasets). The owner should be aware of it before any paid or commercial use of Privora.

## Evaluated and rejected

| Candidate | Why not |
|---|---|
| `@imgly/background-removal` (and its ISNet models) | AGPL-3.0 (D16). |
| ISNet general-use (DIS, `xuebinqin/DIS`), including chenjindu/browser-remove-background's 8-bit build and rembg's ONNX | The repository licenses its **code** under Apache-2.0. The weights are on Google Drive with no licence of their own, and the README points to the DIS5K non-commercial terms. Not verifiable. `onnx-community/ISNet-ONNX` is tagged AGPL-3.0. |
| briaai RMBG-1.4 and RMBG-2.0 | Bria's own non-commercial licence. RMBG-2.0 is also gated. |
| MODNet (Apache-2.0, code and models) | Licence fine, and small (6.6–26 MB). Portraits only: poor on products, animals and objects. Possible later as a fast "people" mode. |
| BiRefNet (full, Swin-L) and BEN2 (MIT) | 490 MB+ and 219 MB (fp16). Too large to download in a browser. |
| BiRefNet_lite fp16 (114.5 MB) | Runs on WebGPU only. The CPU (WASM) backend can't run fp16 models, so it would need a second file. |
| BiRefNet_lite at 1024 × 1024 (`onnx-community/BiRefNet_lite-ONNX`, `wonfy/BiRefNet_lite-ONNX-webgpu`) | Runs out of memory on the CPU (WASM) backend (see "Why 512"). A WebGPU-only 1024 model would need a second download. Possible later as a high-detail option. |
| U²-Net / U²-Netp (Apache-2.0 repository) | Same author and hosting as ISNet (weights on Google Drive). Not checked further: lower quality than BiRefNet_lite. |

## Runtime

| Item | Detail |
|---|---|
| Library | onnxruntime-web 1.31.1 (MIT, © Microsoft). Its JS bundles include only onnxruntime-common (MIT); flatbuffers, protobufjs, long and guid-typescript are package dependencies that are not bundled. |
| WebAssembly | `ort-wasm-simd-threaded.wasm` (14.8 MB, 3.9 MB gzip) for browsers without WebGPU, or `ort-wasm-simd-threaded.asyncify.wasm` (28.7 MB, 7.3 MB gzip), which also contains the WebGPU backend. The browser downloads only the one it uses. Both are self-hosted and hashed by Vite. |
| Native code inside the WASM | Listed in `/licences/onnxruntime-ThirdPartyNotices.txt` (from the official 1.31.1 release, shipped unmodified). |
| Telemetry | None. ONNX Runtime's privacy notice says WebAssembly targets don't include telemetry, and the e2e guard confirms no requests leave our origin. |
| Threads | Single thread until the site sends COOP/COEP headers (Phase 09). ONNX Runtime then uses several threads automatically. |

## Measurements

Measured on an Intel Core i5-9400 (Windows 10), with the production build and the shipped 8-bit model. Single thread, because the site doesn't send COOP/COEP headers yet. Playwright's browsers have no WebGPU here, so only the CPU path was timed. WebGPU was not measured.

| Measurement | Result |
|---|---|
| Inference time on the CPU, two photos (960 × 959 cat, 960 × 791 dog). Time shown by the tool, model start excluded. | Chromium 10.1 s and 9.5 s. Firefox 10.2 s and 9.9 s. WebKit 9.7 s and 9.1 s. |
| First run from an empty cache, a 64 × 48 image (download from localhost, unzip, check, start, run) | 13.8 s in Chromium |
| Peak memory, native ONNX Runtime 1.31.1 (CPU, one thread, memory pattern and arena off) | 1.84 GB at 512 × 512. The 1024 × 1024 export peaked at 6.4 GB. Browser memory was not measured directly. The e2e tests run the model in all three engines, so the WebAssembly heap stays inside its 4 GB limit. |
| Native ONNX Runtime CPU time (default threads), same photos | 2.4–7.7 s at 512, compared with 10.7–51 s for the float32 1024 model. Only a rough guide: the machine was busy. |

## Not shipped this phase (evaluated)

| Tool | Decision |
|---|---|
| AI Image Upscaler | Real-ESRGAN (BSD-3-Clause code) models are about 17–67 MB, and a 4× upscale runs the network over the whole image in tiles. Given BiRefNet_lite's CPU timings (see Measurements), a CPU upscale would likely take minutes (not measured). Not added this phase. Revisit with a small model, a weights licence check, and WebGPU-only use. |
| AI Image Segmentation | Shipped in its foreground form as **AI Subject Mask** (same model, no extra download). Multi-class (semantic) segmentation was not evaluated in depth: it needs another model, and another weights and dataset licence review. |
| Local Image OCR | tesseract.js (Apache-2.0) with tessdata_fast (Apache-2.0) is licensed and works. Deferred with OCR PDF (D39) so both share one self-hosted, no-cache setup. tesseract.js caches language data in IndexedDB by default, which must be turned off. |

## Building and updating models

```
pip install -r scripts/models/requirements.txt   # once: numpy, onnx, protobuf (exact versions)
npm run fetch-models                              # downloads, verifies, quantises, gzips into public/models/
```

`public/models/` is git-ignored. `npm run build` stops with a clear message if the model is missing, so `dist/` never ships the tool without it. To change the model: update `src/tools/ai/model.ts` (source URL and revision, both SHA-256 values, sizes), run `npm run fetch-models`, run the tests, and record the change here and in `DECISIONS.md`.
