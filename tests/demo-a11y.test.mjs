// The demo engine's accessibility contract (spec §6.5, §8.8; Phase D Review Focus 1 and 2), in two
// halves. The markup half reads the dedicated demo page's demo band (dist/index.html, `npm run build`
// first). The behaviour half drives src/scripts/demo-engine.ts with the real ② renderer over the
// real data file, on the fake DOM in tests/support/fake-dom.mjs with mocked timers. Every
// guarantee the Phase 0 tests pinned on the old src/scripts/demo.ts carries over: the stage is
// never a live region, the controls come first and ship hidden, Replay is never disabled, each
// turn is announced once, Replay mid-run leaves nothing of the old run, and a control that
// disables never takes keyboard focus down with it. Phase D adds one: each announced turn has the
// log to itself for STEP_GAP, so a screen reader can finish the line before the next lands.
// tests/e2e/demo-engine.spec.mjs runs the same contract in real browsers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDist } from "./helpers.mjs";
import { h, installDocument } from "./support/fake-dom.mjs";
import { LOG, STEP_GAP, mountDemo } from "../src/scripts/demo-engine.ts";
import { assistantRenderer } from "../src/scripts/demo/assistant.ts";
import { announcements, introText } from "../src/lib/assistant-copy.ts";

const DATA = JSON.parse(readFileSync(new URL("../src/data/demos/knowledge-assistant.json", import.meta.url), "utf8")).data;
const LINES = announcements(DATA);
const QUESTIONS = DATA.scenarios.flatMap((s) => s.turns.map((t) => t.question));

// ---------------------------------------------------------------------------
// Markup: the dedicated demo page, without its inline <style>/<script> bodies (the transcript's
// global styles name the hooks too, and DOM-order checks must only see real elements).
// ---------------------------------------------------------------------------
const home = readDist("demos/knowledge-assistant/index.html").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
const band = home;
const tagOf = (attr) => {
  const m = band.match(new RegExp(`<[a-z]+[^>]*\\b${attr}\\b[^>]*>`));
  assert.ok(m, `element with ${attr} not found in the #demo band`);
  return m[0];
};
const at = (attr) => band.indexOf(attr);

test("the typing stage ships hidden and aria-hidden, and is never a live region", () => {
  const stage = tagOf("data-demo-stage");
  assert.doesNotMatch(stage, /aria-live/);
  assert.match(stage, /aria-hidden="true"/);
  assert.match(stage, /\shidden(?=[\s>])/);
});

test("Pause, Skip to result and Replay come before the stage in DOM order, and the log after it", () => {
  for (const hook of ["data-demo-pause", "data-demo-skip", "data-demo-replay"]) {
    assert.ok(at(hook) > 0 && at(hook) < at("data-demo-stage"), `${hook} must precede the animated region`);
  }
  assert.ok(at("data-demo-pause") < at("data-demo-skip") && at("data-demo-skip") < at("data-demo-replay"), "Pause, Skip, Replay");
  assert.ok(at("data-demo-log") > at("data-demo-stage"));
});

test("the controls ship hidden, so visitors without JavaScript meet no dead buttons", () => {
  assert.match(tagOf("data-demo-controls"), /\shidden(?=[\s>])/);
});

test("Replay is a control-bar button like the others, never disabled in the markup", () => {
  for (const hook of ["data-demo-pause", "data-demo-skip", "data-demo-replay"]) {
    const tag = tagOf(hook);
    assert.match(tag, /^<button\b/);
    assert.match(tag, /type="button"/);
    assert.doesNotMatch(tag, /\sdisabled(?=[\s>=])/);
  }
});

test("one polite log announces progress: visually hidden, empty, and the band's only live region", () => {
  const log = tagOf("data-demo-log");
  assert.match(log, /aria-live="polite"/);
  assert.match(log, /class="sr-only"/);
  assert.match(band, /data-demo-log[^>]*><\/div>/, "the log ships empty");
  const section = band;
  assert.equal(section.match(/aria-live=/g).length, 1);
  assert.doesNotMatch(section, /role="(status|alert|log)"/);
});

test("the static transcript is the frame's transcript slot, and ships visible", () => {
  const slot = tagOf("data-demo-transcript");
  assert.doesNotMatch(slot, /\shidden(?=[\s>])/);
  assert.ok(at("data-assistant-transcript") > at("data-demo-transcript"));
});

// ---------------------------------------------------------------------------
// Behaviour: the engine with the real ② renderer, on the fake DOM, with mocked setTimeout.
// ---------------------------------------------------------------------------

