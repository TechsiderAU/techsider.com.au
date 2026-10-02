import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  plainRef, slug, jurisdiction, sourceRef, launchPackage, solutionPackage, mockPanel,
  makeSolutionSchema, makeIndustrySchema, regulatoryFile, makeKitSchema, traceFile,
  makeDemoSchema, sampleReport, makeInsightSchema, INSIGHT_TYPE_LABEL,
  deliveryChoice, buyer, interval, JURISDICTION_SECTION, SECTION_TITLE, SECTION_ORDER,
  citedSource, corpusRef, assistantTurn, assistantData, registerCell, syntheticDoc, registerData,
  inboxMessage, inboxData, checkerData, platformAiEntry, platformAiFile, CHECKER_PROVENANCE,
} from "../src/content/schemas.ts";
import {
  positioningData, servicesData, contactData, trustData, aboutData, homeData, documentSchema,
} from "../src/content/page-schemas.ts";
import { HOME_TRUST_QUESTION } from "../src/lib/fixed-copy.ts";
import { ENQUIRY_FIELDS } from "../src/lib/contact-form.ts";

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
  id: "test-launch", name: "Test launch package", status: "launch", onshore: true, buyers: ["mid-market"],
  forWhom: "Test buyers", scope: "Test scope", inclusions: ["Test inclusion"],
  clientTime: "Test client time", timeline: "Test timeline", outOfScope: ["Test exclusion"],
  gate: "Test gate", onshoreNote: "Test onshore note",
};
const ON_REQUEST = { id: "test-on-request", name: "Test on-request package", status: "on-request", oneLiner: "Test one-liner" };
const INTERNAL = { id: "test-internal", name: "Test internal package", status: "internal", oneLiner: "Test one-liner" };

