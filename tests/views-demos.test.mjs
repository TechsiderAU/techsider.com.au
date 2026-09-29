// src/lib/views/demos.ts: how the Demos hub, the demo pages and the solution heroes read the demos
// collection (spec §7.1, §8.8, §9.1). One demo per solution, in a file named after it; the hub lists
// them in spec §4.1 order. Plain { id, data } entries stand in for the collection's.
import { test } from "node:test";
import assert from "node:assert/strict";
import { siteContext } from "../src/lib/site.ts";
import { demoCards, demoFor } from "../src/lib/views/demos.ts";

const SITE = siteContext(true);
const KINDS = ["register", "assistant", "inbox", "report", "checker"];
const entry = (id, kind, solution = id) => ({ id, data: { solution, title: `Synthetic ${id} demo`, kind, provenance: "illustrative", data: {} } });
// Reversed, so the order the tests expect can only come from the site context.
const ENTRIES = SITE.solutions.map((s, i) => entry(s.id, KINDS[i])).reverse();

test("demoCards: one card per solution, in spec §4.1 order, whatever order the collection gives", () => {
  assert.deepEqual(
    demoCards(ENTRIES, SITE),
    SITE.solutions.map((s, i) => ({ solutionId: s.id, title: `Synthetic ${s.id} demo`, kind: KINDS[i] })),
  );
});

test("demoFor: the solution's own demo, whose solution is a plain id or an Astro reference", () => {
  assert.equal(demoFor(ENTRIES, "ai-evaluation").kind, "report");
  const referenced = [entry("ai-switch-on", "checker", { id: "ai-switch-on", collection: "solutions" })];
  assert.equal(demoFor(referenced, "ai-switch-on").kind, "checker");
});

test("demoFor and demoCards throw when a solution has no demo, or a demo file names another solution", () => {
  const four = ENTRIES.filter((e) => e.id !== "draft-for-approval");
  const missing = 'no demo for "draft-for-approval": src/data/demos/draft-for-approval.json does not exist (spec §9.1: one demo per solution)';
  assert.throws(() => demoFor(four, "draft-for-approval"), { message: missing });
  assert.throws(() => demoCards(four, SITE), { message: missing });
  const crossed = [entry("document-registers", "register", "knowledge-assistant")];
  assert.throws(() => demoFor(crossed, "document-registers"), {
    message: 'src/data/demos/document-registers.json names solution "knowledge-assistant": a demo file is named after its own solution',
  });
});
