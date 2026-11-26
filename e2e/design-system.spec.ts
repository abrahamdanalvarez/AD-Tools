import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const viewports = {
  desktop: { width: 1280, height: 900 },
  mobile: { width: 375, height: 812 },
};

for (const [device, viewport] of Object.entries(viewports)) {
  for (const scheme of ["light", "dark"] as const) {
    test.describe(`${device} / ${scheme}`, () => {
      test.use({ viewport, colorScheme: scheme });

      test("renders with the right theme, no horizontal scroll, no axe violations", async ({ page }, info) => {
        await page.goto("/");
        await page.evaluate(() => document.fonts.ready);

        const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
        expect(isDark).toBe(scheme === "dark");

        const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
        expect(bg).toBe(scheme === "dark" ? "rgb(2, 6, 23)" : "rgb(248, 250, 252)");

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow).toBeLessThanOrEqual(0);

        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);

        await page.screenshot({ path: info.outputPath(`home-${device}-${scheme}.png`), fullPage: true });
      });
    });
  }
}

test("theme toggle switches theme and stores only the preference", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await page.evaluate(() => ({ ...localStorage }))).toEqual({ "privora-theme": "dark" });

  // Persists across reloads without a flash of the wrong theme.
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("keyboard: skip link comes first and reaches main content", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
});

test.describe("mobile navigation", () => {
  test.use({ viewport: viewports.mobile });

  test("menu opens and closes", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.click();
    await expect(page.locator("#mobile-nav")).toBeVisible();
    await page.locator("#mobile-nav").getByRole("link", { name: "Privacy" }).click();
    await expect(page.locator("#mobile-nav")).toBeHidden();
  });
});
