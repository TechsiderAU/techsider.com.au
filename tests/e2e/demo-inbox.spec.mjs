import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { LOG } from "../../src/scripts/demo-engine.ts";
import { ACTION_LABEL, announcements, formatMetric, inboxSummary, introText } from "../../src/lib/inbox-copy.ts";

// The ③ Draft-for-Approval demo in real browsers (spec §6.5, §8.8, §9.1), on its gallery page,
// which replays the real synthetic inbox: without JavaScript the static transcript reads in full;
// under reduced motion nothing loads or runs and the transcript is the result; without it the two
// lazy chunks load, Pause holds the replay and Resume carries it on; Skip, from the keyboard, ends
// on the transcript with each part on screen once, the frame keeping its height, focus on Replay
// and each finished step logged once; Replay mid-run starts cleanly; axe finds nothing at 390px
// and 1280px.
// The rest of the engine's contract (the log across replays, a reader already in the transcript)
// is pinned by tests/e2e/demo-engine.spec.mjs; tests/demo-inbox.test.mjs holds the renderer and
// the markup.
const PATH = "/preview/templates/demo-inbox/";
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const FILE = JSON.parse(readFileSync(new URL("../../src/data/demos/draft-for-approval.json", import.meta.url), "utf8"));
const DATA = FILE.data;
const SUMMARY = inboxSummary(DATA);
const LINES = announcements(DATA);
/** The parts a replay reveals one by one: each message and its outcome, each draft, both panels, each trace step. */
const REVEALED_PARTS = DATA.messages.length * 2 + SUMMARY.drafts.length + 2 + DATA.trace.length;

const frameOf = (page) => page.getByRole("figure", { name: FILE.title });
const stageOf = (page) => page.locator("[data-demo-stage]");
/** Records the inbox demo's lazy chunks as the page requests them (spec §11.4: they load only when it runs). */
function demoChunks(page) {
  const seen = new Set();
  page.on("request", (r) => {
    const m = new URL(r.url()).pathname.match(/\/_astro\/(inbox|draft-for-approval)\.[\w-]+\.js$/);
    if (m) seen.add(m[1]);
  });
  return seen;
}
/** How far the replay has got: the parts still hidden, and the draft characters typed so far. */
const progress = (page) =>
  stageOf(page).evaluate((stage) => ({
    pending: stage.querySelectorAll("[data-inbox-pending]").length,
    typed: [...stage.querySelectorAll(".inbox-draft-text")].reduce((n, p) => n + (p.firstChild?.textContent?.length ?? 0), 0),
  }));

/** The finished inbox is on screen exactly once in the frame: never the stage and the transcript together. */
async function expectFinished(frame) {
  const view = frame.locator("[data-inbox-view]").filter({ visible: true });
  await expect(view).toHaveCount(1);
  await expect(view.locator("[data-inbox-pending]")).toHaveCount(0);
  await expect(view.locator("[data-inbox-item]")).toHaveCount(DATA.messages.length);
  for (const m of DATA.messages) {
    await expect(frame.getByText(m.reason, { exact: true }).filter({ visible: true }), m.id).toHaveCount(1);
    if (m.draft) await expect(frame.getByText(m.draft, { exact: true }).filter({ visible: true }), m.id).toHaveCount(1);
  }
  await expect(view.locator("[data-inbox-draft]")).toHaveCount(SUMMARY.drafts.length);
  await expect(view.locator('[data-inbox-action="escalate"] [data-inbox-draft]')).toHaveCount(0);
  await expect(view.locator("[data-inbox-approval]")).toBeVisible();
  await expect(view.locator("[data-inbox-approval-item]")).toHaveCount(SUMMARY.drafts.length);
  await expect(view.locator("[data-inbox-trace-step]")).toHaveCount(DATA.trace.length);
  for (const step of DATA.trace) await expect(view.locator("[data-inbox-trace]")).toContainText(formatMetric(step.ms));
}

test("without JavaScript, the static transcript reads in full and nothing of the replay shows, with no axe violations", async ({ browser, page }) => {
  for (const width of [390, 1280]) {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
    const noJs = await ctx.newPage();
    await noJs.goto(PATH);
    const frame = frameOf(noJs);
    await expect(frame.locator("[data-demo-stage]")).toBeHidden();
    await expect(frame.locator("[data-demo-controls]")).toBeHidden();
    await expectFinished(frame);
    const items = frame.locator("[data-inbox-transcript] [data-inbox-item]");
    for (const [i, m] of DATA.messages.entries()) {
      for (const part of [m.from, m.subject, m.body, m.category, ACTION_LABEL[m.action], m.reason, m.draft]) {
        if (part !== undefined) await expect(items.nth(i), `${m.id} at ${width}px`).toContainText(part);
      }
    }
    await ctx.close();
  }
  // axe runs as page JavaScript, so the no-JS rendering is checked with every script stripped from
  // the page, as tests/e2e/solution-template.spec.mjs does. In a JavaScript-disabled context axe
  // never returns.
  await page.route(`**${PATH}`, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, "");
    await route.fulfill({ response, body });
  });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PATH);
    await expect(frameOf(page).locator("[data-demo-stage]")).toBeHidden();
    await expect(frameOf(page).locator("[data-inbox-transcript]")).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(violations, `axe without JavaScript at ${width}px`).toEqual([]);
  }
});

