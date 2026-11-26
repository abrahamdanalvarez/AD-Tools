# Brand

Source of truth for the Privora identity. All UI, metadata and assets must follow this file.

## Identity

| | |
|---|---|
| Name | Privora |
| Attribution | Privora by Abraham Dan |
| Developer | Abraham Dan Alvarez |
| Domain | https://tools.abrahamdan.com |
| Parent site | https://abrahamdan.com |
| Primary tagline | Powerful tools. Private by design. |
| Privacy tagline | Your files. Your device. Your privacy. |
| Marketing tagline | All the tools. None of the uploads. |

**Description.** Privora is a free, privacy-first collection of online PDF, image, audio, video, AI, document, developer, text and productivity tools. All processing takes place directly on the user's device using their web browser. User files are never uploaded to our servers, stored by our website or transmitted to external processing services.

**Mission.** Make powerful everyday digital tools accessible to everyone without compromising user privacy.

**Personality.** Professional, trustworthy, modern, minimalist, accessible, privacy-conscious, independent.

## Colours

| Token | Hex |
|---|---|
| primary | `#2563EB` |
| primary-hover | `#1D4ED8` |
| secondary | `#0F172A` |
| accent | `#06B6D4` |
| background (light) | `#F8FAFC` |
| background (dark) | `#020617` |
| surface (light) | `#FFFFFF` |
| surface (dark) | `#0F172A` |
| text (light) | `#0F172A` |
| text (dark) | `#F8FAFC` |
| muted text | `#64748B` |
| border | `#E2E8F0` |
| success | `#16A34A` |
| warning | `#F59E0B` |
| error | `#DC2626` |

## Typography

| Role | Font |
|---|---|
| Headings | Plus Jakarta Sans |
| Body | Inter |
| Code | JetBrains Mono |

Self-host the font files (no runtime Google Fonts request), in line with the no-third-party-runtime rule in `ARCHITECTURE.md`. All three fonts are OFL-1.1. Verify and record them in `LICENCES.md` when added.

## Logo brief

An original, modern SVG mark: a minimalist abstract **P monogram** with subtle privacy or shield cues. It should suggest privacy, digital utilities, security and simplicity. Avoid generic padlocks and busy illustrations.

Deliverables (built in Phase 2):

- [ ] Horizontal logo (mark + wordmark)
- [ ] Icon-only logo
- [ ] Compact logo
- [ ] Light-mode variant
- [ ] Dark-mode variant
- [ ] Favicon (SVG + ICO/PNG fallbacks, apple-touch-icon)
- [ ] Social sharing image (1200×630)

## Homepage copy

- **Headline:** Powerful tools. Private by design.
- **Subheadline:** Free online tools for your documents, images, media and everyday tasks. Everything is processed directly on your device, without uploading your files.
- **Privacy section heading:** Your files. Your device. Your privacy.
- **Privacy indicators:**
  - 100% On-Device Processing
  - Zero File Uploads
  - Zero Server-Side File Storage
  - No Account Required
- **Footer attribution:** Privora — Developed and maintained by Abraham Dan Alvarez.

## SEO

| Page | Format |
|---|---|
| Homepage title | Privora — Free, Private Online PDF, Image and File Tools |
| Homepage description | Free, privacy-first online tools for PDFs, images, audio, video and everyday tasks. Process files directly in your browser with no file uploads or server-side storage. |
| Tool page title | `[Tool Name] — Free & Private Online Tool \| Privora` |

The same title and description feed Open Graph and Twitter metadata, the web app manifest (`name: "Privora"`, `short_name: "Privora"`), and the sitemap.
