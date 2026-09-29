// Template-preview fixtures: each parses with the same Zod schemas as real content (with
// plain string refs), references resolve between fixtures, every human-readable string is
// visibly fictional, and nothing outside src/preview/ (the preview-only gallery) imports them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  plainRef, makeSolutionSchema, makeIndustrySchema, makeKitSchema, makeDemoSchema,
  regulatoryFile, traceFile, sampleReport, mockPanel,
} from "../src/content/schemas.ts";
import * as all from "../src/fixtures/index.ts";

const {
  SOLUTION_FIXTURE_ID, INDUSTRY_FIXTURE_ID, GOVERNMENT_INDUSTRY_FIXTURE_ID, REGULATORY_FIXTURE_ID,
  GOVERNMENT_REGULATORY_FIXTURE_ID, KIT_FIXTURE_ID, PENDING_KIT_FIXTURE_ID, TRACE_FIXTURE_ID, DEMO_FIXTURE_ID,
  SAMPLE_REPORT_FIXTURE_ID, MOCK_PANEL_FIXTURE_ID,
  solutionFixture, industryFixture, governmentIndustryFixture, regulatoryFixture,
  governmentRegulatoryFixture, kitFixture, pendingKitFixture, traceFixture, demoFixture, sampleReportFixture, mockPanelFixture,
} = all;

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const MODULES = readdirSync(join(SRC, "fixtures")).filter((f) => f.endsWith(".ts") && f !== "index.ts");

const CASES = [
  ["solutionFixture", makeSolutionSchema(plainRef), solutionFixture],
  ["industryFixture", makeIndustrySchema(plainRef), industryFixture],
  ["governmentIndustryFixture", makeIndustrySchema(plainRef), governmentIndustryFixture],
  ["regulatoryFixture", regulatoryFile, regulatoryFixture],
  ["governmentRegulatoryFixture", regulatoryFile, governmentRegulatoryFixture],
  ["kitFixture", makeKitSchema(plainRef), kitFixture],
  ["pendingKitFixture", makeKitSchema(plainRef), pendingKitFixture],
  ["traceFixture", traceFile, traceFixture],
  ["demoFixture", makeDemoSchema(plainRef), demoFixture],
  ["sampleReportFixture", sampleReport, sampleReportFixture],
  ["mockPanelFixture", mockPanel, mockPanelFixture],
];

// A string is visibly fictional when it calls itself a fixture or uses example.com.
const MARKER = /\bfixture\b|\bexample\.com\b/i;
// Keys whose values are machine tokens (enums, ids, refs) rather than prose. A token key
// only exempts a token-shaped value: a sentence under `method` must still say "Fixture".
const TOKEN_KEYS = new Set([
  "id", "status", "kind", "provenance", "rating", "method", "jurisdiction", "jurisdictions",
  "choices", "solution", "industry", "byIndustry", "leadSolutions", "demo", "trace", "row",
]);
const TOKEN = /^[a-z0-9-]+$/;
const TIME = /^\d{2}:\d{2}:\d{2}$/;
// A metric's unit is a symbol or one word ("%", "ms"), never prose.
const UNIT = /^(?:%|[a-z]+)$/;

function assertFictional(value, path = "fixture", key = "") {
  if (typeof value === "string") {
    if (key === "t" && TIME.test(value)) return;
    if (key === "unit" && UNIT.test(value)) return;
    if (TOKEN_KEYS.has(key) && TOKEN.test(value)) return;
    const host = value.match(/^https?:\/\/([^/?#]+)/i)?.[1];
    if (host) {
      assert.match(host, /^(www\.)?example\.com$/i, `${path}: fixture URLs must use example.com, got ${value}`);
      return;
    }
    assert.match(value, MARKER, `${path}: "${value}" is not visibly fictional (say "Fixture" or use example.com)`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertFictional(item, `${path}[${i}]`, key));
    return;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    for (const [k, v] of Object.entries(value)) assertFictional(v, `${path}.${k}`, k);
  }
}

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(astro|ts|js|mjs)$/.test(name) ? [p] : [];
  });
}

