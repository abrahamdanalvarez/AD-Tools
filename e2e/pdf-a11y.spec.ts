import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { makePdf } from "../src/tools/pdf/core/fixtures";

// Accessibility of the interactive PDF tool states (settings with page
// thumbnails, placement editor, signature pad, results), light and dark,
// desktop and mobile.

const check = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "no horizontal scroll").toBeLessThanOrEqual(0);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
};

const pdfFile = async (pages: number) => ({ name: "doc.pdf", mimeType: "application/pdf", buffer: Buffer.from(await makePdf(pages)) });

for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${viewport.width}px ${colorScheme}`, () => {
      test.use({ viewport, colorScheme });

      test("page picker, placement editor, signature and result", async ({ page }) => {
        await page.goto("/delete-pdf-pages/");
        await page.locator('input[type="file"]').first().setInputFiles(await pdfFile(3));
        await expect(page.getByRole("button", { name: "Page 3", exact: true })).toBeVisible();
        await check(page);

        await page.goto("/reorder-pdf-pages/");
        await page.locator('input[type="file"]').first().setInputFiles(await pdfFile(3));
        await expect(page.getByRole("button", { name: "Move page 2 earlier" })).toBeVisible();
        await check(page);

        await page.goto("/sign-pdf/");
        await page.locator('input[type="file"]').first().setInputFiles(await pdfFile(1));
        await page.getByRole("tab", { name: "Type" }).click();
        await page.getByLabel("Type your name").fill("Ada");
        await expect(page.getByRole("group", { name: /Signature position/ })).toBeVisible();
        await check(page);

        await page.getByRole("button", { name: "Sign PDF" }).click();
        await expect(page.getByRole("button", { name: /^Download/ })).toBeVisible();
        await expect(page.getByRole("img", { name: "Preview of page 1" })).toBeVisible();
        await check(page);
      });
    });
  }
}
