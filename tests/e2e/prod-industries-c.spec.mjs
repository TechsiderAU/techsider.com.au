import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Phase C Task 6 in the production build (dist/, prod-chromium only): the Healthcare, Resources &
// energy and Legal & professional pages and the Industries hub. Axe at 390px and 1280px (spec
// check 12), 320px reflow, a Designed around chip landing on its regulatory-map row clear of the
// sticky header, and the hub's links: a card chip into an industry page's row, and a matrix cell
// into a solution page.
const HUB = "/industries/";
const PAGES = [HUB, "/industries/healthcare/", "/industries/resources-and-energy/", "/industries/legal-and-professional/"];
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
// The row's top edge minus the sticky header's bottom edge: >= 0 when the header hides none of it.
const clearOfHeader = (row) =>
  row.evaluate((el) => Math.round(el.getBoundingClientRect().top - document.querySelector("body > header").getBoundingClientRect().bottom));

for (const vp of [NARROW, WIDE]) {
  test(`the hub and the three industry pages have no axe violations at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    for (const path of PAGES) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations, path).toEqual([]);
    }
  });
}

test("nothing scrolls sideways at 320px on the hub or the three industry pages", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of PAGES) {
    await page.goto(path);
    expect(await overflow(page), path).toBeLessThanOrEqual(0);
  }
});

// Reduced motion makes the anchor scroll instant (global.css turns smooth scrolling off).
test.describe(() => {
  test.use({ reducedMotion: "reduce" });

  for (const vp of [NARROW, WIDE]) {
    for (const path of PAGES.slice(1)) {
      test(`a Designed around chip lands on its regulatory-map row at ${vp.width}px (${path})`, async ({ page }) => {
        await page.setViewportSize(vp);
        await page.goto(path);
        const chip = page.locator("#designed-around-obligations a").last();
        const href = await chip.getAttribute("href");
        expect(href).toMatch(/^#reg-/);
        await chip.click();
        await expect(page).toHaveURL(new RegExp(`${href}$`));
        const row = page.locator(`${href}[data-regulatory-row]`);
        await expect(row).toHaveCount(1);
        await expect(row).toBeInViewport();
        expect(await clearOfHeader(row)).toBeGreaterThanOrEqual(0);
      });
    }

    test(`a hub card chip opens its industry page on the row it names at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto(HUB);
      await page.locator('[data-industry-card="legal-and-professional"] summary').click();
      const chip = page.locator('[data-industry-card="legal-and-professional"] a[href*="#reg-"]').first();
      const href = await chip.getAttribute("href");
      await chip.click();
      await expect(page).toHaveURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
      const row = page.locator(`#${href.split("#")[1]}[data-regulatory-row]`);
      await expect(row).toBeInViewport();
      expect(await clearOfHeader(row)).toBeGreaterThanOrEqual(0);
    });
  }
});

test("a hub matrix cell opens its solution page", async ({ page }) => {
  await page.goto(HUB);
  // The row header links to the industry page; the td cells link to the solutions.
  const cell = page.locator("#matrix-healthcare td a").first();
  const href = await cell.getAttribute("href");
  expect(href).toMatch(/^\/solutions\/[a-z-]+\/$/);
  await cell.click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator("h1")).toHaveCount(1);
});

test("the production nav's Industries link opens the hub, and a hub card opens its industry page", async ({ page }) => {
  await page.setViewportSize(WIDE);
  await page.goto("/");
  await page.getByRole("button", { name: "Solutions menu", exact: true }).click();
  await page.locator("#nav-panel-solutions").getByRole("link", { name: "All industries", exact: true }).click();
  await expect(page).toHaveURL(/\/industries\/$/);
  await expect(page.locator("[data-industry-card]")).toHaveCount(9);
  await page.locator('[data-industry-card="healthcare"] h3 a').click();
  await expect(page).toHaveURL(/\/industries\/healthcare\/$/);
  await expect(page.locator("h1")).toHaveText("Know what your AI scribe leaves out.");
});
