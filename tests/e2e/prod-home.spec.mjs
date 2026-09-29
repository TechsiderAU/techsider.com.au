import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { HOME_ANCHORS } from "../../scripts/ci/checks/03-anchors.mjs";
import { LOG } from "../../src/scripts/demo-engine.ts";

// The real Home page in the production build (dist/, prod-chromium only): HomeTemplate with the ②
// demo in the #demo band (Phase D Task 8).
// - Every spec §7.1 anchor lands on its block, with and without JavaScript. /#demo is the one the
//   header's "See a demo" fell back to before /demos/ went live, and older links still use it
//   (Review Focus 5).
// - The band loads the ② demo's renderer and data only once it nears the viewport (spec §11.4).
//   The data is recognised by its first corpus URL, which only the data file holds.
// - No axe violations at 390px and 1280px, and no sideways scroll at 320px, before the demo runs
//   and at its result; without JavaScript the band shows its whole static transcript.
// - "Skip to result" from the keyboard shows the transcript, logs LOG.skipped, and leaves focus on
//   Replay, never <body> (spec §8.8; Review Focus 1). Task 2's tests/e2e/demo-engine.spec.mjs
//   holds the rest of the engine contract (Pause, Replay mid-run, one announcement per step,
//   reduced motion) on the same band in the preview build.
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
const DEMO = JSON.parse(readFileSync(new URL("../../src/data/demos/knowledge-assistant.json", import.meta.url), "utf8"));
const QUESTIONS = DEMO.data.scenarios.flatMap((s) => s.turns.map((t) => t.question));
const DATA_MARK = DEMO.data.scenarios[0].corpus.url;
const isScript = (res) => new URL(res.url()).pathname.endsWith(".js");
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const axe = (page) => new AxeBuilder({ page }).withTags(WCAG).analyze();

/** Opens / (with an optional #fragment) and checks it is HomeTemplate, not the legacy sections. */
async function openHome(page, hash = "") {
  expect((await page.goto(`/${hash}`)).status()).toBe(200);
  await expect(page.locator('main [data-template="home"]')).toHaveCount(1);
}

/**
 * Scrolls the demo into view, which starts the run, and skips to the result from the keyboard.
 * Spec §8.8 on the real Home: the final state is the static transcript, the skip is announced once
 * in the polite log, and Skip disabling itself hands focus to Replay rather than dropping it to
 * <body> (Review Focus 1).
 */
async function runDemoToResult(page) {
  const band = page.locator("#demo");
  await band.locator("[data-demo-frame]").scrollIntoViewIfNeeded();
  const skip = band.locator("[data-demo-skip]");
  await expect(skip).toBeVisible();
  await expect(band.locator("[data-demo-stage]")).toBeVisible();
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect(band.locator("[data-demo-transcript]")).toBeVisible();
  await expect(band.locator("[data-demo-stage]")).toBeHidden();
  await expect(band.locator("[data-demo-log] p").last()).toHaveText(LOG.skipped);
  await expect(band.locator("[data-demo-replay]")).toBeFocused();
  expect(await page.evaluate(() => document.activeElement === document.body), "focus fell to <body>").toBe(false);
}

for (const vp of [WIDE, NARROW]) {
  test(`every spec §7.1 Home anchor, /#demo included, lands on its block with and without JavaScript at ${vp.width}px (Review Focus 5)`, async ({ browser }) => {
    for (const javaScriptEnabled of [true, false]) {
      const ctx = await browser.newContext({ javaScriptEnabled, viewport: vp, reducedMotion: "reduce" });
      for (const id of HOME_ANCHORS) {
        const page = await ctx.newPage();
        await openHome(page, `#${id}`);
        await expect(page.locator(`#${id}`), `/#${id}, JavaScript ${javaScriptEnabled ? "on" : "off"}`).toBeInViewport();
        await page.close();
      }
      await ctx.close();
    }
  });

  test(`the Home page has no axe violations at ${vp.width}px, before the demo runs and at its result`, async ({ page }) => {
    await page.setViewportSize(vp);
    await openHome(page);
    expect((await axe(page)).violations).toEqual([]);
    await runDemoToResult(page);
    expect((await axe(page)).violations).toEqual([]);
  });
}

test("the demo band loads the ② demo's data only when it nears the viewport, then starts with its controls showing (spec §11.4)", async ({ page }) => {
  await page.setViewportSize(WIDE);
  const loaded = [];
  page.on("response", (res) => {
    if (isScript(res)) loaded.push(res);
  });
  await openHome(page);
  await page.waitForLoadState("networkidle");
  const early = await Promise.all(loaded.map((res) => res.text()));
  expect(early.filter((body) => body.includes(DATA_MARK)), "the ② demo's data loaded with the page, before the band was in view").toHaveLength(0);
  await expect(page.locator("#demo [data-demo-controls]")).toBeHidden();
  const data = page.waitForResponse(async (res) => isScript(res) && (await res.text()).includes(DATA_MARK));
  await page.locator("#demo [data-demo-frame]").scrollIntoViewIfNeeded();
  await data;
  await expect(page.locator("#demo [data-demo-controls]")).toBeVisible();
});

test("the Home page doesn't scroll sideways at 320px, before the demo runs or at its result", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await openHome(page);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await runDemoToResult(page);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test("without JavaScript the demo band shows its static transcript, every question in it, and no controls", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: WIDE });
  const page = await ctx.newPage();
  await openHome(page, "#demo");
  const band = page.locator("#demo");
  await expect(band.locator("[data-demo-controls]")).toBeHidden();
  await expect(band.locator("[data-demo-stage]")).toBeHidden();
  const transcript = band.locator("[data-demo-transcript]");
  await expect(transcript).toBeVisible();
  for (const question of QUESTIONS) await expect(transcript).toContainText(question);
  await ctx.close();
});
