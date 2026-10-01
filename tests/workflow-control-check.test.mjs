import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluate, report } from "../scripts/workflow-control-check.mjs";

const cases = JSON.parse(readFileSync(new URL("../public/downloads/workflow-control-cases.json", import.meta.url))).cases;
test("the published cases detect missing approval and replay controls", () => {
  assert.ok(evaluate(cases).every((result) => result.pass));
  const unsafe = evaluate(cases, (item) => item.authorised);
  for (const id of ["unapproved-send", "stale-approval", "wrong-item", "paused", "duplicate", "read-only", "unknown-action"]) {
    assert.equal(unsafe.find((result) => result.id === id).pass, false, id);
  }
});
test("the downloadable report matches its local run", () => {
  const recorded = JSON.parse(readFileSync(new URL("../public/downloads/workflow-control-report.json", import.meta.url)));
  assert.deepEqual(recorded, report());
});

test("the downloadable source is the code used for the report and recording", () => {
  for (const [script, download] of [
    ["workflow-control-check.mjs", "workflow-control-source.txt"],
    ["record-workflow-controls.mjs", "workflow-recording-source.txt"],
  ]) {
    assert.equal(
      readFileSync(new URL(`../public/downloads/${download}`, import.meta.url), "utf8"),
      readFileSync(new URL(`../scripts/${script}`, import.meta.url), "utf8"),
    );
  }
});
