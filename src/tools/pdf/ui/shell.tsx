import { ArrowDown, ArrowUp, FileText, X } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { FilePicker } from "@/components/tool/file-picker";
import { ProcessingStatus, ResultPanel, ToolSettings } from "@/components/tool/tool-sections";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { track } from "@/lib/analytics";
import { downloadBlob, formatBytes } from "@/lib/files";
import { CancelledError } from "@/lib/worker-bridge";
import type { ToolDefinition } from "@/registry/types";
import type { ImageInfo } from "@/tools/image/decode";
import { pdfErrorMessages } from "../core/errors";
import type { PdfInfo } from "../core/meta";
import { readBytes, runPdf, type JobOptions } from "../run";
import { ResultPreview } from "./previews";

export interface PickedFile {
  id: string;
  file: File;
  /** Facts read when the file was chosen (PDF inputs only). */
  info: PdfInfo | null;
  /** Facts read when an image was chosen (image tools). */
  image?: ImageInfo;
}

export interface Ctx {
  files: PickedFile[];
  first: PickedFile;
}

export interface ResultFile {
  name: string;
  blob: Blob;
}

export interface ToolResult {
  files: ResultFile[];
  /** Short line under the result title (sizes, counts…). */
  summary?: ReactNode;
  preview?: "pdf" | "images" | "text" | "none";
  text?: string;
  /** Replaces the standard preview (for example a before/after comparison). */
  node?: ReactNode;
  /** For read-only tools: shown instead of a download. */
  view?: ReactNode;
  zipName?: string;
  title?: string;
}

export interface SettingsProps<S> {
  s: S;
  set: (patch: Partial<S>) => void;
  ctx: Ctx;
}

export interface PdfToolConfig<S> {
  /** "images" inputs are not inspected as PDFs. */
  input?: "pdf" | "images";
  multiple?: boolean;
  minFiles?: number;
  /** Read page count and metadata when a file is chosen (default true for PDFs). */
  inspect?: boolean;
  /** Let password-protected PDFs through (Unlock, viewers). */
  allowEncrypted?: boolean;
  initial: (ctx: Ctx) => S;
  Settings?: ComponentType<SettingsProps<S>>;
  /** User-facing problem with the current settings, or null. */
  validate?: (s: S, ctx: Ctx) => string | null;
  action: (s: S, ctx: Ctx) => string;
  working: string;
  run: (s: S, ctx: Ctx, job: JobOptions) => Promise<ToolResult>;
  /** Read-only tools run straight after a file is chosen. */
  auto?: boolean;
  /** Replaces the PDF inspection when a file is chosen (image tools). Throw to reject the file. */
  inspectFile?: (file: File) => Promise<Pick<PickedFile, "info" | "image">>;
  /** Error code → message. Defaults to the PDF messages. */
  errors?: Record<string, string>;
}

type State =
  | { step: "select" }
  | { step: "ready" }
  | { step: "working"; progress?: number }
  | { step: "done"; result: ToolResult }
  | { step: "error"; message: string };

let nextId = 0;

