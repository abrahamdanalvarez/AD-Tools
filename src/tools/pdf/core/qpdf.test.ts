// @vitest-environment node
import createModule from "@neslinesli93/qpdf-wasm";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it } from "vitest";
import { makePdf, pageWidth, widths } from "./fixtures";
import { inspectPdf } from "./meta";
import { protectPdf, unlockPdf, type QpdfFactory } from "./qpdf";

const factory = createModule as unknown as QpdfFactory;
const wasm = fileURLToPath(new URL("../../../../node_modules/@neslinesli93/qpdf-wasm/dist/qpdf.wasm", import.meta.url));
const code = (p: Promise<unknown>) => p.then(() => "ok", (e: Error) => e.message);

// Emscripten sets process.exitCode when qpdf exits with an error (Node only).
afterEach(() => {
  process.exitCode = 0;
});

describe("password protection (qpdf)", () => {
  it("encrypts with AES-256 and unlocks with the right password only", async () => {
    const src = await makePdf(2);
    const password = "corr3ct horse 'battery'";
    const locked = await protectPdf(factory, wasm, src, password);
    expect((await inspectPdf(locked)).encrypted).toBe(true);
    expect(new TextDecoder("latin1").decode(locked)).toMatch(/\/V 5/); // AES-256 (V5, R6)

    expect(await code(unlockPdf(factory, wasm, locked, "wrong"))).toBe("wrong-password");
    expect(await code(unlockPdf(factory, wasm, locked, ""))).toBe("password-required");

    const open = await unlockPdf(factory, wasm, locked, password);
    expect((await PDFDocument.load(open)).isEncrypted).toBe(false);
    expect(await widths(open)).toEqual([pageWidth(1), pageWidth(2)]);
  });

  it("refuses an empty password and non-PDF input", async () => {
    expect(await code(protectPdf(factory, wasm, await makePdf(1), ""))).toBe("password-required");
    expect(await code(protectPdf(factory, wasm, new TextEncoder().encode("hello"), "x"))).toBe("not-pdf");
    expect(await code(unlockPdf(factory, wasm, await makePdf(1), "x"))).toBe("not-encrypted");
  });
});
