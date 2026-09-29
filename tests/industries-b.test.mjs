// Phase C Task 5: the Education, Manufacturing and Real estate industry pages (spec §5, §8.5).
// The content (src/content/industries/, src/data/regulatory/, src/data/traces/) is parsed with its
// collection schemas, and the pages are read from the production build (dist/) with the CI checks'
// own scanner (scripts/ci/lib.mjs). Expectations come from the content files; the literals below
// are the Phase C rulings this task implements (held rows, package ids, matrix cells).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { pageWords, readDist } from "./helpers.mjs";
import { elements, elementsWith, loadYaml, readJson, startTags, visibleText } from "../scripts/ci/lib.mjs";
import { makeIndustrySchema, makeSolutionSchema, plainRef, regulatoryFile, traceFile } from "../src/content/schemas.ts";
import { PAGES } from "../src/data/nav.ts";
import { NOT_LEGAL_ADVICE, SCENARIO_LABEL } from "../src/lib/fixed-copy.ts";
import { pageDescription, pageTitle } from "../src/lib/meta.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const IDS = ["education", "manufacturing", "real-estate"];
const SOLUTION_IDS = ["document-registers", "knowledge-assistant", "draft-for-approval", "ai-evaluation", "ai-switch-on"];
const INDUSTRY_ORDER = PAGES.filter((p) => p.base === "/industries/").map((p) => p.path.slice("/industries/".length, -1));

