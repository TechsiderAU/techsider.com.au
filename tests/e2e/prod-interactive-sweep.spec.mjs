import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fileURLToPath } from "node:url";
import { elements, htmlFiles, idsIn, pageUrl, readText, startTags } from "../../scripts/ci/lib.mjs";
import { internalLinks, linkProblems } from "../support/gallery-links.mjs";

// The production sweep's interactive half (dist/, prod-chromium only; spec §6.5, §6.6, §8.7, §8.8,
// §11.4; Phase D blueprint scope ruling 5 and Review Focus 1). tests/site-sweep.test.mjs holds every
// page as it is built, and tests/e2e/prod-site-sweep.spec.mjs as it loads. This spec holds the states
// a visitor reaches with JavaScript to the same rules, on every page that has them. The page list and
// each page's demos and checkboxes are read from dist/ when the spec loads, so a page Phase E puts
// live is swept with no edit here:
// - every page loads nothing from another origin, makes no network call of its own (no fetch, XHR,
//   WebSocket, EventSource or beacon, even to its own origin), every request it makes succeeds, and
//   no script errs, through each demo's lazily loaded chunk and every checkbox ticked. The demos and
//   the checker make no network call (scope ruling 5, spec §8.7), and the site has no analytics (§14):
//   a page loads documents, styles, scripts, fonts and images, and nothing else;
// - each engine-backed demo ([data-demo-root]) keeps the replay contract (spec §6.5, §8.8): in the
//   built page its controls come before its stage and the stage before the polite log, and the stage
//   is never a live region; paused mid-run, the stage still shows aria-hidden while "Skip to result"
//   and Replay stay enabled; Skip, pressed from the keyboard, ends on the result without dropping
//   focus to <body>; under reduced motion, and without JavaScript, only the static transcript shows;
// - each engine-backed demo, paused mid-run and then skipped to its result: one h1, no id twice and
//   no axe violation at 390px and 1280px; no sideways scroll at 320px, and every internal link in
//   <main> landing;
// - every checkbox in <main> ticked (the checker's vendors; Phase E's contact-form consent): the
//   same checks, over the results the ticks reveal.
// A failure is a defect in the page, fixed where it lives, never exempted here.
const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));

/** How each [data-demo-root] in a built page breaks the replay's DOM contract (spec §6.5, §8.8), if it does. */
function replayContractProblems(html) {
  return elements(html, (t) => "data-demo-root" in t.attrs).flatMap((root, i) => {
    const tags = startTags(root.inner);
    const at = (hook) => tags.findIndex((t) => hook in t.attrs);
    const [controls, stage, log] = [at("data-demo-controls"), at("data-demo-stage"), at("data-demo-log")];
    const problems = [];
    if (!(controls >= 0 && controls < stage && stage < log)) problems.push(`demo ${i + 1}: not its controls, then its stage, then its log`);
    if (stage >= 0 && "aria-live" in tags[stage].attrs) problems.push(`demo ${i + 1}: the stage is a live region`);
    if (log >= 0 && tags[log].attrs["aria-live"] !== "polite") problems.push(`demo ${i + 1}: the log isn't aria-live="polite"`);
    return problems;
  });
}

const BUILT = htmlFiles(DIST).map((file) => {
  const html = readText(file);
  const main = elements(html, (t) => t.name === "main")[0]?.inner ?? "";
  return {
    path: pageUrl(DIST, file),
    demos: startTags(html).filter((t) => "data-demo-root" in t.attrs).length,
    boxes: startTags(main).filter((t) => t.name === "input" && t.attrs.type === "checkbox").length,
    contract: replayContractProblems(html),
  };
});
const DEMO_BUILT = BUILT.filter((p) => p.demos > 0);
const BOX_BUILT = BUILT.filter((p) => p.boxes > 0);
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const NARROWEST = { width: 320, height: 700 };
const NOTHING_ALLOWED = { paths: new Set(), fragments: new Map() };
/**
 * The request types a script makes when it calls the network itself (Playwright's resourceType();
 * "ping" is a beacon). The lazily loaded demo chunks are "script" requests, so they pass (final
 * review WB-D3: a same-origin fetch() in a replay passed the other-origin check).
 */