/** A demo frame shaped like DemoFrame + DemoEngine + AssistantTranscript, installed as `document`. */
function mountFake() {
  const root = h(
    "div",
    { "data-demo-root": "", "data-demo-kind": "assistant" },
    h(
      "div",
      { "data-demo-controls": "", hidden: "" },
      h("button", { "data-demo-pause": "" }, "Pause"),
      h("button", { "data-demo-skip": "" }, "Skip to result"),
      h("button", { "data-demo-replay": "" }, "Replay"),
    ),
    h("div", { "data-demo-stage": "", "aria-hidden": "true", hidden: "" }),
    h("div", { "data-demo-log": "", "aria-live": "polite" }),
  );
  const cite = h("a", { href: "#assistant-cite-src-1" }, "[1]");
  const transcript = h("div", { "data-demo-transcript": "" }, h("div", { "data-assistant-transcript": "" }, cite));
  const frame = h("figure", { "data-demo-frame": "" }, h("div", { "data-demo-engine": "" }, root), transcript);
  const elsewhere = h("a", { href: "/contact/" }, "Talk to us");
  const body = h("body", {}, frame, elsewhere);
  installDocument(body);
  return { root, transcript, cite, elsewhere, body };
}

/** Mounts a fresh demo with mocked timers; `start` defaults to true. Returns hooks and helpers. */
function setUp(t, { reducedMotion = false, start = true } = {}) {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const dom = mountFake();
  const q = (sel) => dom.root.querySelector(sel);
  const hooks = {
    controls: q("[data-demo-controls]"),
    pause: q("[data-demo-pause]"),
    skip: q("[data-demo-skip]"),
    replay: q("[data-demo-replay]"),
    stage: q("[data-demo-stage]"),
    log: q("[data-demo-log]"),
  };
  const handle = mountDemo(dom.root, assistantRenderer(DATA), { reducedMotion });
  const lines = (kind) => hooks.log.childNodes.filter((p) => kind === undefined || p.getAttribute("data-log") === kind).map((p) => p.textContent);
  const flush = () => new Promise((r) => setImmediate(r));
  /** Advances the mocked clock a millisecond at a time until `cond()` holds. */
  const until = async (cond, what) => {
    for (let ms = 0; ms < 600_000; ms++) {
      if (cond()) return;
      t.mock.timers.tick(1);
      await flush();
    }
    assert.fail(`timed out waiting for ${what}`);
  };
  /** Advances the clock by `ms`, letting the run react. */
  const advance = async (ms) => {
    for (let i = 0; i < ms; i += 10) {
      t.mock.timers.tick(10);
      await flush();
    }
  };
  const ended = () => hooks.skip.disabled;
  if (start) handle.start();
  return { ...dom, ...hooks, handle, lines, until, advance, ended };
}

const focused = () => document.activeElement;
/** True once the first question has started typing into the stage. */
const typing = (d) => (d.stage.querySelector(".assist-q")?.textContent.length ?? 0) > 10;

test("starting reveals the controls and puts the stage in the transcript's place, at its height", (t) => {
  const d = setUp(t, { start: false });
  d.transcript.offsetHeight = 1234;
  d.handle.start();
  assert.equal(d.controls.hidden, false);
  assert.equal(d.transcript.hidden, true);
  assert.equal(d.stage.hidden, false);
  assert.equal(d.stage.getAttribute("aria-hidden"), "true");
  assert.equal(d.stage.style.minHeight, "1234px");
  assert.equal(d.pause.disabled, false);
  assert.equal(d.skip.disabled, false);
  assert.deepEqual(d.lines(), [introText(DATA)]);
});

test("each finished turn is announced once, in order, while the stage stays aria-hidden", async (t) => {
  const d = setUp(t);
  await d.until(() => d.lines("step").length === 1, "the first turn");
  assert.equal(d.stage.getAttribute("aria-hidden"), "true");
  assert.equal(d.stage.getAttribute("aria-live"), null);
  await d.until(d.ended, "the run to end");
  assert.deepEqual(d.lines("start"), [introText(DATA)]);
  assert.deepEqual(d.lines("step"), LINES);
  assert.deepEqual(d.lines("end"), [LOG.finished]);
  assert.equal(d.lines().length, LINES.length + 2);
});

test("each announced turn has the log to itself for STEP_GAP: the replay draws nothing more until it has passed (Review Focus 1)", async (t) => {
  const d = setUp(t);
  await d.until(() => d.lines("step").length === 1, "the first turn");
  const drawn = d.stage.textContent;
  await d.advance(STEP_GAP - 20);
  assert.equal(d.stage.textContent, drawn, "the replay drew on before a screen reader could finish the line");
  assert.equal(d.lines("step").length, 1);
  await d.until(() => d.stage.textContent !== drawn, "the replay to draw on after the gap");
  await d.until(() => d.lines("step").length === 2, "the second turn");
});

test("a finished run shows the transcript in the stage's place and leaves only Replay enabled", async (t) => {
  const d = setUp(t);
  await d.until(d.ended, "the run to end");
  assert.equal(d.transcript.hidden, false);
  assert.equal(d.stage.hidden, true);
  assert.equal(d.stage.style.minHeight, "");
  assert.equal(d.pause.disabled, true);
  assert.equal(d.skip.disabled, true);
  assert.equal(d.replay.disabled, false);
  assert.equal(d.pause.textContent, "Pause");
});

