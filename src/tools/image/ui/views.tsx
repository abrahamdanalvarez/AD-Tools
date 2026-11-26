// Read-only result views: image information, metadata, palette, Base64.
import { useEffect, useState, type ReactNode } from "react";
import { Alert } from "@/components/ui/feedback";
import { Label } from "@/components/ui/input";
import { formatBytes } from "@/lib/files";
import type { ImageInfo } from "../decode";
import { CopyButton } from "./picker";

export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-medium">{k}</dt>
          <dd className="break-words text-muted-foreground">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export function infoRows(file: File, i: ImageInfo): [string, ReactNode][] {
  const g = gcd(i.width, i.height);
  return [
    ["Format", i.label],
    ["Dimensions", `${i.width} × ${i.height} pixels`],
    ["Megapixels", (i.width * i.height / 1e6).toFixed(2)],
    ["Aspect ratio", `${i.width / g}:${i.height / g}`],
    ["File size", formatBytes(file.size)],
    ["Transparency", i.alpha ? "Yes" : "No"],
    ["Animated", i.animated ? "Yes" : "No"],
  ];
}

/** exifr groups, in display order, with friendly titles. */
const GROUPS: [string, string][] = [
  ["ifd0", "Camera and file"],
  ["exif", "Exposure"],
  ["gps", "Location (GPS)"],
  ["iptc", "IPTC (captions, credits)"],
  ["xmp", "XMP"],
  ["icc", "Colour profile"],
  ["jfif", "JFIF"],
  ["ihdr", "PNG header"],
];

function show(v: unknown): string {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : v.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  if (v instanceof Uint8Array || v instanceof ArrayBuffer) return `(binary data, ${v.byteLength} bytes)`;
  if (Array.isArray(v)) return v.map(show).join(", ");
  if (v && typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export type MetadataGroups = Record<string, Record<string, unknown> | undefined>;

export async function readMetadata(file: Blob): Promise<MetadataGroups> {
  const exifr = await import("exifr");
  // Parses the bytes only. exifr fetches nothing when given a buffer.
  const out = await exifr.parse(await file.arrayBuffer(), {
    tiff: true, exif: true, gps: true, xmp: true, iptc: true, icc: true, jfif: true, ihdr: true,
    ifd1: false, interop: false, makerNote: false, userComment: true,
    mergeOutput: false, translateValues: true, reviveValues: true, sanitize: true,
  }).catch(() => undefined);
  return out ?? {};
}

export function MetadataView({ groups }: { groups: MetadataGroups }) {
  const present = GROUPS.filter(([k]) => groups[k] && Object.keys(groups[k]!).length);
  if (!present.length) return <p className="text-sm">No metadata was found in this image.</p>;
  return (
    <div className="grid gap-5">
      {groups.gps && (
        <Alert tone="warning" title="This image contains a GPS location">
          Anyone you share it with can see where it was taken. Remove Image Metadata strips it.
        </Alert>
      )}
      {present.map(([k, title]) => (
        <section key={k} className="grid gap-2">
          <h3 className="font-semibold">{title}</h3>
          <Facts rows={Object.entries(groups[k]!).map(([tag, v]) => [tag, show(v)])} />
        </section>
      ))}
    </div>
  );
}

export function PaletteView({ colours }: { colours: string[] }) {
  return (
    <div className="grid gap-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Palette">
        {colours.map((c) => (
          <li key={c} className="grid gap-2 rounded-lg border border-border p-2">
            <span aria-hidden className="h-16 rounded" style={{ background: c }} />
            <span className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm">{c}</span>
              <CopyButton text={c} label="Copy" />
            </span>
          </li>
        ))}
      </ul>
      <div>
        <CopyButton text={colours.join(", ")} label="Copy all" />
      </div>
    </div>
  );
}

/** The data URL is built and shown only in memory. Large images make very long text. */
export function Base64View({ file, mime }: { file: File; mime: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    let live = true;
    const reader = new FileReader();
    // The type comes from the image bytes, not the file name or the type the system reported.
    reader.onload = () => live && setText(String(reader.result).replace(/^data:[^,]*,/, `data:${mime};base64,`));
    reader.readAsDataURL(file);
    return () => {
      live = false;
      reader.abort();
    };
  }, [file, mime]);
  return (
    <div className="grid gap-2">
      <Label htmlFor="b64-out">Data URL ({formatBytes(text.length)})</Label>
      <textarea id="b64-out" readOnly value={text} rows={8} className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs break-all" />
      <div className="flex flex-wrap gap-2">
        <CopyButton text={text} label="Copy data URL" />
        <CopyButton text={text.slice(text.indexOf(",") + 1)} label="Copy Base64 only" />
      </div>
    </div>
  );
}
