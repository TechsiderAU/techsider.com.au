// Template-preview fixtures: each parses with the same Zod schemas as real content (with
// plain string refs), references resolve between fixtures, every human-readable string is
// visibly fictional, and nothing outside src/preview/ (the preview-only gallery) imports them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  plainRef, makeSolutionSchema, makeIndustrySchema, makeKitSchema, makeDemoSchema, makeInsightSchema,
  regulatoryFile, traceFile, sampleReport, mockPanel, JURISDICTION_SECTION, SECTION_ORDER,
} from "../src/content/schemas.ts";
import {
  positioningData, servicesData, contactData, trustData, aboutData, homeData, documentSchema,
} from "../src/content/page-schemas.ts";
import { HOME_TRUST_QUESTION } from "../src/lib/fixed-copy.ts";
import * as all from "../src/fixtures/index.ts";

const {
  SOLUTION_FIXTURE_ID, INDUSTRY_FIXTURE_ID, GOVERNMENT_INDUSTRY_FIXTURE_ID, REGULATORY_FIXTURE_ID,
  GOVERNMENT_REGULATORY_FIXTURE_ID, KIT_FIXTURE_ID, PENDING_KIT_FIXTURE_ID, TRACE_FIXTURE_ID, DEMO_FIXTURE_ID,
  SAMPLE_REPORT_FIXTURE_ID, MOCK_PANEL_FIXTURE_ID, HERO_TRACE_FIXTURE_ID,
  solutionFixture, industryFixture, governmentIndustryFixture, regulatoryFixture,
  governmentRegulatoryFixture, kitFixture, pendingKitFixture, traceFixture, demoFixture, sampleReportFixture, mockPanelFixture,
  heroTraceFixture, solutionFixtures, industryFixtures, regulatoryFixtures, traceFixtures, insightFixtures,
  FIXTURE_NOW, FIXTURE_STALE_NOW,
  positioningFixture, servicesFixture, contactFixture, contactNoEndpointFixture, trustFixture, trustNoTermsFixture, aboutFixture,
  homeFixture, documentFixtures,
} = all;

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const MODULES = readdirSync(join(SRC, "fixtures")).filter((f) => f.endsWith(".ts") && f !== "index.ts");

const solutionSchema = makeSolutionSchema(plainRef);
const industrySchema = makeIndustrySchema(plainRef);
const insightSchema = makeInsightSchema(plainRef);

// [name, schema, value]. A set's members are named "<set>.<id>", so every entry of every
// fixture set is parsed and checked like a top-level fixture.
const CASES = [
  ["solutionFixture", solutionSchema, solutionFixture],
  ["industryFixture", industrySchema, industryFixture],
  ["governmentIndustryFixture", industrySchema, governmentIndustryFixture],
  ["regulatoryFixture", regulatoryFile, regulatoryFixture],
  ["governmentRegulatoryFixture", regulatoryFile, governmentRegulatoryFixture],
  ["kitFixture", makeKitSchema(plainRef), kitFixture],
  ["pendingKitFixture", makeKitSchema(plainRef), pendingKitFixture],
  ["traceFixture", traceFile, traceFixture],
  ["demoFixture", makeDemoSchema(plainRef), demoFixture],
  ["sampleReportFixture", sampleReport, sampleReportFixture],
  ["mockPanelFixture", mockPanel, mockPanelFixture],
  ["heroTraceFixture", traceFile, heroTraceFixture],
  ["positioningFixture", positioningData, positioningFixture],
  ["servicesFixture", servicesData, servicesFixture],
  ["contactFixture", contactData, contactFixture],
  ["contactNoEndpointFixture", contactData, contactNoEndpointFixture],
  ["trustFixture", trustData, trustFixture],
  ["trustNoTermsFixture", trustData, trustNoTermsFixture],
  ["aboutFixture", aboutData, aboutFixture],
  ["homeFixture", homeData, homeFixture],
  ...Object.entries(solutionFixtures).map(([id, v]) => [`solutionFixtures.${id}`, solutionSchema, v]),
  ...Object.entries(industryFixtures).map(([id, v]) => [`industryFixtures.${id}`, industrySchema, v]),
  ...Object.entries(regulatoryFixtures).map(([id, v]) => [`regulatoryFixtures.${id}`, regulatoryFile, v]),
  ...Object.entries(traceFixtures).map(([id, v]) => [`traceFixtures.${id}`, traceFile, v]),
  ...insightFixtures.map((p) => [`insightFixtures.${p.id}`, insightSchema, p.data]),
  ...documentFixtures.map((d) => [`documentFixtures.${d.id}`, documentSchema, d.data]),
];