test("under reduced motion nothing loads or runs: the transcript is the result at once, with no controls and nothing announced", async ({ page }) => {
  const chunks = demoChunks(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PATH);
  const frame = frameOf(page);
  await expectFinished(frame);
  await expect(frame.locator("[data-inbox-transcript]")).toBeVisible();
  await expect(frame.locator("[data-demo-stage]")).toBeHidden();
  await expect(frame.locator("[data-demo-controls]")).toBeHidden();
  await page.waitForTimeout(1_000); // a run would have shown its first message by now
  await expect(frame.locator("[data-demo-transcript]")).toBeVisible();
  await expect(frame.locator("[data-demo-log] [data-log]")).toHaveCount(0);
  // The Pause test below sees both chunks load without reduced motion, so this can't pass vacuously.
  expect([...chunks], "no inbox chunk loads under reduced motion").toEqual([]);
});

test("Pause holds the replay where it is, and Resume carries on", async ({ page }) => {
  const chunks = demoChunks(page);
  await page.goto(PATH);
  // Running: the view is in the stage, and some of it, not all, has been shown.
  const running = async () => {
    const { pending } = await progress(page);
    return pending > 0 && pending < REVEALED_PARTS;
  };
  await expect.poll(running, { timeout: 10_000 }).toBe(true);
  expect([...chunks].sort(), "the replay and its data load as their own chunks").toEqual(["draft-for-approval", "inbox"]);
  const pause = page.locator("[data-demo-pause]");
  await pause.click();
  await expect(pause).toHaveText("Resume");
  await page.waitForTimeout(200); // a wait already due settles into the pause
  const held = await progress(page);
  expect(held.pending, "paused before the end").toBeGreaterThan(0);
  await page.waitForTimeout(3_000); // longer than any one wait in a run, the engine's 2.5 s STEP_GAP included
  expect(await progress(page)).toEqual(held);
  await pause.click();
  await expect(pause).toHaveText("Pause");
  await expect.poll(() => progress(page), { timeout: 5_000 }).not.toEqual(held);
});

test("Skip to result, from the keyboard, ends on the transcript at once: each part once, the frame keeping its height, focus on Replay, no skipped step announced, no axe violations", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(PATH);
  const frame = frameOf(page);
  await expect(stageOf(page).locator("[data-inbox-item]:not([data-inbox-pending])").first()).toBeVisible();
  const before = (await frame.boundingBox()).height;
  // From the keyboard: Skip disables itself, so focus must move to Replay, never drop to <body>.
  await page.locator("[data-demo-skip]").focus();
  await page.keyboard.press("Enter");
  await expectFinished(frame);
  await expect(frame.locator("[data-inbox-transcript]")).toBeVisible();
  await expect(page.locator("[data-demo-replay]")).toBeFocused();
  await expect(page.locator("[data-demo-skip]")).toBeDisabled();
  // The stage held the whole view from its first frame (spec §11.4 CLS), so ending moves nothing.
  expect(Math.abs((await frame.boundingBox()).height - before)).toBeLessThanOrEqual(2);
  // Skip abandons the run: the log holds the intro, then only the steps that finished before
  // Skip, each once and in plan order, then the skip line, and never a step it skipped.
  const logged = await frame.locator("[data-demo-log] [data-log]").evaluateAll((ps) => ps.map((p) => [p.getAttribute("data-log"), p.textContent]));
  const steps = logged.filter(([kind]) => kind === "step").map(([, line]) => line);
  expect(logged).toEqual([["start", introText(DATA)], ...steps.map((line) => ["step", line]), ["end", LOG.skipped]]);
  expect(steps, "each finished step once, in plan order").toEqual(LINES.slice(0, steps.length));
  expect(steps.length, "the steps Skip abandoned are never announced").toBeLessThan(LINES.length);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
    expect(violations, `axe after Skip at ${width}px`).toEqual([]);
  }
});

test("Replay mid-run starts again from the first message, and leaves one view with no leftovers", async ({ page }) => {
  await page.goto(PATH);
  const stage = stageOf(page);
  const shown = stage.locator("[data-inbox-item]:not([data-inbox-pending])");
  await expect.poll(() => shown.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(2);
  await page.locator("[data-demo-replay]").click();
  await expect.poll(() => shown.count(), { timeout: 2_000 }).toBeLessThan(2);
  await expect(stage.locator("[data-inbox-view]")).toHaveCount(1);
  await expect.poll(() => shown.count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(1);
  await page.locator("[data-demo-skip]").click();
  await expectFinished(frameOf(page));
  await expect(stage.locator("[data-inbox-view]")).toHaveCount(1);
  const actions = await stage.locator("[data-inbox-item]").evaluateAll((els) => els.map((el) => el.getAttribute("data-inbox-action")));
  expect(actions).toEqual(DATA.messages.map((m) => m.action));
});
