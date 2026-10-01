import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fileURLToPath } from "node:url";
import { htmlFiles, idsIn, pageUrl, readText } from "../../scripts/ci/lib.mjs";
import { internalLinks, linkProblems } from "../support/gallery-links.mjs";

// The full-site sweep of the production build (dist/, prod-chromium only; spec §1 criterion 5,
// §6.6, §11.5 check 12; Phase C Review Focus 2). The page list is read from dist/ when the spec
// loads, so every page production builds is swept, whatever it is (a live nav page, an insight,
// the 404), from the build in which it goes live:
// - at 390px and 1280px it has exactly one h1, visible, and no axe violations;
// - at 320px it doesn't scroll sideways, with or without JavaScript;
// - every internal link in its <main> lands on a page or file the server serves, and a fragment on
//   an id there. Production has no gallery-only destinations, so nothing is allowed;
// - at 1280px no table cell breaks a word mid-letter (final review WB-D2).
// tests/site-sweep.test.mjs holds the static half: one h1 in <main>, heading order, unique ids,
// titles and descriptions, the 404 alone noindex, and no link to a planned page.
const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));
const PAGES = htmlFiles(DIST).map((file) => pageUrl(DIST, file));
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const NARROWEST = { width: 320, height: 700 };
const NOTHING_ALLOWED = { paths: new Set(), fragments: new Map() };
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
/** The pages that build a table: every DataTable, the ① registers and the ④ report's tables among them. */
const TABLE_PAGES = htmlFiles(DIST).filter((file) => readText(file).includes("<table")).map((file) => pageUrl(DIST, file));

/**
 * Each word in a shown table cell that the page renders across two lines: a run of letters or digits
 * has no break opportunity of its own, so it spans two lines only when its cell broke it mid-letter.
 * Runs in the page.
 */
function brokenWords() {
  const out = [];
  for (const cell of document.querySelectorAll("table th, table td, table caption")) {
    if (!cell.checkVisibility()) continue;
    const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      for (const m of node.data.matchAll(/[\p{L}\p{N}]{2,}/gu)) {
        const range = document.createRange();
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
        if (lines.size > 1) out.push(`"${m[0]}" in "${cell.innerText.trim().replace(/\s+/g, " ").slice(0, 60)}"`);
      }
    }
  }
  return out;
}

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

// Final review WB-D2: `overflow-wrap: anywhere` on a cell lets an auto-layout table shrink a column
// below its longest word, so at 1280px "Included", "September" and "Management" broke mid-letter.
// A cell now breaks a word only when the word can't fit, and at 1280px every table has the room.
// Each page is read twice: without JavaScript, where every table shows in full (both ① registers,
// the checker's vendor table), and with it under reduced motion, where each replay shows its
// transcript and the ① transcript narrows its table for the side panel, one register at a time.
test("at 1280px no table cell breaks a word mid-letter, on any page that builds a table, with or without JavaScript (final review WB-D2)", async ({ browser }) => {
  test.slow();
  expect(TABLE_PAGES).toEqual(
    expect.arrayContaining(["/resources/what-you-already-pay-for/", "/demos/ai-switch-on/", "/demos/document-registers/", "/demos/ai-evaluation/"]),
  );
  const broken = [];
  const check = async (page, where) => {
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    for (const word of await page.evaluate(brokenWords)) broken.push(`${where}: ${word}`);
  };
  const viewport = { width: 1280, height: 900 };
  for (const options of [{ javaScriptEnabled: false, viewport }, { reducedMotion: "reduce", viewport }]) {
    const ctx = await browser.newContext(options);
    const page = await ctx.newPage();
    const js = options.javaScriptEnabled === false ? "without JavaScript" : "with JavaScript";
    for (const path of TABLE_PAGES) {
      expect((await page.goto(path)).status(), path).toBe(200);
      await check(page, `${path} ${js}`);
      // The ① transcript's toggle shows one register at a time.
      for (const choice of await page.locator("[data-register-choice]").all()) {
        if (!(await choice.isVisible())) continue;
        await choice.click();
        await check(page, `${path} ${js}, ${await choice.innerText()}`);
      }
    }
    await ctx.close();
  }
  expect(broken, "words broken mid-letter at 1280px").toEqual([]);
});

/**
 * Each shown table wider than its frame (the DemoFrame it sits in, or else the page's <main>),
 * measured against the frame's content box. Runs in the page.
 */
function tablesWiderThanFrames() {
  const out = [];
  for (const table of document.querySelectorAll("table")) {
    if (!table.checkVisibility()) continue;
    const frame = table.closest("[data-demo-frame]") ?? table.closest("main");
    const style = getComputedStyle(frame);
    const box = frame.getBoundingClientRect();
    const left = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
    const right = box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
    const t = table.getBoundingClientRect();
    if (t.left < left - 1 || t.right > right + 1) {
      out.push(`"${table.caption?.innerText.trim() ?? "a table"}" is ${Math.round(t.width)}px in a ${Math.round(right - left)}px frame`);
    }
  }
  return out;
}

// Phase D ledger NB-1 (Phase E controller ruling 8): from 768px to 832px the ⑤ vendor tables, seven
// columns each, were wider than their DemoFrame on /demos/ai-switch-on/, and "September" broke
// mid-word there and on the checker's page. A wide table now stays as cards until 53rem. At 768px,
// where tables start, 800px and 832px, no table is wider than its frame and no cell breaks a word
// mid-letter, with or without JavaScript.
for (const width of [768, 800, 832]) {
  test(`at ${width}px no table is wider than its frame, and no cell breaks a word mid-letter, with or without JavaScript (Phase D NB-1)`, async ({ browser }) => {
    test.slow();
    const found = [];
    const viewport = { width, height: 900 };
    for (const options of [{ javaScriptEnabled: false, viewport }, { reducedMotion: "reduce", viewport }]) {
      const ctx = await browser.newContext(options);
      const page = await ctx.newPage();
      const js = options.javaScriptEnabled === false ? "without JavaScript" : "with JavaScript";
      for (const path of TABLE_PAGES) {
        expect((await page.goto(path)).status(), path).toBe(200);
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        for (const problem of await page.evaluate(tablesWiderThanFrames)) found.push(`${path} ${js}: ${problem}`);
        for (const word of await page.evaluate(brokenWords)) found.push(`${path} ${js}: ${word} broke mid-letter`);
      }
      await ctx.close();
    }
    expect(found, `at ${width}px`).toEqual([]);
  });
}
