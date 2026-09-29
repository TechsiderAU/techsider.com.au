import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { focusKeys } from "../support/keys.mjs";

// The template-preview gallery exists only in dist-preview/ (TECHSIDER_NAV_PREVIEW=1).
const PAGES = ["/preview/", "/preview/components/", "/preview/tabs/"];
const BANNER = "Template preview — fictional fixture data";
const axe = (page) => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
const galleryNav = (page) => page.getByRole("navigation", { name: "Template preview pages" });

for (const path of PAGES) {
  test(`${path} shows the fixture banner and has no axe violations at 390px and 1280px`, async ({ page }) => {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      expect((await page.goto(path)).status(), path).toBe(200);
      const banner = page.locator("main > .preview-banner");
      await expect(banner).toBeVisible();
      await expect(banner).toHaveText(BANNER);
      expect((await axe(page).analyze()).violations, `${path} at ${width}px`).toEqual([]);
    }
  });
}

test("the gallery index reaches the components and tabs pages, listed under Components", async ({ page }) => {
  expect((await page.goto("/preview/")).status()).toBe(200);
  await expect(galleryNav(page).getByRole("heading", { level: 2, name: "Components" })).toBeVisible();
  await galleryNav(page).getByRole("link", { name: "Fixture components" }).click();
  await expect(page).toHaveURL(/\/preview\/components\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture components");
  await galleryNav(page).getByRole("link", { name: "Fixture tabs" }).click();
  await expect(page).toHaveURL(/\/preview\/tabs\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture tabs");
});

test("every preview page leads back to the index through All previews, a 44px target after the banner", async ({ page }) => {
  for (const path of PAGES) {
    expect((await page.goto(path)).status(), path).toBe(200);
    const link = page.locator("main > .preview-banner + .preview-all").getByRole("link", { name: "All previews" });
    await expect(link, path).toHaveAttribute("href", "/preview/");
    const box = await link.boundingBox();
    expect(box.width, path).toBeGreaterThanOrEqual(44);
    expect(box.height, path).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("link", { name: "All previews" }).click();
  await expect(page).toHaveURL(/\/preview\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fixture gallery");
});

test("All previews is the first focus stop in <main>, and Enter follows it", async ({ page, browserName }) => {
  const { next } = focusKeys(browserName);
  expect((await page.goto("/preview/tabs/")).status()).toBe(200);
  await page.keyboard.press(next);
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();
  await page.keyboard.press(next);
  await expect(page.getByRole("link", { name: "All previews" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/preview\/$/);
});

test("preview pages don't scroll horizontally at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of PAGES) {
    expect((await page.goto(path)).status(), path).toBe(200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
