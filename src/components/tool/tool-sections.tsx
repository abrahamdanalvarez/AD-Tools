import { ChevronDown, Download, RotateCcw, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { ToolCard } from "@/components/cards";
import { icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/feedback";
import type { Faq, ToolDefinition } from "@/registry/types";

/** Standard privacy notice. Only states what the architecture guarantees. */
export function PrivacyNotice({ ai = false, typed = false }: { ai?: boolean; typed?: boolean }) {
  return (
    <aside
      aria-label="Privacy"
      className="flex gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-sm"
    >
      <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success-text" />
      <div>
        <p className="font-semibold">100% On-Device Processing</p>
        <p className="mt-1 text-muted-foreground">
          {typed
            ? "What you type or paste is processed directly in your browser. It is never uploaded to our servers, stored by our website, added to the page address or sent to external processing services."
            : "Your files are processed directly in your browser. They are never uploaded to our servers, stored by our website or sent to external processing services."}
        </p>
        {ai && (
          <p className="mt-1 text-muted-foreground">
            This AI tool runs locally on your device. An initial model download may be required, but your images are never
            sent to an AI processing server.
          </p>
        )}
      </div>
    </aside>
  );
}

export function SupportedFormats({ tool }: { tool: ToolDefinition }) {
  // "jpeg" is accepted as an extension but shown once, as JPG.
  // "*" means any file; "text" and "values" mark tools you type into instead of choosing a file.
  const names: Record<string, string> = { "*": "Any file", text: "Typed or pasted text", values: "Typed values" };
  const list = (f: string[]) =>
    [...new Set(f.map((x) => (x === "jpeg" ? "jpg" : x)))].map((x) => names[x] ?? x.toUpperCase()).join(", ");
  const typed = tool.inputFormats.every((f) => f === "text" || f === "values");
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
      <dt className="font-medium">Accepts</dt>
      <dd className="text-muted-foreground">{list(tool.inputFormats)}</dd>
      <dt className="font-medium">Creates</dt>
      <dd className="text-muted-foreground">{tool.outputFormats.length ? list(tool.outputFormats) : "Nothing to download: results show on the page"}</dd>
      {!typed && (
        <>
          <dt className="font-medium">Recommended size</dt>
          <dd className="text-muted-foreground">Up to {tool.maxFileSizeMB} MB</dd>
        </>
      )}
      {tool.model && (
        <>
          <dt className="font-medium">One-time download</dt>
          <dd className="text-muted-foreground">About {tool.model.sizeMB} MB AI model, kept in your browser cache</dd>
        </>
      )}
    </dl>
  );
}

export function ToolSettings({ children }: { children: ReactNode }) {
  return (
    <fieldset className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 rounded-xl border border-border bg-surface p-5">
      <legend className="px-1 text-sm font-semibold">Settings</legend>
      {children}
    </fieldset>
  );
}

export function ProcessingStatus({ progress, label, onCancel }: { progress?: number; label: string; onCancel: () => void }) {
  return (
    <div className="grid gap-3 rounded-xl border border-border bg-surface p-5" aria-live="polite">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">{label}</p>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <Progress value={progress} aria-label={label} />
    </div>
  );
}

interface ResultPanelProps {
  title: string;
  details?: ReactNode;
  preview?: ReactNode;
  onDownload: () => void;
  onReset: () => void;
  /** Back to the settings, keeping the chosen files. */
  onEdit?: () => void;
  downloadLabel?: string;
}

export function ResultPanel({ title, details, preview, onDownload, onReset, onEdit, downloadLabel = "Download" }: ResultPanelProps) {
  return (
    <section aria-label="Result" className="grid gap-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {details && <div className="mt-1 text-sm text-muted-foreground">{details}</div>}
      </div>
      {preview}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onDownload}>
          <Download aria-hidden />
          {downloadLabel}
        </Button>
        <Button variant="outline" onClick={onReset}>
          <RotateCcw aria-hidden />
          Start over
        </Button>
        {onEdit && (
          <Button variant="ghost" onClick={onEdit}>
            Change settings
          </Button>
        )}
      </div>
    </section>
  );
}

export function Instructions({ steps }: { steps: string[] }) {
  return (
    <section aria-labelledby="how-to">
      <h2 id="how-to" className="text-xl font-semibold">
        How to use
      </h2>
      <ol className="mt-4 grid gap-3">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary-text">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Limitations({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="limits">
      <h2 id="limits" className="text-xl font-semibold">
        Good to know
      </h2>
      <ul className="mt-4 grid list-disc gap-2 pl-5 text-sm text-muted-foreground">
        {items.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </section>
  );
}

export function Faqs({ items }: { items: Faq[] }) {
  return (
    <section aria-labelledby="faq">
      <h2 id="faq" className="text-xl font-semibold">
        Questions
      </h2>
      <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
        {items.map((f) => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {f.q}
              <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function RelatedTools({ tools }: { tools: ToolDefinition[] }) {
  if (tools.length === 0) return null;
  return (
    <section aria-labelledby="related">
      <h2 id="related" className="text-xl font-semibold">
        Related tools
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <li key={t.id}>
            <ToolCard icon={icons[t.icon]} name={t.name} description={t.description} href={`/${t.slug}/`} />
          </li>
        ))}
      </ul>
    </section>
  );
}