const industrySchema = makeIndustrySchema(plainRef);
const solutionSchema = makeSolutionSchema(plainRef);
const industry = (id) => industrySchema.parse(loadYaml(`${ROOT}src/content/industries/${id}.yaml`));
const rowsOf = (id) => regulatoryFile.parse(readJson(`${ROOT}src/data/regulatory/${id}.json`)).rows;
const solution = (id) => solutionSchema.parse(loadYaml(`${ROOT}src/content/solutions/${id}.yaml`));
const entryOf = (id) => PAGES.find((p) => p.path === `/industries/${id}/`);
const html = (id) => readDist(`industries/${id}/index.html`);
const mainOf = (h) => h.slice(h.search(/<main\b/), h.indexOf("</main>"));
const text = (h) => visibleText(h).trim();
const byId = (h, id) => elements(h, (t) => t.attrs.id === id)[0];
// Dates print as the template prints them: "29 September 2026", in UTC.
const formatDate = (d) => d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Phase C ruling 1: held rows never ship (APP 1.7–1.9 until the OAIC guidance is re-read; the NSW
// Digital Work Systems Act until it commences).
const HELD_ROWS = ["privacy-adm-transparency", "app-automated-decisions", "nsw-digital-work-systems"];

// The recommended packages (blueprint canonical ids), with the status each has in its solution.
const PACKAGES = {
  education: [
    ["knowledge-assistant", "policy-procedure-assistant", "launch"],
    ["ai-evaluation", "independent-evaluation-report", "launch"],
    ["ai-switch-on", "admin-hours-audit-switch-on", "launch"],
  ],
  manufacturing: [
    ["knowledge-assistant", "sop-work-instruction-assistant", "launch"],
    ["document-registers", "compliance-dossier-builder", "on-request"],
    ["draft-for-approval", "fault-to-work-order", "on-request"],
    ["draft-for-approval", "rfq-quote-prep", "on-request"],
  ],
  "real-estate": [
    ["ai-switch-on", "admin-hours-audit-switch-on", "launch"],
    ["document-registers", "management-agreement-register", "launch"],
    ["document-registers", "bond-claim-evidence-pack", "on-request"],
  ],
};

// The solution × industry matrix cells this task adds (spec §8.2: a 3–6-word example per cell).
const MATRIX = {
  "document-registers": { manufacturing: "Compliance dossiers, on request", "real-estate": "Management agreement register" },
  "knowledge-assistant": { education: "Staff policy answers, section cited", manufacturing: "Multilingual SOP answers, page shown" },
  "draft-for-approval": { manufacturing: "Draft work requests, on request", "real-estate": "Shared inbox triage, on request" },
  "ai-evaluation": { education: "Evaluation of deployed staff AI" },
  "ai-switch-on": { education: "Switch-on for independent schools", "real-estate": "Admin Hours Audit and switch-on" },
};

/** Every solution an industry page names: lead solutions, flagship and workflow use cases, packages. */
function solutionsNamed(data) {
  return new Set([
    ...data.leadSolutions,
    ...data.flagshipUseCases.map((u) => u.solution),
    ...data.workflow.flatMap((s) => s.useCases.map((u) => u.solution)),
    ...data.packages.map((p) => p.solution),
  ]);
}

test("each industry, its regulatory rows and its scenario trace parse with their collection schemas, and each carries the commitment marker", () => {
  for (const id of IDS) {
    const data = industry(id);
    // Ruling 15: the marker ends the header comment and covers the regulatory map's design lines.
    const marker = `# ⚑ owner: every commitment in this file, and in the design lines of src/data/regulatory/${id}.json, must be in the standard engagement terms (spec §12 item 2)`;
    assert.ok(readFileSync(`${ROOT}src/content/industries/${id}.yaml`, "utf8").split("\n").includes(marker), `${id}: no commitment marker`);
    assert.equal(data.jurisdictions, undefined, `${id}: only Government is split by jurisdiction`);
    assert.ok(rowsOf(id).length >= 4, `${id}: fewer than 4 regulatory rows`);
    assert.equal(data.scenario.trace, `${id}-scenario`);
    const trace = traceFile.parse(readJson(`${ROOT}src/data/traces/${id}-scenario.json`));
    assert.equal(trace.provenance, "illustrative", `${id}: a scenario trace is never measured`);
  }
});

test("held rows stay off: no APP 1.7–1.9 row and no NSW Digital Work Systems row, in data or on the page (ruling 1)", () => {
  for (const id of IDS) {
    const ids = rowsOf(id).map((r) => r.id);
    for (const held of HELD_ROWS) assert.ok(!ids.includes(held), `${id}: held row ${held}`);
    const t = text(mainOf(html(id)));
    assert.doesNotMatch(t, /APP 1\.[789]/, `${id}: an APP 1.7–1.9 obligation renders`);
    assert.doesNotMatch(t, /Digital Work Systems/i, `${id}: the NSW DWS Act renders`);
  }
});

test("every row cites a primary https source, dated and reviewed, and a shared source names different provisions", () => {
  for (const id of IDS) {
    const rows = rowsOf(id);
    const bySource = new Map();
    for (const r of rows) {
      assert.equal(new URL(r.source).protocol, "https:", `${id}/${r.id}: ${r.source}`);
      assert.equal(r.lastReviewed.toISOString().slice(0, 10), "2026-09-29", `${id}/${r.id}: lastReviewed`);
      assert.ok(r.asAt <= r.lastReviewed, `${id}/${r.id}: asAt is after lastReviewed`);
      assert.match(r.obligation, /\d/, `${id}/${r.id}: the obligation names no provision`);
      bySource.set(r.source, [...(bySource.get(r.source) ?? []), r.obligation]);
    }
    for (const [source, obligations] of bySource) {
      assert.equal(new Set(obligations).size, obligations.length, `${id}: two rows cite ${source} for the same provision`);
    }
  }
});

test("4–6 chips each land on a row of the page's map, with 3–5 systems and the ruled packages, launch first", () => {
  for (const id of IDS) {
    const data = industry(id);
    const rowIds = rowsOf(id).map((r) => r.id);
    assert.ok(data.obligationChips.length >= 4 && data.obligationChips.length <= 6, `${id}: ${data.obligationChips.length} chips`);
    for (const c of data.obligationChips) assert.ok(rowIds.includes(c.row), `${id}: chip "${c.label}" → ${c.row}`);
    assert.equal(new Set(data.obligationChips.map((c) => c.row)).size, data.obligationChips.length, `${id}: two chips name one row`);
    for (const c of data.obligationChips) assert.ok(c.label.length <= 40, `${id}: chip "${c.label}" is over 40 characters`);
    assert.ok(data.worksAlongside.length >= 3 && data.worksAlongside.length <= 5, `${id}: ${data.worksAlongside.length} systems`);
    const resolved = data.packages.map((p) => {
      const s = solution(p.solution);
      const found = [s.genericPackage, ...s.packages].find((x) => x.id === p.package);
      assert.ok(found, `${id}: ${p.solution} has no package ${p.package}`);
      return [p.solution, p.package, found.status];
    });
    assert.deepEqual(resolved, PACKAGES[id], id);
  }
});

test("the solutions list these industries in nav order where the pages name them, each with its matrix cell", () => {
  const solutions = Object.fromEntries(SOLUTION_IDS.map((s) => [s, solution(s)]));
  for (const [sid, s] of Object.entries(solutions)) {
    const order = s.byIndustry.map((i) => INDUSTRY_ORDER.indexOf(i));
    assert.ok(order.every((n, i) => n >= 0 && (i === 0 || n > order[i - 1])), `${sid}: byIndustry ${s.byIndustry.join(", ")} is not in nav order`);
    assert.deepEqual(Object.keys(s.matrix).filter((k) => !s.byIndustry.includes(k)), [], `${sid}: a matrix cell for an industry byIndustry doesn't list`);
  }
  for (const id of IDS) {
    const named = solutionsNamed(industry(id));
    for (const sid of SOLUTION_IDS) {
      const s = solutions[sid];
      assert.equal(s.byIndustry.includes(id), named.has(sid), `${sid}.byIndustry and the ${id} page disagree`);
      assert.equal(s.matrix[id], MATRIX[sid][id], `${sid}.matrix.${id}`);
    }
  }
});

test("the three pages are live and built, each with its industry title and its own meta description", () => {
  for (const id of IDS) {
    const entry = entryOf(id);
    assert.equal(entry.status, "live", id);
    const page = html(id);
    assert.equal(text(page.match(/<title>([\s\S]*?)<\/title>/)[1]), pageTitle(entry), `${id}: <title>`);
    const meta = page.match(/<meta name="description" content="([^"]*)"/)[1];
    assert.equal(visibleText(meta).trim(), pageDescription(entry), `${id}: meta description`);
    assert.doesNotMatch(pageDescription(entry), /\bagents?\b|\bfree\b/i, `${id}: description`);
  }
});

