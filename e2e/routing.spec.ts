import { expect, test } from "@playwright/test";

test("tool page loads directly and survives a refresh", async ({ page }) => {
  const res = await page.goto("/image-converter/");
  expect(res?.status()).toBe(200);
  await expect(page).toHaveTitle("Image Converter — Free & Private Online Tool | Privora");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Image Converter");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Image Converter");
});

test("tool page HTML carries its own SEO tags before JavaScript runs", async ({ request }) => {
  const html = await (await request.get("/image-converter/")).text();
  expect(html).toContain("<title>Image Converter — Free &amp; Private Online Tool | Privora</title>");
  expect(html).toContain('<link rel="canonical" href="https://tools.abrahamdan.com/image-converter/"');
});

test("missing trailing slash redirects like Apache", async ({ request }) => {
  const res = await request.get("/image-converter", { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(res.headers()["location"]).toBe("/image-converter/");
});

test("unknown and planned pages return a real 404 page", async ({ page }) => {
  for (const path of ["/does-not-exist/", "/ocr-pdf/"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  }
});

test("sitemap and robots list only real pages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain("https://tools.abrahamdan.com/image-converter/");
  expect(xml).not.toContain("ocr-pdf");
  expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap: https://tools.abrahamdan.com/sitemap.xml");
});

test("search finds a tool and its link works", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("Find a tool...").fill("webp");
  await page.getByRole("link", { name: /Image Converter/ }).first().click();
  await expect(page).toHaveURL(/\/image-converter\/$/);
});

test("every footer and header link resolves", async ({ page, request }) => {
  await page.goto("/");
  const hrefs = await page.locator("header a, footer a").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
  for (const href of new Set(hrefs)) {
    if (href.startsWith("http")) continue; // external: abrahamdan.com
    const path = href.split("#")[0] || "/";
    expect((await request.get(path)).status(), href).toBe(200);
  }
});