// A string is visibly fictional when it calls itself a fixture or uses example.com.
const MARKER = /\bfixture\b|\bexample\.com\b/i;
// Keys whose values are machine tokens (enums, ids, refs) rather than prose. A token key
// only exempts a token-shaped value: a sentence under `method` must still say "Fixture".
const TOKEN_KEYS = new Set([
  "id", "status", "kind", "provenance", "rating", "method", "jurisdiction", "jurisdictions",
  "choices", "solution", "industry", "byIndustry", "leadSolutions", "demo", "trace", "row",
  "type", "buyers", "package", "entry",
]);
const TOKEN = /^[a-z0-9-]+$/;
// Enum values that aren't token-shaped: exempt only when the value is one of the enum's options.
const ENUM_KEYS = { packagesHeading: ["Packages", "Engagements"], part: ["A", "B"] };
// Fixed spec copy a schema requires verbatim (src/lib/fixed-copy.ts), so no fixture can reword it.
const FIXED_COPY = new Set([HOME_TRUST_QUESTION]);
const TIME = /^\d{2}:\d{2}:\d{2}$/;
// A metric's unit is a symbol or one word ("%", "ms"), never prose.
const UNIT = /^(?:%|[a-z]+)$/;

function assertFictional(value, path = "fixture", key = "") {
  if (typeof value === "string") {
    if (key === "t" && TIME.test(value)) return;
    if (key === "unit" && UNIT.test(value)) return;
    if (TOKEN_KEYS.has(key) && TOKEN.test(value)) return;
    if (Object.hasOwn(ENUM_KEYS, key) && ENUM_KEYS[key].includes(value)) return;
    if (FIXED_COPY.has(value)) return;
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
  assert.throws(() => assertFictional({ packagesHeading: "Programs" }), /not visibly fictional/);
  assert.throws(() => assertFictional({ faq: [{ q: "Why choose our company?" }] }), /not visibly fictional/);
  assertFictional({ packagesHeading: "Engagements", part: "B", buyers: ["mid-market"], faq: [{ q: HOME_TRUST_QUESTION }] });
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
      SAMPLE_REPORT_FIXTURE_ID, MOCK_PANEL_FIXTURE_ID, HERO_TRACE_FIXTURE_ID],
    ["fixture-solution", "fixture-industry", "fixture-government", "fixture-industry", "fixture-government",
      "fixture-kit", "fixture-pending-kit", "fixture-trace", "fixture-demo", "fixture-report", "fixture-mock-panel",
      "fixture-hero-trace"],
  );
});

test("the fixture sets are the gallery's whole fictional site: 5 solutions, 9 industries, their files and traces", () => {
  assert.deepEqual(Object.keys(solutionFixtures), ["fixture-solution", "fixture-solution-2", "fixture-solution-3", "fixture-solution-4", "fixture-solution-5"]);
  assert.equal(solutionFixtures[SOLUTION_FIXTURE_ID], solutionFixture);
  assert.deepEqual(Object.keys(industryFixtures), [
    "fixture-industry", "fixture-government",
    ...[3, 4, 5, 6, 7, 8, 9].map((n) => `fixture-industry-${n}`),
  ]);
  assert.equal(industryFixtures[INDUSTRY_FIXTURE_ID], industryFixture);
  assert.equal(industryFixtures[GOVERNMENT_INDUSTRY_FIXTURE_ID], governmentIndustryFixture);
  assert.deepEqual(Object.keys(regulatoryFixtures), Object.keys(industryFixtures));
  for (const [id, file] of Object.entries(regulatoryFixtures)) {
    assert.equal(file, id === GOVERNMENT_REGULATORY_FIXTURE_ID ? governmentRegulatoryFixture : regulatoryFixture, id);
  }
  assert.deepEqual(traceFixtures, { [TRACE_FIXTURE_ID]: traceFixture, [HERO_TRACE_FIXTURE_ID]: heroTraceFixture });
  assert.equal(FIXTURE_NOW.toISOString(), "2026-09-29T00:00:00.000Z");
  assert.equal(FIXTURE_STALE_NOW.toISOString(), "2027-01-15T00:00:00.000Z");
});

