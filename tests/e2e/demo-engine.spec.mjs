import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { LOG } from "../../src/scripts/demo-engine.ts";
import { announcements, introText } from "../../src/lib/assistant-copy.ts";

// The demo engine in real browsers (spec §6.5, §8.8, §11.4; Phase D Review Focus 1 and 2), on the
// Home's ② demo band (#demo), with the real data file. Most tests install the page clock before the
// page loads and fast-forward the replay with runFor. An installed clock also keeps running at real
// speed, so each test acts on the run well before its first turn is announced (5.1 s into the run),
// or waits on the log. The start on scrolling into view and the lazy chunk load happen in real time.
// tests/demo-a11y.test.mjs pins the same contract on a fake DOM, and tests/demo-assistant.test.mjs
// holds the replay to the transcript's text.
const DATA = JSON.parse(readFileSync(new URL("../../src/data/demos/knowledge-assistant.json", import.meta.url), "utf8")).data;
const TURNS = DATA.scenarios.flatMap((s) => s.turns);
const QUESTIONS = TURNS.map((t) => t.question);
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
/** Far longer than the script: advancing the clock this far always reaches the end of a run. */
const WHOLE_RUN = 10 * 60_000;

/** Opens the Home with the page clock installed (unless `clock: false`) and returns the band's hooks. */
async function openHome(page, { width = 1280, clock = true } = {}) {
  if (clock) await page.clock.install();
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/");
  const frame = page.locator("#demo [data-demo-frame]");
  const log = frame.locator("[data-demo-log]");
  return {
    frame,
    controls: frame.locator("[data-demo-controls]"),
    pause: frame.locator("[data-demo-pause]"),
    skip: frame.locator("[data-demo-skip]"),
    replay: frame.locator("[data-demo-replay]"),
    stage: frame.locator("[data-demo-stage]"),
    transcript: frame.locator("[data-demo-transcript]"),
    lines: log.locator("p"),
    steps: log.locator('[data-log="step"]'),
  };
}

/**
 * Records the requests for the ② demo's lazy chunks (spec §11.4): its renderer (assistant.*.js) and
 * its data (knowledge-assistant.*.js). Returns the chunk names requested so far, sorted.
 */
function lazyChunks(page) {
  const names = new Set();
  page.on("request", (request) => {
    const m = new URL(request.url()).pathname.match(/\/_astro\/((?:knowledge-)?assistant)\.[^/]*\.js$/);
    if (m) names.add(m[1]);
  });
  return () => [...names].sort();
}

/** Scrolls the band into view and waits for the replay to start. */
async function start(d) {
  await d.frame.scrollIntoViewIfNeeded();
  await expect(d.controls).toBeVisible();
  await expect(d.stage).toBeVisible();
}

/** Advances the page clock until `n` steps have been announced. */
async function untilSteps(page, d, n) {
  for (let i = 0; i < 600 && (await d.steps.count()) < n; i++) await page.clock.runFor(100);
  await expect(d.steps).toHaveCount(n);
}

test("before the band is reached it shows the static transcript and no controls, and loads no demo chunk; in view, the replay starts with its controls first", async ({ page }) => {
  const lazy = lazyChunks(page);
  const d = await openHome(page);
  await expect(d.transcript).toBeVisible();
  await expect(d.controls).toBeHidden();
  await expect(d.stage).toBeHidden();
  await expect(d.lines).toHaveCount(0);
  expect(lazy(), "no renderer or data chunk loads before the band is reached").toEqual([]);
  await start(d);
  await expect.poll(lazy, { message: "the renderer and the data load once the band is in view" }).toEqual(["assistant", "knowledge-assistant"]);
  await expect(d.transcript).toBeHidden();
  await expect(d.stage).toHaveAttribute("aria-hidden", "true");
  await expect(d.lines).toHaveText([introText(DATA)]);
  await expect(d.pause).toBeEnabled();
  await expect(d.skip).toBeEnabled();
  await expect(d.replay).toBeEnabled();
  const controls = await d.controls.boundingBox();
  expect(controls.y).toBeLessThan((await d.stage.boundingBox()).y);
});

