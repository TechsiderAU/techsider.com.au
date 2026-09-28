import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Phase A scope: the site shell only. Legacy page sections are replaced in Phase B.
const shell = (page) =>
  new AxeBuilder({ page }).include("header").include("footer").include(".skip-link").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);

for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`shell has no axe violations at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto("/");
    expect((await shell(page).analyze()).violations).toEqual([]);
  });
}

test("open desktop panel has no axe violations", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Solutions menu" }).click();
  expect((await shell(page).analyze()).violations).toEqual([]);
});

test("open mobile menu and a sub-panel have no axe violations", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  const menu = () => new AxeBuilder({ page }).include("#site-menu").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
  expect((await menu().analyze()).violations).toEqual([]);
  await page.locator('[data-menu-open-panel="solutions"]').click();
  expect((await menu().analyze()).violations).toEqual([]);
});

test("a post page shell has no axe violations", async ({ page }) => {
  await page.goto("/insights/evals-before-vibes/");
  expect((await shell(page).analyze()).violations).toEqual([]);
});

test("the skip link becomes visible on focus and moves focus to main", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.locator(".skip-link");
  await expect(skip).toBeFocused();
  const box = await skip.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
});

test("no horizontal scroll at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
