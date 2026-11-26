// @vitest-environment node
import { unzlibSync } from "fflate";
import { PDFDict, PDFDocument, PDFName, PDFRawStream, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { compressPdf } from "./compress";
import { extractImages } from "./extract-images";
import { makePdf, pageWidth, photoJpg, tinyJpg, tinyPng, widths, withOrientation } from "./fixtures";
import { toUserSpace, visualOf } from "./geometry";
import { imagesToPdf, jpegOrientation } from "./images";
import { looksLikePdf, openPdf } from "./load";
import { flattenForms, inspectPdf, setMetadata, stripMetadata } from "./meta";
import {
  deletePages,
  duplicatePages,
  everyNPages,
  extractPages,
  mergePdfs,
  reorderPages,
  reversePages,
  rotatePages,
  splitPdf,
} from "./organize";
import { formatPages, parsePages, parseRangeGroups } from "./ranges";
import { repairPdf } from "./repair";
import { addImage, addPageNumbers, addText, addWatermark, numberLabel } from "./stamp";

const W = pageWidth;
const code = (p: Promise<unknown>) => p.then(() => "ok", (e: Error) => e.message);

/** Text of all content streams on a page, decompressed. */
async function pageText(bytes: Uint8Array, index: number): Promise<string> {
  const doc = await PDFDocument.load(bytes);
  const contents = doc.getPage(index).node.Contents();
  const streams = contents && "asArray" in contents ? contents.asArray() : [contents];
  return streams
    .map((ref) => {
      const s = doc.context.lookup(ref as never);
      if (!(s instanceof PDFRawStream)) return "";
      const raw = s.dict.has(PDFName.of("Filter")) ? unzlibSync(s.contents) : s.contents;
      return new TextDecoder("latin1").decode(raw);
    })
    .join("\n");
}
/** pdf-lib writes standard-font text as hex strings. */
const hex = (s: string) => `<${[...s].map((c) => c.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase()).join("")}>`;

describe("page ranges", () => {
  it("parses single pages, ranges, open ranges and reverse ranges", () => {
    expect(parseRangeGroups("1-3, 5, 8-", 10)).toEqual([[0, 1, 2], [4], [7, 8, 9]]);
    expect(parseRangeGroups("3-1", 3)).toEqual([[2, 1, 0]]);
    expect(parsePages("2, 1-2", 5)).toEqual([1, 0]);
  });
  it("rejects nonsense and out-of-range pages", () => {
    for (const bad of ["", "0", "4", "a", "1-x", "2--3", "-"]) expect(() => parsePages(bad, 3), bad).toThrow("range");
  });
  it("formats indexes compactly", () => {
    expect(formatPages([4, 0, 1, 2])).toBe("1-3, 5");
  });
});

describe("loading", () => {
  it("detects PDFs by their header, not their name", async () => {
    expect(looksLikePdf(await makePdf(1))).toBe(true);
    expect(looksLikePdf(new TextEncoder().encode("hello"))).toBe(false);
    expect(await code(openPdf(new TextEncoder().encode("not a pdf")))).toBe("not-pdf");
  });
  it("reports damaged files instead of crashing", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\n1 0 obj << /Type /Catalog >> garbage");
    expect(await code(openPdf(bytes))).toMatch(/damaged|empty/);
  });
});

describe("organise pages", () => {
  it("merges in order and keeps text", async () => {
    const out = await mergePdfs([await makePdf(2), await makePdf(1)]);
    expect(await widths(out)).toEqual([W(1), W(2), W(1)]);
    expect(await pageText(out, 1)).toContain(hex("Page 2"));
  });
  it("splits into groups and every N pages", async () => {
    const src = await makePdf(5);
    const parts = await splitPdf(src, parseRangeGroups("1-2, 4", 5));
    expect(await Promise.all(parts.map(widths))).toEqual([[W(1), W(2)], [W(4)]]);
    expect(everyNPages(5, 2)).toEqual([[0, 1], [2, 3], [4]]);
  });
  it("extracts, deletes, reorders, reverses and duplicates", async () => {
    const src = await makePdf(4);
    expect(await widths(await extractPages(src, [3, 0]))).toEqual([W(4), W(1)]);
    expect(await widths(await deletePages(src, [1, 2]))).toEqual([W(1), W(4)]);
    expect(await widths(await reorderPages(src, [2, 0, 3, 1]))).toEqual([W(3), W(1), W(4), W(2)]);
    expect(await widths(await reversePages(src))).toEqual([W(4), W(3), W(2), W(1)]);
    expect(await widths(await duplicatePages(src, [0, 2]))).toEqual([W(1), W(1), W(2), W(3), W(3), W(4)]);
  });
  it("refuses to delete every page or use invalid orders", async () => {
    const src = await makePdf(2);
    expect(await code(deletePages(src, [0, 1]))).toBe("range");
    expect(await code(reorderPages(src, [0, 0]))).toBe("range");
    expect(await code(extractPages(src, [5]))).toBe("range");
  });
  it("rotates selected pages, adding to their existing rotation", async () => {
    const once = await rotatePages(await makePdf(2), 90, [1]);
    const twice = await rotatePages(once, 270);
    const doc = await PDFDocument.load(twice);
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([270, 0]);
  });
  it("keeps form fields when reordering in place", async () => {
    const out = await reorderPages(await makePdf(2, { form: true }), [1, 0]);
    expect((await PDFDocument.load(out)).getForm().getFields()).toHaveLength(1);
  });
});

