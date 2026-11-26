// Site-wide settings. Plain data so build scripts can import it.

export const SITE_URL = "https://tools.abrahamdan.com";
export const SITE_NAME = "Privora";

export const HOME_TITLE = "Privora — Free, Private Online PDF, Image and File Tools";
export const HOME_DESCRIPTION =
  "Free, privacy-first online tools for PDFs, images, audio, video and everyday tasks. Process files directly in your browser with no file uploads or server-side storage.";

/** Non-tool pages that exist. Each gets a static HTML file at build time. */
export const staticPages = [
  {
    path: "/credits/",
    title: "Open-Source Credits | Privora",
    description: "The open-source software, fonts and licences that Privora is built with.",
  },
] as const;

/**
 * Footer links. An entry with `href: null` is not built yet and is hidden, so
 * the footer never shows a broken link. Fill these in as pages and channels
 * become available (see docs/PROJECT_STATUS.md).
 */
export const footerLinks: { label: string; href: string | null; external?: boolean }[] = [
  { label: "About", href: null },
  { label: "Privacy Policy", href: null },
  { label: "Terms of Service", href: null },
  { label: "Cookie Policy", href: null },
  { label: "Open-Source Credits", href: "/credits/" },
  { label: "Contact", href: null },
  { label: "Report a Bug", href: null },
  { label: "Request a Tool", href: null },
  { label: "GitHub", href: null },
  { label: "abrahamdan.com", href: "https://abrahamdan.com", external: true },
];
