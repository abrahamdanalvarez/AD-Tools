import { LogoMark } from "@/components/brand/logo";
import { footerLinks } from "@/site";

export function SiteFooter() {
  // Only pages and channels that exist are linked (no broken links).
  const links = footerLinks.filter((l) => l.href);
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 text-sm sm:px-6">
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href!}
                  className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  {...(l.external ? { rel: "noopener" } : {})}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-2 text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <LogoMark className="size-5" />
            <span>Privora — Developed and maintained by Abraham Dan Alvarez.</span>
          </p>
          <p>Your files. Your device. Your privacy.</p>
        </div>
      </div>
    </footer>
  );
}