test("the log announces each turn once, in order, and the finished run shows the transcript with only Replay enabled", async ({ page }) => {
  const d = await openHome(page);
  await start(d);
  await page.clock.runFor(WHOLE_RUN);
  await expect(d.transcript).toBeVisible();
  await expect(d.stage).toBeHidden();
  await expect(d.steps).toHaveText(announcements(DATA));
  await expect(d.lines).toHaveCount(TURNS.length + 2);
  await expect(d.lines.last()).toHaveText(LOG.finished);
  await expect(d.pause).toBeDisabled();
  await expect(d.skip).toBeDisabled();
  await expect(d.replay).toBeEnabled();
});

test("Pause holds the run until Resume", async ({ page }) => {
  const d = await openHome(page);
  await start(d);
  await page.clock.runFor(1_500);
  await d.pause.click();
  await expect(d.pause).toHaveText("Resume");
  await expect(d.lines.last()).toHaveText(LOG.paused);
  const held = await d.stage.textContent();
  const steps = await d.steps.count();
  await page.clock.runFor(60_000);
  expect(await d.stage.textContent()).toBe(held);
  await expect(d.steps).toHaveCount(steps);
  await d.pause.click();
  await expect(d.pause).toHaveText("Pause");
  await expect(d.lines.last()).toHaveText(LOG.resumed);
  await page.clock.runFor(2_000);
  expect((await d.stage.textContent()).length).toBeGreaterThan(held.length);
});

test("Skip to result, from the keyboard, shows the final state at once and moves focus to Replay; no skipped turn is announced", async ({ page }) => {
  const d = await openHome(page);
  await start(d);
  await page.clock.runFor(1_000);
  await d.skip.focus();
  await page.keyboard.press("Enter");
  await expect(d.transcript).toBeVisible();
  await expect(d.stage).toBeHidden();
  await expect(d.replay).toBeFocused();
  await expect(d.pause).toBeDisabled();
  await expect(d.skip).toBeDisabled();
  await expect(d.lines).toHaveText([introText(DATA), LOG.skipped]);
  await page.clock.runFor(WHOLE_RUN);
  await expect(d.lines).toHaveCount(2);
});

test("Replay mid-run restarts cleanly: a fresh log, one run in the stage, and each turn announced once", async ({ page }) => {
  const d = await openHome(page);
  await start(d);
  await untilSteps(page, d, 1);
  await page.clock.runFor(200);
  await d.replay.click();
  await expect(d.lines).toHaveText([introText(DATA)]);
  await expect(d.stage.locator(".assist")).toHaveCount(1);
  await page.clock.runFor(WHOLE_RUN);
  await expect(d.steps).toHaveText(announcements(DATA));
  await expect(d.stage.locator(".assist-q")).toHaveText(QUESTIONS);
  await expect(d.transcript).toBeVisible();
});

test("under prefers-reduced-motion the band keeps its final state: the transcript, no controls, and nothing loads or runs", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const lazy = lazyChunks(page);
  const d = await openHome(page, { clock: false });
  await d.frame.scrollIntoViewIfNeeded();
  // Real time, far longer than a band in view takes to load its chunks and start (the first test).
  // Without this wait the assertions below would pass before a wrongly started run could show.
  await page.waitForTimeout(1_000);
  expect(lazy(), "no renderer or data chunk loads").toEqual([]);
  await expect(d.transcript).toBeVisible();
  await expect(d.controls).toBeHidden();
  await expect(d.stage).toBeHidden();
  await expect(d.lines).toHaveCount(0);
});

