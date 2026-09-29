import { test } from "node:test";
import assert from "node:assert/strict";
import { readDist, visibleText } from "./helpers.mjs";

// The Home's ② demo band renders its static transcript, sources included, on the server (the
// replay only types the same text over it), so these assertions cover what every visitor, and a
// crawler, sees. The CPS 230 pins are the spec §9.4 corrections, carried in the demo's second
// scenario (src/data/demos/knowledge-assistant.json).
const home = visibleText(readDist("index.html"));

test("critical-operations definition is cited as ¶34 under APRA's heading", () => {
  assert.match(home, /CPS 230 · Critical operations and tolerance levels · ¶34/);
});

test("the ¶37 mislabel is gone", () => {
  assert.doesNotMatch(home, /¶37/);
});

test("answer covers the 72-hour incident notice (¶32)", () => {
  assert.match(home, /CPS 230 · Operational risk incidents · ¶32/);
  assert.match(home, /no later than 72 hours/);
  // APRA's trigger is an incident "that it determines to be likely to have" a material impact.
  assert.match(home, /where you determine it is likely to have a material financial impact/);
});

test("answer covers the 24-hour disruption notice (¶41)", () => {
  assert.match(home, /CPS 230 · Business continuity plan · ¶41/);
  assert.match(home, /as soon as possible, and within 24 hours, covering the nature of the disruption/);
  assert.match(home, /not later than 24 hours after, if it has suffered a disruption to a critical operation outside tolerance/);
  assert.match(home, /the entity’s business operations/);  // U+2019 right single quotation mark
});

test("service-provider notice (¶60) is mentioned as a separate obligation", () => {
  assert.match(home, /CPS 230 · Monitoring, notifications and review · ¶60\(a\)/);
  assert.match(home, /20 business days/);
});

test("demo metrics are labelled illustrative, on the frame and above the transcript", () => {
  assert.match(home, /Illustrative data/);
  assert.match(home, /Scores and timings are illustrative: a scripted replay, not a measured run\./);
});

test("demo is described as a canned replay, not a recording", () => {
  assert.doesNotMatch(home, /Recorded illustrative demo|recorded walkthrough/i);
  assert.match(home, /Canned replay · synthetic or public data/);
  // The legacy band's lede went with it (Phase D Task 8); the Home FAQ says what the demo is.
  assert.match(home, /It's a canned replay over public documents: it runs in your browser and never calls a model\./);
});
