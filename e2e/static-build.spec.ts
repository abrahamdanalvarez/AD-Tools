import { expect, test } from "@playwright/test";

test("production build loads from a plain static server", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Privora/);
  await expect(page.getByRole("heading", { name: "Privora" })).toBeVisible();
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
