import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { choose, expect, open, pdf, run, test, unzip, type FileSpec } from "./fixtures";
import { extractImages } from "../src/tools/pdf/core/extract-images";
import { makePdf, pageWidth as W, photoJpg, tinyJpg, tinyPng, widths } from "../src/tools/pdf/core/fixtures";

// Every PDF tool, end to end, on synthetic files. Outputs are checked in Node
// with pdf-lib and pdf.js (page order, rotation, text that is still real,
// selectable text, images, encryption). Every test also proves that nothing
// was uploaded or stored.

async function pageTexts(bytes: Uint8Array): Promise<string[]> {
  const task = getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: FONTS });
  const doc = await task.promise;
  const out: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const c = await (await doc.getPage(n)).getTextContent();
    out.push(c.items.map((i) => ("str" in i ? i.str : "")).join(" ").replace(/\s+/g, " ").trim());
  }
  await task.destroy();
  return out;
}

async function photoPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 250]);
  page.drawImage(await doc.embedJpg(photoJpg()), { x: 0, y: 0, width: 400, height: 250 });
  page.drawImage(await doc.embedPng(tinyPng), { x: 300, y: 200, width: 20, height: 20 });
  page.drawText("Caption", { x: 10, y: 10, size: 12, font: await doc.embedFont(StandardFonts.Helvetica) });
  return doc.save();
}

// pdf.js in Node wants forward slashes and a trailing slash, even on Windows.
const FONTS = fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url)).replaceAll("\\", "/");

test.describe("organise", () => {
  test("merge PDF keeps order and real text", async ({ page }) => {
    await open(page, "merge-pdf", [pdf("a.pdf", await makePdf(2)), pdf("b.pdf", await makePdf(1))]);
    await expect(page.getByText("2 pages")).toBeVisible();
    // Reorder: move b.pdf to the top.
    await page.getByRole("button", { name: "Move b.pdf up" }).click();
    const out = await run(page, "Merge 2 PDFs");
    expect(out.name).toBe("merged.pdf");
    expect(await widths(out.bytes)).toEqual([W(1), W(1), W(2)]);
    expect((await pageTexts(out.bytes))[2]).toContain("Page 2");
  });

  test("split PDF by ranges into a ZIP", async ({ page }) => {
    await open(page, "split-pdf", [pdf("doc.pdf", await makePdf(4))]);
    await page.getByLabel("Ranges").fill("1-2, 3-");
    const out = await run(page, "Split PDF");
    expect(out.name).toBe("doc-split.zip");
    const files = unzip(out.bytes);
    expect(Object.keys(files).sort()).toEqual(["doc-pages-1-2.pdf", "doc-pages-3-4.pdf"]);
    expect(await widths(files["doc-pages-3-4.pdf"])).toEqual([W(3), W(4)]);
  });

  test("rotate, reorder, delete, extract, duplicate and reverse pages", async ({ page }) => {
    const src = await makePdf(3);

    await open(page, "rotate-pdf", [pdf("r.pdf", src)]);
    let out = await run(page, "Rotate PDF");
    expect((await PDFDocument.load(out.bytes)).getPages().map((p) => p.getRotation().angle)).toEqual([90, 90, 90]);

    await open(page, "reorder-pdf-pages", [pdf("o.pdf", src)]);
    await page.getByLabel("New page order").fill("3, 1, 2");
    out = await run(page, "Save new order");
    expect(await widths(out.bytes)).toEqual([W(3), W(1), W(2)]);

    await open(page, "delete-pdf-pages", [pdf("d.pdf", src)]);
    await page.getByLabel("Pages to delete").fill("2");
    out = await run(page, "Delete 1 page");
    expect(await widths(out.bytes)).toEqual([W(1), W(3)]);

    await open(page, "extract-pdf-pages", [pdf("e.pdf", src)]);
    await page.getByLabel("Pages to extract").fill("3, 1");
    out = await run(page, "Extract 2 pages");
    expect(await widths(out.bytes)).toEqual([W(3), W(1)]);
    expect(await pageTexts(out.bytes)).toEqual(["Page 3", "Page 1"]);

    await open(page, "duplicate-pdf-pages", [pdf("u.pdf", src)]);
    await page.getByLabel("Pages to duplicate").fill("1");
    await page.getByLabel("Copies of each page").fill("2");
    out = await run(page, "Duplicate pages");
    expect(await widths(out.bytes)).toEqual([W(1), W(1), W(1), W(2), W(3)]);

    await open(page, "reverse-pdf-pages", [pdf("v.pdf", src)]);
    out = await run(page, "Reverse page order");
    expect(await widths(out.bytes)).toEqual([W(3), W(2), W(1)]);
  });

  test("page selection by clicking thumbnails", async ({ page }) => {
    await open(page, "delete-pdf-pages", [pdf("t.pdf", await makePdf(3))]);
    await page.getByRole("button", { name: "Page 2", exact: true }).click();
    await expect(page.getByLabel("Pages to delete")).toHaveValue("2");
    const out = await run(page, "Delete 1 page");
    expect(await widths(out.bytes)).toEqual([W(1), W(3)]);
  });
});

