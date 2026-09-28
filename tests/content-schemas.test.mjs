import { test } from "node:test";
import assert from "node:assert/strict";
import {
  plainRef, slug, jurisdiction, launchPackage, solutionPackage, mockPanel,
  makeSolutionSchema, makeIndustrySchema, regulatoryFile, makeKitSchema, traceFile,
  makeDemoSchema, sampleReport, makeInsightSchema, INSIGHT_TYPE_LABEL,
} from "../src/content/schemas.ts";

// Node builds every schema with plain string refs; content.config.ts passes Astro's reference() instead.
const solutionSchema = makeSolutionSchema(plainRef);
const industrySchema = makeIndustrySchema(plainRef);
const kitSchema = makeKitSchema(plainRef);
const demoSchema = makeDemoSchema(plainRef);
const insightSchema = makeInsightSchema(plainRef);

function ok(schema, value, label) {
  const r = schema.safeParse(value);
  assert.ok(r.success, `${label} should be accepted: ${JSON.stringify(r.error?.issues)}`);
  return r.data;
}
function bad(schema, value, label) {
  const r = schema.safeParse(value);
  assert.equal(r.success, false, `${label} should be rejected`);
  return r.error.issues;
}

const faq = (n) => Array.from({ length: n }, (_, i) => ({ q: `Test question ${i + 1}?`, a: `Test answer ${i + 1}, long enough to pass.` }));

const LAUNCH = {
  id: "test-launch", name: "Test launch package", status: "launch", onshore: true,
  forWhom: "Test buyers", scope: "Test scope", inclusions: ["Test inclusion"],
  clientTime: "Test client time", timeline: "Test timeline", outOfScope: ["Test exclusion"],
  gate: "Test gate", onshoreNote: "Test onshore note",
};
const ON_REQUEST = { id: "test-on-request", name: "Test on-request package", status: "on-request", oneLiner: "Test one-liner" };
const INTERNAL = { id: "test-internal", name: "Test internal package", status: "internal", oneLiner: "Test one-liner" };

const SOLUTION = {
  job: "Test job statement, twenty characters plus.",
  artefact: "Test artefact statement, twenty characters plus.",
  needProfiles: [{ title: "Test profile A", body: "Test body" }, { title: "Test profile B", body: "Test body" }],
  byIndustry: ["test-industry"],
  genericPackage: LAUNCH,
  packages: [LAUNCH, ON_REQUEST, INTERNAL],
  howWeTest: { summary: "Test summary", bullets: ["Test bullet 1", "Test bullet 2"] },
  whereItRuns: { choices: ["your-account", "managed"], note: "Test note" },
  dontDo: ["Test exclusion"],
  matrix: { "test-industry": "Test cell example" },
  demo: "test-demo",
  faq: faq(3),
};

const MOCK_PANEL = {
  title: "Test panel",
  fields: [{ label: "Test field", value: "Test value" }, { label: "Test account", value: "Test hidden", redacted: true }],
  chips: [{ status: "ok", text: "Test ok" }, { status: "review", text: "Test review" }, { status: "blocked", text: "Test blocked" }],
  citations: [{ source: "Test source", clause: "Test clause", href: "https://example.com/clause" }],
  decision: { approve: "Test approve", reject: "Test reject" },
};