test("Pause holds the run, however long, until Resume", async (t) => {
  const d = setUp(t);
  await d.until(() => d.lines("step").length === 1, "the first turn");
  d.pause.click();
  assert.equal(d.pause.textContent, "Resume");
  assert.equal(d.lines().at(-1), LOG.paused);
  const drawn = d.stage.textContent;
  await d.advance(60_000);
  assert.equal(d.stage.textContent, drawn, "nothing is drawn while paused");
  assert.equal(d.lines("step").length, 1);
  d.pause.click();
  assert.equal(d.pause.textContent, "Pause");
  assert.equal(d.lines().at(-1), LOG.resumed);
  await d.until(() => d.lines("step").length === 2, "the second turn");
});

test("Skip to result, from the keyboard, ends the run at once: the transcript shows, focus moves to Replay, and no skipped turn is announced", async (t) => {
  const d = setUp(t);
  await d.until(() => typing(d), "the first question to start typing");
  d.skip.focus();
  assert.equal(focused(), d.skip);
  d.skip.click();
  assert.equal(focused(), d.replay);
  assert.equal(d.transcript.hidden, false);
  assert.equal(d.stage.hidden, true);
  assert.equal(d.pause.disabled, true);
  assert.equal(d.skip.disabled, true);
  assert.equal(d.replay.disabled, false);
  assert.deepEqual(d.lines(), [introText(DATA), LOG.skipped]);
  await d.advance(60_000);
  assert.deepEqual(d.lines(), [introText(DATA), LOG.skipped], "the abandoned run announces nothing later");
});

test("Skip while paused ends the run too", async (t) => {
  const d = setUp(t);
  await d.until(() => typing(d), "the first question to start typing");
  d.pause.click();
  d.skip.click();
  assert.equal(d.transcript.hidden, false);
  assert.equal(d.pause.textContent, "Pause");
  assert.equal(d.lines().at(-1), LOG.skipped);
});

for (const [when, ready] of [
  ["between turns", (d) => d.lines("step").length === 1],
  ["mid-typing", (d) => d.lines("step").length === 0 && typing(d)],
]) {
  test(`Replay ${when} restarts cleanly: a fresh log, and nothing of the old run in the stage`, async (t) => {
    const d = setUp(t);
    await d.until(() => ready(d), `the point to press Replay ${when}`);
    d.replay.click();
    assert.deepEqual(d.lines(), [introText(DATA)], "the log starts again");
    await d.until(d.ended, "the replayed run to end");
    assert.equal(d.stage.querySelectorAll(".assist").length, 1);
    assert.deepEqual(d.stage.querySelectorAll(".assist-q").map((q) => q.textContent), QUESTIONS);
    assert.deepEqual(d.lines("step"), LINES);
  });
}

test("Replay while paused starts a new run that isn't paused", async (t) => {
  const d = setUp(t);
  await d.until(() => d.lines("step").length === 1, "the first turn");
  d.pause.click();
  d.replay.click();
  assert.equal(d.pause.textContent, "Pause");
  await d.until(() => d.lines("step").length === 1, "the new run's first turn");
});

test("Pause focused when the run ends by itself hands focus to Replay", async (t) => {
  const d = setUp(t);
  d.pause.focus();
  await d.until(d.ended, "the run to end");
  assert.equal(focused(), d.replay);
});

test("the end of a run doesn't move focus that was elsewhere on the page", async (t) => {
  const d = setUp(t);
  d.elsewhere.focus();
  await d.until(d.ended, "the run to end");
  assert.equal(focused(), d.elsewhere);
});

test("under prefers-reduced-motion nothing runs: the transcript stays, and the controls stay hidden", async (t) => {
  const d = setUp(t, { reducedMotion: true });
  await d.advance(1_000);
  assert.equal(d.transcript.hidden, false);
  assert.equal(d.stage.hidden, true);
  assert.equal(d.controls.hidden, true);
  assert.deepEqual(d.lines(), []);
});

test("a run never starts under a keyboard or screen reader user reading the transcript: the controls appear with Replay ready", async (t) => {
  const d = setUp(t, { start: false });
  d.cite.focus();
  d.handle.start();
  await d.advance(1_000);
  assert.equal(focused(), d.cite);
  assert.equal(d.transcript.hidden, false);
  assert.equal(d.stage.hidden, true);
  assert.equal(d.controls.hidden, false);
  assert.equal(d.pause.disabled, true);
  assert.equal(d.skip.disabled, true);
  assert.equal(d.replay.disabled, false);
  assert.deepEqual(d.lines(), []);
  d.replay.click();
  assert.equal(d.transcript.hidden, true);
  assert.equal(focused(), d.replay, "focus leaves the transcript before it hides");
  assert.deepEqual(d.lines(), [introText(DATA)]);
  // Ruling R4: a screen reader's browse mode can activate a link and leave DOM focus where it was,
  // so a click in the frame holds off the run as focus in the transcript does.
  const sr = mountFake();
  const handle = mountDemo(sr.root, assistantRenderer(DATA), { reducedMotion: false });
  sr.cite.click();
  handle.start();
  assert.equal(sr.transcript.hidden, false, "a click in the frame, with focus still on <body>, holds off the run");
});