test.describe("convert", () => {
  test("PDF to JPG renders each page", async ({ page }) => {
    await open(page, "pdf-to-jpg", [pdf("pics.pdf", await makePdf(2))]);
    await choose(page, "Resolution", /Screen/);
    const out = await run(page, "Convert to JPG");
    const files = unzip(out.bytes);
    expect(Object.keys(files).sort()).toEqual(["pics-page-1.jpg", "pics-page-2.jpg"]);
    expect([...files["pics-page-1.jpg"].subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  test("PDF to PNG at 150 DPI", async ({ page }) => {
    await open(page, "pdf-to-png", [pdf("one.pdf", await makePdf(1))]);
    const out = await run(page, "Convert to PNG");
    expect(out.name).toBe("one-page-1.png");
    expect(out.bytes.subarray(1, 4).toString()).toBe("PNG");
    expect(out.bytes.readUInt32BE(16)).toBe(Math.floor((W(1) * 150) / 72)); // IHDR width
  });

  test("JPG to PDF embeds the photo without re-encoding", async ({ page }) => {
    await open(page, "jpg-to-pdf", [{ name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from(tinyJpg()) }]);
    const out = await run(page, /Create PDF/);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPages().map((p) => [p.getWidth(), p.getHeight()])).toEqual([[30, 20]]);
    expect(Buffer.from((await extractImages(new Uint8Array(out.bytes))).images[0].bytes)).toEqual(Buffer.from(tinyJpg()));
  });

  test("PNG and mixed images to PDF, on A4", async ({ page }) => {
    await open(page, "png-to-pdf", [{ name: "dot.png", mimeType: "image/png", buffer: Buffer.from(tinyPng) }]);
    let out = await run(page, /Create PDF/);
    expect((await PDFDocument.load(out.bytes)).getPageCount()).toBe(1);

    await page.goto("/image-to-pdf/");
    const webp = await page.evaluate(() => {
      const c = document.createElement("canvas");
      c.width = 40;
      c.height = 60;
      const x = c.getContext("2d")!;
      x.fillStyle = "#16a34a";
      x.fillRect(0, 0, 40, 60);
      const url = c.toDataURL("image/webp");
      return url.startsWith("data:image/webp") ? url.split(",")[1] : null;
    });
    const files: FileSpec[] = [
      { name: "a.jpg", mimeType: "image/jpeg", buffer: Buffer.from(tinyJpg()) },
      { name: "b.png", mimeType: "image/png", buffer: Buffer.from(tinyPng) },
    ];
    if (webp) files.push({ name: "c.webp", mimeType: "image/webp", buffer: Buffer.from(webp, "base64") });
    await page.locator('input[type="file"]').first().setInputFiles(files);
    await expect(page.getByText("b.png")).toBeVisible();
    await choose(page, "Page size", "A4");
    out = await run(page, /Create PDF from/);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPageCount()).toBe(files.length);
    expect(Math.round(doc.getPage(0).getWidth())).toBe(842); // landscape A4 for a wide image
  });
});

test.describe("optimise and repair", () => {
  test("compress PDF shrinks photos and keeps text", async ({ page }) => {
    const src = await photoPdf();
    await open(page, "compress-pdf", [pdf("big.pdf", src)]);
    await choose(page, "Compression", /Strong/);
    const out = await run(page, "Compress PDF");
    expect(out.bytes.length).toBeLessThan(src.length * 0.8);
    await expect(page.getByText(/1 of 2 images re-compressed/)).toBeVisible();
    expect((await pageTexts(out.bytes))[0]).toContain("Caption");
  });

  test("repair PDF rebuilds a broken cross-reference table", async ({ page }) => {
    const plain = new TextDecoder("latin1").decode(await (await PDFDocument.load(await makePdf(3))).save({ useObjectStreams: false }));
    const broken = Buffer.from(plain.replace(/startxref\s+\d+/, "startxref\n999999"), "latin1");
    await open(page, "repair-pdf", [pdf("broken.pdf", broken)]);
    const out = await run(page, "Repair PDF");
    await PDFDocument.load(out.bytes, { throwOnInvalidObject: true });
    expect(await widths(out.bytes)).toEqual([W(1), W(2), W(3)]);
  });

  test("flatten PDF removes form fields, and explains when there are none", async ({ page }) => {
    await open(page, "flatten-pdf", [pdf("form.pdf", await makePdf(1, { form: true }))]);
    const out = await run(page, "Flatten 1 form field");
    expect((await PDFDocument.load(out.bytes)).getForm().getFields()).toHaveLength(0);

    await open(page, "flatten-pdf", [pdf("plain.pdf", await makePdf(1))]);
    await expect(page.getByText("This PDF has no form fields to flatten.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Flatten/ })).toBeDisabled();
  });
});

test.describe("edit", () => {
  test("watermark and page numbers are real text", async ({ page }) => {
    await open(page, "add-watermark-to-pdf", [pdf("w.pdf", await makePdf(2))]);
    await page.getByLabel("Watermark text").fill("DRAFT");
    let out = await run(page, "Add watermark");
    expect(await pageTexts(out.bytes)).toEqual(["Page 1 DRAFT", "Page 2 DRAFT"]);

    await open(page, "add-page-numbers-to-pdf", [pdf("n.pdf", await makePdf(3))]);
    await choose(page, "Format", "Page 1 of 10");
    out = await run(page, "Add page numbers");
    expect((await pageTexts(out.bytes))[1]).toContain("Page 2 of 3");
  });

  test("add text, placed with the keyboard", async ({ page }) => {
    await open(page, "add-text-to-pdf", [pdf("t.pdf", await makePdf(2))]);
    await page.getByLabel("Text", { exact: true }).fill("Hello Privora");
    await page.getByLabel("Page (1 to 2)").fill("2");
    const box = page.getByRole("group", { name: /Text position/ });
    await box.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("11% from the left")).toBeVisible();
    const out = await run(page, "Add text");
    const text = await pageTexts(out.bytes);
    expect(text[1]).toContain("Hello Privora");
    expect(text[0]).not.toContain("Hello");
  });

  test("add image and visual signature", async ({ page }) => {
    await open(page, "add-image-to-pdf", [pdf("i.pdf", await makePdf(1))]);
    await page.getByLabel("Image (PNG or JPG)").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from(tinyPng) });
    let out = await run(page, "Add image");
    expect((await extractImages(new Uint8Array(out.bytes))).images).toHaveLength(1);

    await open(page, "sign-pdf", [pdf("contract.pdf", await makePdf(2))]);
    await expect(page.getByRole("status").filter({ hasText: "not a cryptographic digital signature" })).toBeVisible();
    await page.getByRole("tab", { name: "Type" }).click();
    await page.getByLabel("Type your name").fill("Ada Lovelace");
    await expect(page.getByRole("group", { name: /Signature position/ })).toBeVisible();
    out = await run(page, "Sign PDF");
    const { images } = await extractImages(new Uint8Array(out.bytes));
    expect(images.map((i) => i.name)).toEqual(["page-2-image-1.png"]);
  });

  test("edit, view and remove metadata", async ({ page }) => {
    const src = await makePdf(1, { title: "Report" });
    await open(page, "pdf-metadata-viewer", [pdf("m.pdf", src)]);
    await expect(page.getByRole("heading", { name: "Metadata", exact: true })).toBeVisible();
    await expect(page.getByText("Report")).toBeVisible();
    await expect(page.getByText("Test Author")).toBeVisible();

    await open(page, "pdf-metadata-editor", [pdf("m.pdf", src)]);
    await expect(page.getByLabel("Title")).toHaveValue("Report");
    await page.getByLabel("Title").fill("Quarterly results");
    let out = await run(page, "Save metadata");
    expect((await PDFDocument.load(out.bytes)).getTitle()).toBe("Quarterly results");

    await open(page, "remove-pdf-metadata", [pdf("m.pdf", src)]);
    out = await run(page, "Remove metadata");
    const clean = await PDFDocument.load(out.bytes, { updateMetadata: false });
    expect([clean.getTitle(), clean.getAuthor(), clean.getProducer(), clean.getCreationDate()]).toEqual([undefined, undefined, undefined, undefined]);
  });
});

test.describe("read and inspect", () => {
  test("extract text and images", async ({ page }) => {
    await open(page, "extract-pdf-text", [pdf("words.pdf", await makePdf(2))]);
    const out = await run(page, "Extract text");
    expect(out.bytes.toString("utf8")).toBe("--- Page 1 ---\nPage 1\n\n--- Page 2 ---\nPage 2");
    await expect(page.getByLabel("Extracted text")).toHaveValue(/Page 2/);

    await open(page, "extract-pdf-images", [pdf("photos.pdf", await photoPdf())]);
    const zip = unzip((await run(page, "Extract images")).bytes);
    expect(Object.keys(zip).sort()).toEqual(["page-1-image-1.jpg", "page-1-image-2.png"]);
    expect(Buffer.from(zip["page-1-image-1.jpg"])).toEqual(Buffer.from(photoJpg()));
  });

  test("text extraction explains scanned PDFs", async ({ page }) => {
    const doc = await PDFDocument.create();
    doc.addPage([200, 200]).drawImage(await doc.embedPng(tinyPng), { x: 0, y: 0, width: 200, height: 200 });
    await open(page, "extract-pdf-text", [pdf("scan.pdf", await doc.save())]);
    await page.getByRole("button", { name: "Extract text" }).click();
    await expect(page.getByRole("alert")).toContainText("need OCR");
  });

  test("page counter, information and preview", async ({ page }) => {
    await open(page, "pdf-page-counter", [pdf("a.pdf", await makePdf(2)), pdf("b.pdf", await makePdf(3))]);
    await page.getByRole("button", { name: "Count pages in 2 files" }).click();
    await expect(page.getByRole("heading", { name: "5 pages in 2 files" })).toBeVisible();

    await open(page, "pdf-info", [pdf("info.pdf", await makePdf(3, { form: true }))]);
    await expect(page.getByRole("heading", { name: "Document information" })).toBeVisible();
    await expect(page.getByText(`${W(1)} × 300 pt`)).toBeVisible();

    await open(page, "pdf-preview", [pdf("view.pdf", await makePdf(3))]);
    await expect(page.getByRole("heading", { name: "3 pages" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Page 3" })).toBeVisible();
  });
});

test.describe("passwords", () => {
  test("protect, then unlock only with the right password", async ({ page }) => {
    const src = await makePdf(2);
    await open(page, "protect-pdf", [pdf("secret.pdf", src)]);
    await page.getByLabel("Password", { exact: true }).fill("s3cret pass");
    await page.getByLabel("Confirm password").fill("nope");
    await expect(page.getByText("The passwords don't match.")).toBeVisible();
    await page.getByLabel("Confirm password").fill("s3cret pass");
    const locked = await run(page, "Protect PDF");
    expect((await PDFDocument.load(locked.bytes, { ignoreEncryption: true })).isEncrypted).toBe(true);
    await expect(getDocument({ data: new Uint8Array(locked.bytes) }).promise).rejects.toThrow(/password/i);

    // Other tools refuse it with a clear message.
    await page.goto("/merge-pdf/");
    await page.locator('input[type="file"]').first().setInputFiles([pdf("secret-protected.pdf", locked.bytes)]);
    await expect(page.getByRole("alert")).toContainText("password protected");

    await open(page, "unlock-pdf", [pdf("secret-protected.pdf", locked.bytes)]);
    await page.getByLabel("PDF password").fill("wrong");
    await page.getByRole("button", { name: "Unlock PDF" }).click();
    await expect(page.getByRole("alert")).toContainText("not correct");
    await page.getByLabel("PDF password").fill("s3cret pass");
    const open_ = await run(page, "Unlock PDF");
    expect((await PDFDocument.load(open_.bytes)).isEncrypted).toBe(false);
    expect(await widths(open_.bytes)).toEqual([W(1), W(2)]);
  });
});

test.describe("validation", () => {
  test("rejects files that aren't PDFs, even with a .pdf name", async ({ page }) => {
    await page.goto("/split-pdf/");
    await page.locator('input[type="file"]').first().setInputFiles([pdf("fake.pdf", new TextEncoder().encode("hello"))]);
    await expect(page.getByRole("alert")).toContainText("isn't a PDF");
    await page.locator('input[type="file"]').first().setInputFiles([{ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") }]);
    await expect(page.getByRole("alert")).toContainText("Unsupported file type");
  });

  test("cancel returns to the settings and start over clears everything", async ({ page }) => {
    await open(page, "pdf-to-png", [pdf("long.pdf", await makePdf(40))]);
    await choose(page, "Resolution", /Print/);
    await page.getByRole("button", { name: "Convert to PNG" }).click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Convert to PNG" })).toBeVisible();
    await page.getByRole("button", { name: "Choose another file" }).click();
    await expect(page.getByRole("button", { name: "Choose file" })).toBeVisible();
    await expect(page.getByText("long.pdf")).toHaveCount(0);
  });
});
