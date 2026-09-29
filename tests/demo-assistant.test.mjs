// The ② Knowledge Assistant demo (spec §8.8, §9.1; Phase D Review Focus 2): its words
// (src/lib/assistant-copy.ts), its replay (src/scripts/demo/assistant.ts) over the real data file,
// and its static transcript as the built Home renders it (dist/index.html, `npm run build` first).
// The replay and the transcript are held to the same text, so a finished or skipped run shows
// exactly what was typed, and the replay can never say what the transcript doesn't.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDist, visibleText } from "./helpers.mjs";
import { elements, elementsWith, hrefsIn, idsIn } from "../scripts/ci/lib.mjs";
import { h, installDocument } from "./support/fake-dom.mjs";
import { createPlayback } from "../src/scripts/playback.ts";
import { assistantRenderer } from "../src/scripts/demo/assistant.ts";
import { OUTCOME, announcements, citesIn, introText, metricText } from "../src/lib/assistant-copy.ts";
import { attributionText } from "../src/lib/attribution.ts";
import { assistantData } from "../src/content/schemas.ts";

const FILE = JSON.parse(readFileSync(new URL("../src/data/demos/knowledge-assistant.json", import.meta.url), "utf8"));
const DATA = FILE.data;
const TURNS = DATA.scenarios.flatMap((s) => s.turns);

/** Runs the renderer to the end on an instant playback, into a fresh fake stage. */
async function replayAll(data = DATA) {
  const stage = h("div", { "data-demo-stage": "", "aria-hidden": "true" });
  installDocument(h("body", {}, stage));
  const steps = [];
  for await (const step of assistantRenderer(data).steps(stage, createPlayback({ instant: true }))) steps.push(step.announce);
  return { stage, steps };
}

/** The Home's transcript: its HTML, without the "Source " words only a screen reader hears. */
const transcriptHtml = () => {
  const [transcript] = elementsWith(readDist("index.html"), "data-assistant-transcript");
  assert.ok(transcript, "the built Home has no [data-assistant-transcript]");
  return transcript.inner;
};
const withoutSrOnly = (html) => html.replace(/<span class="sr-only"[^>]*>[^<]*<\/span>/g, "");
const squash = (s) => s.replace(/\s+/g, "");

test("the data file's data is exactly what the schema returns, so the replay reads what the build validated", () => {
  assert.deepEqual(assistantData.parse(DATA), DATA);
});

test("the replay takes one step per turn, in order, each announced as announcements() says", async () => {
  const { steps } = await replayAll();
  assert.equal(steps.length, TURNS.length);
  assert.deepEqual(steps, announcements(DATA));
});

test("each announcement names its question and its outcome, and leaves the intro to say how to skip ahead", () => {
  const lines = announcements(DATA);
  const outcome = {
    answered: /Answered(, citing sources? [\d, and]+)?\./,
    refused: /Refused: the answer isn't in these documents\./,
    "false-answer-caught": /False answer, caught by the acceptance test \(not independent\)\./, // spec §4.4
  };
  TURNS.forEach((turn, i) => {
    assert.ok(lines[i].includes(`Question ${i + 1} of ${TURNS.length}: ${turn.question}`), lines[i]);
    assert.match(lines[i], outcome[turn.outcome]);
    assert.doesNotMatch(lines[i], /Skip to result/, lines[i]);
    assert.doesNotMatch(lines[i], /\.\s*\./, `a doubled period (the scenario titles end in one): ${lines[i]}`);
  });
  let n = 0;
  DATA.scenarios.forEach((scenario, si) => {
    const named = `Scenario ${si + 1} of ${DATA.scenarios.length}, ${scenario.title.replace(/\.$/, "")}. `;
    assert.equal(lines[n].startsWith(named), DATA.scenarios.length > 1, lines[n]);
    n += scenario.turns.length;
  });
});

test("the intro counts the questions and names Pause and Skip to result", () => {
  const intro = introText(DATA);
  assert.match(intro, new RegExp(`^Replay started: ${TURNS.length} questions`));
  assert.match(intro, /Pause/);
  assert.match(intro, /Skip to result/);
});

test("announcements: one scenario isn't named; citations are listed once each, in first-use order", () => {
  const turn = (outcome, cites) => ({
    question: "Fixture question?",
    retrieved: [{ cite: 0, snippet: "x", score: { value: 0.5 } }],
    answer: cites.map((cite) => ({ text: "x", cite })),
    outcome,
    trace: [{ label: "Retrieve", detail: "x", ms: { value: 1, unit: "ms" } }],
  });
  const data = { scenarios: [{ id: "fixture", title: "Fixture", corpus: {}, sources: [], turns: [turn("answered", [1, 2, 1, 4]), turn("answered", [3]), turn("refused", [])] }] };
  assert.deepEqual(citesIn(data.scenarios[0].turns[0]), [1, 2, 4]);
  assert.deepEqual(announcements(data), [
    "Question 1 of 3: Fixture question? Answered, citing sources 1, 2 and 4.",
    "Question 2 of 3: Fixture question? Answered, citing source 3.",
    "Question 3 of 3: Fixture question? Refused: the answer isn't in these documents.",
  ]);
});

