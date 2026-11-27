import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { makePdf, photoJpg } from "../src/tools/pdf/core/fixtures";

// Accessibility of the interactive PDF and image tool states (page
// thumbnails, placement editor, signature pad, crop editor, colour picker,
// before/after results), light and dark, desktop and mobile.

const check = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "no horizontal scroll").toBeLessThanOrEqual(0);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
};

const photo = { name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from(photoJpg()) };
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

      test("crop editor, colour picker and before/after result", async ({ page }) => {
        await page.goto("/image-cropper/");
        await page.locator('input[type="file"]').first().setInputFiles(photo);
        await expect(page.getByRole("group", { name: /Crop area/ })).toBeVisible();
        await check(page);

        await page.goto("/image-colour-picker/");
        await page.locator('input[type="file"]').first().setInputFiles(photo);
        await expect(page.getByRole("button", { name: "Copy HEX" })).toBeVisible();
        await check(page);

        await page.goto("/image-compressor/");
        await page.locator('input[type="file"]').first().setInputFiles(photo);
        await page.getByRole("button", { name: "Compress image" }).click();
        await expect(page.getByRole("slider", { name: /Comparison position/ })).toBeVisible();
        await check(page);
      });

      test("AI background remover settings and result", async ({ page }) => {
        test.setTimeout(300_000);
        await page.goto("/remove-background/");
        await page.locator('input[type="file"]').first().setInputFiles(photo);
        await page.getByRole("combobox", { name: "Background" }).click();
        await page.getByRole("option", { name: "Solid colour" }).click();
        await expect(page.getByLabel("Background colour")).toBeVisible();
        await check(page);

        await page.getByRole("button", { name: "Remove background" }).click();
        await expect(page.getByRole("slider", { name: /Comparison position/ })).toBeVisible({ timeout: 240_000 });
        await check(page);
      });

      test("typed-input tools: results, errors, previews and tables", async ({ page }) => {
        await page.goto("/json-formatter/");
        await page.getByLabel("JSON", { exact: true }).fill('{"a":[1,2]}');
        await expect(page.getByLabel("Formatted JSON")).toBeVisible();
        await check(page);

        await page.getByLabel("JSON", { exact: true }).fill('{"a":');
        await expect(page.getByText("Check your input")).toBeVisible();
        await check(page);

        await page.goto("/regex-tester/");
        await page.getByLabel("Regular expression", { exact: true }).fill("(\\d+)");
        await page.getByLabel("Test text", { exact: true }).fill("a 12 b 345");
        await expect(page.getByText(/2 matches/)).toBeVisible();
        await check(page);

        for (const slug of ["markdown-editor", "text-diff-checker", "qr-code-generator", "loan-calculator", "css-gradient-generator", "password-generator"]) {
          await page.goto(`/${slug}/`);
          if (slug === "text-diff-checker") {
            await page.getByLabel("Original text").fill("the cat sat");
            await page.getByLabel("Changed text").fill("the dog sat");
          }
          if (slug === "qr-code-generator") await page.getByLabel("Text or link").fill("https://example.com");
          await expect(page.getByRole("region", { name: "Result" }).locator("dl, textarea, pre, table, svg, img, [role=img]").first()).toBeVisible();
          await check(page);
        }
      });

      test("ZIP extractor list", async ({ page }) => {
        const { zipSync, strToU8 } = await import("fflate");
        const zip = Buffer.from(zipSync({ "docs/readme.txt": strToU8("hi"), "photo.jpg": strToU8("x") }));
        await page.goto("/zip-file-extractor/");
        await page.locator('input[type="file"]').first().setInputFiles({ name: "a.zip", mimeType: "application/zip", buffer: zip });
        await expect(page.getByRole("button", { name: "Download docs/readme.txt" })).toBeVisible();
        await check(page);
      });
    });
  }
}