test("a keyboard user already reading the transcript keeps it: the controls appear with Replay ready, and nothing runs", async ({ page, context }) => {
  const d = await openHome(page);
  const cite = d.transcript.locator("a.assist-cite").first();
  await cite.focus(); // focusing scrolls the band into view, which would start the replay
  await expect(d.controls).toBeVisible();
  await expect(cite).toBeFocused();
  await expect(d.transcript).toBeVisible();
  await expect(d.stage).toBeHidden();
  await expect(d.pause).toBeDisabled();
  await expect(d.skip).toBeDisabled();
  await expect(d.replay).toBeEnabled();
  await expect(d.lines).toHaveCount(0);

  // A screen reader activates a citation from its browse mode before the band counts as in view: a
  // click, with focus left on <body>. Only bootDemos' watch on the frame, set from the page's start,
  // sees it: the engine that mounts later finds no focus in the transcript (final review D2-T2-F1).
  const other = await context.newPage();
  const e = await openHome(other);
  await expect(e.frame).not.toBeInViewport();
  expect(await other.evaluate(() => document.activeElement === document.body), "focus starts on <body>").toBe(true);
  await e.transcript.locator("a.assist-cite").first().dispatchEvent("click");
  expect(await other.evaluate(() => document.activeElement === document.body), "the click left focus on <body>").toBe(true);
  await e.frame.scrollIntoViewIfNeeded();
  await expect(e.controls).toBeVisible();
  await expect(e.transcript).toBeVisible();
  await expect(e.stage).toBeHidden();
  await expect(e.replay).toBeEnabled();
  await expect(e.lines).toHaveCount(0);
});

test("at 320px the band doesn't scroll sideways, before or during a run", async ({ page }) => {
  const d = await openHome(page, { width: 320 });
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await overflow(), "before the run").toBeLessThanOrEqual(0);
  await start(d);
  await page.clock.runFor(5_000);
  expect(await overflow(), "during the run").toBeLessThanOrEqual(0);
});

for (const width of [390, 1280]) {
  test(`without JavaScript the static transcript reads in full at ${width}px, with no controls`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto("/");
    const frame = page.locator("#demo [data-demo-frame]");
    const transcript = frame.locator("[data-demo-transcript]");
    await expect(transcript).toBeVisible();
    await expect(frame.locator("[data-demo-controls]")).toBeHidden();
    await expect(frame.locator("[data-demo-stage]")).toBeHidden();
    for (const scenario of DATA.scenarios) {
      await expect(transcript.getByRole("heading", { level: 3, name: scenario.title })).toBeVisible();
      for (const turn of scenario.turns) {
        await expect(transcript).toContainText(turn.question);
        for (const segment of turn.answer) if (segment.text.trim()) await expect(transcript).toContainText(segment.text.trim());
        if (turn.caught) await expect(transcript).toContainText(turn.caught);
      }
      for (const source of scenario.sources) {
        await expect(transcript.getByRole("link", { name: source.label, exact: true }).first()).toBeVisible();
        await expect(transcript).toContainText(source.text);
      }
    }
    await ctx.close();
  });

  // Real time here: axe runs its own timers in the page, so the page clock stays uninstalled.
  test(`no axe violations in the demo band at ${width}px, before, during (paused) and after a run; the controls are 44px targets`, async ({ page }) => {
    const d = await openHome(page, { width, clock: false });
    const axe = async (when) => expect((await new AxeBuilder({ page }).include("#demo").withTags(WCAG).analyze()).violations, when).toEqual([]);
    await axe("before the run");
    await start(d);
    await d.pause.click();
    await expect(d.pause).toHaveText("Resume");
    await axe("paused mid-run");
    for (const button of [d.pause, d.skip, d.replay]) {
      const box = await button.boundingBox();
      expect(Math.min(box.width, box.height), await button.textContent()).toBeGreaterThanOrEqual(44);
    }
    await d.skip.click();
    await expect(d.transcript).toBeVisible();
    await axe("after Skip to result");
  });
}
