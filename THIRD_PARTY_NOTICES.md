# Third-party notices

Privora includes the following open-source software in its production build. Each component remains under its own licence. The full licence texts ship inside each package in `node_modules/` and are reproduced here when a licence requires it.

| Component | Version | Licence | Copyright |
|---|---|---|---|
| React, React DOM, Scheduler | 19.3.1 / 0.28.0 | MIT | © Meta Platforms, Inc. and affiliates |
| Lucide (lucide-react) | 1.81.0 | ISC | © Lucide Contributors (portions © Cole Bemis, Feather, MIT) |
| clsx | 2.1.1 | MIT | © Luke Edwards |
| tailwind-merge | 3.7.1 | MIT | © Dany Castillo |
| class-variance-authority | 0.7.1 | Apache-2.0 | © Joe Bell |
| Tailwind CSS (generated CSS, including Preflight) | 4.3.5 | MIT | © Tailwind Labs, Inc. |
| Radix UI Primitives (radix-ui and @radix-ui/*) | 1.8.1 | MIT | © 2022 WorkOS |
| shadcn/ui (component patterns adapted in `src/components/ui`) | n/a | MIT | © 2023 shadcn |
| pdf-lib | 1.17.1 | MIT | © 2019 Andrew Dillon |
| @pdf-lib/standard-fonts | 1.0.0 | MIT | © 2018 Andrew Dillon |
| @pdf-lib/upng | 1.0.1 | MIT | © 2017 Photopea |
| pako | 1.0.11 | MIT AND Zlib | © 2014-2017 Vitaly Puzrin and Andrei Tuputcyn |
| tslib | 2.9.1 | 0BSD | © Microsoft Corporation |
| PDF.js (pdfjs-dist) | 6.5.438 | Apache-2.0 | © Mozilla Foundation |
| PDF.js data files in `vendor/pdfjs/` | 6.5.438 | See each folder's LICENSE files | Adobe Systems Inc. (CMaps, BSD-3-Clause); The PDFium Authors (Foxit fonts and JBIG2, BSD-style); Red Hat, Inc. (Liberation Sans, GPL-2.0 with font exception); OpenJPEG authors (BSD-2-Clause); Mozilla Corporation and Marti Maria (qcms, MIT); ICC profile (CC0-1.0) |
| qpdf | 12.2.0 | Apache-2.0 | © Jay Berkenbilt and qpdf contributors |
| @neslinesli93/qpdf-wasm | 0.3.1 | ISC | © 2026 Tommaso Pifferi |
| fflate | 0.8.3 | MIT | © 2026 Arjun Barrett |
| exifr | 7.1.3 | MIT | © 2020 Mike Kovařík, Mutiny.cz |
| jSquash oxipng (@jsquash/oxipng) | 2.3.0 | Apache-2.0 | © Jamie Sinclair (jSquash, based on Google's Squoosh codecs) |
| Oxipng (WebAssembly build inside @jsquash/oxipng) | n/a | MIT | © 2016 Joshua Holmer |
| ONNX Runtime Web (onnxruntime-web, its JS bundles and WebAssembly binaries) | 1.31.1 | MIT | © Microsoft Corporation. The WebAssembly binaries include third-party code listed in `licences/onnxruntime-ThirdPartyNotices.txt`, shipped with the site |
| BiRefNet lite (AI model weights) | 512 × 512 ONNX export by Studio Ludens, revision 962e679 | MIT | © 2024 ZhengPeng (Peng Zheng), © 2026 Studio Ludens V.O.F. Licence text shipped at `licences/birefnet-LICENSE.txt`. Weights stored in 8 bits by Privora (modified) |
| Prettier (prettier/standalone and its parser plugins) | 3.10.1 | MIT | © James Long and contributors. The plugins bundle third-party code listed in `licences/prettier-THIRD-PARTY-NOTICES.md`, shipped with the site |
| SQL Formatter (sql-formatter) | 15.9.0 | MIT | © 2016-2020 ZeroTurnaround LLC, © 2020-2021 George Leslie-Waksman and contributors |
| nearley (runtime, bundled by sql-formatter) | 2.20.1 | MIT | © 2014-2019 Kartik Chandra, Tim Radvan |
| yaml | 2.9.1 | ISC | © Eemeli Aro |
| Papa Parse (papaparse) | 5.7.1 | MIT | © 2015 Matthew Holt |
| Marked (marked) | 18.2.0 | MIT | © 2018+ MarkedJS, © 2011-2018 Christopher Jeffrey |
| DOMPurify (dompurify) | 3.4.17 | Apache-2.0 (dual-licensed MPL-2.0 OR Apache-2.0; used under Apache-2.0) | © Cure53 and other contributors |
| uqr | 0.1.3 | MIT | © Project Nayuki, © 2023 Anthony Fu |
| jsQR (jsqr) | 1.4.0 | Apache-2.0 | © Cosmo Wolfe |
| hash-wasm | 4.13.0 | MIT | © 2020 Dani Biró |
| jsdiff (diff) | 9.0.0 | BSD-3-Clause | © 2009-2015 Kevin Decker. Licence text below |
| cRonstrue (cronstrue) | 3.39.0 | MIT | © 2017 Brady Holt |
| Inter (font) | 5.3.0 (@fontsource-variable/inter) | OFL-1.1 | © 2016 The Inter Project Authors |
| Plus Jakarta Sans (font; also outlined in the Privora wordmark) | 5.3.0 (@fontsource-variable/plus-jakarta-sans) | OFL-1.1 | © 2020 The Plus Jakarta Sans Project Authors |
| JetBrains Mono (font) | 5.3.0 (@fontsource-variable/jetbrains-mono) | OFL-1.1 | © 2020 The JetBrains Mono Project Authors |

Build and test tools (Vite, TypeScript, Vitest, Playwright, and others) are not distributed with the site.

No code from other repositories has been incorporated. Any future reuse (for example MIT-licensed code from privatools) will be listed here, with its copyright notice, before it ships.

---

### MIT License (applies to the MIT components above)

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### ONNX Runtime third-party notices

ONNX Runtime's WebAssembly build contains code from other projects (for example Protocol Buffers, Abseil, Eigen, ONNX, SafeInt and GSL) under their own licences: BSD, Apache-2.0, MIT, MPL-2.0 and others. Their full notices ship with the site at `/licences/onnxruntime-ThirdPartyNotices.txt`, taken unmodified from the official onnxruntime 1.31.1 release. ONNX Runtime's MIT licence ships at `/licences/onnxruntime-LICENSE.txt`.

### ISC License (Lucide, @neslinesli93/qpdf-wasm, yaml)

```
Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

### SIL Open Font License 1.1 (Inter, Plus Jakarta Sans, JetBrains Mono)

The fonts are distributed unmodified as WOFF2 files under the SIL Open Font License, Version 1.1. Full text: https://openfontlicense.org/open-font-license-official-text/. The fonts may be bundled with software but may not be sold on their own. The Privora logo artwork uses outlines of Plus Jakarta Sans glyphs. That is artwork made with the font, not a redistribution of the font software.

### Apache License 2.0 (class-variance-authority, PDF.js, qpdf, @jsquash/oxipng, DOMPurify, jsQR)

Full text: https://www.apache.org/licenses/LICENSE-2.0. None of these packages ships a NOTICE file. The PDF.js, qpdf and @jsquash/oxipng code is used unmodified.

### BSD 3-Clause License (jsdiff)

```
Copyright (c) 2009-2015, Kevin Decker <kpdecker@gmail.com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### Other licences

- **Zlib** (pako): the code is provided as-is, the origin must not be misrepresented, and altered versions must be marked. pako is used unmodified.
- **0BSD** (tslib): no conditions.
- **BSD-2-Clause, BSD-3-Clause, CC0-1.0, GPL-2.0 with font exception** (PDF.js data files): each licence text ships next to the files it covers, in `vendor/pdfjs/cmaps/`, `standard_fonts/`, `iccs/` and `wasm/`. The Liberation Sans fonts are unmodified. Their source is available at https://github.com/liberationfonts/liberation-fonts.