const USE_CASE = { name: "Test use case", solution: "test-solution", status: "launch" };
const SOURCE = { label: "Test source", url: "https://example.com/source", asAt: "2026-09-01" };
const INDUSTRY = {
  promise: "Test promise", constraintSet: "Test constraints", constraintHook: "Test hook",
  flagshipUseCases: [USE_CASE, USE_CASE, { ...USE_CASE, status: "on-request", note: "Test note" }],
  obligationChips: [1, 2, 3].map((n) => ({ label: `Test chip ${n}`, row: `test-row-${n}` })),
  worksAlongside: [{ system: "Test system", method: "read-only", verified: "2026-09-01" }],
  leadSolutions: ["test-solution"],
  problem: { from: "Test before", to: "Test after", source: SOURCE },
  workflow: [1, 2, 3, 4].map((n) => ({ id: `test-stage-${n}`, stage: `Test stage ${n}`, useCases: [USE_CASE] })),
  mockPanel: MOCK_PANEL,
  scenario: { title: "Test scenario", problem: "Test", approach: "Test", measure: ["Test"], shipsFirst: "Test", trace: "test-trace" },
  firstEngagement: { needFromYou: ["Test"], youGet: ["Test"], exitRamp: "Test exit ramp" },
  faq: faq(5),
};

const ROW = {
  id: "test-row-1", obligation: "Test obligation", meaning: "Test meaning", design: "Test design", evidence: "Test evidence",
  source: "https://example.com/regulation", asAt: "2026-09-01", lastReviewed: "2026-09-15",
};

const KIT = {
  industry: "test-industry", title: "Test kit", summary: "Test summary", contents: ["Test item"],
  source: SOURCE, asAt: "2026-09-01", lawyerReviewedAt: null, download: "/downloads/test-kit.pdf",
};

const TRACE = {
  title: "Test trace", provenance: "illustrative",
  lines: [{ t: "00:00:01", op: "retrieve", detail: "Test step" }, { t: "00:00:02", op: "answer", detail: "Test step", metric: { value: 12, unit: "ms" } }],
};

const DEMO = { solution: "test-solution", title: "Test demo", kind: "register", provenance: "illustrative", data: { rows: [] } };

const REPORT = {
  system: "Test system", n: 40, method: "Test method", provenance: "illustrative",
  thresholds: [{ metric: "Test metric", target: { value: 90, unit: "%" }, result: { value: 92, unit: "%" }, pass: true }],
  failures: [1, 2, 3].map((n) => ({ id: `F${n}`, rating: "low", description: "Test failure" })),
};

const INSIGHT = { title: "Test title", description: "Test description", publishDate: "2026-06-09", type: "article" };

test("slugs and plain refs accept lower-case kebab ids only", () => {
  for (const id of ["document-registers", "ai-switch-on", "government"]) {
    ok(slug, id, id);
    ok(plainRef("industries"), id, `ref ${id}`);
  }
  for (const id of ["Financial services", "Document-Registers", "a_b", "a/b", ""]) {
    bad(slug, id, JSON.stringify(id));
    bad(plainRef("solutions"), id, `ref ${JSON.stringify(id)}`);
  }
});

test("jurisdiction is exactly cth, nsw, vic, qld, local", () => {
  assert.deepEqual(jurisdiction.options, ["cth", "nsw", "vic", "qld", "local"]);
  bad(jurisdiction, "wa", "wa");
});

test("insight frontmatter: type is required, refs default to [] and legacy pillar/sectors are dropped", () => {
  const data = ok(insightSchema, { ...INSIGHT, pillar: "RAG & retrieval", sectors: ["Financial services"] }, "legacy post");
  assert.ok(data.publishDate instanceof Date);
  assert.deepEqual(data.industries, []);
  assert.deepEqual(data.solutions, []);
  assert.equal(data.illustrative, false);
  assert.equal(data.draft, false);
  assert.ok(!("pillar" in data) && !("sectors" in data), "unknown legacy keys must not survive parsing");
  ok(insightSchema, { ...INSIGHT, type: "reference-scenario", illustrative: true, industries: ["financial-services"], solutions: ["knowledge-assistant"] }, "reference scenario");
  const { type, ...untyped } = INSIGHT;
  bad(insightSchema, untyped, "post without type");
  bad(insightSchema, { ...INSIGHT, type: "case-study" }, "unknown type");
  bad(insightSchema, { ...INSIGHT, industries: ["Financial services"] }, "industry given as a display name");
});

