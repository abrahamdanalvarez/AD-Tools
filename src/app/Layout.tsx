import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader, type NavItem } from "@/components/site-header";

// Absolute links so the header works from any page, not just the homepage.
const nav: NavItem[] = [
  { label: "Tools", href: "/#tools" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Privacy", href: "/#privacy" },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader nav={nav} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