export function PdfToolShell<S>({ tool, config }: { tool: ToolDefinition; config: PdfToolConfig<S> }) {
  const [files, setFiles] = useState<PickedFile[]>([]);
  const [checking, setChecking] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [state, setState] = useState<State>({ step: "select" });
  const [settings, setSettings] = useState<S | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const multiple = !!config.multiple;
  const minFiles = config.minFiles ?? 1;

  useEffect(() => () => abortRef.current?.abort(), []);

  const ctx: Ctx | null = files.length > 0 ? { files, first: files[0] } : null;

  const errors: Record<string, string> = config.errors ?? pdfErrorMessages;
  const messageFor = (err: unknown) => errors[err instanceof Error ? err.message : ""] ?? errors.unknown;

  const inspect = async (file: File): Promise<PickedFile | null> => {
    if (config.inspectFile) {
      try {
        return { id: `f${nextId++}`, file, ...(await config.inspectFile(file)) };
      } catch (err) {
        setNotice(`${file.name}: ${messageFor(err)}`);
        return null;
      }
    }
    if (config.input === "images" || config.inspect === false) return { id: `f${nextId++}`, file, info: null };
    try {
      const { data } = await runPdf({ op: "inspect", file: await readBytes(file) });
      const info = data as PdfInfo;
      if (info.encrypted && !config.allowEncrypted) throw new Error("encrypted");
      return { id: `f${nextId++}`, file, info };
    } catch (err) {
      setNotice(`${file.name}: ${messageFor(err)}`);
      return null;
    }
  };

  const add = async (chosen: File[]) => {
    setNotice(null);
    const big = chosen.find((f) => f.size > tool.maxFileSizeMB * 1024 * 1024);
    setChecking((n) => n + chosen.length);
    const picked: PickedFile[] = [];
    for (const f of chosen) {
      const p = await inspect(f);
      if (p) picked.push(p);
      setChecking((n) => n - 1);
    }
    if (big && picked.length)
      setNotice(`${big.name} is ${formatBytes(big.size)}. Files over ${tool.maxFileSizeMB} MB may be slow or fail on some devices.`);
    if (picked.length === 0) return;
    const next = multiple ? [...files, ...picked] : picked.slice(0, 1);
    setFiles(next);
    setSettings(config.initial({ files: next, first: next[0] }));
    setState({ step: "ready" });
    if (config.auto && !multiple) void process(config.initial({ files: next, first: next[0] }), { files: next, first: next[0] });
  };

  const move = (i: number, d: -1 | 1) =>
    setFiles((list) => {
      const copy = [...list];
      [copy[i], copy[i + d]] = [copy[i + d], copy[i]];
      return copy;
    });
  const remove = (id: string) =>
    setFiles((list) => {
      const next = list.filter((f) => f.id !== id);
      if (next.length === 0) {
        setState({ step: "select" });
        setSettings(null);
      }
      return next;
    });

  const process = async (s: S, c: Ctx) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ step: "working" });
    track({ name: "process_start", toolId: tool.id });
    try {
      const result = await config.run(s, c, {
        signal: controller.signal,
        onProgress: (progress) => setState((st) => (st.step === "working" ? { step: "working", progress } : st)),
      });
      if (controller.signal.aborted) throw new CancelledError();
      track({ name: "process_complete", toolId: tool.id });
      setState({ step: "done", result });
    } catch (err) {
      if (err instanceof CancelledError || controller.signal.aborted) {
        setState({ step: "ready" });
        return;
      }
      const code = err instanceof Error ? err.message : "";
      track({
        name: "process_fail",
        toolId: tool.id,
        reason:
          code === "too-large"
            ? "too-large"
            : code === "not-pdf" || code === "encode-unsupported"
              ? "unsupported"
              : code === "damaged" || code === "image" || code === "decode"
                ? "decode"
                : "unknown",
      });
      setState({ step: "error", message: messageFor(err) });
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    // Drop every reference to the chosen files and results.
    setFiles([]);
    setSettings(null);
    setNotice(null);
    setState({ step: "select" });
  };

  const download = async (result: ToolResult) => {
    if (result.files.length === 1) {
      downloadBlob(result.files[0].blob, result.files[0].name);
    } else {
      const { zipSync } = await import("fflate");
      const entries: Record<string, Uint8Array> = {};
      for (const f of result.files) entries[f.name] = await readBytes(f.blob);
      // Level 0: PDFs and images are already compressed.
      downloadBlob(new Blob([zipSync(entries, { level: 0 }) as BlobPart], { type: "application/zip" }), result.zipName ?? "privora.zip");
    }
    track({ name: "download", toolId: tool.id });
  };

  const picker = (
    <FilePicker
      formats={tool.inputFormats}
      multiple={multiple}
      onFiles={(f) => void add(f)}
      onReject={setNotice}
    />
  );

  if (state.step === "select" || !ctx || settings === null) {
    return (
      <div className="grid gap-4">
        {notice && <Alert tone="error" title={notice} />}
        {checking > 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Spinner /> Checking file…
          </p>
        ) : (
          picker
        )}
      </div>
    );
  }

  const set = (patch: Partial<S>) => setSettings((s) => (s === null ? s : { ...s, ...patch }));
  const problem =
    files.length < minFiles ? `Choose at least ${minFiles} files.` : (config.validate?.(settings, ctx) ?? null);
  const Settings = config.Settings;
  const busy = state.step === "working";

  return (
    <div className="grid gap-4">
      <FileList files={files} multiple={multiple} busy={busy || state.step === "done"} onMove={move} onRemove={remove} onReset={reset} />
      {multiple && state.step !== "done" && !busy && (
        <div className="justify-self-start">
          {checking > 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Spinner /> Checking file…
            </p>
          ) : (
            <AddMore formats={tool.inputFormats} onFiles={(f) => void add(f)} onReject={setNotice} />
          )}
        </div>
      )}
      {notice && <Alert tone="warning" title={notice} />}

      {(state.step === "ready" || state.step === "error") && !config.auto && (
        <>
          {Settings && (
            <ToolSettings>
              <Settings s={settings} set={set} ctx={ctx} />
            </ToolSettings>
          )}
          {state.step === "error" && <Alert tone="error" title="That didn't work">{state.message}</Alert>}
          {problem && files.length >= minFiles && <p className="text-sm text-warning-text">{problem}</p>}
          <div>
            <Button size="lg" disabled={!!problem} onClick={() => void process(settings, ctx)}>
              {config.action(settings, ctx)}
            </Button>
          </div>
        </>
      )}
      {state.step === "error" && config.auto && <Alert tone="error" title="That didn't work">{state.message}</Alert>}

      {busy && <ProcessingStatus progress={state.progress} label={config.working} onCancel={() => abortRef.current?.abort()} />}

      {state.step === "done" &&
        (state.result.view ? (
          <section aria-label="Result" className="grid gap-4 rounded-xl border border-border bg-surface p-5">
            {state.result.view}
            <div>
              <Button variant="outline" onClick={reset}>
                Start over
              </Button>
            </div>
          </section>
        ) : (
          <ResultPanel
            title={state.result.title ?? (state.result.files.length === 1 ? "Your file is ready" : `${state.result.files.length} files are ready`)}
            details={state.result.summary}
            preview={state.result.node ?? <ResultPreview result={state.result} />}
            onDownload={() => void download(state.result)}
            onReset={reset}
            onEdit={config.Settings && !config.auto ? () => setState({ step: "ready" }) : undefined}
            downloadLabel={state.result.files.length === 1 ? `Download ${extLabel(state.result.files[0].name)}` : "Download all (ZIP)"}
          />
        ))}
    </div>
  );
}