test("INSIGHT_TYPE_LABEL labels every insight type", () => {
  assert.deepEqual(Object.keys(INSIGHT_TYPE_LABEL), insightSchema.shape.type.options);
  assert.deepEqual(INSIGHT_TYPE_LABEL, { article: "Article", "reference-scenario": "Reference scenario", "platform-guide": "Platform guide" });
});

test("solution packages discriminate on status", () => {
  ok(launchPackage, LAUNCH, "launch package");
  for (const p of [LAUNCH, ON_REQUEST, INTERNAL]) ok(solutionPackage, p, p.status);
  ok(solutionPackage, { ...ON_REQUEST, precondition: "Test precondition" }, "on-request with precondition");
  bad(solutionPackage, { ...LAUNCH, inclusions: [] }, "launch package with no inclusions");
  bad(solutionPackage, { ...LAUNCH, outOfScope: [] }, "launch package with nothing out of scope");
  bad(solutionPackage, { id: "test-on-request", name: "Test", status: "on-request" }, "on-request package without a one-liner");
  bad(solutionPackage, { ...ON_REQUEST, status: "draft" }, "unknown status");
  bad(solutionPackage, { ...LAUNCH, id: "Test Launch" }, "package id that is not a slug");
});

test("solution schema accepts a complete entry and rejects the gaps", () => {
  ok(solutionSchema, SOLUTION, "solution");
  const { demo, ...noDemo } = SOLUTION;
  ok(solutionSchema, noDemo, "solution without a demo");
  ok(solutionSchema, { ...SOLUTION, program: { title: "Test", summary: "Test", duration: "Test", bullets: ["Test"] }, platformFirst: "Test" }, "solution with program");
  bad(solutionSchema, { ...SOLUTION, job: "Too short" }, "job under 20 characters");
  bad(solutionSchema, { ...SOLUTION, needProfiles: SOLUTION.needProfiles.slice(0, 1) }, "one need profile");
  bad(solutionSchema, { ...SOLUTION, genericPackage: ON_REQUEST }, "generic package that is not a launch package");
  bad(solutionSchema, { ...SOLUTION, byIndustry: ["Financial services"] }, "byIndustry display name");
  bad(solutionSchema, { ...SOLUTION, howWeTest: { summary: "Test", bullets: ["Only one"] } }, "one how-we-test bullet");
  bad(solutionSchema, { ...SOLUTION, whereItRuns: { choices: [], note: "Test" } }, "no run choice");
  bad(solutionSchema, { ...SOLUTION, whereItRuns: { choices: ["on-premise"], note: "Test" } }, "unknown run choice");
  bad(solutionSchema, { ...SOLUTION, dontDo: [] }, "empty dontDo");
  bad(solutionSchema, { ...SOLUTION, matrix: { "test-industry": "x".repeat(61) } }, "matrix cell over 60 characters");
  bad(solutionSchema, { ...SOLUTION, faq: faq(2) }, "two FAQs");
  bad(solutionSchema, { ...SOLUTION, faq: [{ q: "Why?", a: "Test answer, long enough to pass." }, ...faq(2)] }, "FAQ question under 5 characters");
});

