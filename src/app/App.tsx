import { ShieldCheck } from "lucide-react";
import { visibleTools } from "@/registry/registry";

// Foundation shell only. The real homepage, navigation and tool pages
// arrive in Phases 02–03. No tool is listed until it is verified.
export function App() {
  const tools = visibleTools();
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-4 px-4">
      <div className="flex items-center gap-2 text-2xl font-semibold">
        <ShieldCheck aria-hidden className="size-7" />
        <h1>Privora</h1>
      </div>
      <p className="text-lg">Powerful tools. Private by design.</p>
      <p className="text-slate-500">
        {tools.length === 0
          ? "Tools are on the way. Nothing here uploads your files, ever."
          : `${tools.length} tools available.`}
      </p>
    </main>
  );
}
