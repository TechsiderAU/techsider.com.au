import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { siteContext } from "../../src/lib/site.ts";

// The 404 page in the production build (dist/, prod-chromium only), inside the real site shell.
// GitHub Pages serves dist/404.html for any path it has no file for; the test server answers those
// with a plain-text 404 instead, so these tests open /404.html itself. Its hub cards are the hubs
// production shows, which grow as Phase C puts pages live.
const PATH = "/404.html";
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const HUBS = ["home", "solutions", "industries", "services", "resources", "insights", "demos", "about"];
const SHOWN = HUBS.map((key) => siteContext(false).page(key)).filter((p) => p.href !== null);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`the 404 page has one visible h1 and no axe violations at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    expect((await page.goto(PATH)).status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
  });
}

test("the 404 page doesn't scroll sideways at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  expect((await page.goto(PATH)).status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("Page not found.");
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test("a hub card for each hub production shows, and every one lands", async ({ page, request }) => {
  expect(SHOWN.map((p) => p.key)).toEqual(expect.arrayContaining(["home", "insights"]));
  await page.goto(PATH);
  const links = page.locator("main [data-hub]").getByRole("link");
  await expect(links).toHaveText(SHOWN.map((p) => p.label));
  for (const [i, hub] of SHOWN.entries()) {
    await expect(links.nth(i)).toHaveAttribute("href", hub.href);
    expect((await request.get(hub.href)).status(), hub.href).toBe(200);
  }
  await links.filter({ hasText: /^Insights$/ }).click();
  await expect(page).toHaveURL(/\/insights\/$/);
  await expect(page.locator("h1")).toHaveText("Insights.");
});
