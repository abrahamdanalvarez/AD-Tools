// File tools (ZIP creator and extractor, checksums) and the QR code reader,
// on the shared file shell. Files are read locally; nothing is uploaded.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { downloadBlob, formatBytes } from "@/lib/files";
import { imageErrorMessages } from "@/tools/image/core/errors";
import { decodeImage } from "@/tools/image/decode";
import { context, makeCanvas } from "@/tools/image/render";
import { withImages } from "@/tools/image/ui/configs";
import { CopyButton } from "@/tools/image/ui/picker";
import type { PdfToolConfig } from "@/tools/pdf/ui/shell";
import { HASH_LABELS, WEAK, hashFile, type HashAlgorithm } from "@/tools/text/core/hash";
import { Check, Row, SelectField, TextInput } from "@/tools/text/ui/fields";
import { Rows } from "@/tools/text/ui/shell";
import { createZip, entryFileName, extractEntry, listZip, ZipError, type ZipEntry } from "./zip";

type Config<S> = PdfToolConfig<S>;

const fileErrors: Record<string, string> = {
  unknown: "Something went wrong reading this file. Try again, or try another file.",
  "read-failed": "The file couldn't be read. It may have been moved or deleted, or it's too large for this browser.",
};

/** A file that can't be read (moved, deleted, too large) gets its own message. */
const readError = (err: unknown) => Promise.reject(err instanceof Error && err.name === "NotReadableError" ? new Error("read-failed") : err);

// ── ZIP creator ──────────────────────────────────────────────────────────────

interface ZipS {
  level: "0" | "6" | "9";
  name: string;
}

const zipCreator: Config<ZipS> = {
  inspect: false,
  multiple: true,
  minFiles: 1,
  errors: fileErrors,
  initial: () => ({ level: "6", name: "archive" }),
  Settings: ({ s, set }) => (
    <>
      <SelectField
        label="Compression"
        value={s.level}
        options={[
          { value: "6", label: "Normal" },
          { value: "9", label: "Smallest (slower)" },
          { value: "0", label: "None (fastest, for photos and videos)" },
        ]}
        onChange={(level) => set({ level })}
      />
      <TextInput label="ZIP file name" value={s.name} onChange={(name) => set({ name })} suffix=".zip" />
    </>
  ),
  validate: (s, ctx) => {
    const total = ctx.files.reduce((n, f) => n + f.file.size, 0);
    if (total > 2 * 1024 ** 3) return "These files add up to more than 2 GB, which is too much to zip in a browser.";
    return s.name.trim() ? null : "Enter a name for the ZIP file.";
  },
  action: (_, ctx) => `Create ZIP (${ctx.files.length} ${ctx.files.length === 1 ? "file" : "files"})`,
  working: "Creating your ZIP…",
  run: async (s, ctx, job) => {
    const blob = await createZip(
      ctx.files.map((f) => f.file),
      Number(s.level) as 0 | 6 | 9,
      job,
    ).catch(readError);
    const before = ctx.files.reduce((n, f) => n + f.file.size, 0);
    return {
      files: [{ name: `${entryFileName(s.name.trim())}.zip`, blob }],
      summary: `${ctx.files.length} ${ctx.files.length === 1 ? "file" : "files"}, ${formatBytes(before)} → ${formatBytes(blob.size)}`,
      preview: "none",
    };
  },
};

// ── ZIP extractor ────────────────────────────────────────────────────────────