test("industry schema accepts a complete entry and rejects the gaps", () => {
  ok(industrySchema, INDUSTRY, "industry");
  ok(industrySchema, { ...INDUSTRY, faq: faq(7) }, "seven FAQs");
  ok(industrySchema, {
    ...INDUSTRY,
    jurisdictions: ["cth", "nsw", "local"],
    obligationChips: INDUSTRY.obligationChips.map((c, i) => ({ ...c, jurisdiction: ["cth", "nsw", "local"][i] })),
  }, "government-style industry");
  bad(industrySchema, { ...INDUSTRY, workflow: INDUSTRY.workflow.slice(0, 3) }, "three workflow stages");
  bad(industrySchema, { ...INDUSTRY, workflow: [...INDUSTRY.workflow, INDUSTRY.workflow[0]] }, "five workflow stages");
  bad(industrySchema, { ...INDUSTRY, workflow: INDUSTRY.workflow.map((w) => ({ ...w, useCases: [] })) }, "stage without use cases");
  bad(industrySchema, { ...INDUSTRY, faq: faq(4) }, "four FAQs");
  bad(industrySchema, { ...INDUSTRY, faq: faq(8) }, "eight FAQs");
  bad(industrySchema, { ...INDUSTRY, flagshipUseCases: [USE_CASE, USE_CASE] }, "two flagship use cases");
  bad(industrySchema, { ...INDUSTRY, flagshipUseCases: [USE_CASE, USE_CASE, { ...USE_CASE, status: "internal" }] }, "internal use case");
  bad(industrySchema, { ...INDUSTRY, obligationChips: INDUSTRY.obligationChips.slice(0, 2) }, "two obligation chips");
  bad(industrySchema, { ...INDUSTRY, worksAlongside: [{ system: "Test", method: "write-back", verified: "2026-09-01" }] }, "unknown works-alongside method");
  bad(industrySchema, { ...INDUSTRY, leadSolutions: [] }, "no lead solution");
  bad(industrySchema, { ...INDUSTRY, problem: { ...INDUSTRY.problem, source: { ...SOURCE, url: "not a url" } } }, "problem source without a URL");
  bad(industrySchema, { ...INDUSTRY, scenario: { ...INDUSTRY.scenario, trace: "Test Trace" } }, "scenario trace that is not a slug");
  bad(industrySchema, { ...INDUSTRY, jurisdictions: ["wa"] }, "unknown jurisdiction");
});

test("mock panel needs fields and known chip statuses", () => {
  ok(mockPanel, MOCK_PANEL, "mock panel");
  const { decision, ...noDecision } = MOCK_PANEL;
  ok(mockPanel, noDecision, "mock panel without decision row");
  bad(mockPanel, { ...MOCK_PANEL, fields: [] }, "no fields");
  bad(mockPanel, { ...MOCK_PANEL, chips: [{ status: "warning", text: "Test" }] }, "unknown chip status");
  bad(mockPanel, { ...MOCK_PANEL, citations: [{ source: "Test", clause: "Test", href: "not a url" }] }, "citation href that is not a URL");
});

test("regulatory rows need a URL source, both dates and non-empty jurisdictions when given", () => {
  const data = ok(regulatoryFile, { rows: [ROW, { ...ROW, id: "test-row-2", jurisdictions: ["cth", "local"] }] }, "regulatory file");
  assert.ok(data.rows[0].asAt instanceof Date && data.rows[0].lastReviewed instanceof Date);
  bad(regulatoryFile, { rows: [] }, "no rows");
  bad(regulatoryFile, { rows: [{ ...ROW, source: "example.com/regulation" }] }, "source that is not a URL");
  const { lastReviewed, ...unreviewed } = ROW;
  bad(regulatoryFile, { rows: [unreviewed] }, "row without lastReviewed");
  bad(regulatoryFile, { rows: [{ ...ROW, jurisdictions: [] }] }, "empty jurisdictions");
  bad(regulatoryFile, { rows: [{ ...ROW, id: "Test Row" }] }, "row id that is not a slug");
});

test("kits need a source, dates and a /downloads/ pdf or docx path; lawyerReviewedAt may be null", () => {
  assert.equal(ok(kitSchema, KIT, "kit awaiting review").lawyerReviewedAt, null);
  assert.ok(ok(kitSchema, { ...KIT, lawyerReviewedAt: "2026-10-01", download: "/downloads/test-kit.docx" }, "reviewed kit").lawyerReviewedAt instanceof Date);
  const { lawyerReviewedAt, ...unset } = KIT;
  bad(kitSchema, unset, "kit without lawyerReviewedAt");
  bad(kitSchema, { ...KIT, industry: "Financial services" }, "industry display name");
  for (const download of ["/files/test-kit.pdf", "/downloads/test-kit.zip", "/downloads/Test Kit.pdf", "downloads/test-kit.pdf"]) {
    bad(kitSchema, { ...KIT, download }, download);
  }
});

