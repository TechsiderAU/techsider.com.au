// Phase D Task 5: the ④ sample report and the evaluation-method page (spec §8.7, §9.1, §9.3;
// blueprint scope ruling 1). src/data/demos/ai-evaluation.json is the ④ demo: an illustrative
// sample report on Techsider's own ② demo system. It parses, carries every spec §9.1 field, its
// numbers agree with each other and with the published method's interval and rule, and its
// failures are the ② demo's own failure modes. /resources/evaluation-method/ is live: the published
// method, then the report with its fixed caption and illustrative label, and no harness block or
// link while the harness is unpublished (spec §9.2, §12 item 4). What keeps the illustrative
// sample from launching is the ⚑ in src/data/runs/README.md, which check 07 reads.
// Run `npm run build && npm run build:preview` first. tests/e2e/prod-evaluation-method.spec.mjs
// covers the page in a browser; the Phase C site sweep holds it to axe, 320px and its links.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { allHtmlFiles, readDist, readPreviewDist, visibleText } from "./helpers.mjs";
import { elements, elementsWith, hrefsIn, normalizeQuotes, readFrontmatter, readJson } from "../scripts/ci/lib.mjs";
import { SAMPLE_REPORT_CAPTION } from "../scripts/ci/checks/05-captions.mjs";
import { metricTokens } from "../scripts/ci/checks/06-provenance.mjs";
import { run as verifyMarkers } from "../scripts/ci/checks/07-verify-markers.mjs";
import { makeDemoSchema, plainRef, sampleReport } from "../src/content/schemas.ts";
import { PAGES } from "../src/data/nav.ts";
import { pageDescription } from "../src/lib/meta.ts";
import { pageAt } from "../src/lib/pages.ts";
import { crumbs, siteContext } from "../src/lib/site.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PATH = "/resources/evaluation-method/";
const FILE = "resources/evaluation-method/index.html";
const METHOD_FILE = "src/content/documents/evaluation-method.md";
const LABEL = "Illustrative sample: not a real test run";
const RUNS_GATE = "⚑ owner: the ④ sample report must come from a committed harness run before launch (spec §9.1, §12 item 13)";
/** The NSW AI Assessment Framework's risk bands, spelt as the NSW AI Operational Policy (Final version 1.1, §2) spells them. */
const AIAF_BANDS = ["Low-risk", "Medium-risk", "High-Risk", "Critical-risk"];
/** Each threshold's metric, in order, and the id prefix of the failures it counts: each is counted on its own (the method). */
const COUNTED = [["False-answer rate", "false-answer-"], ["False-refusal rate", "false-refusal-"], ["Wrong-citation rate", "wrong-citation-"]];
const Z = 1.96; // a 95% interval

const source = (rel) => readFileSync(join(ROOT, rel), "utf8");
const demo = readJson(join(ROOT, "src/data/demos/ai-evaluation.json"));
const report = sampleReport.parse(demo.data);
const assistant = readJson(join(ROOT, "src/data/demos/knowledge-assistant.json"));
const turns = assistant.data.scenarios.flatMap((s) => s.turns);
const round1 = (x) => Math.round(x * 10) / 10;
/** The 95% Wilson score interval of k failures in n, in percent to one decimal place. */
function wilson(k, n) {
  const p = k / n;
  const z2 = Z * Z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return { low: round1(Math.max(0, 100 * (centre - half))), high: round1(100 * (centre + half)) };
}
const counted = (prefix) => report.failures.filter((f) => f.id.startsWith(prefix));
/** The question a failure was asked: every description opens `Asked “…”`. */
const questionOf = (f) => f.description.match(/^Asked “([^”]+)”/)?.[1];
const text = (html) => visibleText(html).trim();
const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>"));
function sectionOf(html, id) {
  const found = elements(html, (t) => t.name === "section" && t.attrs.id === id);
  assert.equal(found.length, 1, `expected one section#${id}, found ${found.length}`);
  return found[0].inner;
}
/** A DataTable's body rows, each [row header, …cell values], without the cells' aria-hidden column labels. */
function tableRows(table) {
  return elements(table, (t) => t.name === "tr").slice(1).map((tr) => {
    let inner = tr.inner;
    for (const label of elements(inner, (t) => (t.attrs.class ?? "").split(" ").includes("dt-label"))) inner = inner.replace(label.outer, "");
    return elements(inner, (t) => t.name === "th" || t.name === "td").map((cell) => text(cell.inner));
  });
}
/** Every string in a JSON value, with its path. */
function strings(value, path = "") {
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
  return typeof value === "string" ? [[path, value]] : [];
}

