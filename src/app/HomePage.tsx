import { Inbox, ShieldCheck } from "lucide-react";
import { CategoryCard } from "@/components/cards";
import { EmptyState } from "@/components/empty-state";
import { PrivacyBadges, PrivacyGrid } from "@/components/privacy";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader, type NavItem } from "@/components/site-header";
import { categories } from "@/registry/categories";
import { visibleTools } from "@/registry/registry";

const nav: NavItem[] = [
  { label: "Tools", href: "#tools" },
  { label: "Privacy", href: "#privacy" },
];

export function HomePage() {
  const tools = visibleTools();
  const countFor = (id: string) => tools.filter((t) => t.category === id).length;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader nav={nav} />
      <main id="main" className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary-text">
            <ShieldCheck aria-hidden className="size-4" />
            All the tools. None of the uploads.
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Powerful tools. Private by design.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Free online tools for your documents, images, media and everyday tasks. Everything is processed
            directly on your device, without uploading your files.
          </p>
          <PrivacyBadges className="mt-8" />
        </section>

        <section id="tools" aria-labelledby="tools-heading" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6">
          <h2 id="tools-heading" className="text-2xl font-semibold">
            Tools
          </h2>
          <p className="mt-2 text-muted-foreground">Browse by category.</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id}>
                <CategoryCard icon={c.icon} name={c.name} description={c.description} count={countFor(c.id)} />
              </li>
            ))}
          </ul>
          {tools.length === 0 && (
            <EmptyState
              className="mt-6"
              icon={Inbox}
              title="Tools are on the way"
              description="Each tool goes live once it is finished and tested to run entirely in your browser."
            />
          )}
        </section>

        <section
          id="privacy"
          aria-labelledby="privacy-heading"
          className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6"
        >
          <h2 id="privacy-heading" className="text-2xl font-semibold">
            Your files. Your device. Your privacy.
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Privora runs every tool inside your browser. Your files stay on your device from start to finish.
          </p>
          <PrivacyGrid className="mt-6" />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
