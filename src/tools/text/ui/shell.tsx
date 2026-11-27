// One shell for every typed-input tool (developer, text, productivity).
// Results update as the user types. Input and output live only in React
// state: nothing is stored, put in the URL, or sent anywhere.
import { Download, RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { track } from "@/lib/analytics";
import { downloadBlob } from "@/lib/files";
import type { ToolDefinition } from "@/registry/types";
import { CopyButton } from "@/tools/image/ui/picker";
import { InputError } from "../core/encode";
import { MAX_TEXT } from "../core/text";

export interface Output {
  /** Main result, shown in a read-only box with Copy and Download. */
  text?: string;
  textLabel?: string;
  /** File name and type for downloading `text`. */
  download?: { name: string; type: string };
  /** More files to offer, for example a rendered HTML page. */
  extraDownloads?: { name: string; type: string; text: string }[];
  /** Label and value pairs, each with a copy button when `copyRows` is set. */
  rows?: [string, string][];
  copyRows?: boolean;
  /** Custom view (previews, tables, swatches). */
  node?: ReactNode;
  /** Shown above the result. */
  note?: ReactNode;
  warning?: ReactNode;
}

export interface FormTool<S> {
  initial: () => S;
  Inputs: ComponentType<{ s: S; set: (patch: Partial<S>) => void }>;
  /** Throw InputError for a problem the user can fix. Return null to show nothing yet. */
  compute: (s: S) => Output | null | Promise<Output | null>;
  /** Random output: adds a "Generate again" button. */
  generator?: boolean;
  /** Fields that must stay under MAX_TEXT characters. */
  textKeys?: (keyof S)[];
}

/** A tool's config, with its settings type hidden so configs can share one map. */
export type AnyFormTool = FormTool<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const DELAY_MS = 150;

export function FormToolShell<S>({ tool, config }: { tool: ToolDefinition; config: FormTool<S> }) {
  const [s, setS] = useState<S>(config.initial);
  const [nonce, setNonce] = useState(0);
  const [out, setOut] = useState<Output | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const id = ++seq.current;
    const tooLong = (config.textKeys ?? []).find((k) => String(s[k] ?? "").length > MAX_TEXT);
    if (tooLong) {
      setOut(null);
      setError(`The text is too long. The limit is ${MAX_TEXT.toLocaleString("en-US")} characters.`);
      return;
    }
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const result = await config.compute(s);
        if (id !== seq.current) return;
        setOut(result);
        setError(null);
      } catch (err) {
        if (id !== seq.current) return;
        setOut(null);
        // Only messages written for users are shown; anything else is generic.
        setError(err instanceof InputError ? err.message : "Something went wrong with this input. Check it and try again.");
        if (!(err instanceof InputError)) track({ name: "process_fail", toolId: tool.id, reason: "unknown" });
      } finally {
        if (id === seq.current) setBusy(false);
      }
    }, nonce === 0 && seq.current === 1 ? 0 : DELAY_MS);
    return () => clearTimeout(timer);
  }, [s, nonce, config, tool.id]);

  const set = (patch: Partial<S>) => setS((prev) => ({ ...prev, ...patch }));
  const reset = () => {
    setS(config.initial());
    setNonce((n) => n + 1);
  };
  const Inputs = config.Inputs;

  return (
    <div className="grid gap-4">
      <fieldset className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 rounded-xl border border-border bg-surface p-5">
        <legend className="px-1 text-sm font-semibold">Input</legend>
        <Inputs s={s} set={set} />
        <div className="flex flex-wrap gap-2">
          {config.generator && (
            <Button onClick={() => setNonce((n) => n + 1)}>
              <RefreshCw aria-hidden />
              Generate again
            </Button>
          )}
          <Button variant="outline" onClick={reset}>
            <RotateCcw aria-hidden />
            Reset
          </Button>
        </div>
      </fieldset>

      {error && (
        <Alert tone="error" title="Check your input">
          {error}
        </Alert>
      )}

      <section aria-label="Result" aria-busy={busy} className="grid min-w-0 gap-4 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Result</h2>
        {!out && !error && <p className="text-sm text-muted-foreground">{busy ? "Working…" : "The result appears here as you type."}</p>}
        {out && <ResultView out={out} tool={tool} />}
      </section>
    </div>
  );
}

function ResultView({ out, tool }: { out: Output; tool: ToolDefinition }) {
  const id = useId();
  return (
    <>
      {out.warning && <Alert tone="warning" title={out.warning} />}
      {out.note && <div className="text-sm text-muted-foreground">{out.note}</div>}
      {out.rows && <Rows rows={out.rows} copy={!!out.copyRows} />}
      {out.node}
      {out.text !== undefined && (
        <div className="grid gap-2">
          <label htmlFor={id} className="text-sm font-medium">
            {out.textLabel ?? "Output"}
          </label>
          <textarea
            id={id}
            readOnly
            value={out.text}
            rows={Math.min(20, Math.max(3, out.text.split("\n").length))}
            spellCheck={false}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <CopyButton text={out.text} label="Copy" />
            {out.download && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  downloadBlob(new Blob([out.text!], { type: out.download!.type }), out.download!.name);
                  track({ name: "download", toolId: tool.id });
                }}
              >
                <Download aria-hidden />
                Download {out.download.name.slice(out.download.name.lastIndexOf(".") + 1).toUpperCase()}
              </Button>
            )}
            {out.extraDownloads?.map((f) => (
              <Button
                key={f.name}
                variant="outline"
                size="sm"
                onClick={() => {
                  downloadBlob(new Blob([f.text], { type: f.type }), f.name);
                  track({ name: "download", toolId: tool.id });
                }}
              >
                <Download aria-hidden />
                Download {f.name.slice(f.name.lastIndexOf(".") + 1).toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function Rows({ rows, copy }: { rows: [string, string][]; copy?: boolean }) {
  return (
    <dl className="grid min-w-0 gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_minmax(0,1fr)]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-medium">{k}</dt>
          <dd className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 break-all font-mono">{v}</span>
            {copy && v && <CopyButton text={v} label={`Copy ${k}`} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}