test("ai-evaluation.json is the ④ demo: an illustrative report on the ② demo system, with no run to cite", () => {
  const parsed = makeDemoSchema(plainRef).parse(demo);
  assert.equal(parsed.solution, "ai-evaluation");
  assert.equal(parsed.kind, "report");
  assert.equal(demo.provenance, "illustrative", "the demo file claims a measured run");
  assert.equal(report.provenance, "illustrative", "the report claims a measured run");
  assert.equal(demo.run, undefined);
  assert.equal(report.run, undefined, "an illustrative report cites no run (spec §9.3)");
  assert.match(report.system, /\bKnowledge Assistant demo\b/, "spec §9.1: the report is on Techsider's own ② demo system");
  for (const title of [demo.title, report.system]) assert.doesNotMatch(title, /Independent Evaluation Report/i, "check 05: the sample is never that report");
});

test("it carries every spec §9.1 field: n, intervals, ground truth, inter-rater agreement, thresholds, rated failures mapped to NSW AIAF bands, and a regression", () => {
  assert.ok(Number.isInteger(report.n) && report.n >= 50, `n = ${report.n}`);
  assert.deepEqual(report.thresholds.map((t) => t.metric), COUNTED.map(([metric]) => metric));
  for (const t of report.thresholds) {
    assert.equal(t.ci.level, 95, t.metric);
    assert.equal(t.target.unit, "%", t.metric);
    assert.equal(t.result.unit, "%", t.metric);
  }
  assert.match(report.groundTruth, /\bexpected refusal\b/, "the ground truth has no expected refusals, so a false refusal can't be scored");
  assert.match(report.interRater.statistic, /^Cohen's kappa\b/);
  assert.ok(report.interRater.value.value > 0 && report.interRater.value.value <= 1 && report.interRater.value.unit === undefined);
  assert.match(report.framework, /\bNSW AI Assessment Framework\b/, "spec §9.1: failures map to NSW AIAF levels");
  assert.ok(report.failures.length >= 3, `${report.failures.length} failures; spec §9.1 needs at least three`);
  for (const f of report.failures) assert.ok(AIAF_BANDS.includes(f.frameworkLevel), `${f.id}: "${f.frameworkLevel}" is not an AIAF risk band`);
  assert.notEqual(report.regression.baseline, report.regression.candidate);
});

test("its numbers agree: each rate is its listed failures over n, each interval the 95% Wilson interval, and every failure is counted once", () => {
  const ids = report.failures.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, "a failure id repeats");
  for (const id of ids) assert.match(id, /^(false-answer|false-refusal|wrong-citation)-\d+$/);
  for (const [metric, prefix] of COUNTED) {
    const t = report.thresholds.find((x) => x.metric === metric);
    const k = counted(prefix).length;
    assert.equal(t.result.value, round1((100 * k) / report.n), `${metric}: ${k} failures in ${report.n}`);
    const ci = wilson(k, report.n);
    assert.deepEqual([t.ci.low, t.ci.high], [ci.low, ci.high], `${metric}: not the 95% Wilson interval of ${k} in ${report.n}`);
  }
  assert.equal(COUNTED.reduce((sum, [, prefix]) => sum + counted(prefix).length, 0), report.failures.length, "a failure is listed but not counted");
});

test("each outcome follows the report's stated rule: a threshold is met only when its whole interval sits below it, and n lets every threshold be met", () => {
  assert.match(report.method, /\bhighest rate accepted\b/);
  assert.match(report.method, /\bmet only when the whole Wilson score interval sits below it\b/);
  for (const t of report.thresholds) assert.equal(t.pass, t.ci.high < t.target.value, `${t.metric}: interval ${t.ci.low}–${t.ci.high}, target ${t.target.value}`);
  // The method sets n "narrow enough to decide against your threshold": zero failures in n must meet every target.
  const best = wilson(0, report.n).high;
  for (const t of report.thresholds) assert.ok(best < t.target.value, `${t.metric}: even zero failures in ${report.n} give ${best}%, so ${t.target.value}% can never be met`);
  // The method calls an answer "unsupported by its source" a false answer, so the report says where a wrong citation goes.
  assert.match(report.method, /\bcounts as a wrong citation, not a false answer\b/);
});

test("its interval is the published method's: the method's worked example comes out of the same Wilson interval", () => {
  const method = source(METHOD_FILE);
  assert.deepEqual(wilson(5, 100), { low: 2.2, high: 11.2 });
  assert.ok(method.includes("its 95% Wilson interval runs from about 2.2% to 11.2%"));
  assert.deepEqual(wilson(20, 400), { low: 3.3, high: 7.6 });
  assert.ok(method.includes("gives an interval of about 3.3% to 7.6%"));
  assert.equal(wilson(0, 100).high, 3.7);
  assert.ok(method.includes("the upper end of the interval is still about 3.7%"));
});

