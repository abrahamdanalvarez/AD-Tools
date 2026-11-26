import { Breadcrumbs } from "@/components/tool/breadcrumbs";

// Mirrors THIRD_PARTY_NOTICES.md. Update both when shipped dependencies change.
const credits = [
  { name: "React and React DOM", licence: "MIT", by: "Meta Platforms, Inc. and affiliates", url: "https://react.dev" },
  { name: "Radix UI Primitives", licence: "MIT", by: "WorkOS", url: "https://www.radix-ui.com" },
  { name: "shadcn/ui (component patterns)", licence: "MIT", by: "shadcn", url: "https://ui.shadcn.com" },
  { name: "Tailwind CSS", licence: "MIT", by: "Tailwind Labs, Inc.", url: "https://tailwindcss.com" },
  { name: "Lucide icons", licence: "ISC", by: "Lucide Contributors", url: "https://lucide.dev" },
  { name: "clsx", licence: "MIT", by: "Luke Edwards", url: "https://github.com/lukeed/clsx" },
  { name: "tailwind-merge", licence: "MIT", by: "Dany Castillo", url: "https://github.com/dcastil/tailwind-merge" },
  { name: "class-variance-authority", licence: "Apache-2.0", by: "Joe Bell", url: "https://cva.style" },
  { name: "PDF.js", licence: "Apache-2.0", by: "Mozilla Foundation", url: "https://mozilla.github.io/pdf.js/" },
  { name: "pdf-lib", licence: "MIT", by: "Andrew Dillon", url: "https://pdf-lib.js.org" },
  { name: "pako", licence: "MIT and Zlib", by: "Vitaly Puzrin and Andrei Tuputcyn", url: "https://github.com/nodeca/pako" },
  { name: "UPNG.js (@pdf-lib/upng)", licence: "MIT", by: "Photopea", url: "https://github.com/photopea/UPNG.js" },
  { name: "qpdf", licence: "Apache-2.0", by: "Jay Berkenbilt and contributors", url: "https://qpdf.sourceforge.io" },
  { name: "qpdf-wasm", licence: "ISC", by: "Tommaso Pifferi", url: "https://github.com/neslinesli93/qpdf-wasm" },
  { name: "fflate", licence: "MIT", by: "Arjun Barrett", url: "https://github.com/101arrowz/fflate" },
  { name: "Liberation Sans (used by PDF.js)", licence: "GPL-2.0 with font exception", by: "Red Hat, Inc.", url: "https://github.com/liberationfonts/liberation-fonts" },
  { name: "Inter", licence: "SIL OFL 1.1", by: "The Inter Project Authors", url: "https://rsms.me/inter/" },
  { name: "Plus Jakarta Sans", licence: "SIL OFL 1.1", by: "The Plus Jakarta Sans Project Authors", url: "https://github.com/tokotype/PlusJakartaSans" },
  { name: "JetBrains Mono", licence: "SIL OFL 1.1", by: "The JetBrains Mono Project Authors", url: "https://www.jetbrains.com/lp/mono/" },
];

export function CreditsPage() {
  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 py-10 sm:px-6">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Open-Source Credits" }]} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Open-source credits</h1>
        <p className="mt-2 text-muted-foreground">
          Privora is built with these open-source projects. Thank you to everyone who makes them.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Project</th>
              <th scope="col" className="px-4 py-3 font-medium">Licence</th>
              <th scope="col" className="px-4 py-3 font-medium">Copyright</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {credits.map((c) => (
              <tr key={c.name}>
                <td className="px-4 py-3">
                  <a href={c.url} rel="noopener" className="font-medium text-primary-text underline-offset-4 hover:underline">
                    {c.name}
                  </a>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{c.licence}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