test("each page has one h1 (its promise), the spec §8.5 blocks in order and unique ids", () => {
  const blocks = ["designed-around", "problem", "workflow", "packages", "regulatory-map", "scenario", "first-engagement", "insights", "faq", "contact"];
  for (const id of IDS) {
    const page = html(id);
    const main = mainOf(page);
    const h1 = elements(main, (t) => t.name === "h1");
    assert.equal(h1.length, 1, `${id}: ${h1.length} h1 elements`);
    assert.equal(text(h1[0].inner), industry(id).promise);
    assert.match(industry(id).promise, /\.$/, `${id}: the promise is a declarative ending in a period (spec §3.3)`);
    const found = startTags(main).map((t) => t.attrs.id).filter((x) => blocks.includes(x));
    assert.deepEqual(found.filter((b) => b !== "insights"), blocks.filter((b) => b !== "insights"), `${id}: block order`);
    const ids = startTags(page).map((t) => t.attrs.id).filter(Boolean);
    assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), [], `${id}: duplicate ids`);
  }
});

test("chips link to rows of the map below, which lists every row with its source, review date and notice", () => {
  for (const id of IDS) {
    const page = html(id);
    const rows = rowsOf(id);
    const chips = startTags(byId(page, "designed-around-obligations").outer).filter((t) => t.name === "a").map((t) => t.attrs.href);
    assert.deepEqual(chips, industry(id).obligationChips.map((c) => `#reg-${c.row}`), `${id}: chip links`);
    const map = byId(page, "regulatory-map");
    const built = elementsWith(map.inner, "data-regulatory-row");
    assert.deepEqual(built.map((r) => r.attrs.id), rows.map((r) => `reg-${r.id}`), `${id}: map rows`);
    for (const [i, r] of rows.entries()) {
      const t = text(built[i].inner);
      for (const field of [r.obligation, r.meaning, r.design, r.evidence]) assert.ok(t.includes(field), `${id}/${r.id}: "${field.slice(0, 40)}…"`);
      assert.ok(built[i].inner.includes(`href="${r.source}"`), `${id}/${r.id}: no source link`);
    }
    assert.ok(text(map.inner).includes(`Last reviewed ${formatDate(new Date("2026-09-29"))}`), `${id}: last reviewed`);
    assert.deepEqual(elementsWith(map.inner, "data-notice").map((n) => text(n.inner)), [NOT_LEGAL_ADVICE], id);
  }
});

test("the scenario is labelled illustrative, and the FAQ answers exactly the content's questions", () => {
  for (const id of IDS) {
    const page = html(id);
    const scenario = byId(page, "scenario");
    assert.equal(scenario.attrs["data-provenance"], "illustrative");
    assert.ok(text(scenario.inner).startsWith(SCENARIO_LABEL), `${id}: scenario label`);
    const blocks = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const faq = blocks.filter((b) => b["@type"] === "FAQPage");
    assert.equal(faq.length, 1, `${id}: FAQPage blocks`);
    assert.deepEqual(faq[0].mainEntity.map((q) => q.name), industry(id).faq.map((f) => f.q), id);
  }
});

