import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Phase C Task 5 on the production build (dist/, prod-chromium only): the Education, Manufacturing
// and Real estate pages have no axe violations at 390px and 1280px (spec §11.5 check 12), each
// page's first Designed around chip lands on its regulatory-map row clear of the sticky header,
// and nothing scrolls sideways at 320px (WCAG 1.4.10).
const PAGES = ["/industries/education/", "/industries/manufacturing/", "/industries/real-estate/"];
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1280, height: 800 }];

for (const vp of VIEWPORTS) {
  test(`the Education, Manufacturing and Real estate pages have no axe violations at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    for (const path of PAGES) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations, path).toEqual([]);
    }
  });
}

// Reduced motion makes the anchor scroll instant (global.css turns smooth scrolling off).
test.describe(() => {
  test.use({ reducedMotion: "reduce" });

  for (const vp of VIEWPORTS) {
    test(`a Designed around chip lands on its regulatory-map row, clear of the header, at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      for (const path of PAGES) {
        await page.goto(path);
        const chip = page.locator("#designed-around-obligations a").first();
        const href = await chip.getAttribute("href");
        expect(href, path).toMatch(/^#reg-[a-z0-9-]+$/);
        await chip.click();
        await expect(page).toHaveURL(new RegExp(`${href}$`));
        const row = page.locator(`${href}[data-regulatory-row]`);
        await expect(row, path).toHaveCount(1);
        await expect(row, path).toBeInViewport();
        const gap = await row.evaluate((el) =>
          Math.round(el.getBoundingClientRect().top - document.querySelector("body > header").getBoundingClientRect().bottom));
        expect(gap, path).toBeGreaterThanOrEqual(0);
      }
    });
  }
});

test("at 320px none of the three pages scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
