import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { demoFixture } from "../../src/fixtures/index.ts";
import { LOG } from "../../src/scripts/demo-engine.ts";
import { REPLAY_INTRO, announcedSteps, downloadsOf, pageAnchor, registerView } from "../../src/lib/register.ts";

// The ① register demo in a browser (spec §8.8, §9.1 ①), on the preview gallery's demo page:
// DemoEngine (kind "register") and RegisterTranscript over the register fixture.
// - The replay copies the transcript into the stage and reads the chosen register a row at a time,
//   announcing each row with a flagged value once, then the summary; Pause holds it, Replay
//   restarts it cleanly, Skip ends it.
// - The transcript is the final state. With JavaScript it shows one register at a time, and a value
//   opens its page in the side panel, highlighted; Back returns focus. Under reduced motion nothing
//   replays and the transcript works the same. Without JavaScript it reads in full, and each value
//   jumps to its marked page.
// tests/register-demo.test.mjs covers the real data, the replay's steps and the built markup.
const PATH = "/preview/templates/demo/";
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const DATA = demoFixture.data;
const VIEWS = DATA.registers.map((r) => registerView(DATA, r.id));
const [FIRST, SECOND] = VIEWS;
const valuesOf = (view) => view.rows.flatMap((row) => row.cells.map((cell) => ({ view, row, cell })));
// A value on its page in the register shown first; a flagged value with a note; and a flagged
// value its page doesn't have. tests/register-demo.test.mjs holds the fixture to having them.
const FOUND = valuesOf(FIRST).find(({ cell }) => cell.status === "ok" && cell.at !== null);
const FLAGGED = VIEWS.flatMap(valuesOf).find(({ cell }) => cell.status !== "ok" && cell.at !== null && cell.note !== null);
const ABSENT = VIEWS.flatMap(valuesOf).find(({ cell }) => cell.status !== "ok" && cell.at === null);
/** Twice a run of the fixture's first register: about 9.5 s, with the engine's 2.5 s STEP_GAP after each of its three lines. */
const RUN_MS = 20_000;

const stage = (page) => page.locator("[data-demo-stage]");
const copy = (page) => stage(page).locator("[data-register-replay]");
const transcript = (page) => page.locator("[data-demo-transcript] [data-register-transcript]");
const panel = (page) => transcript(page).locator("[data-register-panel]");
const logLines = (page) => page.locator("[data-demo-log] p").allTextContents();

test.beforeAll(() => {
  if (!FOUND || !FLAGGED || !ABSENT) throw new Error("the register fixture needs an ok value on its page, a flagged value on its page with a note, and a flagged value its page doesn't have");
});

/** Ends the run that started on load with Skip, and waits for the transcript. */
async function skipToResult(page) {
  await expect(copy(page)).toBeVisible();
  await page.locator("[data-demo-skip]").click();
  await expect(transcript(page)).toBeVisible();
  await expect(stage(page)).toBeHidden();
}

/** Opens the page with reduced motion: no replay, so the transcript is the demo from the start. */
async function gotoStill(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(PATH);
  await expect(transcript(page)).toBeVisible();
}

test("the replay reads the first register a row at a time, announces each flagged row once, then the summary, and ends on the transcript", async ({ page }) => {
  await page.goto(PATH);
  await expect(copy(page)).toBeVisible();
  await expect(copy(page).locator(`[data-register="${FIRST.id}"]`)).toBeVisible();
  await expect(stage(page)).toBeHidden({ timeout: RUN_MS });
  await expect(transcript(page)).toBeVisible();
  expect(await logLines(page)).toEqual([REPLAY_INTRO, ...announcedSteps(FIRST), LOG.finished]);
});

test("Pause holds the replay mid-register, and Replay starts it again with nothing left of the old run", async ({ page }) => {
  await page.goto(PATH);
  await expect(copy(page).locator("tbody tr").first()).toBeVisible();
  await page.locator("[data-demo-pause]").click();
  await page.waitForTimeout(400); // a value already due may still show
  const shown = copy(page).locator(`[data-register="${FIRST.id}"] td:not(.rg-pending)`);
  const held = await shown.count();
  expect(held).toBeLessThan(FIRST.rows.length * FIRST.fields.length);
  await page.waitForTimeout(1500);
  await expect(shown).toHaveCount(held);
  await expect(stage(page)).toBeVisible();
  await page.locator("[data-demo-replay]").click();
  await expect(copy(page)).toHaveCount(1);
  await expect(stage(page)).toBeHidden({ timeout: RUN_MS });
  expect(await logLines(page)).toEqual([REPLAY_INTRO, ...announcedSteps(FIRST), LOG.finished]);
});