test("assertFictional rejects real-looking copy, real hosts and prose in token fields", () => {
  assert.throws(() => assertFictional({ title: "Real Company Pty Ltd loan register" }), /not visibly fictional/);
  assert.throws(() => assertFictional({ source: { url: "https://www.legislation.gov.au/fixture" } }), /must use example\.com/);
  assert.throws(() => assertFictional({ method: "Two reviewers marked every answer" }), /not visibly fictional/);
  assert.throws(() => assertFictional({ lines: [{ t: "9am", op: "fixture.load" }] }), /not visibly fictional/);
  assert.throws(() => assertFictional({ target: { value: 90, unit: "per cent of answers" } }), /not visibly fictional/);
  assertFictional({
    status: "on-request", name: "Northwind Fixture Pty Ltd", href: "https://example.com/fixture",
    asAt: new Date("2026-09-01"), n: 3, t: "09:00:00", target: { value: 90, unit: "%" }, metric: { value: 420, unit: "ms" },
  });
});

test("every fixture parses with its content schema and loses no keys", () => {
  for (const [name, schema, value] of CASES) {
    const result = schema.safeParse(value);
    assert.ok(result.success, `${name}: ${result.success ? "" : JSON.stringify(result.error.issues)}`);
    assert.deepEqual(result.data, value, `${name}: the schema dropped or changed a field`);
  }
});

test("fixture ids are the documented constants", () => {
  assert.deepEqual(
    [SOLUTION_FIXTURE_ID, INDUSTRY_FIXTURE_ID, GOVERNMENT_INDUSTRY_FIXTURE_ID, REGULATORY_FIXTURE_ID,
      GOVERNMENT_REGULATORY_FIXTURE_ID, KIT_FIXTURE_ID, PENDING_KIT_FIXTURE_ID, TRACE_FIXTURE_ID, DEMO_FIXTURE_ID,
      SAMPLE_REPORT_FIXTURE_ID, MOCK_PANEL_FIXTURE_ID],
    ["fixture-solution", "fixture-industry", "fixture-government", "fixture-industry", "fixture-government",
      "fixture-kit", "fixture-pending-kit", "fixture-trace", "fixture-demo", "fixture-report", "fixture-mock-panel"],
  );
});

test("fixture references resolve to other fixtures", () => {
  const rowIds = regulatoryFixture.rows.map((r) => r.id);
  assert.deepEqual(rowIds, ["fixture-row-1", "fixture-row-2", "fixture-row-3"]);
  assert.deepEqual(solutionFixture.byIndustry, [INDUSTRY_FIXTURE_ID]);
  assert.deepEqual(Object.keys(solutionFixture.matrix), [INDUSTRY_FIXTURE_ID]);
  assert.equal(solutionFixture.demo, DEMO_FIXTURE_ID);
  for (const industry of [industryFixture, governmentIndustryFixture]) {
    const useCases = [...industry.flagshipUseCases, ...industry.workflow.flatMap((w) => w.useCases)];
    for (const u of useCases) assert.equal(u.solution, SOLUTION_FIXTURE_ID, u.name);
    assert.deepEqual(industry.leadSolutions, [SOLUTION_FIXTURE_ID]);
    assert.deepEqual(industry.obligationChips.map((c) => c.row), rowIds);
    assert.equal(industry.scenario.trace, TRACE_FIXTURE_ID);
    assert.equal(industry.mockPanel, mockPanelFixture);
  }
  assert.equal(kitFixture.industry, INDUSTRY_FIXTURE_ID);
  assert.equal(pendingKitFixture.industry, INDUSTRY_FIXTURE_ID);
  assert.equal(demoFixture.solution, SOLUTION_FIXTURE_ID);
});

test("the solution fixture covers every package status", () => {
  assert.equal(solutionFixture.genericPackage.status, "launch");
  assert.equal(solutionFixture.genericPackage.onshore, true);
  assert.deepEqual(solutionFixture.packages.map((p) => p.status), ["launch", "launch", "on-request", "internal"]);
  assert.deepEqual(solutionFixture.packages.slice(0, 2).map((p) => p.onshore), [false, true]);
  assert.equal(solutionFixture.faq.length, 3);
});

