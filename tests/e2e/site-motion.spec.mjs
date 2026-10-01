import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { withoutScripts } from "../support/no-scripts.mjs";

test.use({ reducedMotion: "no-preference", viewport: { width: 1280, height: 900 } });
test("section entrances finish with content fully readable", async ({ page }) => {
  await page.goto("/");
  await page.locator("#industries-heading").scrollIntoViewIfNeeded();
  const section = page.locator("#industries [data-section-header]");
  await expect(section).toHaveAttribute("data-motion-seen", "true");
  await expect.poll(() => section.evaluate(el => getComputedStyle(el).opacity)).toBe("1");
});

test("reduced motion leaves content accessible without entrance animations", async ({ page }) => {
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-site-motion", "paused");
  await page.locator("#services-heading").scrollIntoViewIfNeeded();
  await expect(page.locator("#services-heading")).toBeVisible();
  expect(await page.locator("#services [data-section-header]").evaluate(el => el.getAnimations().length)).toBe(0);
});

test("without site JavaScript, the artwork and all sections remain visible", async ({ page }) => {
  await withoutScripts(page, "/");
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\bno-js\b/);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator('[data-business-artwork="hero"] img')).toBeVisible();
  await page.locator("#industries-heading").scrollIntoViewIfNeeded();
  await expect(page.locator("#industries-heading")).toBeVisible();
});

test("the animated hero has no mobile overflow or accessibility violations", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  }
  const results = await new AxeBuilder({ page }).include("[data-page-hero]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});
