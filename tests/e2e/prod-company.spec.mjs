import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The live company pages in the production build (dist/, prod-chromium only): About, Contact and the
// Resources hub (Phase C Task 7). /contact/ has no form endpoint until Phase E, so it leads with the
// email address as plain text; the copy button needs JavaScript. Spec check 12 names /contact/ for axe.
const PAGES = ["/about/", "/contact/", "/resources/"];
const EMAIL = "admin@techsider.com.au";
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const path of PAGES) {
  test(`${path}: no axe violations at 390px and 1280px`, async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations, `${path} at ${viewport.width}px`).toEqual([]);
    }
  });

  test(`${path}: no horizontal scroll at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(path);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
}

test.describe("/contact/ without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the address and native form are visible, while the copy button stays hidden", async ({ page }) => {
    await page.goto("/contact/");
    await expect(page.locator("[data-email]")).toHaveText(EMAIL);
    await expect(page.locator("[data-email]")).toBeVisible();
    await expect(page.locator("[data-copy-email]")).toBeHidden();
    await expect(page.locator("form")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Send enquiry" })).toBeVisible();
  });
});

test("/contact/ with JavaScript: the copy button copies the address and says so", async ({ page }) => {
  // Stand in for the Clipboard API before any page script runs, and record what it's given.
  await page.addInitScript(() => {
    window.__copied = [];
    const clipboard = { writeText: async (value) => void window.__copied.push(value) };
    Object.defineProperty(Navigator.prototype, "clipboard", { configurable: true, get: () => clipboard });
  });
  await page.goto("/contact/");
  const button = page.getByRole("button", { name: "Copy address" });
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator("[data-copy-status]")).toHaveText("Copied");
  expect(await page.evaluate(() => window.__copied)).toEqual([EMAIL]);
});