test("each page runs 900–1,400 words, counting the regulatory map and the FAQ (spec §8.5)", () => {
  for (const id of IDS) {
    const n = pageWords(html(id));
    assert.ok(n >= 900 && n <= 1400, `${id}: ${n} words`);
  }
});

test("mid-market language: no agents outside statute names, no tenancy, sprint, pricing or coming-soon copy (spec §3.4, §5, D4)", () => {
  for (const id of IDS) {
    const main = mainOf(html(id));
    const map = byId(main, "regulatory-map").outer;
    const outsideMap = text(main.replace(map, " "));
    assert.doesNotMatch(outsideMap, /\bagents?\b/i, `${id}: "agent" outside the regulatory map`);
    const t = text(main);
    assert.doesNotMatch(t, /\btenancy\b|\bsprint\b|APRA audit/i, id);
    assert.doesNotMatch(t, /(?:\bAU?)?\$\s?\d|\bfrom\s+\$/i, `${id}: a currency figure`);
    assert.doesNotMatch(t, /coming (?:soon|later)/i, id);
  }
  const mfg = text(mainOf(html("manufacturing")));
  assert.doesNotMatch(mfg, /\bfree\b|Sales Order/i, "manufacturing: 'free' or a vendor agent product (ruling 8)");
  const re = text(mainOf(html("real-estate")));
  assert.doesNotMatch(re, /Connector/, "real estate: the PropertyMe Connector (ruling 9)");
  const edu = text(mainOf(html("education")));
  assert.doesNotMatch(edu, /\bRTOs?\b|\bASQA\b|ChatGPT Edu/, "education: RTOs or an unverified works-alongside system (ruling 5)");
});

// ---------- the final whole-branch review's fixes (C5-T5) ----------

test("each scenario ships what the page's recommended package offers (C5-T5-F1, C5-T5-F2)", () => {
  // Manufacturing: the SOP & Work-Instruction Assistant is reached on the web (its onshore note), not in Teams.
  const sop = solution("knowledge-assistant").packages.find((p) => p.id === "sop-work-instruction-assistant");
  assert.match(sop.onshoreNote, /\bon the web\b/);
  const shipped = industry("manufacturing").scenario.shipsFirst;
  assert.doesNotMatch(shipped, /\bTeams\b|Microsoft 365/);
  assert.match(shipped, /\bon the web\b/);
  // Education: the scenario's trial has 40 questions, and go-live follows the go/no-go and the
  // acceptance test the page's package sets (50–100 questions), not the trial alone.
  const scenario = industry("education").scenario;
  assert.match(scenario.approach, /\b40 questions\b/);
  assert.match(scenario.shipsFirst, /^After the go\/no-go, /);
  assert.match(scenario.shipsFirst, /\bacceptance-test report\b/);
});

test("Manufacturing: the Mitti answer claims no source scope for its AI Assistant, and the AI Adopt Centre answer carries its owner marker (C5-T5-F4, C5-T5-F5)", () => {
  // Research index keep-off list: what the Mitti AI Assistant answers from is unverified.
  const mitti = industry("manufacturing").faq.find((f) => /SafetyCulture/.test(f.q));
  assert.doesNotMatch(mitti.a, /\banything stored there\b|\beverything (?:stored|held) (?:there|in)\b/i);
  assert.match(mitti.a, /^Try its AI Assistant on your own SOP questions first\./);
  // Whether the AI Adopt Centres still take SMEs is unconfirmed (dossier open item 9), so check 07 holds the answer.
  const lines = readFileSync(`${ROOT}src/content/industries/manufacturing.yaml`, "utf8").split("\n");
  const at = lines.findIndex((l) => l.trim() === '- q: "Should we go to an AI Adopt Centre first?"');
  assert.ok(at > 0, "no AI Adopt Centre FAQ");
  assert.equal(lines[at - 1].trim(), "# ⚑ owner: confirm the AI Adopt Centres are still taking SMEs (manufacturing dossier, open item 9)");
});

test("Real estate: the Queensland trust-audit chip uses its row's words (C5-T5-F6)", () => {
  const row = rowsOf("real-estate").find((r) => r.id === "qld-trust-audit");
  assert.match(row.obligation, /\bunannounced checks\b/);
  const chip = industry("real-estate").obligationChips.find((c) => c.row === "qld-trust-audit");
  assert.equal(chip.label, "Trust audits and unannounced checks, Qld");
  assert.ok(chip.label.length <= 40);
});
