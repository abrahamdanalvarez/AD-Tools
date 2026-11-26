import { expect, test as base, type Page } from "@playwright/test";
import { unzipSync } from "fflate";

// Shared helpers for the tool specs. The auto `guard` fixture fails any test
// that uploads anything, contacts another origin, hits a missing file, or
// leaves anything in browser storage.

export { expect, type Page };

export type FileSpec = { name: string; mimeType: string; buffer: Buffer };
export const pdf = (name: string, bytes: Uint8Array): FileSpec => ({ name, mimeType: "application/pdf", buffer: Buffer.from(bytes) });

export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ page, baseURL }, use) => {
      const origin = new URL(baseURL!).origin;
      const bad: string[] = [];
      page.on("request", (r) => {
        const u = new URL(r.url());
        if (u.protocol === "blob:" || u.protocol === "data:") return;
        if (r.method() !== "GET" || u.origin !== origin) bad.push(`${r.method()} ${r.url()}`);
      });
      page.on("response", (r) => {
        if (r.status() >= 400 && new URL(r.url()).origin === origin) bad.push(`${r.status()} ${r.url()}`);
      });
      await use();
      expect(bad, "no uploads, foreign or failed requests").toEqual([]);
      const stored = await page.evaluate(async () => ({
        local: localStorage.length,
        session: sessionStorage.length,
        idb: (await indexedDB.databases?.())?.length ?? 0,
        caches: (await caches.keys()).length,
      }));
      expect(stored, "nothing persisted").toEqual({ local: 0, session: 0, idb: 0, caches: 0 });
    },
    { auto: true },
  ],
});

export async function open(page: Page, slug: string, files: FileSpec[]) {
  await page.goto(`/${slug}/`);
  await page.locator('input[type="file"]').first().setInputFiles(files);
  await expect(page.getByText(files[0].name)).toBeVisible();
}

export async function choose(page: Page, label: string | RegExp, option: string | RegExp) {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option }).click();
}

/** Click the action, wait for the result, download it. */
export async function run(page: Page, action: string | RegExp): Promise<{ name: string; bytes: Buffer }> {
  await page.getByRole("button", { name: action }).click();
  const button = page.getByRole("button", { name: /^Download/ });
  await expect(button).toBeVisible({ timeout: 30_000 });
  if (page.context().browser()?.browserType().name() === "firefox" && /WebP/.test((await button.textContent()) ?? "")) {
    // Firefox saves WebP files and then opens them from disk, which Playwright
    // reports as a closed page rather than a download. Capture the blob the app
    // hands to the download link instead (still the exact bytes the user gets).
    await page.evaluate(() => {
      HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        void fetch(this.href)
          .then((r) => r.arrayBuffer())
          .then((b) => Object.assign(window, { __saved: { name: this.download, bytes: [...new Uint8Array(b)] } }));
      };
    });
    await button.click();
    const saved = await (await page.waitForFunction(() => (window as unknown as { __saved?: unknown }).__saved)).jsonValue();
    const { name, bytes } = saved as { name: string; bytes: number[] };
    return { name, bytes: Buffer.from(bytes) };
  }
  const [download] = await Promise.all([page.waitForEvent("download"), button.click()]);
  const chunks = await (await download.createReadStream()).toArray();
  return { name: download.suggestedFilename(), bytes: Buffer.concat(chunks) };
}

export const unzip = (b: Buffer) => unzipSync(new Uint8Array(b));