/** Small preview of a chosen image. SVGs load as images, so their scripts never run. */
function Thumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <img
      src={url}
      alt=""
      className="size-12 shrink-0 rounded border border-border bg-[repeating-conic-gradient(var(--surface-muted)_0_25%,transparent_0_50%)] bg-[length:12px_12px] object-contain"
    />
  );
}

const extLabel = (name: string) => name.slice(name.lastIndexOf(".") + 1).toUpperCase().replace("WEBP", "WebP");

function FileList({
  files,
  multiple,
  busy,
  onMove,
  onRemove,
  onReset,
}: {
  files: PickedFile[];
  multiple: boolean;
  busy: boolean;
  onMove: (i: number, d: -1 | 1) => void;
  onRemove: (id: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface text-sm">
      <ol className="divide-y divide-border">
        {files.map((f, i) => (
          <li key={f.id} className="flex flex-wrap items-center gap-3 p-3">
            {f.image ? <Thumb file={f.file} /> : <FileText aria-hidden className="size-5 shrink-0 text-primary-text" />}
            <p className="min-w-0 flex-1">
              <span className="block truncate font-medium">{f.file.name}</span>
              <span className="text-muted-foreground">
                {formatBytes(f.file.size)}
                {f.info?.pageCount != null && ` · ${f.info.pageCount} ${f.info.pageCount === 1 ? "page" : "pages"}`}
                {f.info?.encrypted && " · password protected"}
                {f.image && ` · ${f.image.width} × ${f.image.height} · ${f.image.label}`}
              </span>
            </p>
            {multiple && !busy && (
              <span className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label={`Move ${f.file.name} up`} disabled={i === 0} onClick={() => onMove(i, -1)}>
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move ${f.file.name} down`}
                  disabled={i === files.length - 1}
                  onClick={() => onMove(i, 1)}
                >
                  <ArrowDown aria-hidden />
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Remove ${f.file.name}`} onClick={() => onRemove(f.id)}>
                  <X aria-hidden />
                </Button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {!multiple && !busy && (
        <div className="border-t border-border p-2 text-right">
          <Button variant="ghost" size="sm" onClick={onReset}>
            Choose another file
          </Button>
        </div>
      )}
    </div>
  );
}

function AddMore({ formats, onFiles, onReject }: { formats: string[]; onFiles: (f: File[]) => void; onReject: (m: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button variant="outline" onClick={() => ref.current?.click()}>
        Add more files
      </Button>
      <input
        ref={ref}
        type="file"
        hidden
        multiple
        accept={formats.map((f) => `.${f}`).join(",")}
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          e.target.value = "";
          const ok = list.filter((f) => formats.includes(f.name.slice(f.name.lastIndexOf(".") + 1).toLowerCase()));
          if (ok.length < list.length) onReject(`Unsupported file type. Choose a ${formats.map((x) => x.toUpperCase()).join(", ")} file.`);
          if (ok.length) onFiles(ok);
        }}
      />
    </>
  );
}

export { pdfErrorMessages };
