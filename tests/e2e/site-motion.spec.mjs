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
  const artwork = page.locator("[data-workflow-artwork]");
  await artwork.scrollIntoViewIfNeeded();
  await expect(artwork).toHaveAttribute("data-workflow-motion", "paused");
  await expect(artwork).toHaveAttribute("data-workflow-phase", "review");
  await expect(page.locator("[data-workflow-toggle]")).toBeHidden();
  expect(await artwork.evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0);
});

test("without site JavaScript, the artwork and all sections remain visible", async ({ page }) => {
  await withoutScripts(page, "/");
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\bno-js\b/);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator('[data-business-artwork="hero"] img')).toBeVisible();
  await expect(page.locator("[data-workflow-artwork]")).toHaveAttribute("data-workflow-phase", "review");
  await expect(page.locator("[data-workflow-toggle]")).toBeHidden();
  await page.locator("#industries-heading").scrollIntoViewIfNeeded();
  await expect(page.locator("#industries-heading")).toBeVisible();
});

test("the sample workflow waits for approval before updating systems", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto("/");
  const artwork = page.locator("[data-workflow-artwork]");
  await artwork.scrollIntoViewIfNeeded();
  await expect(artwork).toHaveAttribute("data-workflow-motion", "running");
  await expect(artwork).toHaveAttribute("data-workflow-phase", "extract", { timeout: 5000 });
  await expect(page.locator('[data-workflow-node="0"]')).toHaveAttribute("data-state", "complete");
  await expect(artwork).toHaveAttribute("data-workflow-phase", "review", { timeout: 7000 });
  await expect(page.locator('[data-workflow-node="3"]')).toHaveAttribute("data-state", "waiting");
  await expect(page.locator('[data-workflow-node="4"]')).toHaveAttribute("data-state", "pending");
  await expect(page.locator("[data-run-status]")).toHaveText("Awaiting review");
  await expect(artwork).toHaveAttribute("data-workflow-phase", "approved", { timeout: 6500 });
  await expect(page.locator('[data-workflow-activity="2"] [data-activity-status]')).toHaveText("Approved");
  await expect(artwork).toHaveAttribute("data-workflow-phase", "update", { timeout: 4000 });
  await expect(page.locator('[data-workflow-node="3"]')).toHaveAttribute("data-state", "complete");
  await expect(artwork).toHaveAttribute("data-workflow-phase", "complete", { timeout: 4000 });
  await expect(page.locator('[data-workflow-node="4"]')).toHaveAttribute("data-state", "complete");
});

test("keyboard pause freezes the run and leaving the viewport suspends it", async ({ page }) => {
  await page.goto("/");
  const artwork = page.locator("[data-workflow-artwork]");
  const toggle = page.locator("[data-workflow-toggle]");
  await artwork.scrollIntoViewIfNeeded();
  await expect(artwork).toHaveAttribute("data-workflow-motion", "running");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggle).toHaveText("Resume animation");
  const phase = await artwork.getAttribute("data-workflow-phase");
  await page.waitForTimeout(2200);
  await expect(artwork).toHaveAttribute("data-workflow-phase", phase);
  await expect(artwork).toHaveAttribute("data-workflow-motion", "paused");
  await page.keyboard.press("Enter");
  await expect(artwork).toHaveAttribute("data-workflow-motion", "running");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await page.locator("#industries-heading").scrollIntoViewIfNeeded();
  await expect(artwork).toHaveAttribute("data-workflow-motion", "paused");
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