describe("page geometry", () => {
  it("maps the visible bottom-left corner for every rotation", async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([200, 100]);
    const corners: Record<number, [number, number]> = { 0: [0, 0], 90: [200, 0], 180: [200, 100], 270: [0, 100] };
    for (const r of [0, 90, 180, 270] as const) {
      page.setRotation({ type: "degrees", angle: r } as never);
      const v = visualOf(page);
      expect([v.width, v.height]).toEqual(r % 180 ? [100, 200] : [200, 100]);
      const at = toUserSpace(page, 0, 0);
      expect([at.x, at.y, at.rotate]).toEqual([...corners[r], r]);
    }
  });
});

describe("stamps", () => {
  it("adds a watermark, page numbers and text as real (selectable) text", async () => {
    const src = await makePdf(3);
    const wm = await addWatermark(src, { text: "DRAFT", size: 0, opacity: 0.3, angle: 45, color: "#ff0000", pages: [0] });
    expect(await pageText(wm, 0)).toContain(hex("DRAFT"));
    expect(await pageText(wm, 1)).not.toContain(hex("DRAFT"));

    const nums = await addPageNumbers(src, { position: "bottom-center", format: "page-n-of-total", start: 1, size: 10, margin: 20 });
    expect(await pageText(nums, 2)).toContain(hex("Page 3 of 3"));

    const txt = await addText(src, { page: 1, x: 0.1, y: 0.1, text: "Hello\nWorld", size: 12, font: "times", color: "#000000" });
    const t = await pageText(txt, 1);
    expect(t).toContain(hex("Hello"));
    expect(t).toContain(hex("World"));
    expect(numberLabel("n-of-total", 2, 9)).toBe("2 / 9");
  });
  it("rejects text the standard fonts can't encode", async () => {
    expect(await code(addWatermark(await makePdf(1), { text: "日本", size: 20, opacity: 1, angle: 0, color: "#000000" }))).toBe("chars");
  });
  it("places an image on one page", async () => {
    const out = await addImage(await makePdf(2), { page: 1, x: 0.5, y: 0.5, width: 0.25, image: tinyPng, kind: "png" });
    const doc = await PDFDocument.load(out);
    const hasImage = (i: number) =>
      (doc.getPage(i).node.Resources()?.lookupMaybe(PDFName.of("XObject"), PDFDict)?.keys().length ?? 0) > 0;
    expect([hasImage(0), hasImage(1)]).toEqual([false, true]);
    expect(await code(addImage(await makePdf(1), { page: 0, x: 0, y: 0, width: 0.5, image: new Uint8Array(4), kind: "png" }))).toBe("image");
  });
});

describe("images to PDF", () => {
  it("makes one page per image, embedding JPEGs without re-encoding", async () => {
    const jpg = tinyJpg();
    const out = await imagesToPdf(
      [
        { bytes: jpg, kind: "jpg" },
        { bytes: tinyPng, kind: "png" },
      ],
      { pageSize: "fit", orientation: "auto", margin: 0 },
    );
    const doc = await PDFDocument.load(out);
    expect(doc.getPages().map((p) => [p.getWidth(), p.getHeight()])).toEqual([
      [30, 20],
      [2, 2],
    ]);
    const { images } = await extractImages(out);
    expect(images[0].bytes).toEqual(jpg); // byte-for-byte: no quality loss
  });
  it("uses A4 with automatic orientation and honours EXIF rotation", async () => {
    expect(jpegOrientation(withOrientation(tinyJpg(), 6))).toBe(6);
    expect(jpegOrientation(tinyJpg())).toBe(1);
    const out = await imagesToPdf([{ bytes: withOrientation(tinyJpg(), 6), kind: "jpg" }], { pageSize: "a4", orientation: "auto", margin: 36 });
    const [page] = (await PDFDocument.load(out)).getPages();
    // 30×20 rotated a quarter turn is taller than wide: portrait A4.
    expect([Math.round(page.getWidth()), Math.round(page.getHeight())]).toEqual([595, 842]);
  });
  it("reports unreadable images", async () => {
    expect(await code(imagesToPdf([{ bytes: new Uint8Array(10), kind: "jpg" }], { pageSize: "fit", orientation: "auto", margin: 0 }))).toBe("image");
  });
});

