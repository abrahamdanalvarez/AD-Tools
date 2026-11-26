import { expect, test } from "@playwright/test";

test("production build loads from a plain static server", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Privora — Free, Private Online PDF, Image and File Tools");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Powerful tools. Private by design.");
});

test("makes no requests to other origins", async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const foreign: string[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.protocol.startsWith("http") && url.origin !== origin) foreign.push(req.url());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(foreign).toEqual([]);
});

test("stores nothing in browser storage on load", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const counts = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    cookies: document.cookie.length,
    idb: (await indexedDB.databases()).length,
    caches: (await caches.keys()).length,
  }));
  expect(counts).toEqual({ local: 0, session: 0, cookies: 0, idb: 0, caches: 0 });
});

test("brand assets and metadata are served", async ({ page, request }) => {
  await page.goto("/");
  for (const path of [
    "/favicon.ico",
    "/favicon.svg",
    "/apple-touch-icon.png",
    "/manifest.webmanifest",
    "/brand/og-image.png",
    "/brand/icon-192.png",
    "/brand/icon-512.png",
  ]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://tools.abrahamdan.com/brand/og-image.png",
  );
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.name).toBe("Privora");
});
