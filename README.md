# Privora

**Powerful tools. Private by design.**
*Your files. Your device. Your privacy.*

Privora is a free, privacy-first collection of online PDF, image, audio, video, AI, document, developer, text and productivity tools at [tools.abrahamdan.com](https://tools.abrahamdan.com).

All the tools. None of the uploads. Every tool runs entirely in your browser. Your files are never uploaded to our servers, stored by our website or sent to outside processing services. No account needed.

> **Status:** the foundation is in place. No tools are available yet. See [docs/ROADMAP.md](docs/ROADMAP.md).

## How it works

Privora is a static website. Processing happens on your device using WebAssembly, Web Workers and, where supported, WebGPU. The server only delivers the app itself.

## Development

Requires Node.js (development and build only).

```bash
npm ci
npm run dev         # local dev server
npm test            # unit tests
npm run build       # production build into dist/
npm run test:e2e    # browser tests against dist/ (run the build first)
```

The first time you run the e2e tests, install the browser with `npx playwright install chromium`.

## Deployment

1. `npm ci`
2. `npm run build`
3. Upload the contents of `dist/` into `public_html/` for tools.abrahamdan.com on the Virtualmin host.

No server runtime, database or backend is required.

## Docs

- [Roadmap](docs/ROADMAP.md)
- [Project status](docs/PROJECT_STATUS.md)
- [Brand](docs/BRAND.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Privacy](docs/PRIVACY.md)
- [Licences](docs/LICENCES.md)
- [Decisions](docs/DECISIONS.md)
- [Repository audit](docs/REPOSITORY_AUDIT.md)
- [Tool inventory](docs/TOOL_INVENTORY.md)
- [Security audit](docs/SECURITY_AUDIT.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## Author

Privora by Abraham Dan. Developed and maintained by Abraham Dan Alvarez. [abrahamdan.com](https://abrahamdan.com)
