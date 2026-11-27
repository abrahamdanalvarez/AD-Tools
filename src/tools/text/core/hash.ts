// Hashes with hash-wasm (WebAssembly embedded in its JS, nothing fetched).
// Files are read in chunks, so even large files never sit in memory whole.
import { CancelledError } from "@/lib/worker-bridge";

export type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha384" | "sha512" | "sha3-256" | "sha3-512" | "crc32";

export const HASH_LABELS: Record<HashAlgorithm, string> = {
  md5: "MD5",
  sha1: "SHA-1",
  sha256: "SHA-256",
  sha384: "SHA-384",
  sha512: "SHA-512",
  "sha3-256": "SHA3-256",
  "sha3-512": "SHA3-512",
  crc32: "CRC32",
};

/** Not safe against deliberate tampering. */
export const WEAK = new Set<HashAlgorithm>(["md5", "sha1", "crc32"]);

async function hasher(a: HashAlgorithm) {
  const h = await import("hash-wasm");
  switch (a) {
    case "md5":
      return h.createMD5();
    case "sha1":
      return h.createSHA1();
    case "sha256":
      return h.createSHA256();
    case "sha384":
      return h.createSHA384();
    case "sha512":
      return h.createSHA512();
    case "sha3-256":
      return h.createSHA3(256);
    case "sha3-512":
      return h.createSHA3(512);
    case "crc32":
      return h.createCRC32();
  }
}

/** Hashes the UTF-8 bytes of `text` with each algorithm. Lowercase hex. */
export async function hashText(text: string, algorithms: HashAlgorithm[]): Promise<Record<string, string>> {
  const bytes = new TextEncoder().encode(text);
  const out: Record<string, string> = {};
  for (const a of algorithms) {
    const h = await hasher(a);
    h.init();
    h.update(bytes);
    out[a] = h.digest("hex");
  }
  return out;
}

/** Streams the file once and feeds every chosen algorithm. */
export async function hashFile(
  file: Blob,
  algorithms: HashAlgorithm[],
  job: { signal?: AbortSignal; onProgress?: (p: number) => void } = {},
): Promise<Record<string, string>> {
  const hs = await Promise.all(algorithms.map(hasher));
  for (const h of hs) h.init();
  const reader = file.stream().getReader();
  let done = 0;
  try {
    for (;;) {
      if (job.signal?.aborted) throw new CancelledError();
      const { value, done: end } = await reader.read();
      if (end) break;
      for (const h of hs) h.update(value);
      done += value.byteLength;
      job.onProgress?.(file.size ? done / file.size : 1);
    }
  } finally {
    reader.releaseLock();
  }
  return Object.fromEntries(algorithms.map((a, i) => [a, hs[i].digest("hex")]));
}