const SOLUTION = {
  job: "Test job statement, twenty characters plus.",
  artefact: "Test artefact statement, twenty characters plus.",
  forLine: "Test teams with a stack of paperwork",
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
  obligationChips: [1, 2, 3, 4].map((n) => ({ label: `Test chip ${n}`, row: `test-row-${n}` })),
  worksAlongside: ["read-only", "import", "draft-for-approval"].map((method, i) => ({ system: `Test system ${i + 1}`, method, verified: "2026-09-01" })),
  leadSolutions: ["test-solution"],
  packages: ["test-generic", "test-launch", "test-on-request"].map((id) => ({ solution: "test-solution", package: id })),
  dontDo: ["Test limit"],
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

// One valid data set per demo kind (Phase D): the register, assistant, inbox and checker shapes,
// and the ④ report's sample report (REPORT, below).
const PAGES = [{ n: 1, text: "Test page one" }, { n: 2, text: "Test page two" }];
const DOCS = [1, 2, 3, 4, 5, 6].map((n) => ({ id: `test-doc-${n}`, title: `Synthetic test document ${n}`, template: "Test template", pages: PAGES }));
const FIELDS = ["test-a", "test-b", "test-c"].map((key) => ({ key, label: `Test field ${key}` }));
const cells = (page = 1) => Object.fromEntries(FIELDS.map((f) => [f.key, { value: "Test value", page, status: "ok" }]));
const REGISTER = {
  documents: DOCS,
  registers: [
    { id: "test-register-a", title: "Test register A", fields: FIELDS, rows: [1, 2, 3].map((n) => ({ doc: `test-doc-${n}`, cells: cells() })) },
    { id: "test-register-b", title: "Test register B", fields: FIELDS, rows: [4, 5, 6].map((n) => ({ doc: `test-doc-${n}`, cells: cells(2) })) },
  ],
  download: "/downloads/test-register.csv",
};
const CORPUS = { title: "Test corpus", version: "Test version", url: "https://example.com/corpus", licence: "CC BY 4.0", attribution: "Test attribution" };
const SOURCES = [1, 2].map((cite) => ({ cite, label: `Test source ${cite}`, text: `Test source text ${cite}`, href: `https://example.com/source-${cite}` }));
const turn = (outcome, extra = {}) => ({
  question: "Test question?",
  retrieved: [{ cite: 1, snippet: "Test snippet", score: { value: 0.9 } }, { cite: 0, snippet: "Test distractor", score: { value: 0.2 } }],
  answer: [{ text: "Test answer: " }, { text: "Test quote", cite: 2 }],
  outcome,
  ...extra,
  trace: [{ label: "Retrieve", detail: "Test detail", ms: { value: 40, unit: "ms" } }],
});
const TURNS = [turn("answered"), turn("refused"), turn("false-answer-caught", { caught: "Test catch" })];
const ASSISTANT = { scenarios: [{ id: "test-scenario", title: "Test scenario", corpus: CORPUS, sources: SOURCES, turns: TURNS }] };
const message = (n, action) => ({
  id: `test-message-${n}`, channel: n % 2 ? "email" : "sms", from: "Test sender", body: "Test body", category: "Test category",
  action, reason: "Test reason", ...(action === "draft-for-approval" ? { draft: "Test draft", to: "Test recipient" } : {}),
});
const INBOX = {
  messages: [1, 2, 3, 4, 5, 6].map((n) => message(n, "draft-for-approval")).concat(message(7, "file"), message(8, "escalate")),
  trace: [1, 2, 3].map((n) => ({ label: `Test step ${n}`, detail: "Test detail", ms: { value: 10 * n, unit: "ms" } })),
};
const CHECKER = { source: "platform-ai" };
const ENTRY = {
  vendor: "Test vendor", product: "Test product", feature: "Test feature", plans: ["Test plan"], included: "included",
  processingLocation: "Not published. Test detail.", source: "https://example.com/pricing", asAt: "2026-09-29", category: "general",
};
const PLATFORM = { asAt: "2026-09-29", entries: Array.from({ length: 20 }, () => ENTRY) };

const DEMO = { solution: "test-solution", title: "Test demo", kind: "register", provenance: "illustrative", data: REGISTER };

// Government: every item is tagged, and each of the three sub-sections meets the counts.
const perSection = (n, make) => ["cth", "nsw", "local"].flatMap((j) => Array.from({ length: n }, (_, i) => ({ ...make(i), jurisdiction: j })));
const GOVERNMENT = {
  ...INDUSTRY,
  jurisdictions: ["cth", "nsw", "vic", "local"],
  obligationChips: perSection(4, (i) => ({ label: `Test chip ${i + 1}`, row: `test-row-${i + 1}` })),
  worksAlongside: perSection(3, (i) => ({ system: `Test system ${i + 1}`, method: "read-only", verified: "2026-09-01" })),
  packages: perSection(3, (i) => ({ solution: "test-solution", package: `test-package-${i + 1}` })),
};

const REPORT = {
  system: "Test system", n: 40, method: "Test method",
  groundTruth: "Test ground truth: two reviewers wrote each answer",
  interRater: { statistic: "Test agreement statistic", value: { value: 0.8 } },
  framework: "Test framework",
  provenance: "illustrative",
  thresholds: [{ metric: "Test metric", target: { value: 90, unit: "%" }, result: { value: 92, unit: "%" }, ci: { low: 86, high: 96, level: 95 }, pass: true }],
  failures: [1, 2, 3].map((n) => ({ id: `F${n}`, rating: "low", description: "Test failure", frameworkLevel: `Test level ${n}` })),
  regression: {
    baseline: "Test model A", candidate: "Test model B",
    rows: [{ metric: "Test metric", baseline: { value: 92, unit: "%" }, candidate: { value: 90, unit: "%" } }],
  },
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

test("insight frontmatter: type is required, refs default to [] and legacy pillar/sectors are rejected", () => {
  const data = ok(insightSchema, INSIGHT, "post");
  assert.ok(data.publishDate instanceof Date);
  assert.deepEqual(data.industries, []);
  assert.deepEqual(data.solutions, []);
  assert.equal(data.illustrative, false);
  assert.equal(data.draft, false);
  // Strict: a leftover or misspelt key fails the build instead of vanishing.
  bad(insightSchema, { ...INSIGHT, pillar: "RAG & retrieval", sectors: ["Financial services"] }, "legacy post");
  ok(insightSchema, { ...INSIGHT, type: "reference-scenario", illustrative: true, industries: ["financial-services"], solutions: ["knowledge-assistant"] }, "reference scenario");
  const { type, ...untyped } = INSIGHT;
  bad(insightSchema, untyped, "post without type");
  bad(insightSchema, { ...INSIGHT, type: "case-study" }, "unknown type");
  bad(insightSchema, { ...INSIGHT, industries: ["Financial services"] }, "industry given as a display name");
});

test("a reference scenario must be marked illustrative (spec §9.3)", () => {
  const scenario = { ...INSIGHT, type: "reference-scenario" };
  for (const [value, label] of [[scenario, "illustrative left to default"], [{ ...scenario, illustrative: false }, "illustrative: false"]]) {
    const issues = bad(insightSchema, value, `reference scenario with ${label}`);
    assert.ok(issues.some((i) => i.message === "reference scenarios must set illustrative: true"), JSON.stringify(issues));
  }
  // The review's probe: a typo used to parse as illustrative: false and pass.
  bad(insightSchema, { ...scenario, illustative: true }, "reference scenario with a misspelt illustrative");
  ok(insightSchema, { ...scenario, illustrative: true }, "reference scenario marked illustrative");
});

test("every content schema rejects unknown keys, at the top level and nested", () => {
  const cases = [
    [insightSchema, { ...INSIGHT, drafts: true }, "insight"],
    [solutionSchema, { ...SOLUTION, jobb: "Test" }, "solution"],
    [solutionSchema, { ...SOLUTION, howWeTest: { ...SOLUTION.howWeTest, bulets: [] } }, "solution.howWeTest"],
    [solutionSchema, { ...SOLUTION, packages: [{ ...LAUNCH, onshor: true }] }, "solution.packages[0] (launch)"],
    [solutionSchema, { ...SOLUTION, packages: [{ ...ON_REQUEST, oneliner: "Test" }] }, "solution.packages[0] (on request)"],
    [solutionSchema, { ...SOLUTION, faq: [...faq(2), { ...faq(1)[0], answer: "Test" }] }, "solution.faq[2]"],
    [industrySchema, { ...INDUSTRY, faqs: [] }, "industry"],
    [industrySchema, { ...INDUSTRY, scenario: { ...INDUSTRY.scenario, trce: "test-trace" } }, "industry.scenario"],
    [industrySchema, { ...INDUSTRY, problem: { ...INDUSTRY.problem, source: { ...SOURCE, date: "2026-09-01" } } }, "industry.problem.source"],
    [industrySchema, { ...INDUSTRY, workflow: INDUSTRY.workflow.map((w) => ({ ...w, usecases: [] })) }, "industry.workflow[]"],
    [industrySchema, { ...INDUSTRY, packages: INDUSTRY.packages.map((p) => ({ ...p, pkg: "test" })) }, "industry.packages[]"],
    [industrySchema, { ...INDUSTRY, worksAlongside: INDUSTRY.worksAlongside.map((w) => ({ ...w, access: "read-only" })) }, "industry.worksAlongside[]"],
    [kitSchema, { ...KIT, lawyerReviewed: "2026-09-01" }, "kit"],
    [regulatoryFile, { rows: [{ ...ROW, lastReview: "2026-09-01" }] }, "regulatory row"],
    [regulatoryFile, { rows: [ROW], note: "Test" }, "regulatory file"],
    [traceFile, { ...TRACE, provenace: "measured" }, "trace"],
    [traceFile, { ...TRACE, lines: [{ t: "00:00:01", op: "Test", detail: "Test", metrc: { value: 1 } }] }, "trace line"],
    [traceFile, { ...TRACE, lines: [{ t: "00:00:01", op: "Test", detail: "Test", metric: { value: 1, units: "ms" } }] }, "trace metric"],
    [demoSchema, { ...DEMO, runn: "src/data/runs/test-run/" }, "demo"],
    [demoSchema, { ...DEMO, data: { ...REGISTER, rows: [] } }, "register demo data"],
    [registerCell, { value: "Test", page: 1, status: "ok", pg: 2 }, "register cell"],
    [syntheticDoc, { ...DOCS[0], author: "Test" }, "synthetic document"],
    [citedSource, { ...SOURCES[0], url: "https://example.com" }, "cited source"],
    [corpusRef, { ...CORPUS, licenceUrl: "https://example.com" }, "corpus"],
    [assistantTurn, { ...TURNS[0], evals: {} }, "assistant turn"],
    [assistantData, { ...ASSISTANT, persona: "Test" }, "assistant data"],
    [inboxMessage, { ...INBOX.messages[0], priority: "high" }, "inbox message"],
    [inboxData, { ...INBOX, approver: "Test" }, "inbox data"],
    [checkerData, { ...CHECKER, asAt: "2026-09-29" }, "checker data"],
    [platformAiEntry, { ...ENTRY, price: "Test" }, "platform AI entry"],
    [platformAiFile, { ...PLATFORM, vendors: [] }, "platform AI file"],
    [sampleReport, { ...REPORT, title: "Test" }, "sample report"],
    [sampleReport, { ...REPORT, thresholds: [{ ...REPORT.thresholds[0], pas: true }] }, "sample report threshold"],
    [sampleReport, { ...REPORT, failures: REPORT.failures.map((f) => ({ ...f, severity: "low" })) }, "sample report failure"],
    [sampleReport, { ...REPORT, interRater: { ...REPORT.interRater, kappa: 0.8 } }, "sample report inter-rater agreement"],
    [sampleReport, { ...REPORT, thresholds: [{ ...REPORT.thresholds[0], ci: { ...REPORT.thresholds[0].ci, unit: "%" } }] }, "sample report interval"],
    [sampleReport, { ...REPORT, regression: { ...REPORT.regression, model: "Test" } }, "sample report regression"],
    [sampleReport, { ...REPORT, regression: { ...REPORT.regression, rows: [{ ...REPORT.regression.rows[0], delta: 2 }] } }, "sample report regression row"],
    [mockPanel, { ...MOCK_PANEL, fields: [{ label: "Test", value: "Test", redact: true }] }, "mock panel field"],
    [mockPanel, { ...MOCK_PANEL, decision: { ...MOCK_PANEL.decision, escalate: "Test" } }, "mock panel decision"],
  ];
  for (const [schema, value, label] of cases) {
    const issues = bad(schema, value, `${label} with an unknown key`);
    assert.ok(issues.some((i) => i.code === "unrecognized_keys"), `${label}: ${JSON.stringify(issues)}`);
  }
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
  bad(solutionSchema, { ...SOLUTION, matrix: { "test-industry": "" } }, "empty matrix cell");
  bad(solutionSchema, { ...SOLUTION, matrix: { "test-industry": "  " } }, "blank matrix cell");
  bad(solutionSchema, { ...SOLUTION, faq: faq(2) }, "two FAQs");
  bad(solutionSchema, { ...SOLUTION, faq: [{ q: "Why?", a: "Test answer, long enough to pass." }, ...faq(2)] }, "FAQ question under 5 characters");
});

test("industry schema accepts a complete entry and rejects the gaps", () => {
  ok(industrySchema, INDUSTRY, "industry");
  ok(industrySchema, { ...INDUSTRY, faq: faq(7) }, "seven FAQs");
  ok(industrySchema, GOVERNMENT, "government-style industry");
  bad(industrySchema, { ...INDUSTRY, workflow: INDUSTRY.workflow.slice(0, 3) }, "three workflow stages");
  bad(industrySchema, { ...INDUSTRY, workflow: [...INDUSTRY.workflow, INDUSTRY.workflow[0]] }, "five workflow stages");
  bad(industrySchema, { ...INDUSTRY, workflow: INDUSTRY.workflow.map((w) => ({ ...w, useCases: [] })) }, "stage without use cases");
  bad(industrySchema, { ...INDUSTRY, faq: faq(4) }, "four FAQs");
  bad(industrySchema, { ...INDUSTRY, faq: faq(8) }, "eight FAQs");
  bad(industrySchema, { ...INDUSTRY, flagshipUseCases: [USE_CASE, USE_CASE] }, "two flagship use cases");
  bad(industrySchema, { ...INDUSTRY, flagshipUseCases: [USE_CASE, USE_CASE, { ...USE_CASE, status: "internal" }] }, "internal use case");
  bad(industrySchema, { ...INDUSTRY, obligationChips: INDUSTRY.obligationChips.slice(0, 3) }, "three obligation chips");
  bad(industrySchema, { ...INDUSTRY, packages: [...INDUSTRY.packages.slice(0, 2), { solution: "test-solution", package: "Test Package" }] }, "package id that is not a slug");
  bad(industrySchema, { ...INDUSTRY, dontDo: [] }, "empty dontDo");
  const { packages, ...noPackages } = INDUSTRY;
  bad(industrySchema, noPackages, "industry without packages");
  bad(industrySchema, { ...INDUSTRY, worksAlongside: [{ system: "Test", method: "write-back", verified: "2026-09-01" }] }, "unknown works-alongside method");
  bad(industrySchema, { ...INDUSTRY, leadSolutions: [] }, "no lead solution");
  bad(industrySchema, { ...INDUSTRY, problem: { ...INDUSTRY.problem, source: { ...SOURCE, url: "not a url" } } }, "problem source without a URL");
  bad(industrySchema, { ...INDUSTRY, scenario: { ...INDUSTRY.scenario, trace: "Test Trace" } }, "scenario trace that is not a slug");
  bad(industrySchema, { ...INDUSTRY, jurisdictions: ["wa"] }, "unknown jurisdiction");
  bad(industrySchema, { ...GOVERNMENT, jurisdictions: [] }, "empty jurisdictions");
});

/** Asserts `value` fails with an issue at `path` carrying exactly `message`. */
function badWith(schema, value, path, message) {
  const issues = bad(schema, value, message);
  assert.ok(issues.some((i) => i.path.join(".") === path && i.message === message), `expected "${message}" at ${path}: ${JSON.stringify(issues)}`);
}

test("industry sections without jurisdictions: 4–6 chips, 3–5 systems, 3–4 packages, none tagged (spec §8.5)", () => {
  const many = (list, n) => Array.from({ length: n }, (_, i) => list[i % list.length]);
  ok(industrySchema, { ...INDUSTRY, obligationChips: many(INDUSTRY.obligationChips, 6), worksAlongside: many(INDUSTRY.worksAlongside, 5), packages: many(INDUSTRY.packages, 4) }, "industry at the maximums");
  badWith(industrySchema, { ...INDUSTRY, obligationChips: many(INDUSTRY.obligationChips, 3) }, "obligationChips", "3 chips; the spec needs 4–6");
  badWith(industrySchema, { ...INDUSTRY, obligationChips: many(INDUSTRY.obligationChips, 7) }, "obligationChips", "7 chips; the spec needs 4–6");
  badWith(industrySchema, { ...INDUSTRY, worksAlongside: many(INDUSTRY.worksAlongside, 2) }, "worksAlongside", "2 works-alongside systems; the spec needs 3–5");
  badWith(industrySchema, { ...INDUSTRY, worksAlongside: many(INDUSTRY.worksAlongside, 6) }, "worksAlongside", "6 works-alongside systems; the spec needs 3–5");
  badWith(industrySchema, { ...INDUSTRY, packages: many(INDUSTRY.packages, 2) }, "packages", "2 packages; the spec needs 3–4");
  badWith(industrySchema, { ...INDUSTRY, packages: many(INDUSTRY.packages, 5) }, "packages", "5 packages; the spec needs 3–4");
  badWith(
    industrySchema,
    { ...INDUSTRY, packages: INDUSTRY.packages.map((p, i) => (i === 1 ? { ...p, jurisdiction: "cth" } : p)) },
    "packages.1.jurisdiction",
    "packages[1] names a jurisdiction, but the industry lists no jurisdictions",
  );
});

test("industry sections with jurisdictions: every item is tagged, and each sub-section meets the counts", () => {
  const data = ok(industrySchema, GOVERNMENT, "government-style industry");
  assert.deepEqual(data.jurisdictions, ["cth", "nsw", "vic", "local"]);
  // nsw and vic are both the State sub-section: re-tagging state chips as vic keeps it at 4.
  ok(industrySchema, { ...GOVERNMENT, obligationChips: GOVERNMENT.obligationChips.map((c, i) => (i === 4 || i === 5 ? { ...c, jurisdiction: "vic" } : c)) }, "state chips split across nsw and vic");
  // A sub-section the industry doesn't list needs nothing.
  const cthOnly = (list) => list.filter((x) => x.jurisdiction === "cth");
  ok(industrySchema, { ...GOVERNMENT, jurisdictions: ["cth"], obligationChips: cthOnly(GOVERNMENT.obligationChips), worksAlongside: cthOnly(GOVERNMENT.worksAlongside), packages: cthOnly(GOVERNMENT.packages) }, "Commonwealth only");
  const without = (list, j, n) => {
    let dropped = 0;
    return list.filter((x) => !(x.jurisdiction === j && dropped++ < n));
  };
  badWith(industrySchema, { ...GOVERNMENT, obligationChips: without(GOVERNMENT.obligationChips, "nsw", 1) }, "obligationChips", "state: 3 chips; the spec needs 4–6");
  badWith(industrySchema, { ...GOVERNMENT, worksAlongside: without(GOVERNMENT.worksAlongside, "cth", 1) }, "worksAlongside", "commonwealth: 2 works-alongside systems; the spec needs 3–5");
  badWith(industrySchema, { ...GOVERNMENT, packages: [...GOVERNMENT.packages, ...GOVERNMENT.packages.filter((p) => p.jurisdiction === "local").slice(0, 2)] }, "packages", "local: 5 packages; the spec needs 3–4");
  badWith(
    industrySchema,
    { ...GOVERNMENT, obligationChips: GOVERNMENT.obligationChips.map((c, i) => (i === 0 ? { label: c.label, row: c.row } : c)) },
    "obligationChips.0.jurisdiction",
    "obligationChips[0] needs a jurisdiction: the industry lists jurisdictions",
  );
  badWith(
    industrySchema,
    { ...GOVERNMENT, worksAlongside: GOVERNMENT.worksAlongside.map((w, i) => (i === 3 ? { ...w, jurisdiction: "qld" } : w)) },
    "worksAlongside.3.jurisdiction",
    'worksAlongside[3] names "qld", which is not in jurisdictions',
  );
});

test("each jurisdiction belongs to one Government sub-section, titled and ordered as spec §8.5", () => {
  assert.deepEqual(Object.keys(JURISDICTION_SECTION), jurisdiction.options);
  assert.deepEqual(JURISDICTION_SECTION, { cth: "commonwealth", nsw: "state", vic: "state", qld: "state", local: "local" });
  assert.deepEqual(SECTION_ORDER, ["commonwealth", "state", "local"]);
  assert.deepEqual(SECTION_TITLE, { commonwealth: "Commonwealth", state: "State (NSW, Vic, Qld)", local: "Local government" });
  assert.deepEqual(deliveryChoice.options, ["your-account", "managed", "platform-you-license"]);
  assert.deepEqual(buyer.options, ["mid-market", "enterprise-government"]);
});

test("solutions carry a for line, a packages heading, the independence switch and per-package buyers", () => {
  const data = ok(solutionSchema, SOLUTION, "solution");
  assert.equal(data.packagesHeading, "Packages", "packagesHeading defaults to Packages");
  assert.equal(data.independencePolicy, false, "independencePolicy defaults to false");
  const evaluation = ok(solutionSchema, { ...SOLUTION, packagesHeading: "Engagements", independencePolicy: true }, "④-style solution");
  assert.deepEqual([evaluation.packagesHeading, evaluation.independencePolicy], ["Engagements", true]);
  bad(solutionSchema, { ...SOLUTION, packagesHeading: "Programs" }, "unknown packages heading");
  const { forLine, ...noForLine } = SOLUTION;
  bad(solutionSchema, noForLine, "solution without a for line");
  bad(solutionSchema, { ...SOLUTION, forLine: "Too short" }, "for line under 10 characters");
  bad(solutionSchema, { ...SOLUTION, forLine: "x".repeat(91) }, "for line over 90 characters");
  ok(launchPackage, { ...LAUNCH, buyers: ["mid-market", "enterprise-government"] }, "a package for both buyers");
  bad(launchPackage, { ...LAUNCH, buyers: [] }, "launch package with no buyer");
  bad(launchPackage, { ...LAUNCH, buyers: ["government"] }, "unknown buyer");
  const { buyers, ...noBuyers } = LAUNCH;
  bad(solutionSchema, { ...SOLUTION, genericPackage: noBuyers }, "generic package without buyers");
  // Listed packages have no buyers: they are never a tab or a full block.
  bad(solutionPackage, { ...ON_REQUEST, buyers: ["mid-market"] }, "on-request package with buyers");
});

test("URL fields use z.url(), not the deprecated z.string().url() (a ts6385 hint in every astro check)", () => {
  const src = readFileSync(new URL("../src/content/schemas.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /z\.string\(\)\.url\(/);
  assert.equal(
    src.match(/\bz\.url\(\)/g)?.length, 6,
    "sourceRef.url, mockPanel citation href, regulatoryRow.source, citedSource.href, corpusRef.url and platformAiEntry.source",
  );
  for (const [schema, value, label] of [
    [sourceRef, { ...SOURCE, url: "not a url" }, "source ref"],
    [mockPanel, { ...MOCK_PANEL, citations: [{ source: "Test", clause: "Test", href: "example.com/clause" }] }, "citation href"],
    [regulatoryFile, { rows: [{ ...ROW, source: "not a url" }] }, "regulatory source"],
    [citedSource, { ...SOURCES[0], href: "example.com/source" }, "cited source href"],
    [corpusRef, { ...CORPUS, url: "not a url" }, "corpus url"],
    [platformAiEntry, { ...ENTRY, source: "example.com/pricing" }, "platform AI source"],
  ]) bad(schema, value, `${label} that is not a URL`);
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
  ok(demoSchema, { ...DEMO, kind: "inbox", provenance: "measured", run: "src/data/runs/test-run/", data: INBOX }, "measured inbox demo with run");
  // The ⑤ checker's data is real, dated vendor facts (controller ruling 6): it is "sourced", never
  // illustrative or measured, and no replay or report demo may call itself sourced.
  assert.equal(CHECKER_PROVENANCE, "sourced");
  ok(demoSchema, { ...DEMO, kind: "checker", provenance: "sourced", data: CHECKER }, "sourced checker demo");
  bad(demoSchema, { ...DEMO, kind: "checker", data: CHECKER }, "an illustrative checker demo");
  bad(demoSchema, { ...DEMO, kind: "checker", provenance: "measured", run: "src/data/runs/test-run/", data: CHECKER }, "a measured checker demo");
  bad(demoSchema, { ...DEMO, kind: "checker", provenance: "sourced", run: "src/data/runs/test-run/", data: CHECKER }, "a checker demo with a run");
  bad(demoSchema, { ...DEMO, provenance: "sourced" }, "a sourced register demo");
  ok(demoSchema, { ...DEMO, provenance: "measured", run: "src/data/runs/test-run/" }, "measured demo with run");
  const issues = bad(demoSchema, { ...DEMO, provenance: "measured" }, "measured demo without run");
  assert.ok(issues.some((i) => i.message === "measured demos need a run path"));
  bad(demoSchema, { ...DEMO, kind: "chatbot" }, "unknown kind");
  bad(demoSchema, { ...DEMO, solution: "Test Solution" }, "solution display name");
  const { provenance, ...unmarked } = DEMO;
  bad(demoSchema, unmarked, "demo without provenance");
});

test("demo entries discriminate on kind, and each kind takes its own data (Phase D)", () => {
  assert.deepEqual(demoSchema.options.map((o) => o.shape.kind.value), ["register", "assistant", "inbox", "report", "checker"]);
  const data = { register: REGISTER, assistant: ASSISTANT, inbox: INBOX, report: REPORT, checker: CHECKER };
  // The checker's entry is "sourced" (controller ruling 6); every other kind is illustrative here.
  const entry = (kind, value) => ({ ...DEMO, kind, data: value, ...(kind === "checker" ? { provenance: CHECKER_PROVENANCE } : {}) });
  for (const [kind, value] of Object.entries(data)) {
    ok(demoSchema, entry(kind, value), `${kind} demo`);
    for (const [other, wrong] of Object.entries(data)) {
      if (other !== kind) bad(demoSchema, entry(kind, wrong), `${kind} demo with ${other} data`);
    }
  }
  const parsed = ok(demoSchema, entry("assistant", ASSISTANT), "assistant demo");
  assert.equal(parsed.data.scenarios[0].turns[2].caught, "Test catch");
  bad(demoSchema, entry("checker", { source: "vendor-json" }), "checker data naming another source");
  const { data: _, ...noData } = DEMO;
  bad(demoSchema, noData, "demo without data");
});

test("assistant data: every cite resolves in its scenario, and the demo shows a refusal and a caught false answer (spec §9.1)", () => {
  ok(assistantData, ASSISTANT, "assistant data");
  const scenario = ASSISTANT.scenarios[0];
  const withTurn = (i, over) => ({ scenarios: [{ ...scenario, turns: scenario.turns.map((t, j) => (j === i ? { ...t, ...over } : t)) }] });
  badWith(assistantData, withTurn(0, { answer: [{ text: "Test", cite: 3 }] }), "scenarios.0.turns.0.answer.0.cite", 'scenario "test-scenario" turn 1: answer cite 3 names no source');
  badWith(
    assistantData, withTurn(1, { retrieved: [{ cite: 9, snippet: "Test", score: { value: 0.5 } }] }), "scenarios.0.turns.1.retrieved.0.cite",
    'scenario "test-scenario" turn 2: retrieved cite 9 names no source',
  );
  ok(assistantData, withTurn(1, { retrieved: [{ cite: 0, snippet: "Test distractor", score: { value: 0.1 } }] }), "a turn whose only chunk is a distractor");
  badWith(assistantData, { scenarios: [{ ...scenario, sources: [SOURCES[0], { ...SOURCES[1], cite: 1 }] }] }, "scenarios.0.sources", 'scenario "test-scenario": source cite 1 repeats');
  badWith(assistantData, { scenarios: [scenario, scenario] }, "scenarios", 'scenario id "test-scenario" repeats');
  const only = (...outcomes) => ({ scenarios: [{ ...scenario, turns: outcomes.map((o) => (o === "false-answer-caught" ? turn(o, { caught: "Test catch" }) : turn(o))) }] });
  badWith(assistantData, only("answered", "false-answer-caught"), "scenarios", 'the scenarios need at least one "refused" turn (spec §9.1)');
  badWith(assistantData, only("answered", "refused"), "scenarios", 'the scenarios need at least one "false-answer-caught" turn (spec §9.1)');
  // The two outcomes may sit in different scenarios.
  ok(assistantData, { scenarios: [{ ...only("answered", "refused").scenarios[0], id: "test-a" }, { ...only("answered", "false-answer-caught").scenarios[0], id: "test-b" }] }, "outcomes split across scenarios");
  const caughtMessage = 'a "false-answer-caught" turn says what the test caught, and no other turn does';
  badWith(assistantTurn, turn("false-answer-caught"), "caught", caughtMessage);
  badWith(assistantTurn, turn("answered", { caught: "Test catch" }), "caught", caughtMessage);
  bad(assistantData, { scenarios: [{ ...scenario, turns: scenario.turns.slice(0, 1) }] }, "a scenario with one turn");
  bad(assistantData, withTurn(0, { retrieved: [] }), "a turn that retrieved nothing");
  bad(assistantData, withTurn(0, { answer: [] }), "a turn with no answer");
  bad(assistantData, withTurn(0, { trace: [] }), "a turn with no trace");
  bad(assistantData, withTurn(0, { outcome: "abstained" }), "an unknown outcome");
  bad(assistantData, withTurn(0, { retrieved: [{ cite: 1, snippet: "Test", score: 0.9 }] }), "a score as a bare number, not a metric");
  bad(assistantData, withTurn(0, { trace: [{ label: "Test", detail: "Test", ms: "40 ms" }] }), "a latency as text, not a metric");
});

test("register data: every row names a document, a page it has and one cell per field", () => {
  ok(registerData, REGISTER, "register data");
  const [a, b] = REGISTER.registers;
  const withRow = (row) => ({ ...REGISTER, registers: [{ ...a, rows: [row, ...a.rows.slice(1)] }, b] });
  badWith(registerData, withRow({ ...a.rows[0], doc: "test-doc-9" }), "registers.0.rows.0.doc", 'register "test-register-a" row 1: document "test-doc-9" doesn\'t exist');
  const { "test-c": _, ...twoCells } = a.rows[0].cells;
  badWith(registerData, withRow({ ...a.rows[0], cells: twoCells }), "registers.0.rows.0.cells", 'register "test-register-a" row 1: no cell for field "test-c"');
  badWith(
    registerData, withRow({ ...a.rows[0], cells: { ...a.rows[0].cells, "test-d": { value: "Test", page: 1, status: "ok" } } }),
    "registers.0.rows.0.cells.test-d", 'register "test-register-a" row 1: cell "test-d" is not a field',
  );
  badWith(
    registerData, withRow({ ...a.rows[0], cells: { ...a.rows[0].cells, "test-a": { value: "Test", page: 3, status: "review" } } }),
    "registers.0.rows.0.cells.test-a.page", 'register "test-register-a" row 1, cell "test-a": page 3 isn\'t a page of document "test-doc-1"',
  );
  badWith(registerData, { ...REGISTER, documents: [...DOCS.slice(0, 5), DOCS[0]] }, "documents", 'document id "test-doc-1" repeats');
  badWith(registerData, { ...REGISTER, documents: [{ ...DOCS[0], pages: [PAGES[0], PAGES[0]] }, ...DOCS.slice(1)] }, "documents.0.pages", 'document "test-doc-1": page 1 repeats');
  badWith(registerData, { ...REGISTER, registers: [a, { ...b, id: a.id }] }, "registers", 'register id "test-register-a" repeats');
  badWith(registerData, { ...REGISTER, registers: [{ ...a, fields: [...FIELDS, FIELDS[0]] }, b] }, "registers.0.fields", 'register "test-register-a": field key "test-a" repeats');
  bad(registerData, { ...REGISTER, documents: DOCS.slice(0, 5) }, "five documents");
  bad(registerData, { ...REGISTER, registers: [a] }, "one register");
  bad(registerData, { ...REGISTER, registers: [{ ...a, fields: FIELDS.slice(0, 2) }, b] }, "a register with two fields");
  bad(registerData, { ...REGISTER, registers: [{ ...a, rows: a.rows.slice(0, 2) }, b] }, "a register with two rows");
  bad(registerData, withRow({ ...a.rows[0], cells: { ...a.rows[0].cells, "test-a": { value: "Test", page: 1, status: "flagged" } } }), "an unknown cell status");
  for (const download of ["/downloads/test-register.pdf", "/files/test-register.csv", "downloads/test-register.csv", "/downloads/Test Register.csv"]) {
    bad(registerData, { ...REGISTER, download }, `download ${download}`);
  }
  ok(registerData, { ...REGISTER, download: "/downloads/test-register-documents.txt" }, "a text download");
});

test("inbox data: eight messages, exactly one escalated, and every draft-for-approval message has its draft and its recipient", () => {
  ok(inboxData, INBOX, "inbox data");
  const withMessage = (i, m) => ({ ...INBOX, messages: INBOX.messages.map((x, j) => (j === i ? m : x)) });
  badWith(inboxData, withMessage(6, message(7, "escalate")), "messages", "exactly one message is escalated (spec §9.1); found 2");
  badWith(inboxData, withMessage(7, message(8, "file")), "messages", "exactly one message is escalated (spec §9.1); found 0");
  const { draft, ...undrafted } = INBOX.messages[0];
  badWith(inboxData, withMessage(0, undrafted), "messages.0.draft", 'message "test-message-1" is drafted for approval, so it needs a draft');
  // No draft goes to a tenant (controller ruling 5), so each one says who it goes to: a contractor, a
  // property manager or an owner.
  const { to, ...unaddressed } = INBOX.messages[0];
  badWith(inboxData, withMessage(0, unaddressed), "messages.0.to", 'message "test-message-1" is drafted for approval, so it says who the draft goes to');
  badWith(
    inboxData, withMessage(7, { ...INBOX.messages[7], draft: "Test draft" }), "messages.7",
    'message "test-message-8" isn\'t drafted for approval, so it has no draft and no recipient',
  );
  badWith(
    inboxData, withMessage(6, { ...INBOX.messages[6], to: "Test recipient" }), "messages.6",
    'message "test-message-7" isn\'t drafted for approval, so it has no draft and no recipient',
  );
  badWith(inboxData, withMessage(1, { ...INBOX.messages[1], id: "test-message-1" }), "messages", 'message id "test-message-1" repeats');
  ok(inboxData, withMessage(0, { ...INBOX.messages[0], subject: "Test subject" }), "an email with a subject");
  bad(inboxData, { ...INBOX, messages: INBOX.messages.slice(0, 7) }, "seven messages");
  bad(inboxData, { ...INBOX, trace: INBOX.trace.slice(0, 2) }, "a two-step trace");
  bad(inboxData, withMessage(0, { ...INBOX.messages[0], channel: "letter" }), "an unknown channel");
  bad(inboxData, withMessage(0, { ...INBOX.messages[0], action: "send" }), "an action that sends without approval");
});

test("platform AI facts: dated entries with a vendor-page source, included or add-on, and a kit category (spec §8.7)", () => {
  const data = ok(platformAiFile, PLATFORM, "platform AI file");
  assert.ok(data.asAt instanceof Date && data.entries[0].asAt instanceof Date);
  bad(platformAiFile, { ...PLATFORM, entries: PLATFORM.entries.slice(0, 19) }, "nineteen entries");
  const withEntry = (over) => ({ ...PLATFORM, entries: [{ ...ENTRY, ...over }, ...PLATFORM.entries.slice(1)] });
  bad(platformAiFile, withEntry({ included: "free" }), "an inclusion that isn't included or add-on");
  bad(platformAiFile, withEntry({ category: "health" }), "an unknown category");
  bad(platformAiFile, withEntry({ plans: [] }), "an entry with no plans");
  bad(platformAiFile, withEntry({ asAt: "not a date" }), "an undated entry");
  const { category, ...uncategorised } = ENTRY;
  bad(platformAiFile, { ...PLATFORM, entries: [uncategorised, ...PLATFORM.entries.slice(1)] }, "an entry without a category");
  assert.deepEqual(platformAiEntry.shape.category.options, ["accounting", "legal", "property", "general"]);
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

test("sample reports carry the spec §9.1 evidence: ground truth, inter-rater agreement, intervals, framework levels, regression", () => {
  const data = ok(sampleReport, REPORT, "sample report");
  assert.deepEqual(data.thresholds[0].ci, { low: 86, high: 96, level: 95 });
  for (const key of ["groundTruth", "interRater", "framework", "regression"]) {
    const { [key]: _, ...missing } = REPORT;
    bad(sampleReport, missing, `sample report without ${key}`);
  }
  bad(sampleReport, { ...REPORT, groundTruth: "Too short" }, "ground truth under 10 characters");
  bad(sampleReport, { ...REPORT, interRater: { ...REPORT.interRater, value: "0.8" } }, "inter-rater value as text");
  const { ci, ...noCi } = REPORT.thresholds[0];
  bad(sampleReport, { ...REPORT, thresholds: [noCi] }, "threshold without a confidence interval");
  for (const [level, label] of [[49, "under 50"], [100, "over 99"], [95.5, "fractional"]]) {
    bad(sampleReport, { ...REPORT, thresholds: [{ ...REPORT.thresholds[0], ci: { ...ci, level } }] }, `interval level ${label}`);
  }
  const issues = bad(interval, { low: 96, high: 86, level: 95 }, "interval with its bounds reversed");
  assert.ok(issues.some((i) => i.message === "an interval's low bound is above its high bound"), JSON.stringify(issues));
  ok(interval, { low: 0.5, high: 0.5, level: 90 }, "a zero-width interval");
  bad(sampleReport, { ...REPORT, failures: REPORT.failures.map(({ frameworkLevel, ...f }) => f) }, "failures without a framework level");
  bad(sampleReport, { ...REPORT, regression: { ...REPORT.regression, rows: [] } }, "regression view without rows");
  bad(sampleReport, { ...REPORT, regression: { ...REPORT.regression, rows: [{ ...REPORT.regression.rows[0], candidate: "90%" }] } }, "regression metric as text");
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

// --- Page data (src/content/page-schemas.ts) ------------------------------------------------

const titled = (title) => ({ title, body: "Test body" });
const texts = (label, n) => Array.from({ length: n }, (_, i) => `${label} ${i + 1}`);
const words = (n) => Array.from({ length: n }, (_, i) => `word${i + 1}`).join(" ");

const POSITIONING = {
  subPromise: "Test sub-promise, long enough to pass the forty-character minimum.",
  originLine: "Test origin line, twenty plus.",
  pillars: ["cited", "measured", "onshore", "ownership"].map((id) => ({ id, title: `Test ${id}`, mechanism: "Test mechanism", midMarket: "Test plain version" })),
};
const SERVICES = {
  phases: ["prove", "build", "run"].map((id) => ({ id, name: `Test ${id}`, duration: "Test duration", summary: "Test summary", deliverables: ["Test deliverable"], exitCriteria: ["Test exit"] })),
  services: ["entry", "after-audit-or-trial", "secondary", "not-entry"].map((entry, i) => ({ id: `test-service-${i + 1}`, name: "Test service", what: "Test what", forWhom: "Test for", entry })),
  entryOffers: texts("Test buyer", 3).map((b) => ({ buyer: b, entry: "Test entry", then: "Test then" })),
  team: { summary: "Test summary", functions: [titled("Test function A"), titled("Test function B")] },
  deliveryChoices: ["your-account", "managed", "platform-you-license"].map((id) => ({ id, title: "Test choice", body: "Test body" })),
  onshoreNote: texts("Test note", 3),
  independence: texts("Test rule", 3),
  deRisk: texts("Test", 3).map(titled),
  standardInclusions: texts("Test inclusion", 5),
  routes: {
    midMarket: { title: "Test route", steps: texts("Test step", 3).map((name) => ({ name, body: "Test body" })) },
    enterprise: { title: "Test route", steps: texts("Test step", 2).map((name) => ({ name, body: "Test body" })), partnerLine: "Test partner line" },
  },
  faq: faq(3),
  evaluationPartner: {
    promise: "Test promise", audiences: texts("Test audience", 3), delivers: texts("Test deliverable", 3),
    fit: texts("Test fit", 2), methodSummary: "Test summary", faq: faq(3),
  },
};
const CONTACT = {
  replyTime: "one test business day",
  formEndpoint: "https://example.com/form",
  formProvider: { name: "Test Forms", country: "Test country" },
  redirectField: "_redirect",
  hiddenFields: { _append: "false" },
  honeypotField: "_gotcha",
  emailProvider: { name: "Test Mail", country: "Test country" },
  subProcessors: texts("Test entity", 2).map((entity) => ({ entity, purpose: "Test purpose", country: "Test country", data: "Test data" })),
  whatNext: texts("Test step", 3),
  deflection: ["security", "privacy", "press"].map((t) => ({ title: `Test ${t}`, body: "Test body", email: `${t}@example.com` })),
};
const TRUST = {
  asAt: "2026-09-15",
  partA: { cookies: "Test none", analytics: "Test none", enquiries: "Test mailbox", securityContact: "security@example.com" },
  partB: [{ id: "test-residency", title: "Test residency", body: "Test body", confirmed: false }],
  // A Part B answer names the contract term it rests on; a Part A answer names none.
  faq: [1, 2, 3, 4, 5].map((n) => ({
    q: `Test question ${n}?`, a: words(30 + n), part: n % 2 ? "A" : "B", ...(n % 2 ? {} : { term: "test-residency" }), asAt: "2026-09-15",
  })),
  transparency: { statement: "Test statement", systems: [{ name: "Test system", purpose: "Test purpose", data: "Test data", human: "Test human", demo: "test-demo" }] },
  changes: [{ date: "2026-09-15", change: "Test change" }],
};
const ABOUT = {
  mission: "Test mission", whoWeServe: "Test who", whyControl: "Test why",
  principles: texts("Test principle", 5).map(titled), howWeWork: texts("Test step", 3).map(titled),
  buildLog: [{ date: "2026-09-01", event: "Test event" }],
};
const HOME = {
  heroTrace: "test-hero-trace",
  faq: [{ q: HOME_TRUST_QUESTION, a: "Test answer, long enough to pass." }, ...faq(3)],
  trustPageLine: "Test sentence about the Trust page.",
};
const DOCUMENT = { title: "Test document", summary: "Test summary, twenty plus characters.", lastUpdated: "2026-09-01" };

test("page data: positioning holds the four pillars in spec §3.2 order", () => {
  ok(positioningData, POSITIONING, "positioning");
  badWith(positioningData, { ...POSITIONING, pillars: [...POSITIONING.pillars].reverse() }, "pillars", "pillars run cited, measured, onshore, ownership, in that order (spec §3.2)");
  bad(positioningData, { ...POSITIONING, pillars: POSITIONING.pillars.slice(0, 3) }, "three pillars");
  bad(positioningData, { ...POSITIONING, pillars: [...POSITIONING.pillars.slice(0, 3), { ...POSITIONING.pillars[3], id: "neutral" }] }, "unknown pillar id");
  bad(positioningData, { ...POSITIONING, subPromise: "Too short" }, "sub-promise under 40 characters");
});

test("page data: services run prove, build, run, with one delivery choice per id", () => {
  ok(servicesData, SERVICES, "services");
  badWith(servicesData, { ...SERVICES, phases: [SERVICES.phases[1], SERVICES.phases[0], SERVICES.phases[2]] }, "phases", "phases run prove, build, run, in that order (spec §4.2)");
  badWith(
    servicesData,
    { ...SERVICES, deliveryChoices: [SERVICES.deliveryChoices[0], SERVICES.deliveryChoices[0], SERVICES.deliveryChoices[2]] },
    "deliveryChoices",
    "deliveryChoices has one entry per choice: your-account, managed, platform-you-license (spec §4.6)",
  );
  bad(servicesData, { ...SERVICES, standardInclusions: texts("Test inclusion", 4) }, "four standard inclusions");
  bad(servicesData, { ...SERVICES, services: [{ ...SERVICES.services[0], entry: "maybe" }, ...SERVICES.services.slice(1)] }, "unknown entry label");
  bad(servicesData, { ...SERVICES, routes: { ...SERVICES.routes, enterprise: { ...SERVICES.routes.enterprise, partnerLine: undefined } } }, "enterprise route without a partner line");
  bad(servicesData, { ...SERVICES, evaluationPartner: { ...SERVICES.evaluationPartner, fit: ["Test fit"] } }, "one fit line");
});

test("page data: contact takes a form endpoint URL or null, and real email addresses", () => {
  ok(contactData, CONTACT, "contact");
  assert.equal(ok(contactData, { ...CONTACT, formEndpoint: null }, "contact without a form endpoint").formEndpoint, null);
  bad(contactData, { ...CONTACT, formEndpoint: "example.com/form" }, "form endpoint that is not a URL");
  bad(contactData, { ...CONTACT, formEndpoint: "http://example.com/form" }, "form endpoint over plain http (the form posts personal data)");
  const { formEndpoint, ...unset } = CONTACT;
  bad(contactData, unset, "form endpoint left out rather than null");
  bad(contactData, { ...CONTACT, deflection: CONTACT.deflection.map((d, i) => (i === 0 ? { ...d, email: "security" } : d)) }, "deflection email that is not an address");
  ok(contactData, { ...CONTACT, deflection: CONTACT.deflection.slice(0, 1) }, "one shared contact mailbox");
  bad(contactData, { ...CONTACT, deflection: [] }, "no contact mailbox");
  bad(contactData, { ...CONTACT, subProcessors: CONTACT.subProcessors.slice(0, 1) }, "one sub-processor");
});

test("page data: the form provider is null until a form endpoint needs one (blueprint ruling 16, spec §10.2)", () => {
  assert.equal(ok(contactData, { ...CONTACT, formEndpoint: null, formProvider: null }, "no endpoint and no form provider").formProvider, null);
  ok(contactData, { ...CONTACT, formEndpoint: null }, "a form provider named before the endpoint exists");
  bad(contactData, { ...CONTACT, formProvider: null }, "a form endpoint with no form provider for the collection notice");
  const { formProvider, ...unset } = CONTACT;
  bad(contactData, unset, "form provider left out rather than null");
});

test("page data: a form provider's field names are tokens, and each is a name the form doesn't already post (Phase E)", () => {
  ok(contactData, { ...CONTACT, redirectField: null, hiddenFields: {} }, "a provider that sets its redirect in its dashboard");
  ok(contactData, { ...CONTACT, redirectField: "_next", hiddenFields: { _subject: "Test subject", "fi-extra": "Test" } }, "other token names");
  for (const name of ["", "1st", "two words", 'quo"te', "a=b", "é"]) {
    bad(contactData, { ...CONTACT, honeypotField: name }, `honeypot field ${JSON.stringify(name)}`);
    bad(contactData, { ...CONTACT, redirectField: name }, `redirect field ${JSON.stringify(name)}`);
    bad(contactData, { ...CONTACT, hiddenFields: { [name]: "Test" } }, `hidden field ${JSON.stringify(name)}`);
  }
  for (const name of ENQUIRY_FIELDS) {
    badWith(contactData, { ...CONTACT, honeypotField: name }, "honeypotField", `"${name}" is already a field of the enquiry form`);
    badWith(contactData, { ...CONTACT, redirectField: name }, "redirectField", `"${name}" is already a field of the enquiry form`);
    badWith(contactData, { ...CONTACT, hiddenFields: { [name]: "Test" } }, `hiddenFields.${name}`, `"${name}" is already a field of the enquiry form`);
  }
  badWith(contactData, { ...CONTACT, redirectField: "_gotcha" }, "redirectField", '"_gotcha" is already a field of the enquiry form');
  badWith(contactData, { ...CONTACT, hiddenFields: { _redirect: "Test" } }, "hiddenFields._redirect", '"_redirect" is already a field of the enquiry form');
  for (const key of ["redirectField", "hiddenFields", "honeypotField"]) {
    const { [key]: _, ...unset } = CONTACT;
    bad(contactData, unset, `${key} left out`);
  }
});

test("page data: every Trust FAQ answer is 30–110 words (spec §8.11)", () => {
  const data = ok(trustData, TRUST, "trust");
  assert.ok(data.asAt instanceof Date && data.faq[0].asAt instanceof Date);
  const withAnswer = (a) => ({ ...TRUST, faq: TRUST.faq.map((f, i) => (i === 2 ? { ...f, a } : f)) });
  ok(trustData, withAnswer(words(30)), "a 30-word answer");
  ok(trustData, withAnswer(` ${words(110)}\n`), "a 110-word answer with surrounding whitespace");
  badWith(trustData, withAnswer(words(29)), "faq.2.a", "faq[2].a has 29 words; the spec needs 30–110");
  badWith(trustData, withAnswer(words(111)), "faq.2.a", "faq[2].a has 111 words; the spec needs 30–110");
  bad(trustData, { ...TRUST, faq: TRUST.faq.map((f, i) => (i === 0 ? { ...f, part: "C" } : f)) }, "a FAQ in neither part");
  bad(trustData, { ...TRUST, faq: TRUST.faq.slice(0, 4) }, "four FAQs");
  bad(trustData, { ...TRUST, partA: { ...TRUST.partA, securityContact: "security" } }, "security contact that is not an address");
});

test("page data: a Part B Trust answer names the Part B term it rests on, and a Part A answer names none (spec §8.11, §12 item 2)", () => {
  const withFaq = (i, over) => ({ ...TRUST, faq: TRUST.faq.map((f, j) => (j === i ? { ...f, ...over } : f)) });
  assert.equal(ok(trustData, TRUST, "trust").faq[1].term, "test-residency");
  const { term, ...untermed } = TRUST.faq[1];
  badWith(
    trustData, { ...TRUST, faq: TRUST.faq.map((f, j) => (j === 1 ? untermed : f)) }, "faq.1.term",
    "faq[1] describes Part B, so it names the Part B term it rests on (spec §8.11, §12 item 2)",
  );
  badWith(trustData, withFaq(1, { term: "test-ownership" }), "faq.1.term", 'faq[1].term "test-ownership" names no Part B term');
  badWith(trustData, withFaq(0, { term: "test-residency" }), "faq.0.term", "faq[0] describes Part A, so it names no Part B term");
  bad(trustData, withFaq(1, { term: "Test residency" }), "a term that is not a slug");
});

test("page data: the Home FAQ asks the trust question exactly once (spec §8.1.10)", () => {
  ok(homeData, HOME, 'home');
  bad(homeData, { ...HOME, faq: HOME.faq.slice(0, 2) }, 'fewer than three FAQs');
  bad(homeData, { ...HOME, heroTrace: 'Test Trace' }, 'invalid trace slug');
  bad(homeData, { ...HOME, trustPageLine: 'Too short' }, 'invalid contextual trust copy');
});

test("page data: about needs five principles; document frontmatter defaults draft to false", () => {
  ok(aboutData, ABOUT, "about");
  bad(aboutData, { ...ABOUT, principles: ABOUT.principles.slice(0, 4) }, "four principles");
  bad(aboutData, { ...ABOUT, buildLog: [] }, "empty build log");
  const doc = ok(documentSchema, DOCUMENT, "document");
  assert.equal(doc.draft, false);
  assert.ok(doc.lastUpdated instanceof Date);
  assert.equal(doc.effective, undefined);
  assert.ok(ok(documentSchema, { ...DOCUMENT, effective: "2026-10-01", draft: true }, "effective draft").effective instanceof Date);
  bad(documentSchema, { ...DOCUMENT, summary: "Too short" }, "summary under 20 characters");
  const { lastUpdated, ...undated } = DOCUMENT;
  bad(documentSchema, undated, "document without lastUpdated");
});

test("every page-data schema rejects unknown keys, at the top level and nested", () => {
  const cases = [
    [positioningData, { ...POSITIONING, tagline: "Test" }, "positioning"],
    [positioningData, { ...POSITIONING, pillars: POSITIONING.pillars.map((p) => ({ ...p, icon: "Test" })) }, "positioning pillar"],
    [servicesData, { ...SERVICES, pricing: "Test" }, "services"],
    [servicesData, { ...SERVICES, phases: SERVICES.phases.map((p) => ({ ...p, fee: "Test" })) }, "services phase"],
    [servicesData, { ...SERVICES, team: { ...SERVICES.team, headcount: 3 } }, "services team"],
    [servicesData, { ...SERVICES, evaluationPartner: { ...SERVICES.evaluationPartner, cta: "Test" } }, "evaluation partner"],
    [contactData, { ...CONTACT, phone: "Test" }, "contact"],
    [contactData, { ...CONTACT, formProvider: { ...CONTACT.formProvider, region: "Test" } }, "contact form provider"],
    [trustData, { ...TRUST, certifications: [] }, "trust"],
    [trustData, { ...TRUST, partB: TRUST.partB.map((b) => ({ ...b, confirmedAt: "2026-09-15" })) }, "trust part B"],
    [aboutData, { ...ABOUT, team: [] }, "about"],
    [homeData, { ...HOME, hero: "Test" }, "home"],
    [documentSchema, { ...DOCUMENT, author: "Test" }, "document"],
  ];
  for (const [schema, value, label] of cases) {
    const issues = bad(schema, value, `${label} with an unknown key`);
    assert.ok(issues.some((i) => i.code === "unrecognized_keys"), `${label}: ${JSON.stringify(issues)}`);
  }
});