test("the outcome lines carry their meaning in words, and name the test as not independent (spec §4.4, §6.6)", () => {
  assert.deepEqual(OUTCOME, {
    answered: { label: "Answer", status: "ok" },
    refused: { label: "Refused: the answer isn't in these documents", status: "review" },
    "false-answer-caught": { label: "False answer, caught by the acceptance test (not independent)", status: "blocked" },
  });
});

test("metricText prints a typed metric as TracePanel does: the value, then the unit", () => {
  assert.equal(metricText({ value: 0.91 }), "0.91");
  assert.equal(metricText({ value: 41, unit: "ms" }), "41ms");
});

test("the stage holds no link, button or id: it is aria-hidden, and the transcript owns those", async () => {
  const { stage } = await replayAll();
  assert.deepEqual(stage.querySelectorAll("a"), []);
  assert.deepEqual(stage.querySelectorAll("button"), []);
  assert.deepEqual(stage.querySelectorAll("[id]"), []);
});

test("a cancelled run draws nothing more into the stage, whether cancelled before it starts or between turns", async () => {
  const stage = h("div", {});
  installDocument(h("body", {}, stage));
  const early = createPlayback();
  early.cancel();
  const steps = [];
  for await (const step of assistantRenderer(DATA).steps(stage, early)) steps.push(step);
  assert.deepEqual(steps, []);
  assert.deepEqual(stage.childNodes, []);
  // Skip, or Replay, in the pause after the first turn: the rest of the run draws nothing.
  const pb = createPlayback({ instant: true });
  const run = assistantRenderer(DATA).steps(stage, pb);
  assert.equal((await run.next()).done, false);
  const drawn = stage.textContent;
  const turns = stage.querySelectorAll(".assist-turn").length;
  pb.cancel();
  assert.deepEqual(await run.next(), { value: undefined, done: true });
  assert.equal(stage.querySelectorAll(".assist-turn").length, turns, "no turn is started after the cancel");
  assert.equal(stage.textContent, drawn);
});

test("the replay draws exactly the Home transcript's text, in the same order", async () => {
  const { stage } = await replayAll();
  assert.equal(squash(stage.textContent), squash(visibleText(withoutSrOnly(transcriptHtml()))));
});

test("the Home transcript: every scenario's title is an h3 under the band's h2, and every question, answer, catch, source and attribution is there", () => {
  const html = transcriptHtml();
  const text = visibleText(html);
  const titles = elements(html, (t) => /^h[1-6]$/.test(t.name));
  assert.deepEqual(titles.map((t) => t.name), DATA.scenarios.map(() => "h3"));
  assert.deepEqual(titles.map((t) => visibleText(t.inner).trim()), DATA.scenarios.map((s) => s.title));
  for (const scenario of DATA.scenarios) {
    for (const turn of scenario.turns) {
      assert.ok(text.includes(turn.question), turn.question);
      for (const segment of turn.answer) assert.ok(text.includes(segment.text.trim().replace(/\s+/g, " ")), segment.text);
      if (turn.caught) assert.ok(text.includes(turn.caught), turn.caught);
    }
    for (const source of scenario.sources) {
      assert.ok(text.includes(source.label), source.label);
      assert.ok(text.includes(source.text), source.label);
    }
    const attribution = attributionText(scenario.corpus.attribution);
    assert.ok(squash(text).includes(squash(attribution)), `${scenario.id}: attribution`);
  }
});

test("every citation link lands on its own scenario's source, and the transcript's ids are unique", () => {
  const html = transcriptHtml();
  const ids = [...idsIn(html)];
  const all = elements(html, (t) => "id" in t.attrs).map((e) => e.attrs.id);
  assert.equal(all.length, ids.length, "an id is repeated");
  const expected = DATA.scenarios.flatMap((s) => s.turns.flatMap((t) => citesIn(t).map((c) => `#assistant-${s.id}-src-${c}`)));
  const cites = hrefsIn(html).filter((href) => href.startsWith("#"));
  assert.deepEqual([...new Set(cites)].sort(), [...new Set(expected)].sort());
  for (const href of cites) assert.ok(ids.includes(href.slice(1)), `${href} has no target`);
  for (const scenario of DATA.scenarios) {
    for (const source of scenario.sources) {
      const [item] = elementsWith(html, "id", `assistant-${scenario.id}-src-${source.cite}`);
      assert.ok(item && hrefsIn(item.inner).includes(source.href), `${scenario.id} source ${source.cite} links to ${source.href}`);
    }
  }
});
