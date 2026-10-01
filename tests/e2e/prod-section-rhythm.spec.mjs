import { test, expect } from "@playwright/test";

// Section rhythm in the production build (dist/, prod-chromium only).
// - WB-13: a bone band that directly follows another bone band has no top padding, so the space
//   between two bone sections' content is one rhythm step (6rem from 64rem, 4rem below), not two.
//   A bone section that follows the carbon hero keeps its own top padding.
// - WB-5: the Government page's jurisdiction jump links sit one rhythm step above the
//   "Commonwealth" heading.
const STEP = { 390: 64, 1280: 96 };
const BONE_RUNS = ["/solutions/knowledge-assistant/", "/industries/government/", "/industries/accounting/", "/services/", "/about/"];

/** Each pair of sibling bone bands directly in the template: the second's top padding, and the space between their contents. */
const bonePairs = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-template] > .surface-bone + .surface-bone")].map((next) => {
      const prev = next.previousElementSibling;
      const padTop = parseFloat(getComputedStyle(next).paddingTop);
      const contentBottom = prev.getBoundingClientRect().bottom - parseFloat(getComputedStyle(prev).paddingBottom);
      return { ids: `#${prev.id} → #${next.id}`, padTop, gap: next.getBoundingClientRect().top + padTop - contentBottom };
    }),
  );

for (const width of [390, 1280]) {
  test(`two bone sections in a row are one rhythm step apart, and the first bone section keeps its padding, at ${width}px (WB-13)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of BONE_RUNS) {
      await page.goto(path);
      const pairs = await bonePairs(page);
      expect(pairs.length, `${path}: no bone sections in a row`).toBeGreaterThan(0);
      for (const { ids, padTop, gap } of pairs) {
        expect(padTop, `${path} ${ids}: top padding`).toBe(0);
        expect(gap, `${path} ${ids}: space between the sections' content`).toBeLessThanOrEqual(STEP[width] + 1);
      }
      const first = page.locator("[data-template] > .surface-bone").first();
      expect(await first.evaluate((el) => parseFloat(getComputedStyle(el).paddingTop)), `${path}: the first bone section`).toBe(STEP[width]);
    }
  });

  test(`Government: the jump links sit one rhythm step above the Commonwealth heading at ${width}px (WB-5)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/industries/government/");
    const jumps = await page.locator("#designed-around .ind-jumps").boundingBox();
    const heading = await page.locator("#commonwealth-heading").boundingBox();
    expect(heading.y - (jumps.y + jumps.height)).toBeLessThanOrEqual(STEP[width] + 1);
  });
}
