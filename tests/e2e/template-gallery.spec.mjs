import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { idsIn } from "../../scripts/ci/lib.mjs";
import { PREVIEW_PAGES, previewPath } from "../../src/fixtures/index.ts";
import { GALLERY_ONLY, internalLinks, linkProblems } from "../support/gallery-links.mjs";

// The gallery-wide sweep (spec §6.6, §7.4; B2 Review Focus 2 and 3), over every template page of
// the /preview/ gallery, in every engine:
// - at 390px and 1280px it has exactly one h1, visible, and no axe violations;
// - at 320px it doesn't scroll sideways, with or without JavaScript;
// - every internal link in its <main> lands on a page or file the preview server serves, and a
//   fragment on an id there, apart from the gallery-only destinations of tests/support/gallery-links.mjs.
// tests/template-gallery.test.mjs holds the static half: unique ids, heading order, no link to a
// planned page, and the unit tests of the link logic.
const TEMPLATE_PAGES = PREVIEW_PAGES.filter((p) => p.group === "templates");
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const NARROWEST = { width: 320, height: 700 };
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const entry of TEMPLATE_PAGES) {
  const path = previewPath(entry);

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
      expect(linkProblems(links, served, GALLERY_ONLY)).toEqual([]);
    });
  });
}