describe("metadata and forms", () => {
  it("reads document facts", async () => {
    const info = await inspectPdf(await makePdf(3, { title: "Report", form: true }));
    expect(info).toMatchObject({ pageCount: 3, encrypted: false, formFields: 1, firstPage: { width: W(1), height: 300 }, sameSizePages: false });
    expect(info.metadata?.title).toBe("Report");
  });
  it("edits and strips metadata", async () => {
    const src = await makePdf(1, { title: "Old" });
    const edited = await setMetadata(src, { title: "New", author: "Me", subject: "", keywords: "a, b", creator: "", producer: "" });
    expect((await inspectPdf(edited)).metadata).toMatchObject({ title: "New", author: "Me", keywords: "a b" });
    const stripped = await inspectPdf(await stripMetadata(edited));
    expect(stripped.metadata).toMatchObject({ title: "", author: "", keywords: "", producer: "" });
    expect(stripped.created).toBeNull();
  });
  it("flattens form fields and says when there are none", async () => {
    const flat = await flattenForms(await makePdf(1, { form: true }));
    expect((await PDFDocument.load(flat)).getForm().getFields()).toHaveLength(0);
    expect(await code(flattenForms(await makePdf(1)))).toBe("no-forms");
  });
});

describe("images inside PDFs", () => {
  async function pdfWithPhoto() {
    const doc = await PDFDocument.create();
    const img = await doc.embedJpg(photoJpg());
    const page = doc.addPage([400, 250]);
    page.drawImage(img, { x: 0, y: 0, width: 400, height: 250 });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    page.drawText("Caption", { x: 10, y: 10, font, size: 12 });
    page.drawImage(await doc.embedPng(tinyPng), { x: 300, y: 200, width: 20, height: 20 });
    return doc.save();
  }

  it("extracts JPEGs byte for byte and PNG-able images as PNG", async () => {
    const { images, skipped } = await extractImages(await pdfWithPhoto());
    expect(images.map((i) => i.name)).toEqual(["page-1-image-1.jpg", "page-1-image-2.png"]);
    expect(images[0].bytes).toEqual(photoJpg());
    expect([...images[1].bytes.subarray(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
    expect(skipped).toBe(0);
    expect(await code(extractImages(await makePdf(1)))).toBe("no-images");
  });

  it("recompresses photos only, keeping text", async () => {
    const src = await pdfWithPhoto();
    const fakeEncoder = async () => ({ bytes: tinyJpg(), width: 30, height: 20 });
    const res = await compressPdf(src, "balanced", fakeEncoder);
    expect(res.imagesRecompressed).toBe(1);
    expect(res.bytes.length).toBeLessThan(src.length);
    expect(await pageText(res.bytes, 0)).toContain(hex("Caption"));
  });

  it("returns the original when it can't be made smaller", async () => {
    const src = await makePdf(1);
    const res = await compressPdf(src, "strong", async () => null);
    expect(res.unchanged).toBe(true);
    expect(res.bytes).toBe(src);
  });
});

describe("repair", () => {
  it("rebuilds files with a broken cross-reference table", async () => {
    const doc = await PDFDocument.load(await makePdf(3));
    const s = new TextDecoder("latin1").decode(await doc.save({ useObjectStreams: false }));
    const broken = [
      s.replace(/startxref\s+\d+/, "startxref\n999999"),
      s.slice(0, s.indexOf("xref")) + "trailer\n<< /Root 1 0 R >>\n%%EOF",
      s.replace("%PDF-1.7", "%PDF-1.7\n%junk-shifts-every-offset"),
    ];
    for (const b of broken) {
      const bytes = Uint8Array.from(b, (c) => c.charCodeAt(0));
      const fixed = await repairPdf(bytes);
      expect(fixed.pageCount).toBe(3);
      expect(await widths(fixed.bytes)).toEqual([W(1), W(2), W(3)]);
    }
  });
  it("refuses non-PDFs", async () => {
    expect(await code(repairPdf(new TextEncoder().encode("hello")))).toBe("not-pdf");
  });
});
