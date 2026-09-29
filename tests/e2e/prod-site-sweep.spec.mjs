import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fileURLToPath } from "node:url";
import { htmlFiles, idsIn, pageUrl } from "../../scripts/ci/lib.mjs";
import { internalLinks, linkProblems } from "../support/gallery-links.mjs";

// The full-site sweep of the production build (dist/, prod-chromium only; spec §1 criterion 5,
// §6.6, §11.5 check 12; Phase C Review Focus 2). The page list is read from dist/ when the spec
// loads, so every page production builds is swept, whatever it is (a live nav page, an insight,
// the 404), from the build in which it goes live:
// - at 390px and 1280px it has exactly one h1, visible, and no axe violations;
// - at 320px it doesn't scroll sideways, with or without JavaScript;
// - every internal link in its <main> lands on a page or file the server serves, and a fragment on
//   an id there. Production has no gallery-only destinations, so nothing is allowed.
// tests/site-sweep.test.mjs holds the static half: one h1 in <main>, heading order, unique ids,
// titles and descriptions, the 404 alone noindex, and no link to a planned page.
const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));
const PAGES = htmlFiles(DIST).map((file) => pageUrl(DIST, file));
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const NARROWEST = { width: 320, height: 700 };
const NOTHING_ALLOWED = { paths: new Set(), fragments: new Map() };
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("the sweep reads the production build: Home, the 404, Insights and at least one post", () => {
  expect(PAGES.length, "dist/ holds no page: run `npm run build` first").toBeGreaterThan(0);
  expect(PAGES).toEqual(expect.arrayContaining(["/", "/404.html", "/insights/"]));
  expect(PAGES.some((p) => /^\/insights\/[^/]+\/$/.test(p)), "no insight post").toBe(true);
});

for (const path of PAGES) {
  test.describe(path, () => {
    test("one visible h1 and no axe violations at 390px and 1280px", async ({ page }) => {
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        expect((await page.goto(path)).status(), `${width}px`).toBe(200);
        await expect(page.locator("h1"), `${width}px`).toHaveCount(1);
        await expect(page.getByRole("heading", { level: 1 }), `${width}px`).toBeVisible();
        const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
        expect(violations, `axe at ${width}px`).toEqual([]);
      }
    });

    test("no horizontal scroll at 320px, with or without JavaScript", async ({ page, browser }) => {
      await page.setViewportSize(NARROWEST);
      await page.goto(path);
      expect(await overflow(page), "with JavaScript").toBeLessThanOrEqual(0);
      const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: NARROWEST });
      const noJs = await ctx.newPage();
      await noJs.goto(path);
      expect(await overflow(noJs), "without JavaScript").toBeLessThanOrEqual(0);
      await ctx.close();
    });

    test("every internal link in <main> lands on a served page or file, and on an id there", async ({ page, request }) => {
      await page.goto(path);
      const hrefs = await page.locator("main [href]").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
      const links = internalLinks(hrefs, path);
      // path → the ids on the page served there (none for a file that isn't HTML), or null.
      const served = new Map();
      for (const target of new Set(links.map((l) => l.path))) {
        if (target === path) {
          served.set(target, new Set(await page.locator("[id]").evaluateAll((els) => els.map((el) => el.id))));
          continue;
        }
        const response = await request.get(encodeURI(target));
        if (!response.ok()) {
          served.set(target, null);
          continue;
        }
        const html = (response.headers()["content-type"] ?? "").startsWith("text/html");
        served.set(target, html ? idsIn(await response.text()) : new Set());
      }
      expect(linkProblems(links, served, NOTHING_ALLOWED)).toEqual([]);
    });
  });
}
