// Contract tests for MockPanel, SampleReport, TracePanel and DataTable (spec §8.12). The MockPanel and
// SampleReport captions and the SampleReport title are literals in the component source, and no prop
// or data field can change or remove them. tests/e2e/ui-components-b.spec.mjs checks the rendered output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { elements, elementsWith } from "../scripts/ci/lib.mjs";
import { readPreviewDist, visibleText } from "./helpers.mjs";
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
  assert.deepEqual(propKeys(source("DataTable")), ["caption", "columns", "rows", "rowHeader", "rowIds", "rowMarker"]);
  // Provenance travels in the data, as it does for a trace (spec §9.3: every report dataset
  // declares it), so SampleReport's one prop carries it and no caller can leave it out.
  for (const [name, schema] of [["sampleReport", sampleReport], ["traceFile", traceFile]]) {
    assert.ok("provenance" in schema.shape && "run" in schema.shape, `${name} lacks provenance or run`);
  }
});

test("SampleReport and TracePanel mark their provenance and label it; measured without a run fails the build", () => {
  const report = source("SampleReport");
  assert.match(report, /<article class="sample-report" data-sample-report data-provenance=\{report\.provenance\}>/);
  assert.match(report, /<span data-provenance-label>\{label\}<\/span>/);
  assert.match(report, /"Illustrative sample: not a real test run"/);
  assert.match(report, /`Measured run: \$\{report\.run\}`/);
  const trace = source("TracePanel");
  assert.match(trace, /data-trace-panel data-provenance=\{trace\.provenance\}/);
  assert.match(trace, /<span data-provenance-label>\{label\}<\/span>/);
  // A guard like DataTable's rowHeader check: an in-code measured item without a run throws at
  // build time instead of rendering "Measured run: undefined".
  for (const [src, v] of [[report, "report"], [trace, "trace"]]) {
    assert.match(src, new RegExp(`if \\(${v}\\.provenance === "measured" && !${v}\\.run\\) \\{\\s*throw new Error\\(`), `${v}: no measured-without-run guard`);
  }
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
  // The schemas are strict, so a stray caption or title is rejected outright, not silently dropped.
  assert.throws(() => sampleReport.parse({ ...sampleReportFixture, title: "Independent Evaluation Report" }), /title/);
  assert.throws(() => sampleReport.parse({ ...sampleReportFixture, caption: "x" }), /caption/);
  assert.throws(() => mockPanel.parse({ ...mockPanelFixture, caption: "x" }), /caption/);
});

test("the fixtures these components render are valid and exercise every branch", () => {
  const panel = mockPanel.parse(mockPanelFixture);
  assert.ok(panel.fields.some((f) => f.redacted), "no redacted field");
  assert.deepEqual([...new Set(panel.chips.map((c) => c.status))].sort(), ["blocked", "ok", "review"]);
  assert.ok(panel.decision, "no decision row");
  const report = sampleReport.parse(sampleReportFixture);
  assert.ok(report.failures.length >= 3);
  // The fixture's thresholds and failures are made up, so it says so (spec §9.3).
  assert.equal(report.provenance, "illustrative");
  assert.equal(report.run, undefined);
  const trace = traceFile.parse(traceFixture);
  assert.equal(trace.provenance, "illustrative");
  assert.ok(trace.lines.some((l) => l.metric), "no line with a metric");
});

// Spec §9.1, in the built gallery (dist-preview/, from `npm run build:preview`): every SampleReport
// shows the ground truth, inter-rater agreement, confidence intervals, framework levels and the
// model-change regression table, with each row's values in column order.
const inOrder = (text, parts) => {
  let at = 0;
  for (const part of parts) {
    const i = text.indexOf(part, at);
    if (i < 0) return false;
    at = i + part.length;
  }
  return true;
};
const bodyRows = (table) =>
  elements(table.inner, (t) => t.name === "tr").filter((tr) => /<td\b/.test(tr.inner)).map((tr) => visibleText(tr.inner).trim());

test("SampleReport renders the spec §9.1 fields: ground truth, agreement, intervals, framework levels, regression", () => {
  const html = readPreviewDist("preview/components/index.html");
  const reports = elementsWith(html, "data-sample-report");
  assert.equal(reports.length, 4, "illustrative and measured, on carbon and on bone");
  const r = sampleReportFixture;
  const show = (m) => `${m.value}${m.unit ?? ""}`;
  for (const report of reports) {
    const text = visibleText(report.inner);
    for (const expected of [
      `Ground truth ${r.groundTruth}`,
      `Inter-rater agreement ${r.interRater.statistic}: ${show(r.interRater.value)}`,
      `Failures mapped to ${r.framework}`,
      "Model-change regression",
      ...r.failures.map((f) => `Framework level: ${f.frameworkLevel}`),
    ]) assert.ok(text.includes(expected), `a SampleReport lacks "${expected}"`);
    const [thresholds, regression, ...more] = elementsWith(report.inner, "data-data-table");
    assert.ok(thresholds && regression && more.length === 0, "a SampleReport holds exactly two DataTables");
    const tRows = bodyRows(thresholds);
    assert.equal(tRows.length, r.thresholds.length);
    r.thresholds.forEach((t, i) => {
      const ci = `${t.ci.low}–${t.ci.high}${t.result.unit ?? ""} (${t.ci.level}% CI)`;
      assert.ok(inOrder(tRows[i], [t.metric, show(t.target), show(t.result), ci, t.pass ? "Pass" : "Fail"]), `threshold row: ${tRows[i]}`);
    });
    const columns = elements(regression.inner, (t) => t.name === "th" && t.attrs.scope === "col").map((th) => visibleText(th.inner).trim());
    assert.deepEqual(columns, ["Metric", r.regression.baseline, r.regression.candidate]);
    const rRows = bodyRows(regression);
    assert.equal(rRows.length, r.regression.rows.length);
    r.regression.rows.forEach((row, i) => {
      assert.ok(inOrder(rRows[i], [row.metric, show(row.baseline), show(row.candidate)]), `regression row: ${rRows[i]}`);
    });
  }
});
