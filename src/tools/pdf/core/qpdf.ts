import { PdfError } from "./errors";
import { looksLikePdf, MAX_PDF_BYTES, openPdf } from "./load";

// qpdf (Apache-2.0) compiled to WebAssembly (@neslinesli93/qpdf-wasm, ISC).
// Used only for AES-256 encryption and decryption, which pdf-lib can't do.
// Passwords are passed as program arguments in memory and never stored.

interface QpdfInstance {
  callMain(args: string[]): number;
  FS: { writeFile(path: string, data: Uint8Array): void; readFile(path: string): Uint8Array };
}
export type QpdfFactory = (opts: { locateFile: () => string; print: (s: string) => void; printErr: (s: string) => void }) => Promise<QpdfInstance>;

async function run(factory: QpdfFactory, wasmUrl: string, args: string[], input: Uint8Array) {
  // A fresh instance per job: no state carries over between files. Output is
  // discarded: it can contain file names or passwords.
  const q = await factory({ locateFile: () => wasmUrl, print: () => {}, printErr: () => {} });
  q.FS.writeFile("/in.pdf", input);
  let code: number;
  try {
    code = q.callMain(args);
  } catch (e) {
    code = typeof (e as { status?: number }).status === "number" ? (e as { status: number }).status : 2;
  }
  let out: Uint8Array | null = null;
  try {
    out = q.FS.readFile("/out.pdf");
  } catch {
    out = null;
  }
  return { code, out };
}

function check(bytes: Uint8Array) {
  if (bytes.byteLength > MAX_PDF_BYTES) throw new PdfError("too-large");
  if (!looksLikePdf(bytes)) throw new PdfError("not-pdf");
}

/** Encrypt with AES-256. Anyone with the password can open the file. */
export async function protectPdf(factory: QpdfFactory, wasmUrl: string, bytes: Uint8Array, password: string): Promise<Uint8Array> {
  if (!password) throw new PdfError("password-required");
  check(bytes);
  await openPdf(bytes); // throws "encrypted" or "damaged" first, with a clear message
  const r = await run(
    factory,
    wasmUrl,
    ["/in.pdf", "--encrypt", `--user-password=${password}`, `--owner-password=${password}`, "--bits=256", "--", "/out.pdf"],
    bytes,
  );
  // 0 = success, 3 = success with warnings.
  if ((r.code !== 0 && r.code !== 3) || !r.out) throw new PdfError("damaged");
  return r.out;
}

/**
 * Remove encryption, given the file's real password. An empty password is
 * refused, so restrictions can't be stripped from files without knowing it.
 */
export async function unlockPdf(factory: QpdfFactory, wasmUrl: string, bytes: Uint8Array, password: string): Promise<Uint8Array> {
  if (!password) throw new PdfError("password-required");
  check(bytes);
  // pdf-lib reads the file structure without the password: is it encrypted at all?
  const doc = await openPdf(bytes, { allowEncrypted: true });
  if (!doc.isEncrypted) throw new PdfError("not-encrypted");
  const r = await run(factory, wasmUrl, [`--password=${password}`, "--decrypt", "/in.pdf", "/out.pdf"], bytes);
  // The structure was readable, so a failure here means the password was rejected.
  if ((r.code !== 0 && r.code !== 3) || !r.out) throw new PdfError("wrong-password");
  return r.out;
}
