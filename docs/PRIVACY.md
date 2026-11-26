# Privacy

**Your files. Your device. Your privacy.**

Privacy requirements override all feature requirements. If a tool cannot meet them, it is not published.

## The promise

- Files you open in Privora are processed on your own device, in your browser.
- Your files, their contents, and their names are never uploaded, sent, or stored by us.
- No account, no sign-up.
- Files you create are saved only when you choose to download them.

## Never transmitted or persisted

- User files and generated files
- File names, file paths, file hashes
- Document contents, images, audio, video
- Extracted text, OCR results
- Passwords, API keys
- Clipboard contents
- Any other sensitive user input

"Persisted" includes `localStorage`, `sessionStorage`, IndexedDB, Cache Storage, OPFS, cookies, service-worker caches, and any remote storage.

## Allowed

| Item | Where |
|---|---|
| Temporary processing data | Memory only (JS heap, WASM memory, in-memory WASM file systems such as ffmpeg MEMFS) |
| Output files | Only when the user starts a download |
| Public app assets, models, fonts, WASM | May be cached (HTTP cache, Cache Storage, IndexedDB for model/language data) |
| Theme, language, favourite tool IDs | `localStorage` |

## Analytics

**Disabled by default.** It stays off until a provider is configured and approved by the owner, and it is documented here first.

Allowed events (with no other properties):

| Event | Payload |
|---|---|
| `page_view` | page path (route only, no query strings) |
| `tool_open` | tool ID |
| `process_start` | tool ID |
| `process_complete` | tool ID |
| `process_fail` | tool ID, and an error category from a fixed enum (never a raw message) |
| `download` | tool ID |

Never sent: content, file names or sizes that could identify a file, hashes, text inputs, free-form error messages, or identifiers that track a person across sessions. The provider must be cookieless and must not need a consent banner.

## Engineering checks (enforced from Phase 09)

- **Network audit:** Playwright tests run each tool and assert that no request goes anywhere except our own static assets and approved analytics events.
- **Storage audit:** tests assert that no user data is left in any browser storage after use.
- **Library review:** turn off or override any library default that would persist user data. Model and language caching is fine.
- **Cleanup:** revoke object URLs and release buffers after use.
- **CSP:** `connect-src` is limited to our own origin (plus the analytics endpoint, if approved).
- **Cloudflare:** check that no feature injects scripts or beacons (Web Analytics auto-inject, Rocket Loader, Zaraz, email obfuscation), because these change the privacy and CSP picture.