test("fixture references resolve to other fixtures", () => {
  const solutionIds = Object.keys(solutionFixtures);
  const industryIds = Object.keys(industryFixtures);
  assert.deepEqual(regulatoryFixture.rows.map((r) => r.id), ["fixture-row-1", "fixture-row-2", "fixture-row-3", "fixture-row-4"]);
  assert.equal(solutionFixture.demo, DEMO_FIXTURE_ID);
  for (const [id, s] of Object.entries(solutionFixtures)) {
    for (const x of s.byIndustry) assert.ok(industryIds.includes(x), `${id}: byIndustry names ${x}`);
    for (const x of Object.keys(s.matrix)) assert.ok(industryIds.includes(x), `${id}: matrix key ${x}`);
    if (s.demo !== undefined) assert.equal(s.demo, DEMO_FIXTURE_ID, id);
  }
  for (const [id, industry] of Object.entries(industryFixtures)) {
    const useCases = [...industry.flagshipUseCases, ...industry.workflow.flatMap((w) => w.useCases)];
    for (const x of [...useCases.map((u) => u.solution), ...industry.leadSolutions]) assert.ok(solutionIds.includes(x), `${id}: solution ${x}`);
    // CI check 01's rule: each recommended package is a renderable package of its solution.
    for (const p of industry.packages) {
      const solution = solutionFixtures[p.solution];
      assert.ok(solution, `${id}: package solution ${p.solution}`);
      const pkg = [solution.genericPackage, ...solution.packages].find((x) => x.id === p.package);
      assert.ok(pkg, `${id}: ${p.package} is not a package of ${p.solution}`);
      assert.notEqual(pkg.status, "internal", `${id}: ${p.package} is internal`);
    }
    // Every chip links to a row of the industry's own file, and a tagged chip's row lists its jurisdiction.
    for (const c of industry.obligationChips) {
      const row = regulatoryFixtures[id].rows.find((r) => r.id === c.row);
      assert.ok(row, `${id}: chip row ${c.row}`);
      if (c.jurisdiction) assert.ok(row.jurisdictions?.includes(c.jurisdiction), `${id}: ${c.row} does not list ${c.jurisdiction}`);
    }
    assert.ok(industry.scenario.trace in traceFixtures, `${id}: scenario trace ${industry.scenario.trace}`);
    assert.equal(industry.mockPanel, mockPanelFixture);
  }
  for (const p of insightFixtures) {
    for (const x of p.data.industries) assert.ok(industryIds.includes(x), `${p.id}: industry ${x}`);
    for (const x of p.data.solutions) assert.ok(solutionIds.includes(x), `${p.id}: solution ${x}`);
  }
  assert.equal(homeFixture.heroTrace, HERO_TRACE_FIXTURE_ID);
  for (const system of trustFixture.transparency.systems) if (system.demo) assert.equal(system.demo, DEMO_FIXTURE_ID);
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
  assert.deepEqual([solutionFixture.packagesHeading, solutionFixture.independencePolicy], ["Packages", false]);
  // fixture-industry-9's gallery href is null, so its "By industry" chip renders as plain text.
  assert.ok(solutionFixture.byIndustry.includes("fixture-industry-9"));
});

test("the other fixture solutions take the shapes of spec §4.1 ②–⑤ (the §8.3 adaptations)", () => {
  const launch = (s) => s.packages.filter((p) => p.status === "launch");
  const statuses = (s) => s.packages.map((p) => p.status);
  const [s2, s3, s4, s5] = [2, 3, 4, 5].map((n) => solutionFixtures[`fixture-solution-${n}`]);
  // ②: two audience-variant launch packages, one of them not onshore.
  assert.deepEqual(launch(s2).map((p) => p.onshore), [true, false]);
  // ③: only on-request packages beside the generic package.
  assert.deepEqual(statuses(s3), ["on-request", "on-request"]);
  // ④: "Engagements", the independence policy, three enterprise/government launch packages,
  // one on-request package and one internal package.
  assert.deepEqual([s4.packagesHeading, s4.independencePolicy], ["Engagements", true]);
  assert.deepEqual(statuses(s4), ["launch", "launch", "launch", "on-request", "internal"]);
  for (const p of [s4.genericPackage, ...launch(s4)]) assert.deepEqual(p.buyers, ["enterprise-government"], p.id);
  // ⑤: no program, one launch package, nothing onshore.
  assert.equal(s5.program, undefined);
  assert.equal(launch(s5).length, 1);
  assert.ok([s5.genericPackage, ...launch(s5)].every((p) => p.onshore === false));
  for (const s of [s2, s3, s5]) assert.deepEqual([s.packagesHeading, s.independencePolicy], ["Packages", false]);
  // Package ids and names are unique across the five, so an industry card or hub link names one
  // package, and a test can find (or miss) a package by its name alone.
  const all5 = Object.values(solutionFixtures).flatMap((s) => [s.genericPackage, ...s.packages]);
  assert.equal(new Set(all5.map((p) => p.id)).size, all5.length);
  assert.equal(new Set(all5.map((p) => p.name)).size, all5.length);
  // Both buyer groups have launch packages (the Solutions hub's "By buyer" view).
  const buyers = Object.values(solutionFixtures).flatMap((s) => [s.genericPackage, ...launch(s)].flatMap((p) => p.buyers));
  assert.deepEqual([...new Set(buyers)].sort(), ["enterprise-government", "mid-market"]);
});