test("Skip to result shows the transcript at once: one register, its exception queue, the side panel's hint and both downloads", async ({ page }) => {
  await page.goto(PATH);
  await skipToResult(page);
  await expect(transcript(page).locator(`[data-register="${FIRST.id}"]`)).toBeVisible();
  await expect(transcript(page).locator(`[data-register="${SECOND.id}"]`)).toBeHidden();
  await expect(transcript(page).locator("[data-register-docs]")).toBeHidden();
  await expect(panel(page).locator("[data-register-hint]")).toBeVisible();
  const queue = transcript(page).locator(`[data-register="${FIRST.id}"] [data-register-queue-item]`);
  await expect(queue).toHaveCount(FIRST.queue.length);
  for (const [i, { row, cell }] of FIRST.queue.entries()) {
    await expect(queue.nth(i)).toContainText(`${row.doc.title}, ${cell.label}: [${cell.status}] ${cell.value}`);
    if (cell.note) await expect(queue.nth(i)).toContainText(cell.note);
  }
  for (const href of Object.values(downloadsOf(DATA))) await expect(transcript(page).locator(`a[download][href="${href}"]`)).toBeVisible();
});

test("under reduced motion nothing replays: the controls stay hidden and the transcript is the demo, toggle and side panel included", async ({ page }) => {
  await gotoStill(page);
  // A run starts within moments of load when one is going to (the frame is in view), so give it a
  // real second before asserting that none did; asserting at once could pass before a run begins.
  await page.waitForTimeout(1_000);
  await expect(stage(page)).toBeHidden();
  await expect(page.locator("[data-demo-controls]")).toBeHidden();
  expect(await logLines(page)).toEqual([]);
  await expect(transcript(page).locator("[data-register-switch]")).toBeVisible();
  await expect(panel(page)).toBeVisible();
  await expect(transcript(page).locator("[data-register-docs]")).toBeHidden();
});

test("a value opens its page in the side panel with only that value highlighted, and Back returns focus to it", async ({ page }) => {
  await gotoStill(page);
  const { row, cell } = FOUND;
  const link = transcript(page).locator(`[data-register-cell="${cell.id}"]`);
  await link.click();
  const title = panel(page).locator("[data-register-panel-title]");
  await expect(title).toHaveText(`${row.doc.title}, page ${cell.page}`);
  await expect(title).toBeFocused();
  await expect(panel(page)).toHaveAccessibleName(`${row.doc.title}, page ${cell.page}`);
  await expect(page).toHaveURL(new RegExp(`${PATH}$`)); // the panel opened; the page didn't jump
  const text = panel(page).locator("[data-register-panel-text]");
  await expect(text).toHaveText(cell.pageText);
  await expect(text.locator("mark")).toHaveText([cell.pageText.slice(cell.at.start, cell.at.end)]);
  await expect(link).toHaveAttribute("aria-current", "true");
  await panel(page).locator("[data-register-back]").click();
  await expect(link).toBeFocused();
});

test("from the exception queue, a flagged value shows its status in words and its note; a value its page lacks says nothing is highlighted", async ({ page }) => {
  await gotoStill(page);
  for (const { view, row, cell } of [FLAGGED, ABSENT]) {
    await transcript(page).locator(`[data-register-choice="${view.id}"]`).click();
    const entry = transcript(page).locator(`[data-register-open="${cell.id}"]`);
    await entry.click();
    await expect(panel(page).locator("[data-register-panel-title]")).toHaveText(`${row.doc.title}, page ${cell.page}`);
    await expect(panel(page).locator(".rg-panel-field")).toHaveText(`${cell.label}: [${cell.status}] ${cell.value}`);
    if (cell.note) await expect(panel(page).locator("[data-register-note]")).toHaveText(cell.note);
    const marks = panel(page).locator("[data-register-panel-text] mark");
    if (cell.at) await expect(marks).toHaveText([cell.pageText.slice(cell.at.start, cell.at.end)]);
    else {
      await expect(marks).toHaveCount(0);
      await expect(panel(page)).toContainText("Nothing is highlighted: this value records something the page doesn't have.");
    }
    await panel(page).locator("[data-register-back]").click();
    await expect(entry).toBeFocused();
  }
});

