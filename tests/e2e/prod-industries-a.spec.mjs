import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Phase C Task 4: the Government, Financial services and Accounting industry pages in the production
// build (dist/, prod-chromium only). Spec §11.5 check 12 (axe) at 390px and 1280px, a Designed around
// chip landing on its regulatory row in each mode, and 320px reflow.
const GOVERNMENT = "/industries/government/";
const PAGES = [GOVERNMENT, "/industries/financial-services/", "/industries/accounting/"];
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`the three industry pages have no axe violations at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    for (const path of PAGES) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations, path).toEqual([]);
    }
  });
}

// The row's top edge minus the sticky header's bottom edge: >= 0 when the header hides none of it.
const clearOfHeader = (row) =>
  row.evaluate((el) => Math.round(el.getBoundingClientRect().top - document.querySelector("body > header").getBoundingClientRect().bottom));

// Reduced motion makes the anchor scroll instant (global.css turns smooth scrolling off).
test.describe(() => {
  test.use({ reducedMotion: "reduce" });

  for (const [path, scope] of [[GOVERNMENT, "#state-designed-around"], ["/industries/financial-services/", "#designed-around"]]) {
    test(`a Designed around chip lands on its row, clear of the header, at 390px (${path})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);
      const chip = page.locator(`${scope} a[href^="#reg-"]`).first();
      const href = await chip.getAttribute("href");
      await chip.click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      const row = page.locator(`${href}[data-regulatory-row]`);
      await expect(row).toHaveCount(1);
      await expect(row).toBeInViewport();
      expect(await clearOfHeader(row)).toBeGreaterThanOrEqual(0);
    });
  }
});

test("at 320px no industry page scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
