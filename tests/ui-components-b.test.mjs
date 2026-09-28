// Contract tests for MockPanel, SampleReport, TracePanel and DataTable (spec §8.12). The MockPanel and
// SampleReport captions and the SampleReport title are literals in the component source, and no prop
// or data field can change or remove them. tests/e2e/ui-components-b.spec.mjs checks the rendered output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mockPanel, sampleReport, traceFile } from "../src/content/schemas.ts";
import { mockPanelFixture, sampleReportFixture, traceFixture } from "../src/fixtures/index.ts";

const source = (name) => readFileSync(new URL(`../src/components/ui/${name}.astro`, import.meta.url), "utf8");
const propKeys = (src) => {
  const body = src.match(/interface Props \{\n([\s\S]*?)\n\}/)?.[1];
  assert.ok(body, "no multi-line `interface Props { … }` block");
  return [...body.matchAll(/^\s*(\w+)\??:/gm)].map((m) => m[1]);
};

test("each component takes exactly the props the blueprint names", () => {
  assert.deepEqual(propKeys(source("MockPanel")), ["panel"]);
  assert.deepEqual(propKeys(source("SampleReport")), ["report"]);
  assert.deepEqual(propKeys(source("TracePanel")), ["trace"]);
  assert.deepEqual(propKeys(source("DataTable")), ["caption", "columns", "rows", "rowHeader"]);
});

test("the MockPanel caption is a literal in the markup, with no slot to replace it", () => {
  const src = source("MockPanel");
  assert.match(src, /<figcaption class="mock-caption">Illustrative interface, fictional data<\/figcaption>/);
  assert.equal(src.match(/<figcaption/g).length, 1);
  assert.doesNotMatch(src, /<slot/);
});

test("the SampleReport title and caption are literals, with no slot to replace them", () => {
  const src = source("SampleReport");
  assert.match(src, /<h2 class="sample-title">Sample evaluation report<\/h2>/);
  assert.match(src, /<p class="sample-caption" data-sample-caption>Sample report: Techsider testing its own demo system, so not independent\.<\/p>/);
  assert.doesNotMatch(src, /<slot/);
  assert.doesNotMatch(src, /independent evaluation report/i);
});

test("no data field can carry a caption or title into the components", () => {
  for (const key of ["caption", "title"]) {
    assert.ok(!(key in sampleReport.shape), `sampleReport has a ${key} field`);
  }
  assert.ok(!("caption" in mockPanel.shape), "mockPanel has a caption field");
  const report = sampleReport.parse({ ...sampleReportFixture, title: "Independent Evaluation Report", caption: "x" });
  assert.equal("title" in report, false);
  assert.equal("caption" in report, false);
  const panel = mockPanel.parse({ ...mockPanelFixture, caption: "x" });
  assert.equal("caption" in panel, false);
});

test("the fixtures these components render are valid and exercise every branch", () => {
  const panel = mockPanel.parse(mockPanelFixture);
  assert.ok(panel.fields.some((f) => f.redacted), "no redacted field");
  assert.deepEqual([...new Set(panel.chips.map((c) => c.status))].sort(), ["blocked", "ok", "review"]);
  assert.ok(panel.decision, "no decision row");
  assert.ok(sampleReport.parse(sampleReportFixture).failures.length >= 3);
  const trace = traceFile.parse(traceFixture);
  assert.equal(trace.provenance, "illustrative");
  assert.ok(trace.lines.some((l) => l.metric), "no line with a metric");
});