const NETWORK_CALLS = new Set(["fetch", "xhr", "websocket", "eventsource", "ping"]);

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const repeatedIds = (page) =>
  page.evaluate(() => {
    const ids = [...document.querySelectorAll("[id]")].map((el) => el.id);
    return [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  });

/** Collects the page's uncaught script errors from here on. */
function scriptErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

/** The frames that hold an engine-backed demo, in page order: exactly as many as the build put on the page. */
async function demoFrames(page, count) {
  const disclosure = page.locator(".solution-example:not([open]) > summary");
  if (await disclosure.count()) await disclosure.click();
  const frames = page.locator("[data-demo-frame]:has([data-demo-root])");
  await expect(frames, "engine-backed demo frames on the page").toHaveCount(count);
  return frames.all();
}

/**
 * Scrolls a demo's frame into view, which starts its run (on a demo page it has already started),
 * lets the run finish its first step and pauses it. A run that has already ended is replayed first:
 * Replay is never disabled (spec §8.8). The paused state must then be a mid-run one: the stage
 * shows, still aria-hidden, and "Skip to result" and Replay stay enabled.
 */
async function pauseMidRun(frame) {
  await frame.scrollIntoViewIfNeeded();
  await expect(frame.locator("[data-demo-controls]"), "the run never started").toBeVisible({ timeout: 15_000 });
  const pause = frame.locator("[data-demo-pause]");
  if (await pause.isDisabled()) await frame.locator("[data-demo-replay]").click();
  // The log's first line opens the run; a second means a step has finished drawing.
  await expect
    .poll(() => frame.locator("[data-demo-log] > *").count(), { message: "no step of the run finished", timeout: 15_000 })
    .toBeGreaterThan(1);
  await pause.click();
  const stage = frame.locator("[data-demo-stage]");
  await expect(stage, "paused mid-run, the stage shows").toBeVisible();
  await expect(stage, "paused mid-run, the stage is aria-hidden (spec §8.8)").toHaveAttribute("aria-hidden", "true");
  await expect(frame.locator("[data-demo-skip]"), "paused mid-run, Skip to result is available").toBeEnabled();
  await expect(frame.locator("[data-demo-replay]"), "Replay is never disabled mid-run").toBeEnabled();
}

/**
 * "Skip to result", pressed from the keyboard, then waits for the result (spec §8.8: Skip reveals
 * the static transcript's content): the playing stage is gone, and either the frame's transcript
 * shows again or the finished stage shows with aria-hidden dropped. The run's end may disable Skip,
 * but focus must not drop to <body> (Phase D Review Focus 1), and Replay stays enabled.
 */
async function skipToResult(frame) {
  await frame.locator("[data-demo-skip]").press("Enter");
  await expect
    .poll(
      () =>
        frame.evaluate((el) => {
          const shown = (node) => node !== null && node.checkVisibility();
          const stage = el.querySelector("[data-demo-stage]");
          const playing = shown(stage) && stage.getAttribute("aria-hidden") === "true";
          const result = shown(el.querySelector("[data-demo-transcript]")) || (shown(stage) && stage.getAttribute("aria-hidden") !== "true");
          return !playing && result;
        }),
      { message: "Skip to result never showed the result" },
    )
    .toBe(true);
  const focused = await frame.page().evaluate(() => document.activeElement?.tagName ?? "none");
  expect(focused, "focus dropped to <body> when the run ended").not.toMatch(/^(BODY|none)$/);
  await expect(frame.locator("[data-demo-replay]"), "Replay stays available at the result").toBeEnabled();
}

/**
 * Under reduced motion, or without JavaScript, nothing plays (spec §6.5, §8.8): every frame shows its
 * static transcript at once, and neither its controls nor its stage. The network settles first, so an
 * engine that wrongly loads and starts has had the time to show its controls.
 */
async function expectTranscriptsOnly(page, count, where) {
  for (const [i, frame] of (await demoFrames(page, count)).entries()) {
    await frame.scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    await expect(frame.locator("[data-demo-transcript]"), `${where}, demo ${i + 1}: the transcript`).toBeVisible();
    await expect(frame.locator("[data-demo-controls]"), `${where}, demo ${i + 1}: the controls`).toBeHidden();
    await expect(frame.locator("[data-demo-stage]"), `${where}, demo ${i + 1}: the stage`).toBeHidden();
  }
}

/** Ticks every visible checkbox in <main>; the checker's form shows once its script runs. Returns how many. */
async function tickAll(page) {
  const boxes = page.locator("main input[type=checkbox]");
  await expect(boxes.first(), "no checkbox in <main> is visible").toBeVisible();
  let ticked = 0;
  for (const box of await boxes.all()) {
    if (!(await box.isVisible())) continue;
    await box.check();
    ticked += 1;
  }
  return ticked;
}

/** One h1, no id twice and no axe violation, in the page's current state. */
async function expectSound(page, where) {
  await expect(page.locator("h1"), `${where}: h1 count`).toHaveCount(1);
  expect(await repeatedIds(page), `${where}: ids used twice`).toEqual([]);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(violations, `${where}: axe`).toEqual([]);
}

/** Every internal link in <main> as the page stands now, checked against what the server serves. */
async function landingProblems(page, request, path) {
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
  return linkProblems(links, served, NOTHING_ALLOWED);
}

test("the sweep finds the demos and the checker in the production build, and every replay keeps its DOM contract", () => {
  expect(BUILT.length, "dist/ holds no page: run `npm run build` first").toBeGreaterThan(0);
  // Phase D Tasks 7 and 8: the ① ② ③ replays on their demo pages and solution heroes, and ② on Home.
  expect(DEMO_BUILT.map((p) => p.path)).toEqual(
    expect.arrayContaining([
      "/demos/document-registers/", "/demos/knowledge-assistant/", "/demos/draft-for-approval/",
      "/solutions/document-registers/", "/solutions/knowledge-assistant/", "/solutions/draft-for-approval/",
    ]),
  );
  // Phase D Tasks 6 and 7: the checker, on its own page and on the ⑤ demo page.
  expect(BOX_BUILT.map((p) => p.path)).toEqual(expect.arrayContaining(["/resources/what-you-already-pay-for/", "/demos/ai-switch-on/"]));
  // Spec §6.5, §8.8: the controls come before the animated stage in DOM order, and only the log is live.
  expect(BUILT.flatMap((p) => p.contract.map((problem) => `${p.path} ${problem}`)), "replays that break the DOM contract").toEqual([]);
});

for (const { path, demos, boxes } of BUILT) {
  test(`${path} loads nothing from another origin, makes no network call, every request succeeds and no script errs, through its demos and ticked checkboxes`, async ({ page, baseURL }) => {
    const origin = new URL(baseURL).origin;
    const offsite = [];
    const calls = [];
    const failed = [];
    const errors = [];
    page.on("request", (r) => {
      const url = r.url();
      if (/^https?:/.test(url) && new URL(url).origin !== origin) offsite.push(url);
      if (NETWORK_CALLS.has(r.resourceType())) calls.push(`${r.resourceType()} ${url}`);
    });
    page.on("websocket", (ws) => calls.push(`websocket ${ws.url()}`));
    page.on("requestfailed", (r) => failed.push(`${r.url()} (${r.failure()?.errorText})`));
    page.on("response", (r) => {
      if (r.status() >= 400) failed.push(`${r.url()} (${r.status()})`);
    });
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    expect((await page.goto(path)).status()).toBe(200);
    for (const frame of await demoFrames(page, demos)) {
      await frame.scrollIntoViewIfNeeded();
      await expect(frame.locator("[data-demo-controls]"), "the run never started").toBeVisible({ timeout: 15_000 });
    }
    if (boxes > 0) await tickAll(page);
    await page.waitForLoadState("networkidle");
    expect(offsite, "requests to another origin").toEqual([]);
    expect(calls, "network calls a script made (fetch, XHR, WebSocket, EventSource, beacon)").toEqual([]);
    expect(failed, "requests that failed").toEqual([]);
    expect(errors, "script and console errors").toEqual([]);
  });
}

for (const { path, demos } of DEMO_BUILT) {
  test.describe(path, () => {
    test("each demo, paused mid-run and then at its result: one h1, no id twice, no axe violation at 390px and 1280px", async ({ page }) => {
      test.slow();
      const errors = scriptErrors(page);
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        for (const [i, frame] of (await demoFrames(page, demos)).entries()) {
          await pauseMidRun(frame);
          await expectSound(page, `${width}px, demo ${i + 1} paused`);
          await skipToResult(frame);
          await expectSound(page, `${width}px, demo ${i + 1} at its result`);
        }
      }
      expect(errors, "script errors").toEqual([]);
    });

    test("each demo shows only its transcript under reduced motion and without JavaScript; paused mid-run and then at its result: no sideways scroll at 320px, and every internal link in <main> lands", async ({ page, request, browser }) => {
      test.slow();
      const errors = scriptErrors(page);
      await page.setViewportSize(NARROWEST);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      await expectTranscriptsOnly(page, demos, "reduced motion");
      const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: NARROWEST });
      const noJs = await ctx.newPage();
      await noJs.goto(path);
      await expectTranscriptsOnly(noJs, demos, "without JavaScript");
      await ctx.close();
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.goto(path);
      for (const [i, frame] of (await demoFrames(page, demos)).entries()) {
        await pauseMidRun(frame);
        expect(await overflow(page), `demo ${i + 1} paused`).toBeLessThanOrEqual(0);
        await skipToResult(frame);
        expect(await overflow(page), `demo ${i + 1} at its result`).toBeLessThanOrEqual(0);
        expect(await landingProblems(page, request, path), `demo ${i + 1} at its result`).toEqual([]);
      }
      expect(errors, "script errors").toEqual([]);
    });
  });
}

for (const { path } of BOX_BUILT) {
  test.describe(path, () => {
    test("every checkbox in <main> ticked: one h1, no id twice, no axe violation at 390px and 1280px", async ({ page }) => {
      test.slow();
      const errors = scriptErrors(page);
      for (const width of [390, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        expect(await tickAll(page), `${width}px`).toBeGreaterThan(0);
        await expectSound(page, `${width}px, every checkbox ticked`);
      }
      expect(errors, "script errors").toEqual([]);
    });

    test("every checkbox in <main> ticked: no sideways scroll at 320px, and every internal link in <main> lands", async ({ page, request }) => {
      const errors = scriptErrors(page);
      await page.setViewportSize(NARROWEST);
      await page.goto(path);
      expect(await tickAll(page)).toBeGreaterThan(0);
      expect(await overflow(page), "every checkbox ticked").toBeLessThanOrEqual(0);
      expect(await landingProblems(page, request, path)).toEqual([]);
      expect(errors, "script errors").toEqual([]);
    });
  });
}
