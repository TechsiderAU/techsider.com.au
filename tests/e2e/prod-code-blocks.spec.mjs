import { test, expect } from "@playwright/test";

// Code blocks in the production build (dist/, prod-chromium only; Phase B2 carry-over WB-8). The
// one post with a code block shows it as a carbon island in spec §6.1 colours, with no inline style
// to override them. At 320px the block scrolls sideways inside itself while the page doesn't, and
// the keyboard can scroll it: Shiki's tabindex="0" stays on the <pre>.
const POST = "/insights/evals-before-vibes/";
const RGB = { carbon: "rgb(11, 11, 12)", bone: "rgb(242, 241, 236)", acid: "rgb(200, 255, 46)", muted: "rgb(154, 154, 148)" };

test("the post's code block is carbon, with bone, acid and muted tokens only (WB-8)", async ({ page }) => {
  await page.goto(POST);
  const pre = page.locator("[data-prose] pre");
  await expect(pre).toHaveCount(1);
  expect(await pre.getAttribute("style")).toBeNull();
  expect(await pre.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(RGB.carbon);
  const colours = await pre.locator("span:not(.line)").evaluateAll((spans) => [...new Set(spans.map((s) => getComputedStyle(s).color))]);
  expect(colours.sort()).toEqual([RGB.acid, RGB.bone, RGB.muted].sort());
});

test("at 320px the code block scrolls inside itself, the page doesn't, and the keyboard scrolls it (WB-8)", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(POST);
  const pre = page.locator("[data-prose] pre");
  const { scrollWidth, clientWidth } = await pre.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
  expect(scrollWidth).toBeGreaterThan(clientWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await expect(pre).toHaveAttribute("tabindex", "0");
  await pre.focus();
  await expect(pre).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => pre.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
});