test("industry fixtures meet spec §8.5's counts, and Government meets them in each sub-section", () => {
  for (const [id, f] of Object.entries(industryFixtures)) {
    assert.equal(f.workflow.length, 4, id);
    assert.equal(f.flagshipUseCases.length, 3, id);
    assert.equal(f.faq.length, 5, id);
    assert.ok(f.dontDo.length >= 1, id);
    if (id === GOVERNMENT_INDUSTRY_FIXTURE_ID) continue;
    assert.equal(f.jurisdictions, undefined, id);
    assert.deepEqual([f.obligationChips.length, f.worksAlongside.length, f.packages.length], [4, 3, 3], id);
    assert.ok([...f.obligationChips, ...f.worksAlongside, ...f.packages].every((x) => x.jurisdiction === undefined), id);
  }
  assert.deepEqual(industryFixture.packages.map((p) => p.package), ["fixture-generic-package", "fixture-launch-package", "fixture-on-request-package"]);
  assert.ok(industryFixture.platformFirst);
  const gov = governmentIndustryFixture;
  assert.deepEqual(gov.jurisdictions, ["cth", "nsw", "vic", "local"]);
  for (const section of SECTION_ORDER) {
    const count = (items) => items.filter((x) => JURISDICTION_SECTION[x.jurisdiction] === section).length;
    assert.deepEqual([count(gov.obligationChips), count(gov.worksAlongside), count(gov.packages)], [4, 3, 3], section);
  }
  // One package recurs in two sub-sections: the templates must still produce unique ids.
  const govPackages = gov.packages.map((p) => p.package);
  assert.ok(govPackages.some((p, i) => govPackages.indexOf(p) !== i));
  assert.deepEqual(regulatoryFixture.rows.filter((r) => r.jurisdictions).map((r) => r.id), ["fixture-row-3"]);
  // The Government file follows check 08: every row names its jurisdictions; four rows per
  // sub-section, and fixture-gov-row-5 (cth and nsw) belongs to two, so it renders twice.
  const rows = governmentRegulatoryFixture.rows;
  assert.deepEqual(rows.map((r) => r.id), Array.from({ length: 12 }, (_, i) => `fixture-gov-row-${i + 1}`));
  assert.ok(rows.every((r) => r.jurisdictions?.length > 0));
  assert.deepEqual(rows.find((r) => r.id === "fixture-gov-row-5").jurisdictions, ["cth", "nsw"]);
  const sectionsOf = (r) => new Set(r.jurisdictions.map((j) => JURISDICTION_SECTION[j]));
  assert.deepEqual(SECTION_ORDER.map((s) => rows.filter((r) => sectionsOf(r).has(s)).length), [5, 4, 4]);
});

test("fixture-industry-3 carries the long-text edge case for the 320px checks", () => {
  const f = industryFixtures["fixture-industry-3"];
  const longest = (label) => Math.max(...label.split(/\s+/).map((w) => w.length));
  // Among the first three chips: the Industries hub shows only those.
  assert.ok(f.obligationChips.slice(0, 3).some((c) => longest(c.label) >= 60), "no 60-character unbroken token in a chip label");
  assert.ok(f.constraintHook.length >= 160, "the constraint hook is not long");
});

test("insight fixtures: four posts on the documented dates plus one newer draft, listed out of date order", () => {
  const day = (d) => d.toISOString().slice(0, 10);
  const published = insightFixtures.filter((p) => !p.data.draft);
  const dates = published.map((p) => day(p.data.publishDate));
  assert.deepEqual([...dates].sort().reverse(), ["2026-09-20", "2026-08-30", "2026-07-15", "2026-06-01"]);
  assert.notDeepEqual(dates, [...dates].sort().reverse(), "listed out of date order, so a view that forgets to sort shows it");
  const newest = Math.max(...published.map((p) => p.data.publishDate.getTime()));
  const drafts = insightFixtures.filter((p) => p.data.draft);
  assert.equal(drafts.length, 1);
  assert.ok(drafts[0].data.publishDate.getTime() > newest, "the draft is the newest post, so a view that keeps drafts shows it");
  assert.deepEqual([...new Set(insightFixtures.map((p) => p.data.type))].sort(), ["article", "platform-guide", "reference-scenario"]);
  // Spec §8.1.9: at FIXTURE_NOW the newest post is within 45 days; at FIXTURE_STALE_NOW it is not.
  const age = (now) => (now.getTime() - newest) / 86_400_000;
  assert.ok(age(FIXTURE_NOW) <= 45 && age(FIXTURE_STALE_NOW) > 45);
});