test("industry fixtures have four stages, three flagship use cases and five FAQs; government adds jurisdictions", () => {
  for (const f of [industryFixture, governmentIndustryFixture]) {
    assert.equal(f.workflow.length, 4);
    assert.equal(f.flagshipUseCases.length, 3);
    assert.equal(f.faq.length, 5);
  }
  assert.equal(industryFixture.jurisdictions, undefined);
  assert.ok(industryFixture.obligationChips.every((c) => c.jurisdiction === undefined));
  assert.deepEqual(governmentIndustryFixture.jurisdictions, ["cth", "nsw", "local"]);
  assert.deepEqual(governmentIndustryFixture.obligationChips.map((c) => c.jurisdiction), ["cth", "nsw", "local"]);
  assert.deepEqual(regulatoryFixture.rows.filter((r) => r.jurisdictions).map((r) => r.id), ["fixture-row-3"]);
  // The Government file follows check 08: every row names a jurisdiction, and each sub-section
  // (Commonwealth, state, local) gets a row, so every Government chip links to a rendered row.
  assert.deepEqual(governmentRegulatoryFixture.rows.map((r) => r.jurisdictions), [["cth"], ["nsw"], ["local"]]);
  for (const c of governmentIndustryFixture.obligationChips) {
    assert.ok(governmentRegulatoryFixture.rows.find((r) => r.id === c.row)?.jurisdictions?.includes(c.jurisdiction), c.row);
  }
});

test("trace, demo, kit, report and mock panel fixtures exercise every display state", () => {
  assert.equal(traceFixture.provenance, "illustrative");
  assert.equal(traceFixture.run, undefined);
  assert.equal(traceFixture.lines.length, 5);
  assert.equal(traceFixture.lines.filter((l) => l.metric).length, 1);
  assert.equal(demoFixture.kind, "register");
  assert.equal(demoFixture.provenance, "illustrative");
  assert.ok(kitFixture.lawyerReviewedAt instanceof Date, "kitFixture is lawyer-reviewed");
  assert.equal(pendingKitFixture.lawyerReviewedAt, null, "pendingKitFixture awaits lawyer review");
  assert.notEqual(pendingKitFixture.download, kitFixture.download);
  assert.ok(sampleReportFixture.failures.length >= 3);
  assert.deepEqual(sampleReportFixture.thresholds.map((t) => t.pass), [true, false]);
  assert.equal(mockPanelFixture.fields.filter((f) => f.redacted).length, 1);
  assert.deepEqual(mockPanelFixture.chips.map((c) => c.status), ["ok", "review", "blocked"]);
  assert.equal(mockPanelFixture.citations.length, 2);
  assert.ok(mockPanelFixture.decision);
});

test("every fixture string is visibly fictional", () => {
  for (const [name, , value] of CASES) assertFictional(value, name);
});

test("index.ts re-exports every fixture module, and every exported fixture is checked here", async () => {
  const fixtureNames = [];
  for (const file of MODULES) {
    const mod = await import(`../src/fixtures/${file}`);
    for (const [key, value] of Object.entries(mod)) {
      assert.equal(all[key], value, `index.ts does not re-export ${key} from ${file}`);
      if (key.endsWith("Fixture")) fixtureNames.push(key);
    }
  }
  assert.deepEqual(fixtureNames.sort(), CASES.map(([name]) => name).sort());
});

// Derived fixtures share nested objects (governmentIndustryFixture spreads industryFixture;
// every industry holds mockPanelFixture), so an in-place sort or splice in a template or
// preview page would silently change other specimens. index.ts deep-freezes every export.
function assertDeepFrozen(value, path, seen = new Set()) {
  if ((typeof value !== "object" && typeof value !== "function") || value === null || seen.has(value)) return;
  seen.add(value);
  assert.ok(Object.isFrozen(value), `${path} is not frozen`);
  for (const key of Reflect.ownKeys(value)) {
    const d = Object.getOwnPropertyDescriptor(value, key);
    if ("value" in d) assertDeepFrozen(d.value, `${path}.${String(key)}`, seen);
  }
}

