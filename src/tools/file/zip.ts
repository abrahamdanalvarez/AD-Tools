// ZIP reading and writing with fflate, guarded against archive bombs: entry
// count, total and per-file size and compression ratio are checked before
// anything is unpacked, and the real output is counted while it is inflated,
// because the sizes written in an archive can lie.
import { Unzip, UnzipInflate, UnzipPassThrough, unzipSync, Zip, ZipDeflate, ZipPassThrough } from "fflate";
import { CancelledError } from "@/lib/worker-bridge";
import { InputError } from "@/tools/text/core/encode";

export const LIMITS = {
  entries: 10_000,
  /** Largest single unpacked file (browsers struggle with bigger Blobs). */
  entryBytes: 1024 ** 3,
  /** All unpacked files together. */
  totalBytes: 4 * 1024 ** 3,
  /** Unpacked ÷ packed. Ordinary files rarely pass 100; bombs reach millions. */
  ratio: 1000,
  /** Ratio is only checked above this size, so tiny repetitive files are fine. */
  ratioFloor: 10 * 1024 ** 2,
};

export const ZipError = InputError;

export interface ZipEntry {
  name: string;
  /** Packed and declared unpacked sizes. */
  size: number;
  originalSize: number;
  method: number;
  dir: boolean;
  /** Why it can't be extracted, if it can't. */
  problem?: string;
}

/** Reads the archive's directory without unpacking anything. */
export function listZip(data: Uint8Array): ZipEntry[] {
  const entries: ZipEntry[] = [];
  try {
    unzipSync(data, {
      filter: (f) => {
        if (entries.length >= LIMITS.entries) throw new ZipError(`This archive has more than ${LIMITS.entries.toLocaleString("en-US")} files, so it isn't opened.`);
        entries.push({ name: f.name, size: f.size, originalSize: f.originalSize, method: f.compression, dir: f.name.endsWith("/") });
        return false;
      },
    });
  } catch (err) {
    if (err instanceof ZipError) throw err;
    throw new ZipError("This isn't a ZIP file, or it's damaged.");
  }
  let total = 0;
  for (const e of entries) {
    total += e.originalSize;
    if (e.method !== 0 && e.method !== 8) e.problem = "Uses a compression method browsers can't unpack (only Store and Deflate are supported).";
    else if (e.originalSize > LIMITS.entryBytes) e.problem = "Too large to unpack in a browser (over 1 GB).";
    else if (e.originalSize > LIMITS.ratioFloor && e.size > 0 && e.originalSize / e.size > LIMITS.ratio) e.problem = "Compressed suspiciously well (possible zip bomb), so it isn't unpacked.";
  }
  if (total > LIMITS.totalBytes) throw new ZipError("This archive would unpack to more than 4 GB, so it isn't opened. It may be a zip bomb.");
  return entries;
}

/** Unpacks one entry, stopping if the real output is bigger than declared or the limits. */
export function extractEntry(data: Uint8Array, entry: ZipEntry): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const cap = Math.min(entry.originalSize, LIMITS.entryBytes);
    const chunks: Uint8Array[] = [];
    let got = 0;
    let found = false;
    const unzip = new Unzip((file) => {
      if (file.name !== entry.name || found) return;
      found = true;
      file.ondata = (err, chunk, final) => {
        if (err) return reject(new ZipError("This file couldn't be unpacked. It may be damaged or password-protected."));
        got += chunk.length;
        if (got > cap) {
          file.terminate();
          return reject(new ZipError("This file unpacks to more than the archive says, so it was stopped (possible zip bomb)."));
        }
        chunks.push(chunk);
        if (final) resolve(new Blob(chunks as BlobPart[]));
      };
      file.start();
    });
    unzip.register(UnzipInflate);
    unzip.register(UnzipPassThrough);
    try {
      unzip.push(data, true);
    } catch {
      reject(new ZipError("This file couldn't be unpacked. It may be damaged or password-protected."));
    }
    if (!found) reject(new ZipError("This file wasn't found in the archive."));
  });
}

/** The last part of an entry's path, safe to use as a download name. */
export function entryFileName(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").filter((p) => p && p !== "." && p !== "..").pop() ?? "file";
  return base.replace(/[\u0000-\u001f<>:"|?*]/g, "_") || "file";
}


/** Unique names inside the archive: photo.jpg, photo-2.jpg… */
function uniqueName(name: string, taken: Set<string>) {
  let n = name, i = 2;
  while (taken.has(n)) n = name.replace(/(\.[^.]+)?$/, (ext) => `-${i++}${ext}`);
  taken.add(n);
  return n;
}

/** Streams files into a ZIP: each file is read in chunks, so it is never held twice. */
export async function createZip(files: File[], level: 0 | 6 | 9, job: { signal?: AbortSignal; onProgress?: (p: number) => void } = {}): Promise<Blob> {
  const out: Uint8Array[] = [];
  let failed: Error | null = null;
  const zip = new Zip((err, chunk) => {
    if (err) failed = err;
    else out.push(chunk);
  });
  const total = files.reduce((n, f) => n + f.size, 0) || 1;
  const taken = new Set<string>();
  let done = 0;
  for (const f of files) {
    const entry = level === 0 ? new ZipPassThrough(uniqueName(f.name, taken)) : new ZipDeflate(uniqueName(f.name, taken), { level });
    entry.mtime = f.lastModified;
    zip.add(entry);
    const reader = f.stream().getReader();
    for (;;) {
      if (job.signal?.aborted) {
        zip.terminate();
        throw new CancelledError();
      }
      const { value, done: end } = await reader.read();
      if (end) break;
      entry.push(value);
      done += value.byteLength;
      job.onProgress?.(done / total);
    }
    entry.push(new Uint8Array(0), true);
    if (failed) throw failed;
  }
  zip.end();
  if (failed) throw failed;
  return new Blob(out as BlobPart[], { type: "application/zip" });
}