test("the regression runs the same set on two model versions: A is the reported run, and B's rates are whole failures over n", () => {
  const { rows } = report.regression;
  assert.deepEqual(rows.map((r) => r.metric), report.thresholds.map((t) => t.metric));
  assert.match(report.method, new RegExp(`\\bThe failures listed are ${report.regression.baseline.toLowerCase()}'s\\.`, "i"));
  rows.forEach((row, i) => {
    assert.deepEqual(row.baseline, report.thresholds[i].result, `${row.metric}: the baseline isn't the reported result`);
    assert.equal(row.candidate.unit, "%");
    const k = Math.round((row.candidate.value * report.n) / 100);
    assert.equal(row.candidate.value, round1((100 * k) / report.n), `${row.metric}: ${row.candidate.value}% isn't a whole count of ${report.n}`);
  });
});

test("its failures are the ② demo's own: the false answer the demo shows caught, and questions the demo never shows answered or refused", () => {
  for (const f of report.failures) assert.ok(questionOf(f), `${f.id}: the description doesn't open with the question asked`);
  const caught = turns.filter((t) => t.outcome === "false-answer-caught");
  assert.ok(caught.length >= 1, "the ② demo shows no false answer being caught");
  for (const t of caught) {
    assert.ok(counted("false-answer-").some((f) => questionOf(f) === t.question), `the false answer the ② demo shows ("${t.question}") isn't listed`);
  }
  for (const f of report.failures) {
    const shown = turns.find((t) => t.question === questionOf(f));
    if (shown === undefined) continue;
    assert.ok(f.id.startsWith("false-answer-") && shown.outcome === "false-answer-caught",
      `${f.id}: the ② demo shows "${shown.question}" ${shown.outcome}, so the report can't list it as this failure`);
  }
  assert.ok(counted("false-refusal-").length >= 1, "no refusal on an in-scope question");
  assert.ok(counted("wrong-citation-").length >= 1, "no citation to the wrong paragraph");
});

test("the wrong citation is one the ② demo gets right: CPS 230 defines critical operations in ¶34, not ¶37", () => {
  const definition = assistant.data.scenarios.flatMap((s) => s.sources).find((s) => /^Critical operations are processes\b/.test(s.text));
  assert.ok(definition, "the ② demo quotes no CPS 230 definition of critical operations");
  assert.match(definition.label, /¶34$/, "the ② demo cites the definition somewhere other than ¶34");
  const [wrong] = counted("wrong-citation-").filter((f) => f.description.includes("¶37"));
  assert.ok(wrong, "no listed failure cites ¶37");
  assert.ok(wrong.description.includes("The definition is ¶34."));
});

test("no metric-shaped number sits in the report's words (spec §9.3; check 06)", () => {
  for (const [path, s] of strings(demo)) assert.deepEqual(metricTokens(s).map((h) => h.match), [], path);
});

test("the launch gate: src/data/runs/README.md holds the ⚑ that check 07 keeps open until a committed harness run replaces the sample", async () => {
  const readme = source("src/data/runs/README.md");
  assert.ok(readme.includes(RUNS_GATE), "the README lacks the launch-gate line");
  assert.doesNotMatch(readme, /Phase D commits the first runs/, "the harness isn't built in Phase D (blueprint scope ruling 1)");
  const report7 = await verifyMarkers({ root: ROOT, mode: "report" });
  assert.ok(report7.warnings.some((w) => w.startsWith("src/data/runs/README.md:")), "check 07 doesn't report the gate");
  const gate = await verifyMarkers({ root: ROOT, mode: "gate" });
  assert.ok(gate.errors.some((e) => e.startsWith("src/data/runs/README.md:")), "check 07 doesn't fail the launch on the gate");
});

test("/resources/evaluation-method/ is live, described in nav.ts, and its one-liner claims only what is published", () => {
  const entry = pageAt(PATH);
  assert.equal(entry.status, "live");
  assert.equal(pageDescription(entry), entry.description);
  assert.match(entry.description, /\billustrative sample report\b/, "the description presents the sample as a real report");
  assert.equal(entry.oneLiner, "How we test AI, published so you can check it.");
  assert.doesNotMatch(entry.oneLiner, /re-run/, "nothing a visitor can re-run is published until the harness is (spec §12 item 4)");
});