test("every fixture export is deep-frozen, so no page can change a shared specimen", () => {
  for (const [key, value] of Object.entries(all)) assertDeepFrozen(value, key);
  assert.throws(() => industryFixture.workflow.sort(), TypeError);
  assert.throws(() => governmentIndustryFixture.mockPanel.chips.splice(0, 1), TypeError);
  assert.throws(() => { sampleReportFixture.provenance = "measured"; }, TypeError);
  assert.equal(industryFixture.workflow[0].id, "fixture-intake");
  assert.equal(mockPanelFixture.chips.length, 3);
});

// Any module specifier or glob pattern that reaches src/fixtures/: `import … from` and `export … from`,
// a side-effect `import "…"`, a dynamic `import("…")`, and `import.meta.glob(…)` (Vite's glob import).
const FIXTURE_PATH = String.raw`["'\`][^"'\`]*\/fixtures(?:\/[^"'\`]*)?["'\`]`;
const IMPORTS_FIXTURES = new RegExp(String.raw`(?:\bfrom|\bimport)\s*\(?\s*${FIXTURE_PATH}|\bimport\.meta\.glob\w*\s*\([^)]*?${FIXTURE_PATH}`);
// Only the lazy forms: a dynamic `import("…")` and `import.meta.glob(…)`.
const LOADS_FIXTURES_LAZILY = new RegExp(String.raw`\bimport\s*\(\s*${FIXTURE_PATH}|\bimport\.meta\.glob\w*\s*\([^)]*?${FIXTURE_PATH}`);
const SOURCES = sourceFiles(SRC).map((p) => relative(SRC, p).split(sep).join("/"));
const sourceText = (rel) => readFileSync(join(SRC, rel), "utf8");

test("only src/preview/ imports the fixtures", () => {
  for (const code of [
    'import { kitFixture } from "../fixtures/index.ts";',
    'export * from "../../fixtures/kit.ts";',
    'import "../fixtures/index.ts";',
    'const fx = await import("../../fixtures/index.ts");',
    'const all = import.meta.glob("../fixtures/*.ts");',
    "const all = import.meta.glob(['../lib/*.ts', '/src/fixtures/**/*.ts'], { eager: true });",
  ]) assert.ok(IMPORTS_FIXTURES.test(code), `the guard misses: ${code}`);
  for (const code of ['import { x } from "../lib/fixture-names.ts";', "// only the preview route may load src/fixtures/"]) {
    assert.ok(!IMPORTS_FIXTURES.test(code), `the guard flags: ${code}`);
  }
  const offenders = SOURCES
    .filter((rel) => !rel.startsWith("fixtures/") && !rel.startsWith("preview/"))
    .filter((rel) => IMPORTS_FIXTURES.test(sourceText(rel)));
  assert.deepEqual(offenders, []);
});

// src/preview/integration.mjs injects the gallery route only into preview builds, so src/preview/
// imports fixtures statically. A module imported both statically and through import() makes Vite
// log [WARN] INEFFECTIVE_DYNAMIC_IMPORT, which fails the pristine-build gate.
test("src/preview/ imports the fixtures statically, never through import() or import.meta.glob", () => {
  for (const code of ['const fx = await import("../fixtures/index.ts");', 'const all = import.meta.glob("../../fixtures/*.ts");']) {
    assert.ok(LOADS_FIXTURES_LAZILY.test(code), `the lazy-import guard misses: ${code}`);
  }
  for (const code of ['import { solutionFixture } from "../../fixtures/index.ts";', 'import type { PreviewPage } from "../fixtures/index.ts";']) {
    assert.ok(!LOADS_FIXTURES_LAZILY.test(code), `the lazy-import guard flags: ${code}`);
  }
  const preview = SOURCES.filter((rel) => rel.startsWith("preview/"));
  assert.ok(preview.some((rel) => IMPORTS_FIXTURES.test(sourceText(rel))), "nothing in src/preview/ imports the fixtures");
  assert.deepEqual(preview.filter((rel) => LOADS_FIXTURES_LAZILY.test(sourceText(rel))), []);
});
