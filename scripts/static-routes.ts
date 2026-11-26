// Vite build plugin: writes one real HTML file per route so direct visits and
// refreshes work on plain static hosting (Apache, no rewrites), and each page
// has its own title, description and canonical URL for search engines.
// Also writes sitemap.xml, robots.txt and 404.html. Everything comes from the
// tool registry, so there's no second list to maintain.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { visibleTools } from "../src/registry/registry.ts";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_URL, staticPages } from "../src/site.ts";

interface PageMeta {
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export function pageList(): PageMeta[] {
  return [
    { path: "/", title: HOME_TITLE, description: HOME_DESCRIPTION },
    ...visibleTools().map((t) => ({ path: `/${t.slug}/`, title: t.seoTitle, description: t.seoDescription })),
    ...staticPages.map((p) => ({ path: p.path, title: p.title, description: p.description })),
  ];
}

export function withMeta(html: string, page: PageMeta): string {
  const url = SITE_URL + page.path;
  const title = escape(page.title);
  const description = escape(page.description);
  let out = html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${url}$2`);
  if (page.noindex) {
    out = out
      .replace(/\s*<link\s+rel="canonical"[^>]*>/, "")
      .replace("</title>", '</title>\n    <meta name="robots" content="noindex" />');
  }
  return out;
}

export function sitemap(pages: PageMeta[]): string {
  const urls = pages.map((p) => `  <url><loc>${SITE_URL}${p.path}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function staticRoutes(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "privora-static-routes",
    apply: "build",
    configResolved(c) {
      config = c;
    },
    async closeBundle() {
      const outDir = resolve(config.root, config.build.outDir);
      const template = await readFile(join(outDir, "index.html"), "utf8");
      const pages = pageList();
      for (const page of pages) {
        const dir = join(outDir, page.path);
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, "index.html"), withMeta(template, page));
      }
      await writeFile(
        join(outDir, "404.html"),
        withMeta(template, { path: "/404.html", title: "Page not found | Privora", description: HOME_DESCRIPTION, noindex: true }),
      );
      await writeFile(join(outDir, "sitemap.xml"), sitemap(pages));
      await writeFile(join(outDir, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
      config.logger.info(`static routes: ${pages.length} pages, sitemap.xml, robots.txt, 404.html`);
    },
  };
}
