import { useEffect, useMemo, useRef, useState } from "react";
import { FilePicker } from "@/components/tool/file-picker";
import { ProcessingStatus, ResultPanel, ToolSettings } from "@/components/tool/tool-sections";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { track } from "@/lib/analytics";
import { downloadBlob, extensionOf, formatBytes, replaceExtension } from "@/lib/files";
import { CancelledError, runCancellable, runWorker } from "@/lib/worker-bridge";
import type { ToolDefinition } from "@/registry/types";
import { convertImage, offscreenSupported } from "./convert";
import { errorMessages, outputs, type ConvertInput, type ConvertResult, type OutputType } from "./types";

type State =
  | { step: "select" }
  | { step: "ready"; file: File }
  | { step: "working"; file: File; progress: number }
  | { step: "done"; file: File; result: ConvertResult; url: string }
  | { step: "error"; file: File; message: string };

const createWorker = () => new Worker(new URL("./convert.worker.ts", import.meta.url), { type: "module" });

/** Detects whether this browser can encode a format (Safari cannot write WebP). */
function canEncode(type: OutputType): boolean {
  if (type === "image/png" || type === "image/jpeg") return true;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    return c.toDataURL(type).startsWith(`data:${type}`);
  } catch {
    return false;
  }
}

export default function ImageConverter({ tool }: { tool: ToolDefinition }) {
  const [state, setState] = useState<State>({ step: "select" });
  const [notice, setNotice] = useState<string | null>(null);
  const [type, setType] = useState<OutputType>("image/png");
  const [quality, setQuality] = useState(90);
  const abortRef = useRef<AbortController | null>(null);
  const supported = useMemo(() => outputs.filter((o) => canEncode(o.type)), []);
  const output = outputs.find((o) => o.type === type)!;

  // Free the result preview URL and stop any running job when leaving.
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (state.step !== "done") return;
    return () => URL.revokeObjectURL(state.url);
  }, [state]);

  const choose = (files: File[]) => {
    const file = files[0];
    setNotice(
      file.size > tool.maxFileSizeMB * 1024 * 1024
        ? `This file is ${formatBytes(file.size)}. Files over ${tool.maxFileSizeMB} MB may be slow or fail on some devices.`
        : null,
    );
    // Default to a different format than the input.
    const inputExt = extensionOf(file.name).replace("jpeg", "jpg");
    if (inputExt === output.ext) setType(supported.find((o) => o.ext !== inputExt)?.type ?? "image/png");
    setState({ step: "ready", file });
  };

  const convert = async (file: File) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ step: "working", file, progress: 0 });
    track({ name: "process_start", toolId: tool.id });
    const onProgress = (progress: number) => setState((s) => (s.step === "working" ? { ...s, progress } : s));
    try {
      const result = offscreenSupported()
        ? await runWorker<ConvertInput, ConvertResult>(
            createWorker,
            { file, type, quality: quality / 100 },
            { signal: controller.signal, onProgress },
          )
        : await runCancellable(convertImage(file, type, quality / 100, onProgress), controller.signal);
      track({ name: "process_complete", toolId: tool.id });
      setState({ step: "done", file, result, url: URL.createObjectURL(result.blob) });
    } catch (err) {
      if (err instanceof CancelledError) {
        setState({ step: "ready", file });
        return;
      }
      const code = err instanceof Error ? err.message : "";
      track({ name: "process_fail", toolId: tool.id, reason: code === "decode" ? "decode" : code.startsWith("encode") ? "encode" : "unknown" });
      setState({ step: "error", file, message: errorMessages[code] ?? errorMessages.encode });
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setNotice(null);
    setState({ step: "select" });
  };

  if (state.step === "select") {
    return (
      <div className="grid gap-4">
        {notice && <Alert tone="error" title={notice} />}
        <FilePicker formats={tool.inputFormats} onFiles={choose} onReject={setNotice} />
      </div>
    );
  }

  const { file } = state;
  const outName = replaceExtension(file.name, output.ext);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 text-sm">
        <p className="min-w-0">
          <span className="block truncate font-medium">{file.name}</span>
          <span className="text-muted-foreground">{formatBytes(file.size)}</span>
        </p>
        {state.step !== "working" && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Choose another file
          </Button>
        )}
      </div>

      {notice && <Alert tone="warning" title={notice} />}

      {(state.step === "ready" || state.step === "error") && (
        <>
          <ToolSettings>
            <div className="grid gap-2">
              <Label htmlFor="ic-format">Convert to</Label>
              <Select value={type} onValueChange={(v) => setType(v as OutputType)}>
                <SelectTrigger id="ic-format" className="sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supported.map((o) => (
                    <SelectItem key={o.type} value={o.type}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {supported.length < outputs.length && (
                <p className="text-xs text-muted-foreground">Your browser cannot create WebP files.</p>
              )}
            </div>
            {output.lossy && (
              <div className="grid gap-2">
                <Label htmlFor="ic-quality">Quality: {quality}%</Label>
                <input
                  id="ic-quality"
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-[var(--primary)] sm:w-72"
                />
              </div>
            )}
          </ToolSettings>
          {state.step === "error" && <Alert tone="error" title="Conversion failed">{state.message}</Alert>}
          <div>
            <Button size="lg" onClick={() => convert(file)}>
              Convert to {output.label}
            </Button>
          </div>
        </>
      )}

      {state.step === "working" && (
        <ProcessingStatus
          progress={state.progress}
          label={`Converting to ${output.label}…`}
          onCancel={() => abortRef.current?.abort()}
        />
      )}

      {state.step === "done" && (
        <ResultPanel
          title="Your image is ready"
          details={`${outName} · ${state.result.width} × ${state.result.height} · ${formatBytes(state.result.blob.size)}`}
          preview={
            <img
              src={state.url}
              alt="Converted image preview"
              className="max-h-80 w-auto max-w-full rounded-lg border border-border bg-[repeating-conic-gradient(var(--surface-muted)_0_25%,transparent_0_50%)] bg-[length:16px_16px] object-contain"
            />
          }
          onDownload={() => {
            downloadBlob(state.result.blob, outName);
            track({ name: "download", toolId: tool.id });
          }}
          onReset={reset}
          downloadLabel={`Download ${output.label}`}
        />
      )}
    </div>
  );
}
