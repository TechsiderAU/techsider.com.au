import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The live Services and Evaluation Partner pages (Phase C Task 2) in the preview build, where every
// nav group shows. This covers what needs a browser: axe over the whole page at 390px and 1280px,
// 320px reflow, and the Services panel's Prove, Build and Run links landing on their phases from
// another page, clear of the sticky header. tests/services-pages.test.mjs pins the markup, and
// tests/e2e/prod-services.spec.mjs the production build.
const PAGES = ["/services/", "/services/evaluation-partner/"];
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
const PHASES = [["Prove", "prove"], ["Build", "build"], ["Run", "run"]];

// Every test opens its page through open(), so a page that isn't built fails at once, not on a timeout.
async function open(page, url) {
  expect((await page.goto(url)).status(), url).toBe(200);
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const path of PAGES) {
  for (const vp of [WIDE, NARROW]) {
    test(`${path}: no axe violations at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, path);
      await expect(page.locator("main h1")).toHaveCount(1);
      expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations).toEqual([]);
    });
  }

  test(`${path}: no horizontal scroll at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await open(page, path);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
}

for (const [label, id] of PHASES) {
  test(`the Services menu's ${label} link lands on the ${label} phase, clear of the sticky header`, async ({ page }) => {
    await page.setViewportSize(WIDE);
    await open(page, "/services/evaluation-partner/");
    await page.getByRole("button", { name: "Services menu" }).click();
    const panel = page.locator("#nav-panel-services");
    await expect(panel).toBeVisible();
    await panel.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/services/#${id}$`));
    const heading = page.locator(`#${id}-heading`);
    await expect(heading).toBeInViewport();
    const header = await page.locator(".site-header").boundingBox();
    const box = await heading.boundingBox();
    expect(box.y, `#${id} sits under the header`).toBeGreaterThanOrEqual(header.y + header.height - 1);
  });
}
