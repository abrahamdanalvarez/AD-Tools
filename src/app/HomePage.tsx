import { ShieldCheck } from "lucide-react";
import { CategoryCard, ToolCard } from "@/components/cards";
import { icons } from "@/components/icons";
import { PrivacyBadges, PrivacyGrid } from "@/components/privacy";
import { ToolSearch } from "@/components/tool-search";
import { popularTools, toolsInCategory, visibleCategories } from "@/registry/registry";

const steps = [
  { title: "Choose a tool.", text: "Pick what you need from the list or search." },
  { title: "Select a local file.", text: "Choose it from your device or drop it on the page." },
  { title: "Process privately in your browser.", text: "Your device does the work. Nothing is uploaded." },
  { title: "Download the result.", text: "Save the new file straight to your device." },
];

const sectionClass = "mx-auto max-w-6xl scroll-mt-20 px-4 py-12 sm:px-6";

export function HomePage() {
  const popular = popularTools();
  const categories = visibleCategories();

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-14 pb-10 sm:px-6 sm:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary-text">
          <ShieldCheck aria-hidden className="size-4" />
          All the tools. None of the uploads.
        </p>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Powerful tools. Private by design.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Free online tools for your documents, images, media and everyday tasks. Everything is processed directly
          on your device, without uploading your files.
        </p>
        <div className="mt-8">
          <ToolSearch />
        </div>
        <PrivacyBadges className="mt-8" />
      </section>

      {popular.length > 0 && (
        <section aria-labelledby="popular-heading" className={sectionClass}>
          <h2 id="popular-heading" className="text-2xl font-semibold">
            Popular tools
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((t) => (
              <li key={t.id}>
                <ToolCard icon={icons[t.icon]} name={t.name} description={t.description} href={`/${t.slug}/`} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="tools" aria-labelledby="tools-heading" className={sectionClass}>
        <h2 id="tools-heading" className="text-2xl font-semibold">
          Tool categories
        </h2>
        <p className="mt-2 text-muted-foreground">More tools are added as each one is finished and tested.</p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <CategoryCard
                icon={icons[c.icon]}
                name={c.name}
                description={c.description}
                count={toolsInCategory(c.id).length}
                href={`#category-${c.id}`}
              />
            </li>
          ))}
        </ul>

        <div className="mt-10 grid gap-10">
          {categories.map((c) => (
            <section key={c.id} id={`category-${c.id}`} aria-labelledby={`category-${c.id}-heading`} className="scroll-mt-20">
              <h3 id={`category-${c.id}-heading`} className="text-lg font-semibold">
                {c.name}
              </h3>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {toolsInCategory(c.id).map((t) => (
                  <li key={t.id}>
                    <ToolCard icon={icons[t.icon]} name={t.name} description={t.description} href={`/${t.slug}/`} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section id="how-it-works" aria-labelledby="how-heading" className={sectionClass}>
        <h2 id="how-heading" className="text-2xl font-semibold">
          How it works
        </h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-border bg-surface p-5">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {i + 1}
              </span>
              <p className="mt-3 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="privacy" aria-labelledby="privacy-heading" className={sectionClass}>
        <h2 id="privacy-heading" className="text-2xl font-semibold">
          Your files. Your device. Your privacy.
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Privora runs every tool inside your browser. Your files stay on your device from start to finish.
        </p>
        <PrivacyGrid className="mt-6" />
      </section>
    </>
  );
}
