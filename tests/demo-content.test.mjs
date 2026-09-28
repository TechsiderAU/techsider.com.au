import { test } from "node:test";
import assert from "node:assert/strict";
import { readDist, visibleText } from "./helpers.mjs";

// The static (no-JS) transcript and the Sources panel are both server-rendered,
// so these assertions cover what every visitor, and a crawler, sees.
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
});

test("answer covers the 24-hour disruption notice (¶41)", () => {
  assert.match(home, /CPS 230 · Business continuity plan · ¶41/);
  assert.match(home, /no later than 24 hours/);
  assert.match(home, /not later than 24 hours after, if it has suffered a disruption to a critical operation outside tolerance/);
});

test("service-provider notice (¶60) is mentioned as a separate obligation", () => {
  assert.match(home, /CPS 230 · Monitoring, notifications and review · ¶60\(a\)/);
  assert.match(home, /20 business days/);
});

test("demo metrics are labelled illustrative", () => {
  assert.match(home, /Illustrative values: scripted demo, not a measured run\./);
});

test("demo is described as scripted, not recorded", () => {
  assert.doesNotMatch(home, /Recorded illustrative demo|recorded walkthrough/i);
  assert.match(home, /Scripted illustrative demo/);
});
