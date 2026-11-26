# AD Tools

**Everyday tools. Simplified.**
*Your files. Your device. Your privacy.*

AD Tools (Abraham Dan Tools) is a free collection of PDF, image, AI, audio, video, document, text, developer and productivity tools at [tools.abrahamdan.com](https://tools.abrahamdan.com).

Every tool runs entirely in your browser. Your files are never uploaded, stored or sent anywhere. No account needed.

> **Status:** early setup. No tools are available yet. See [docs/ROADMAP.md](docs/ROADMAP.md).

## How it works

AD Tools is a static website. Processing happens on your device using WebAssembly, Web Workers and, where supported, WebGPU. The server only delivers the app itself.

## Development

Requires Node.js (development and build only).

```bash
npm ci
npm run dev     # local dev server
npm run build   # production build into dist/
```

## Deployment

1. `npm ci`
2. `npm run build`
3. Upload the contents of `dist/` into `public_html/` on the Virtualmin host.

No server runtime, database or backend is required.

## Docs

- [Roadmap](docs/ROADMAP.md)
- [Project status](docs/PROJECT_STATUS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Privacy](docs/PRIVACY.md)
- [Licences](docs/LICENCES.md)

## Author

Built by Abraham Dan Alvarez. [abrahamdan.com](https://abrahamdan.com)
