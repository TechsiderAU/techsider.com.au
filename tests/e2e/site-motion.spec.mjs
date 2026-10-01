import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { withoutScripts } from "../support/no-scripts.mjs";

test.use({ reducedMotion: "no-preference", viewport: { width: 1280, height: 900 } });
const signal = page => page.locator("[data-signal-field]");
const tile = page => signal(page).locator(".signal-tile").first();
const state = page => tile(page).evaluate(el => getComputedStyle(el).animationPlayState);
const time = page => tile(page).evaluate(el => el.getAnimations()[0]?.currentTime);

test("the visible pixel accent moves, and keyboard pause/resume keeps focus and controls the loop", async ({ page }) => {
  await page.goto("/");
  await signal(page).scrollIntoViewIfNeeded();
  await expect.poll(() => state(page)).toBe("running");
  const start = await time(page);
  await expect.poll(() => time(page)).not.toBe(start);
  const pause = page.getByRole("button", { name: "Pause motion" });
  await pause.focus();
  await pause.press("Space");
  const resume = page.getByRole("button", { name: "Resume motion" });
  await expect(resume).toBeFocused();
  await expect(resume).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => state(page)).toBe("paused");
  // Two samples prove the animation clock stays still while paused.
  const stopped = await time(page);
  await page.waitForTimeout(200);
  expect(await time(page)).toBe(stopped);
  await resume.press("Space");
  await expect.poll(() => state(page)).toBe("running");
  await expect.poll(() => time(page)).not.toBe(stopped);
});

test("the loop stops offscreen, while section entrances finish with content fully readable", async ({ page }) => {
  await page.goto("/");
  await signal(page).scrollIntoViewIfNeeded();
  await expect.poll(() => state(page)).toBe("running");
  await page.locator("#industries-heading").scrollIntoViewIfNeeded();
  await expect(signal(page)).toHaveAttribute("data-signal-visible", "false");
  await expect.poll(() => state(page)).toBe("paused");
  const section = page.locator("#industries [data-section-header]");
  await expect(section).toHaveAttribute("data-motion-seen", "true");
  await expect.poll(() => section.evaluate(el => getComputedStyle(el).opacity)).toBe("1");
  await signal(page).scrollIntoViewIfNeeded();
  await expect.poll(() => state(page)).toBe("running");
});

test("reduced motion stops the loop, removes decorative controls and leaves content accessible", async ({ page }) => {
  await page.goto("/");
  await signal(page).scrollIntoViewIfNeeded();
  await expect.poll(() => state(page)).toBe("running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-site-motion", "paused");
  await expect(page.locator("[data-motion-toggle]")).toBeHidden();
  expect(await tile(page).evaluate(el => el.getAnimations().length)).toBe(0);
  await page.locator("#services-heading").scrollIntoViewIfNeeded();
  await expect(page.locator("#services-heading")).toBeVisible();
  expect(await page.locator("#services [data-section-header]").evaluate(el => el.getAnimations().length)).toBe(0);
});

test("without site JavaScript, the artwork and all sections remain visible with a static accent", async ({ page }) => {
  await withoutScripts(page, "/");
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\bno-js\b/);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator('[data-business-artwork="hero"] img')).toBeVisible();
  await expect(page.locator("[data-motion-toggle]")).toBeHidden();
  expect(await tile(page).evaluate(el => el.getAnimations().length)).toBe(0);
  await page.locator("#industries-heading").scrollIntoViewIfNeeded();
  await expect(page.locator("#industries-heading")).toBeVisible();
});

test("the animated hero has no mobile overflow or accessibility violations", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await signal(page).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    expect((await page.locator("[data-motion-toggle]").boundingBox()).height).toBeGreaterThanOrEqual(44);
  }
  const results = await new AxeBuilder({ page }).include("[data-page-hero]").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);
});