test("page fixtures exercise every display state", () => {
  assert.equal(contactFixture.formEndpoint, "https://example.com/fixture/form");
  assert.equal(contactNoEndpointFixture.formEndpoint, null);
  assert.deepEqual(trustFixture.partB.map((b) => b.confirmed), [true, true, false]);
  assert.deepEqual([...new Set(trustFixture.faq.map((f) => f.part))].sort(), ["A", "B"]);
  // Part B answers rest on confirmed terms and on the unconfirmed one, so the page shows some and hides one.
  const confirmedTerm = new Map(trustFixture.partB.map((b) => [b.id, b.confirmed]));
  assert.deepEqual([...new Set(trustFixture.faq.filter((f) => f.part === "B").map((f) => confirmedTerm.get(f.term)))].sort(), [false, true]);
  // The same page with no term confirmed: Part B and every Part B answer drop out.
  assert.deepEqual(trustNoTermsFixture.partB.map((b) => [b.id, b.confirmed]), trustFixture.partB.map((b) => [b.id, false]));
  assert.equal(trustNoTermsFixture.faq, trustFixture.faq);
  assert.equal(homeFixture.faq.filter((f) => f.q === HOME_TRUST_QUESTION).length, 1);
  assert.deepEqual(servicesFixture.phases.map((p) => p.id), ["prove", "build", "run"]);
  assert.deepEqual([...new Set(servicesFixture.services.map((s) => s.entry))].sort(), ["after-audit-or-trial", "entry", "not-entry", "secondary"]);
  // Spec §8.6: the team is described by function, with no names and no numbers.
  assert.doesNotMatch(JSON.stringify(servicesFixture.team), /\d/);
  assert.deepEqual(positioningFixture.pillars.map((p) => p.id), ["cited", "measured", "onshore", "ownership"]);
  assert.ok(aboutFixture.principles.length >= 5);
  assert.deepEqual(documentFixtures.map((d) => d.id), ["fixture-privacy", "fixture-evaluation-method"]);
  assert.ok(documentFixtures[0].data.effective instanceof Date);
  assert.equal(documentFixtures[1].data.effective, undefined);
  for (const d of documentFixtures) assert.match(d.bodyHtml, /^<h2>/, `${d.id}: the body's headings start at h2`);
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
  assert.ok(sampleReportFixture.thresholds.every((t) => t.ci.low <= t.result.value && t.result.value <= t.ci.high));
  assert.equal(new Set(sampleReportFixture.failures.map((f) => f.frameworkLevel)).size, sampleReportFixture.failures.length);
  assert.ok(sampleReportFixture.regression.rows.length >= 1);
  assert.equal(heroTraceFixture.provenance, "illustrative");
  assert.ok(heroTraceFixture.lines.some((l) => l.metric));
  assert.equal(mockPanelFixture.fields.filter((f) => f.redacted).length, 1);
  assert.deepEqual(mockPanelFixture.chips.map((c) => c.status), ["ok", "review", "blocked"]);
  assert.equal(mockPanelFixture.citations.length, 2);
  assert.ok(mockPanelFixture.decision);
});

test("every fixture string is visibly fictional", () => {
  for (const [name, , value] of CASES) assertFictional(value, name);
  // The sets' ids and bodies too, not only the data the schemas parse.
  assertFictional(insightFixtures, "insightFixtures");
  assertFictional(documentFixtures, "documentFixtures");
});

test("index.ts re-exports every fixture module, and every exported fixture is checked here", async () => {
  const fixtureNames = [];
  for (const file of MODULES) {
    const mod = await import(`../src/fixtures/${file}`);
    for (const [key, value] of Object.entries(mod)) {
      assert.equal(all[key], value, `index.ts does not re-export ${key} from ${file}`);
      if (/Fixtures?$/.test(key)) fixtureNames.push(key);
    }
  }
  assert.deepEqual(fixtureNames.sort(), [...new Set(CASES.map(([name]) => name.split(".")[0]))].sort());
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
  assert.throws(() => insightFixtures.sort(), TypeError);
  assert.throws(() => { solutionFixtures["fixture-solution-6"] = solutionFixture; }, TypeError);
  assert.throws(() => { trustFixture.partB[2].confirmed = true; }, TypeError);
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