test("traces: illustrative needs no run, measured needs a run path", () => {
  ok(traceFile, TRACE, "illustrative trace");
  ok(traceFile, { ...TRACE, provenance: "measured", run: "src/data/runs/test-run/" }, "measured trace with run");
  const issues = bad(traceFile, { ...TRACE, provenance: "measured" }, "measured trace without run");
  assert.ok(issues.some((i) => i.message === "measured traces need a run path"));
  const { provenance, ...unmarked } = TRACE;
  bad(traceFile, unmarked, "trace without provenance");
  bad(traceFile, { ...TRACE, lines: [] }, "trace without lines");
  bad(traceFile, { ...TRACE, lines: [{ t: "0:00:01", op: "Test", detail: "Test" }] }, "timestamp not hh:mm:ss");
  bad(traceFile, { ...TRACE, lines: [{ t: "00:00:01", op: "Test", detail: "Test", metric: { value: "12", unit: "ms" } }] }, "metric value as text");
});

test("demos: known kinds only; measured needs a run path", () => {
  ok(demoSchema, DEMO, "illustrative demo");
  ok(demoSchema, { ...DEMO, provenance: "measured", run: "src/data/runs/test-run/" }, "measured demo with run");
  const issues = bad(demoSchema, { ...DEMO, provenance: "measured" }, "measured demo without run");
  assert.ok(issues.some((i) => i.message === "measured demos need a run path"));
  bad(demoSchema, { ...DEMO, kind: "chatbot" }, "unknown kind");
  bad(demoSchema, { ...DEMO, solution: "Test Solution" }, "solution display name");
  const { provenance, ...unmarked } = DEMO;
  bad(demoSchema, unmarked, "demo without provenance");
});

test("sample reports need a positive integer n, typed thresholds and at least three rated failures", () => {
  ok(sampleReport, REPORT, "sample report");
  ok(sampleReport, { ...REPORT, thresholds: [{ ...REPORT.thresholds[0], target: { value: 40 } }] }, "threshold metric without a unit");
  bad(sampleReport, { ...REPORT, thresholds: [{ ...REPORT.thresholds[0], target: "at least 90%" }] }, "threshold target as free text");
  bad(sampleReport, { ...REPORT, thresholds: [{ ...REPORT.thresholds[0], result: { value: "92", unit: "%" } }] }, "threshold result value as text");
  bad(sampleReport, { ...REPORT, failures: REPORT.failures.slice(0, 2) }, "two failures");
  bad(sampleReport, { ...REPORT, failures: [...REPORT.failures.slice(0, 2), { id: "F3", rating: "critical", description: "Test" }] }, "unknown rating");
  bad(sampleReport, { ...REPORT, thresholds: [] }, "no thresholds");
  bad(sampleReport, { ...REPORT, n: 0 }, "n = 0");
  bad(sampleReport, { ...REPORT, n: 1.5 }, "fractional n");
});

test("sample reports declare provenance: illustrative needs no run, measured needs a run path", () => {
  ok(sampleReport, REPORT, "illustrative sample report");
  ok(sampleReport, { ...REPORT, provenance: "measured", run: "src/data/runs/test-run/" }, "measured sample report with run");
  for (const run of [undefined, ""]) {
    const issues = bad(sampleReport, { ...REPORT, provenance: "measured", run }, `measured sample report with run ${JSON.stringify(run)}`);
    assert.ok(issues.some((i) => i.message === "measured sample reports need a run path"), JSON.stringify(issues));
  }
  const { provenance, ...unmarked } = REPORT;
  bad(sampleReport, unmarked, "sample report without provenance");
  bad(sampleReport, { ...REPORT, provenance: "estimated" }, "unknown provenance");
});
