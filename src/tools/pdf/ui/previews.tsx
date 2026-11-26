import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/input";
import { formatBytes } from "@/lib/files";
import type { ToolResult } from "./shell";
import { PageThumb, usePdfDocument } from "./pages";

export function ResultPreview({ result }: { result: ToolResult }) {
  if (result.preview === "text") return <TextPreview text={result.text ?? ""} />;
  if (result.preview === "images") return <ImagesPreview files={result.files} />;
  if (result.preview === "none") return <FileNames files={result.files} />;
  return (
    <div className="grid gap-3">
      <PdfPreview blob={result.files[0].blob} />
      {result.files.length > 1 && <FileNames files={result.files} />}
    </div>
  );
}

function FileNames({ files }: { files: ToolResult["files"] }) {
  if (files.length < 2) return null;
  return (
    <ul className="max-h-48 overflow-y-auto rounded-lg border border-border text-sm">
      {files.map((f) => (
        <li key={f.name} className="flex justify-between gap-3 border-b border-border px-3 py-1.5 last:border-0">
          <span className="truncate">{f.name}</span>
          <span className="shrink-0 text-muted-foreground">{formatBytes(f.blob.size)}</span>
        </li>
      ))}
    </ul>
  );
}

export function PdfPreview({ blob }: { blob: Blob }) {
  const { doc, failed } = usePdfDocument(blob);
  if (failed) return <p className="text-sm text-muted-foreground">Preview isn't available for this file.</p>;
  if (!doc) return null;
  return (
    <figure className="flex items-end gap-4">
      <div className="w-[140px] shrink-0">
        <PageThumb doc={doc} page={1} width={140} label="Preview of page 1" />
      </div>
      <figcaption className="text-sm text-muted-foreground">
        {doc.numPages} {doc.numPages === 1 ? "page" : "pages"}
      </figcaption>
    </figure>
  );
}

function ImagesPreview({ files }: { files: ToolResult["files"] }) {
  const shown = useMemo(() => files.slice(0, 12), [files]);
  const urls = useMemo(() => shown.map((f) => URL.createObjectURL(f.blob)), [shown]);
  // Object URLs are released as soon as the preview goes away.
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);
  return (
    <div className="grid gap-2">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3">
        {shown.map((f, i) => (
          <li key={f.name} className="grid gap-1 text-xs">
            <img src={urls[i]} alt={f.name} className="aspect-[3/4] w-full rounded border border-border bg-white object-contain" />
            <span className="truncate">{f.name}</span>
          </li>
        ))}
      </ul>
      {files.length > shown.length && <p className="text-sm text-muted-foreground">and {files.length - shown.length} more</p>}
    </div>
  );
}

function TextPreview({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2">
      <Label htmlFor="extracted-text">Extracted text</Label>
      <textarea
        id="extracted-text"
        readOnly
        value={text}
        rows={12}
        className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
      />
      <button
        type="button"
        className="justify-self-start text-sm font-medium text-primary-text underline-offset-4 hover:underline"
        onClick={() => {
          // Write-only clipboard access, on request. Clipboard contents are never read.
          void navigator.clipboard?.writeText(text).then(() => setCopied(true));
        }}
      >
        {copied ? "Copied" : "Copy text"}
      </button>
    </div>
  );
}
