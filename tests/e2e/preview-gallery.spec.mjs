import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The template-preview gallery exists only in dist-preview/ (TECHSIDER_NAV_PREVIEW=1).
const PAGES = ["/preview/", "/preview/components/", "/preview/tabs/"];
const BANNER = "Template preview — fictional fixture data";
const axe = (page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
const galleryNav = (page) => page.getByRole("navigation", { name: "Template preview pages" });

for (const path of PAGES) {
  test(`${path} shows the fixture banner and has no axe violations`, async ({ page }) => {
    expect((await page.goto(path)).status(), path).toBe(200);
    const banner = page.locator("main > .preview-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toHaveText(BANNER);
    expect((await axe(page).analyze()).violations).toEqual([]);
  });
}

test("the gallery index reaches the components and tabs pages", async ({ page }) => {
  expect((await page.goto("/preview/")).status()).toBe(200);
  await galleryNav(page).getByRole("link", { name: "Fixture components" }).click();
  await expect(page).toHaveURL(/\/preview\/components\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture components");
  await galleryNav(page).getByRole("link", { name: "Fixture tabs" }).click();
  await expect(page).toHaveURL(/\/preview\/tabs\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture tabs");
});

test("preview pages don't scroll horizontally at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of PAGES) {
    expect((await page.goto(path)).status(), path).toBe(200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
