import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The company pages Phase C Task 7 writes but keeps planned: Trust, the Legal hub, the two legal
// drafts and the Safe-Use Kits page. Only the preview build (dist-preview/) has them;
// tests/e2e/prod-company.spec.mjs covers the live About, Contact and Resources pages in dist/.
const PAGES = ["/trust/", "/legal/", "/legal/privacy/", "/legal/website-terms/", "/resources/safe-use-kits/"];
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const path of PAGES) {
  test(`${path}: no axe violations in <main> at 390px and 1280px`, async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      await page.goto(path);
      const results = await new AxeBuilder({ page }).include("main").withTags(WCAG).analyze();
      expect(results.violations, `${path} at ${viewport.width}px`).toEqual([]);
    }
  });

  test(`${path}: no horizontal scroll at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(path);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
}