test("production: the published method, then the sample report from ai-evaluation.json with its caption and illustrative label", () => {
  const main = mainOf(readDist(FILE));
  assert.equal(elementsWith(main, "data-template", "evaluation-method").length, 1);
  const h1s = elements(main, (t) => t.name === "h1");
  assert.deepEqual(h1s.map((h) => text(h.inner)), [readFrontmatter(join(ROOT, METHOD_FILE)).title]);
  const [prose] = elementsWith(sectionOf(main, "method"), "data-prose");
  assert.deepEqual(
    elements(prose.inner, (t) => t.name === "h2").map((h) => normalizeQuotes(text(h.inner))), // Markdown curls "isn't"
    [...source(METHOD_FILE).matchAll(/^## (.+)$/gm)].map((m) => m[1]),
  );
  const reports = elementsWith(sectionOf(main, "sample-report"), "data-sample-report");
  assert.equal(reports.length, 1);
  const [r] = reports;
  assert.equal(r.attrs["data-provenance"], "illustrative");
  assert.deepEqual(elementsWith(r.inner, "data-sample-caption").map((c) => text(c.inner)), [SAMPLE_REPORT_CAPTION]);
  assert.deepEqual(elementsWith(r.inner, "data-provenance-label").map((l) => text(l.inner)), [LABEL]);
  const meta = elements(r.inner, (t) => t.name === "dd").map((dd) => text(dd.inner));
  assert.ok(meta.includes(report.system) && meta.includes(`n = ${report.n}`), "the report's system or n is missing");
  const [thresholds, regression] = elementsWith(r.inner, "data-data-table").map((t) => t.inner);
  assert.deepEqual(tableRows(thresholds), report.thresholds.map((t) => [
    t.metric, `${t.target.value}%`, `${t.result.value}%`, `${t.ci.low}–${t.ci.high}% (95% CI)`, t.pass ? "Pass" : "Fail",
  ]));
  assert.deepEqual(
    elements(r.inner, (t) => (t.attrs.class ?? "").split(" ").includes("sample-failure-id")).map((s) => text(s.inner)),
    report.failures.map((f) => f.id),
  );
  assert.deepEqual(tableRows(regression), report.regression.rows.map((row) => [row.metric, `${row.baseline.value}%`, `${row.candidate.value}%`]));
});

test("production: no harness block and no link to github.com while the harness is unpublished (spec §9.2, §12 item 4)", () => {
  const html = readDist(FILE);
  assert.equal(elements(html, (t) => t.attrs.id === "harness").length, 0, "#harness renders with a null harnessUrl");
  assert.equal(elementsWith(html, "data-harness-link").length, 0);
  assert.deepEqual(hrefsIn(html).filter((h) => /github\.com/i.test(h)), []);
});

test("production: the breadcrumb runs Home › Resources › Evaluation method, and the closing prompt opens a contact about ④", () => {
  const site = siteContext(false);
  const main = mainOf(readDist(FILE));
  const [nav] = elements(main, (t) => t.name === "nav" && t.attrs["aria-label"] === "Breadcrumb");
  const trail = crumbs(site, ["resources", "evaluationMethod"]);
  assert.deepEqual(trail.map((c) => c.label), ["Home", "Resources", "Evaluation method"]);
  assert.deepEqual(elements(nav.inner, (t) => t.name === "a").map((a) => [text(a.inner), a.attrs.href]), trail.slice(0, -1).map((c) => [c.label, c.href]));
  const [prompt] = elementsWith(sectionOf(main, "contact"), "data-prompt-block");
  assert.deepEqual(elements(prompt.inner, (t) => t.name === "a").map((a) => a.attrs.href), [site.contact({ interest: "ai-evaluation" })]);
});

test("production: the Services pages and every live solution page link to the method", () => {
  const solutions = PAGES.filter((p) => p.base === "/solutions/" && p.status === "live").map((p) => `${p.path.slice(1)}index.html`);
  assert.equal(solutions.length, 5, "the five solution pages are live from Phase C Task 3");
  const pages = ["services/index.html", "services/evaluation-partner/index.html", ...solutions];
  for (const f of pages) {
    const links = elements(mainOf(readDist(f)), (t) => t.name === "a").filter((a) => text(a.inner) === "Read the evaluation method");
    assert.ok(links.length >= 1, `dist/${f} doesn't link to the method`);
    for (const a of links) assert.equal(a.attrs.href, PATH, `dist/${f}`);
  }
});

test("no production page carries an owner marker, not even in an HTML comment", () => {
  assert.doesNotMatch(source(METHOD_FILE).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, ""), /⚑/, "the method's ⚑ is in its body, which renders");
  assert.deepEqual(allHtmlFiles().filter((f) => readDist(f).includes("⚑")), []);
});

test("preview: the same page, from the same data", () => {
  const main = mainOf(readPreviewDist(FILE));
  assert.equal(elementsWith(main, "data-template", "evaluation-method").length, 1);
  const [r] = elementsWith(sectionOf(main, "sample-report"), "data-sample-report");
  assert.equal(r.attrs["data-provenance"], "illustrative");
  assert.ok(text(r.inner).includes(report.failures[0].description));
});