test("the toggle shows the other register and keeps focus; Replay then replays that register", async ({ page }) => {
  await page.goto(PATH);
  await skipToResult(page);
  const second = transcript(page).locator(`[data-register-choice="${SECOND.id}"]`);
  await second.focus();
  await page.keyboard.press("Enter");
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await expect(transcript(page).locator(`[data-register-choice="${FIRST.id}"]`)).toHaveAttribute("aria-pressed", "false");
  await expect(second).toBeFocused();
  await expect(transcript(page).locator(`[data-register="${SECOND.id}"]`)).toBeVisible();
  await expect(transcript(page).locator(`[data-register="${FIRST.id}"]`)).toBeHidden();
  await expect(transcript(page).getByRole("table", { name: SECOND.title })).toBeVisible();
  await page.locator("[data-demo-replay]").click();
  await expect(copy(page).locator(`[data-register="${SECOND.id}"]`)).toBeVisible();
  await expect(copy(page).locator(`[data-register="${FIRST.id}"]`)).toBeHidden();
  await expect(stage(page)).toBeHidden({ timeout: RUN_MS });
  expect(await logLines(page)).toEqual([REPLAY_INTRO, ...announcedSteps(SECOND), LOG.finished]);
});

test("with a page open: no axe violations at 390px and 1280px, 44px targets, and no sideways scroll at 320px", async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await gotoStill(page);
    await transcript(page).locator(`[data-register-cell="${FOUND.cell.id}"]`).click();
    const { violations } = await new AxeBuilder({ page }).include("[data-demo-frame]").withTags(WCAG).analyze();
    expect(violations, `${width}px`).toEqual([]);
    const small = await transcript(page).evaluate((root) =>
      [...root.querySelectorAll("a, button")]
        .filter((el) => el.checkVisibility({ checkVisibilityCSS: true }))
        .map((el) => ({ name: el.textContent.trim(), ...el.getBoundingClientRect().toJSON() }))
        .filter((r) => r.width < 44 || r.height < 44)
        .map((r) => `${r.name} (${Math.round(r.width)}×${Math.round(r.height)})`));
    expect(small, `${width}px`).toEqual([]);
  }
  await page.setViewportSize({ width: 320, height: 700 });
  await gotoStill(page);
  await transcript(page).locator(`[data-register-cell="${FOUND.cell.id}"]`).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

for (const width of [390, 1280]) {
  test(`without JavaScript the transcript reads in full, and each value jumps to its marked page, at ${width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(PATH);
    await expect(page.locator("[data-demo-controls]")).toBeHidden();
    await expect(stage(page)).toBeHidden();
    await expect(transcript(page).locator("[data-register-switch]")).toBeHidden();
    await expect(panel(page)).toBeHidden();
    for (const view of VIEWS) {
      const table = transcript(page).getByRole("table", { name: view.title });
      await expect(table).toBeVisible();
      await expect(table.getByRole("row")).toHaveCount(view.rows.length + 1);
      // Each row header names its document, then its template: the "·" between them is aria-hidden (ledger ruling R4).
      for (const [i, row] of view.rows.entries()) await expect(table.getByRole("rowheader").nth(i)).toHaveAccessibleName(`${row.doc.title} ${row.doc.template}`);
    }
    const { row, cell } = FOUND;
    const anchor = pageAnchor("register", row.doc.id, cell.page);
    await transcript(page).locator(`[data-register-cell="${cell.id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#${anchor}$`));
    const target = page.locator(`[id="${anchor}"]`);
    await expect(target).toBeInViewport();
    await expect(target.locator("mark", { hasText: cell.pageText.slice(cell.at.start, cell.at.end) }).first()).toBeVisible();
    for (const href of Object.values(downloadsOf(DATA))) await expect(transcript(page).locator(`a[download][href="${href}"]`)).toBeVisible();
    await ctx.close();
  });
}
