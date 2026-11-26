# Privacy

**Your files. Your device. Your privacy.**

Privacy requirements override all feature requirements. If a tool cannot meet them, it is not shipped.

## The promise

- Files you open in AD Tools are processed on your own device, in your browser.
- Your files, their contents, and their names are never uploaded, sent, or stored by us.
- No account, no sign-up.
- Files you create are saved only when you choose to download them.

## Rules for development

### Never transmitted or persisted

User-selected files, generated files, document contents, images, audio, video, file names, passwords, extracted text, OCR results, and any other sensitive input.

### Never used for sensitive data

`localStorage`, `sessionStorage`, IndexedDB, Cache Storage, cookies, OPFS, remote storage.

### Allowed

| Item | Where |
|---|---|
| Temporary processing data | Memory only (JS heap, WASM memory, in-memory virtual FS) |
| User downloads | User-initiated, to their device |
| Public AI models, app assets, WASM | May be cached (HTTP cache, Cache Storage) |
| Non-sensitive preferences (theme, etc.) | `localStorage` |
| Analytics (future, optional) | Aggregate tool usage only. Never contents, names, or inputs. |

### Engineering checks (enforced from Phase 7)

- Network audit: Playwright tests assert no request carries user data and that no requests go to third-party origins during processing.
- Storage audit: tests assert no user data lands in any browser storage after using a tool.
- Library review: disable or override default caching that would persist user data. Model and language caching is fine.
- Object URLs are revoked, and buffers are released after use.
- A CSP restricts `connect-src` to our own origin.

## Analytics

Not implemented. If added, it must be privacy-safe (no cookies, no personal data, no file data) and documented here first.
