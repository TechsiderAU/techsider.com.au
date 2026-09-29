import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readFrontmatter } from "../../scripts/ci/lib.mjs";
import { focusKeys } from "../support/keys.mjs";

// The restyled Insights index and posts (spec §8.9), in every browser. The preview build renders
// them exactly as production does, except that its SiteContext shows every planned page.
// tests/e2e/prod-insights.spec.mjs covers the production-only links.
const DIR = fileURLToPath(new URL("../../src/content/insights/", import.meta.url));
const POSTS = readdirSync(DIR)
  .filter((f) => f.endsWith(".md") && readFrontmatter(`${DIR}${f}`).draft !== true)
  .map((f) => `/insights/${f.replace(/\.md$/, "")}/`)
  .sort();
const PAGES = ["/insights/", ...POSTS];
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const ACID = "rgb(200, 255, 46)";
const CARBON = "rgb(11, 11, 12)";

for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`the index and every post have one h1 and no axe violations at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.locator("h1"), path).toHaveCount(1);
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations, path).toEqual([]);
    }
  });
}

test("no horizontal scroll at 320px on the index or any post", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of PAGES) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("a whole insight card opens its post: the stretched title link covers the card", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/insights/");
  const card = page.locator("[data-insight-card]").first();
  const link = card.locator("a.insight-card-link");
  await expect(link).toHaveCount(1);
  const href = await link.getAttribute("href");
  const title = await link.innerText();
  expect(POSTS).toContain(href);
  // The description is not a link, but the stretched title link covers it: a click there opens the post.
  const box = await card.locator(".insight-card-description").boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page).toHaveURL(new RegExp(`${href}$`));
  await expect(page.locator("h1")).toHaveText(title);
});

test("focus is visible: carbon on the bone cards, lime on the carbon hero and closing prompt", async ({ page, browserName }) => {
  const { next } = focusKeys(browserName);
  const ring = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      const s = getComputedStyle(el);
      return { tag: el.tagName, text: el.textContent.trim(), visible: el.matches(":focus-visible"), style: s.outlineStyle, color: s.outlineColor };
    });

  await page.goto("/insights/");
  await page.locator("main#main").focus();
  await page.keyboard.press(next);
  const first = await ring();
  await expect(page.locator("[data-insight-card] a").first()).toBeFocused();
  expect(first).toMatchObject({ tag: "A", visible: true, style: "solid", color: CARBON });

  await page.goto(POSTS[0]);
  await page.locator("main#main").focus();
  await page.keyboard.press(next);
  await expect(page.locator("[data-page-hero] nav a").first()).toBeFocused();
  expect(await ring()).toMatchObject({ text: "Home", visible: true, style: "solid", color: ACID });
  const cta = page.locator("[data-post-closing] a");
  await cta.focus();
  await page.keyboard.press(focusKeys(browserName).prev);
  await page.keyboard.press(next);
  await expect(cta).toBeFocused();
  expect(await ring()).toMatchObject({ visible: true, style: "solid", color: ACID });
});

test("links in the index and a post are 44px targets, except links inside running text", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/insights/", POSTS[0]]) {
    await page.goto(path);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("main a, main button")]
        .filter((el) => !el.closest("[data-prose]") && el.checkVisibility({ checkVisibilityCSS: true }))
        .map((el) => ({ name: el.textContent.trim(), r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width < 44 || r.height < 44)
        .map(({ name, r }) => `${name}: ${Math.round(r.width)}×${Math.round(r.height)}`),
    );
    expect(small, path).toEqual([]);
  }
});
