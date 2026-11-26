import { useEffect, useState } from "react";
import { ResultPanel } from "@/components/tool/tool-sections";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Label } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import { downloadBlob, formatBytes } from "@/lib/files";
import type { ToolDefinition } from "@/registry/types";
import { imageErrorMessages } from "../core/errors";
import { formatLabel, mimeOf, sniff, type ImageFormat } from "../core/formats";
import { checker, useObjectUrl } from "./compare";

const EXT: Partial<Record<ImageFormat, string>> = { jpeg: "jpg", png: "png", webp: "webp", gif: "gif", bmp: "bmp", ico: "ico", avif: "avif" };
/** About 20 MB of image data. */
const MAX_CHARS = 28_000_000;

/** Accepts a data URL or bare Base64. The type comes from the decoded bytes, not the text. SVG is refused. */
export function decodeBase64Image(text: string): { bytes: Uint8Array; format: ImageFormat } | null {
  const body = text.trim().replace(/^data:[^,]*,/, "").replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!body || body.length > MAX_CHARS || !/^[A-Za-z0-9+/]*={0,2}$/.test(body)) return null;
  let bin: string;
  try {
    bin = atob(body.padEnd(Math.ceil(body.length / 4) * 4, "="));
  } catch {
    return null;
  }
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const format = sniff(bytes);
  return format && EXT[format] ? { bytes, format } : null;
}

/** Text input instead of a file: the pasted text stays in memory and is never stored. */
export default function Base64ToImage({ tool }: { tool: ToolDefinition }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; format: ImageFormat; width: number; height: number } | null>(null);
  const url = useObjectUrl(result?.blob);
  useEffect(() => setError(null), [text]);

  const decode = async () => {
    track({ name: "process_start", toolId: tool.id });
    const out = decodeBase64Image(text);
    const blob = out && new Blob([out.bytes as BlobPart], { type: mimeOf[out.format] });
    try {
      if (!out || !blob) throw new Error("base64");
      const bitmap = await createImageBitmap(blob);
      setResult({ blob, format: out.format, width: bitmap.width, height: bitmap.height });
      bitmap.close();
      track({ name: "process_complete", toolId: tool.id });
    } catch {
      track({ name: "process_fail", toolId: tool.id, reason: "decode" });
      setError(out ? imageErrorMessages.decode : imageErrorMessages.base64);
    }
  };
  const reset = () => {
    setText("");
    setResult(null);
  };

  if (result) {
    const name = `image.${EXT[result.format]}`;
    return (
      <ResultPanel
        title="Your image is ready"
        details={`${name} · ${result.width} × ${result.height} · ${formatBytes(result.blob.size)}`}
        preview={<img src={url} alt="Decoded image" className={`max-h-80 w-auto max-w-full rounded-lg border border-border object-contain ${checker}`} />}
        onDownload={() => {
          downloadBlob(result.blob, name);
          track({ name: "download", toolId: tool.id });
        }}
        onReset={reset}
        downloadLabel={`Download ${formatLabel[result.format]}`}
      />
    );
  }
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="b64-in">Base64 or data URL</Label>
        <textarea
          id="b64-in"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          spellCheck={false}
          autoComplete="off"
          placeholder="data:image/png;base64,iVBORw0KGgo…"
          className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs break-all"
        />
      </div>
      {error && <Alert tone="error" title="That didn't work">{error}</Alert>}
      <div>
        <Button size="lg" disabled={!text.trim()} onClick={() => void decode()}>
          Decode image
        </Button>
      </div>
    </div>
  );
}