function ZipView({ data, entries }: { data: Uint8Array; entries: ZipEntry[] }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const files = entries.filter((e) => !e.dir);
  const total = files.reduce((n, e) => n + e.originalSize, 0);

  const save = async (e: ZipEntry) => {
    setBusy(e.name);
    try {
      downloadBlob(await extractEntry(data, e), entryFileName(e.name));
    } catch (err) {
      setErrors((x) => ({ ...x, [e.name]: err instanceof ZipError ? err.message : "This file couldn't be unpacked." }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">
        {files.length} {files.length === 1 ? "file" : "files"}, {formatBytes(total)} unpacked
      </h2>
      <p className="text-sm text-muted-foreground">Download the files you need. Folders in the archive aren't recreated: each file downloads on its own. Archives inside the archive aren't opened.</p>
      <div tabIndex={0} role="region" aria-label="Files in the archive" className="max-h-[32rem] overflow-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-2 font-medium">Name</th>
              <th className="p-2 text-right font-medium">Size</th>
              <th className="p-2 font-medium">
                <span className="sr-only">Download</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {files.map((e) => (
              <tr key={e.name} className="border-b border-border align-top">
                <td className="break-all p-2">
                  {e.name}
                  {(e.problem || errors[e.name]) && <p className="mt-1 text-xs text-error-text">{e.problem ?? errors[e.name]}</p>}
                </td>
                <td className="whitespace-nowrap p-2 text-right">{formatBytes(e.originalSize)}</td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="outline" disabled={!!e.problem || busy !== null} onClick={() => void save(e)} aria-label={`Download ${e.name}`}>
                    {busy === e.name ? "Unpacking…" : "Download"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const zipExtractor: Config<object> = {
  inspect: false,
  auto: true,
  errors: fileErrors,
  initial: () => ({}),
  action: () => "Open",
  working: "Reading the archive…",
  run: async (_, ctx) => {
    const data = new Uint8Array(await ctx.first.file.arrayBuffer().catch(readError));
    const entries = listZip(data);
    if (entries.every((e) => e.dir)) throw new ZipError("This archive is empty.");
    return { files: [], view: <ZipView data={data} entries={entries} /> };
  },
};

// ── Checksums ────────────────────────────────────────────────────────────────

const FILE_ALGOS: HashAlgorithm[] = ["sha256", "sha512", "sha1", "md5", "crc32"];

interface SumS {
  algos: Record<HashAlgorithm, boolean>;
  expected: string;
}

function SumView({ sums, expected }: { sums: Record<string, string>; expected: string }) {
  const want = expected.trim().toLowerCase().replace(/^[a-z0-9-]+[:=]\s*/, "");
  const match = want ? Object.entries(sums).find(([, v]) => v === want) : undefined;
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">Checksums</h2>
      {want &&
        (match ? (
          <Alert tone="success" title={`Match: the ${HASH_LABELS[match[0] as HashAlgorithm]} checksum is the same as the one you entered.`} />
        ) : (
          <Alert tone="error" title="No match. None of the checksums equals the one you entered.">
            The file may be damaged or different, or the expected checksum uses another algorithm.
          </Alert>
        ))}
      <Rows rows={Object.entries(sums).map(([k, v]) => [`${HASH_LABELS[k as HashAlgorithm]}${WEAK.has(k as HashAlgorithm) ? " (weak)" : ""}`, v])} copy />
    </div>
  );
}

const checksum: Config<SumS> = {
  inspect: false,
  errors: fileErrors,
  initial: () => ({ algos: { sha256: true, sha512: false, sha1: false, md5: true, crc32: false, sha384: false, "sha3-256": false, "sha3-512": false }, expected: "" }),
  Settings: ({ s, set }) => (
    <>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Algorithms</legend>
        <Row>
          {FILE_ALGOS.map((a) => (
            <Check key={a} label={HASH_LABELS[a]} checked={s.algos[a]} onChange={(v) => set({ algos: { ...s.algos, [a]: v } })} />
          ))}
        </Row>
      </fieldset>
      <TextInput label="Expected checksum (optional, to compare)" value={s.expected} onChange={(expected) => set({ expected })} className="font-mono sm:w-[28rem]" />
    </>
  ),
  validate: (s) => (FILE_ALGOS.some((a) => s.algos[a]) ? null : "Choose at least one algorithm."),
  action: () => "Calculate checksums",
  working: "Reading the file…",
  run: async (s, ctx, job) => {
    const sums = await hashFile(
      ctx.first.file,
      FILE_ALGOS.filter((a) => s.algos[a]),
      job,
    ).catch(readError);
    return { files: [], view: <SumView sums={sums} expected={s.expected} /> };
  },
};

// ── QR code reader ───────────────────────────────────────────────────────────

/** Tries the image as is, then inverted (light codes on dark backgrounds). */
async function readQr(file: Blob): Promise<string | null> {
  const bitmap = await decodeImage(file);
  // Large photos are scaled down: QR codes don't need more than about 2,000 px.
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const c = makeCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
  const g = context(c);
  g.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  const img = g.getImageData(0, 0, c.width, c.height);
  c.width = c.height = 0;
  const { default: jsQR } = await import("jsqr");
  return jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

function QrResult({ text }: { text: string }) {
  const isLink = /^https?:\/\/\S+$/i.test(text.trim());
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">QR code content</h2>
      <pre tabIndex={0} aria-label="QR code content" className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-md border border-border bg-background p-3 font-mono text-sm">{text}</pre>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={text} label="Copy" />
        {isLink && (
          <a href={text.trim()} target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer" className="text-sm font-medium text-primary-text underline">
            Open link
          </a>
        )}
      </div>
      {isLink && <p className="text-sm text-muted-foreground">Check the address before opening it: QR codes are sometimes used to hide scam links.</p>}
    </div>
  );
}

const qrReader: Config<object> = withImages({
  auto: true,
  errors: { ...imageErrorMessages, "no-qr": "No QR code was found. Try a sharper, closer image with the whole code visible." },
  initial: () => ({}),
  action: () => "Read",
  working: "Looking for a QR code…",
  run: async (_, ctx) => {
    const text = await readQr(ctx.first.file);
    if (text === null) throw new Error("no-qr");
    return { files: [], view: <QrResult text={text} /> };
  },
});

export const fileConfigs: Record<string, Config<any>> = { // eslint-disable-line @typescript-eslint/no-explicit-any
  "zip-file-creator": zipCreator,
  "zip-file-extractor": zipExtractor,
  "file-checksum-generator": checksum,
  "qr-code-reader": qrReader,
};
