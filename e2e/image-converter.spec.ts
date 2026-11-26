import { expect, test, type Page } from "@playwright/test";

/** Makes a small PNG with a transparent area, inside the browser. */
async function makePng(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 40;
    c.height = 30;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(0, 0, 20, 30);
    return c.toDataURL("image/png");
  });
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

test("converts PNG to JPG locally and downloads it, with no network upload", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const sent: string[] = [];
  page.on("request", (req) => {
    if (req.method() !== "GET" || new URL(req.url()).origin !== origin) sent.push(`${req.method()} ${req.url()}`);
  });

  await page.goto("/image-converter/");
  const png = await makePng(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "holiday.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("holiday.png")).toBeVisible();

  await page.getByRole("combobox", { name: "Convert to" }).click();
  await page.getByRole("option", { name: "JPG" }).click();
  await page.getByRole("button", { name: "Convert to JPG" }).click();

  await expect(page.getByRole("heading", { name: "Your image is ready" })).toBeVisible();
  await expect(page.getByText(/holiday\.jpg · 40 × 30/)).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download JPG" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("holiday.jpg");
  const bytes = await (await download.createReadStream()).toArray();
  const buf = Buffer.concat(bytes);
  expect(buf.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff])); // JPEG signature

  expect(sent).toEqual([]);
  const stored = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    idb: (await indexedDB.databases()).length,
    caches: (await caches.keys()).length,
  }));
  expect(stored).toEqual({ local: 0, session: 0, idb: 0, caches: 0 });

  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("button", { name: "Choose file" })).toBeVisible();
});

// Support is detected at runtime, not by browser name: the option must appear
// exactly when this browser can really encode WebP (Playwright's WebKit build
// can; Apple's Safari historically cannot).
test("offers WebP only where the browser can create it", async ({ page }) => {
  await page.goto("/image-converter/");
  const canEncode = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    return c.toDataURL("image/webp").startsWith("data:image/webp");
  });
  await page.locator('input[type="file"]').setInputFiles({ name: "a.png", mimeType: "image/png", buffer: await makePng(page) });
  await page.getByRole("combobox", { name: "Convert to" }).click();
  const webp = page.getByRole("option", { name: "WebP" });
  if (!canEncode) {
    await expect(webp).toHaveCount(0);
  } else {
    await webp.click();
    await page.getByRole("button", { name: "Convert to WebP" }).click();
    await expect(page.getByText(/a\.webp · 40 × 30/)).toBeVisible();
  }
});

test("rejects unsupported files with a clear message", async ({ page }) => {
  await page.goto("/image-converter/");
  await page.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hi") });
  await expect(page.getByRole("alert")).toContainText("Unsupported file type");
});

test("reports a damaged image instead of failing silently", async ({ page }) => {
  await page.goto("/image-converter/");
  // Checked as soon as it's chosen, before any settings are shown.
  await page.locator('input[type="file"]').setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
  await expect(page.getByRole("alert")).toContainText("could not be opened");
});
