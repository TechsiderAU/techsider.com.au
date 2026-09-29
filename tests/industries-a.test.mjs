// Phase C Task 4: the Government, Financial services and Accounting industry pages (spec §5, §8.5),
// as the production build renders them from src/content/industries/, src/data/regulatory/ and
// src/data/traces/, and their byIndustry and matrix entries in the solution YAMLs. Facts come from
// the Phase C research dossiers; these tests pin what the spec and the Phase C rulings require of
// the pages: every chip lands on a row, Government's three jurisdiction sections, the word counts,
// the held rows and keep-off facts, and the CI checks. Run `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { pageWords, readDist, visibleText } from "./helpers.mjs";
import { ROOT, decodeEntities, elements, elementsWith, normalizeQuotes, readFrontmatter, startTags } from "../scripts/ci/lib.mjs";
import { runAll } from "../scripts/ci/run-all.mjs";
import {
  JURISDICTION_SECTION, SECTION_ORDER, makeIndustrySchema, makeSolutionSchema, plainRef, regulatoryFile, traceFile,
} from "../src/content/schemas.ts";
import { PAGES } from "../src/data/nav.ts";
import { SCENARIO_LABEL } from "../src/lib/fixed-copy.ts";
import { pageDescription, pageTitle } from "../src/lib/meta.ts";
import { siteContext } from "../src/lib/site.ts";

const IDS = ["government", "financial-services", "accounting"];
/** Spec §8.5: 900–1,400 words counting tables and FAQ; the Government page 1,800–2,600. */
const WORD_RANGE = { government: [1800, 2600], "financial-services": [900, 1400], accounting: [900, 1400] };
const SOLUTION_IDS = ["document-registers", "knowledge-assistant", "draft-for-approval", "ai-evaluation", "ai-switch-on"];
/** Phase C ruling 1: rows held until they are re-checked. */
const HELD_ROWS = { government: ["cth-app-1-adm-transparency"], accounting: ["tpb-verify-and-document"] };
/**
 * Facts the research index keeps off the site, and ruling 2's panel and clearance FAQs, as they would
 * read on a page. OpenText and ServiceNow go with the unverified "agencies commonly run them" claim,
 * Protecht and Camms with their unverified import paths, SOCI stays off the FS page (ruling 3), and
 * First AML's speed claim stays off the Accounting page (verify-register §17).
 */
const KEEP_OFF = [
  "APP 1.7", "IRAP", "AI6", "APES 320", "XeroForce", "generally available", "no additional cost",
  "OpenText", "ServiceNow", "Protecht", "Camms", "SOCI", "BuyICT", "buy.nsw", "clearance", "APRA audit", "tenancy",
  "sixty seconds",
];
/** One DTA page states both the impact-assessment and the monitoring duties; each row quotes its own part. */
const SAME_PAGE = [["cth-dta-ai-impact-assessment", "cth-dta-monitor-revalidate"]];
/** A paragraph, section or principle a row's obligation names, so two rows on one source cite different parts. */
const LOCATOR = /¶\s?[\d–-]+|\bss? [\d-]+|\bAGT\.\d|\bIPPs? \d|\bQPPs? \d|\bRG [\d.–]+|\bAPPs? \d/;
/** Ruling 15: the commitment marker ends each industry YAML's header, and covers its regulatory map's design lines. */
const commitmentMarker = (id) =>
  `# ⚑ owner: every commitment in this file, and in the design lines of src/data/regulatory/${id}.json, must be in the standard engagement terms (spec §12 item 2)`;

const industrySchema = makeIndustrySchema(plainRef);
const solutionSchema = makeSolutionSchema(plainRef);
const readYaml = (rel) => parse(readFileSync(join(ROOT, rel), "utf8"));
const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
const industry = (id) => industrySchema.parse(readYaml(`src/content/industries/${id}.yaml`));
const rows = (id) => regulatoryFile.parse(readJson(`src/data/regulatory/${id}.json`)).rows;
const solution = (id) => solutionSchema.parse(readYaml(`src/content/solutions/${id}.yaml`));
const page = (id) => readDist(`industries/${id}/index.html`);
const navAt = (path) => PAGES.find((p) => p.path === path);
const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>"));
const text = (html) => visibleText(html).trim();
const byId = (html, id) => elements(html, (t) => t.attrs.id === id)[0];
const hrefsIn = (html) => startTags(html).filter((t) => t.name === "a").map((t) => t.attrs.href);
const rowIdsIn = (html) => elementsWith(html, "data-regulatory-row").map((r) => r.attrs.id);
/** The page's own copy in <main>: everything but the related-insight cards, whose titles are the posts'. */
const ownCopy = (html) => {
  const main = mainOf(html);
  const insights = byId(main, "insights");
  return text(insights ? main.replace(insights.outer, " ") : main);
};
/** The sections a Government row renders in (a row tagged nsw and local renders in State and Local). */
const sectionsOf = (row) => [...new Set(row.jurisdictions.map((j) => JURISDICTION_SECTION[j]))];

test("the three industries are live in nav.ts, each with its own 150–160 character description", () => {
  for (const id of IDS) {
    const entry = navAt(`/industries/${id}/`);
    assert.equal(entry.status, "live", id);
    assert.doesNotThrow(() => pageDescription(entry), id);
  }
});

test("the content files validate, each industry names its own illustrative scenario trace, and each carries the commitment marker", () => {
  for (const id of IDS) {
    const data = industry(id);
    assert.ok(readFileSync(join(ROOT, `src/content/industries/${id}.yaml`), "utf8").split("\n").includes(commitmentMarker(id)), `${id}: no commitment marker (ruling 15)`);
    assert.equal(data.scenario.trace, `${id}-scenario`);
    const trace = traceFile.parse(readJson(`src/data/traces/${id}-scenario.json`));
    assert.equal(trace.provenance, "illustrative", id);
    assert.ok(rows(id).length >= 4, `${id}: fewer than 4 regulatory rows`);
  }
  assert.deepEqual(industry("government").jurisdictions, ["cth", "nsw", "vic", "qld", "local"]);
  assert.equal(industry("financial-services").jurisdictions, undefined);
  assert.equal(industry("accounting").jurisdictions, undefined);
});

test("every obligation chip names a row of its own industry's map, and on Government a row of its section", () => {
  for (const id of IDS) {
    const byRow = new Map(rows(id).map((r) => [r.id, r]));
    for (const chip of industry(id).obligationChips) {
      const row = byRow.get(chip.row);
      assert.ok(row, `${id}: chip "${chip.label}" names row "${chip.row}", which isn't in src/data/regulatory/${id}.json`);
      if (chip.jurisdiction) assert.ok(row.jurisdictions.includes(chip.jurisdiction), `${id}: chip "${chip.label}" is ${chip.jurisdiction}, row ${row.id} isn't`);
    }
  }
});

test("every row cites an https primary source, and rows share a source only when they cite different parts of it", () => {
  for (const id of IDS) {
    const bySource = new Map();
    for (const row of rows(id)) {
      assert.match(row.source, /^https:\/\//, `${id}/${row.id}`);
      assert.ok(row.asAt <= row.lastReviewed, `${id}/${row.id}: asAt is after lastReviewed`);
      bySource.set(row.source, [...(bySource.get(row.source) ?? []), row]);
    }
    for (const [source, shared] of bySource) {
      if (shared.length === 1) continue;
      const ids = shared.map((r) => r.id);
      if (SAME_PAGE.some((pair) => pair.length === ids.length && pair.every((r) => ids.includes(r)))) continue;
      const parts = shared.map((r) => r.obligation.match(LOCATOR)?.[0]);
      assert.ok(parts.every(Boolean), `${id}: ${ids.join(", ")} share ${source} without each naming its paragraph`);
      assert.equal(new Set(parts).size, parts.length, `${id}: ${ids.join(", ")} share ${source} and name the same paragraph`);
    }
  }
});

test("Phase C ruling 1: held rows stay out of the regulatory files", () => {
  for (const [id, held] of Object.entries(HELD_ROWS)) {
    const present = rows(id).map((r) => r.id);
    for (const row of held) assert.ok(!present.includes(row), `${id}: held row ${row} is published`);
  }
  for (const id of IDS) {
    for (const row of rows(id)) assert.doesNotMatch(`${row.obligation} ${row.meaning}`, /APP 1\.[789]|automated decision/i, `${id}/${row.id}`);
  }
});

test("each page renders its promise as the one h1, its own title and description, and the industry template", () => {
  for (const id of IDS) {
    const html = page(id);
    const entry = navAt(`/industries/${id}/`);
    assert.equal(decodeEntities(html.match(/<title>([^<]*)<\/title>/)[1]), pageTitle(entry));
    assert.equal(decodeEntities(html.match(/<meta name="description" content="([^"]*)"/)[1]), pageDescription(entry));
    const main = mainOf(html);
    const h1 = elements(main, (t) => t.name === "h1");
    assert.equal(h1.length, 1, id);
    assert.equal(text(h1[0].inner), industry(id).promise);
    assert.deepEqual(elementsWith(main, "data-template").map((r) => r.attrs["data-template"]), ["industry"], id);
  }
});

test("spec §8.5 structure: each page's blocks in order (Government by jurisdiction), and no id used twice", () => {
  const single = ["designed-around", "problem", "workflow", "packages", "regulatory-map", "scenario", "first-engagement", "faq", "contact"];
  // Jurisdiction mode: Commonwealth, State and Local each carry their own chips, packages and map.
  const jurisdiction = ["designed-around", "commonwealth", "state", "local", "problem", "workflow", "packages", "scenario", "first-engagement", "faq", "contact"];
  for (const id of IDS) {
    const html = page(id);
    const blocks = id === "government" ? jurisdiction : single;
    // Task 8's #insights sits between first-engagement and faq; it isn't in the list, so it doesn't count here.
    const found = startTags(mainOf(html)).map((t) => t.attrs.id).filter((x) => blocks.includes(x));
    assert.deepEqual(found, blocks, `${id}: block order`);
    const ids = startTags(html).map((t) => t.attrs.id).filter(Boolean);
    assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), [], `${id}: duplicate ids`);
  }
});

test("Financial services and Accounting: every Designed around chip lands on a row of the map below, and every row renders once", () => {
  for (const id of ["financial-services", "accounting"]) {
    const html = page(id);
    const chips = hrefsIn(byId(html, "designed-around").inner);
    assert.deepEqual(chips, industry(id).obligationChips.map((c) => `#reg-${c.row}`), id);
    const rendered = rowIdsIn(byId(html, "regulatory-map").inner);
    assert.deepEqual(rendered, rows(id).map((r) => `reg-${r.id}`), id);
    for (const href of chips) assert.ok(rendered.includes(href.slice(1)), `${id}: ${href} lands on no row`);
    assert.equal(elementsWith(html, "data-jurisdiction-section").length, 0, id);
  }
});

test("Government: Commonwealth, State and Local sections, each with its rows, 4–6 chips that land in it, and 3–4 packages", () => {
  const html = page("government");
  const data = industry("government");
  const sections = elementsWith(html, "data-jurisdiction-section");
  assert.deepEqual(sections.map((s) => s.attrs["data-jurisdiction-section"]), SECTION_ORDER);
  for (const s of sections) {
    const id = s.attrs.id;
    const expectedRows = rows("government").filter((r) => sectionsOf(r).includes(id)).map((r) => `reg-${id}-${r.id}`);
    const rendered = rowIdsIn(s.inner);
    assert.ok(rendered.length >= 1, `${id}: no regulatory row`);
    assert.deepEqual(rendered, expectedRows, id);
    const chips = hrefsIn(byId(s.inner, `${id}-designed-around`).inner).filter((h) => h.startsWith("#reg-"));
    assert.ok(chips.length >= 4 && chips.length <= 6, `${id}: ${chips.length} chips`);
    assert.deepEqual(chips, data.obligationChips.filter((c) => JURISDICTION_SECTION[c.jurisdiction] === id).map((c) => `#reg-${id}-${c.row}`));
    for (const href of chips) assert.ok(rendered.includes(href.slice(1)), `${id}: ${href} lands outside its section`);
    const cards = elementsWith(byId(s.inner, `${id}-packages`).inner, "data-package-status");
    assert.ok(cards.length >= 3 && cards.length <= 4, `${id}: ${cards.length} packages`);
  }
  assert.equal(byId(html, "regulatory-map"), undefined, "a page-wide map on the Government page");
});

test("spec §8.5 word counts: 900–1,400 words, and 1,800–2,600 on the Government page", () => {
  for (const id of IDS) {
    const [min, max] = WORD_RANGE[id];
    const n = pageWords(page(id));
    assert.ok(n >= min && n <= max, `${id}: ${n} words; the spec needs ${min}–${max}`);
  }
});

test("the problem cites its public source, the scenario is labelled illustrative, and the CTA asks about the industry", () => {
  const site = siteContext(false);
  for (const id of IDS) {
    const html = page(id);
    const data = industry(id);
    assert.ok(hrefsIn(byId(html, "problem").inner).includes(data.problem.source.url), `${id}: no link to the problem source`);
    const scenario = byId(html, "scenario");
    assert.equal(scenario.attrs["data-provenance"], "illustrative");
    assert.ok(text(scenario.inner).startsWith(SCENARIO_LABEL), `${id}: the scenario doesn't open with its label`);
    assert.equal(elementsWith(scenario.inner, "data-trace-panel")[0].attrs["data-provenance"], "illustrative");
    const hero = elementsWith(html, "data-page-hero")[0];
    assert.ok(hrefsIn(hero.inner).includes(site.contact({ industry: id })), `${id}: the CTA doesn't preselect the industry`);
  }
});

test("held and keep-off facts stay off the pages, and Accounting keeps mid-market language (spec §3.4)", () => {
  for (const id of IDS) {
    const t = ownCopy(page(id));
    for (const phrase of KEEP_OFF) assert.ok(!t.includes(phrase), `${id}: "${phrase}" is on the page`);
    // Spec §3.4: "Feasibility Sprint on public or synthetic data" is the government term; no other page says "sprint".
    const sprintFree = id === "government" ? t.replace(/Feasibility Sprint/g, "") : t;
    assert.doesNotMatch(sprintFree, /\bsprint\b/i, `${id}: "sprint" outside Government's Feasibility Sprint`);
  }
  const accounting = ownCopy(page("accounting"));
  assert.doesNotMatch(accounting, /\bagents?\b/i, "Accounting says agent(s)");
  // platform-ai.md: FYI has no native AI (ATO SmartDocs is a third-party integration), so no sentence credits FYI with AI.
  assert.doesNotMatch(accounting, /\bFYI\b[^.?!]*\bAI\b/, "Accounting credits FYI with AI");
});

test("each solution an industry page uses lists that industry in byIndustry, with a 3–6 word matrix cell", () => {
  const used = (data) => new Set([
    ...data.leadSolutions, ...data.flagshipUseCases.map((u) => u.solution),
    ...data.workflow.flatMap((s) => s.useCases.map((u) => u.solution)), ...data.packages.map((p) => p.solution),
  ]);
  for (const id of IDS) {
    const uses = used(industry(id));
    for (const sid of SOLUTION_IDS) {
      const s = solution(sid);
      assert.equal(s.byIndustry.includes(id), uses.has(sid), `${sid}.byIndustry and ${id}`);
      assert.equal(Object.hasOwn(s.matrix, id), uses.has(sid), `${sid}.matrix and ${id}`);
      if (!uses.has(sid)) continue;
      const words = s.matrix[id].split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
      assert.ok(words >= 3 && words <= 6, `${sid}.matrix.${id}: ${words} words`);
    }
  }
});

test("solution pages link back to these industries, and the Solutions hub matrix shows their cells", () => {
  const hub = readDist("solutions/index.html");
  for (const id of IDS) {
    const row = byId(hub, `matrix-${id}`);
    assert.ok(row, `the matrix has no ${id} row`);
    assert.ok(hrefsIn(row.inner).includes(`/industries/${id}/`), `the ${id} row header doesn't link to its page`);
    for (const sid of SOLUTION_IDS) {
      const cell = solution(sid).matrix[id];
      if (cell === undefined) continue;
      assert.ok(text(row.inner).includes(cell), `matrix ${id} × ${sid}: "${cell}" isn't rendered`);
      const byIndustry = byId(readDist(`solutions/${sid}/index.html`), "who-industries");
      assert.ok(hrefsIn(byIndustry.inner).includes(`/industries/${id}/`), `/solutions/${sid}/ doesn't link to /industries/${id}/`);
    }
  }
});

test("CI checks 01, 02, 04, 06, 08 and 11 pass on dist/, and none reports these pages or their files", async () => {
  const checks = ["01-slugs", "02-links", "04-banned-phrases", "06-provenance", "08-regulatory-kits", "11-pricing"];
  const { results } = await runAll({ root: ROOT, dist: join(ROOT, "dist"), mode: "report", checks });
  const mine = new RegExp(`(industries/|regulatory/|traces/)(${IDS.join("|")})`);
  // From Phase C Task 8 each page's Related insights cards repeat a post's title and description.
  // Check 04 already warns on those where the post itself and /insights/ show them, so a warning
  // that quotes a card's text isn't about this page's own copy.
  const dir = join(ROOT, "src/content/insights");
  const cards = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => readFrontmatter(join(dir, f)))
    .map(({ title, description }) => normalizeQuotes(`${title} ${description}`).replace(/\s+/g, " "));
  const fromCard = (w) => {
    const quoted = w.match(/ in "…?(.*?)…?"$/)?.[1];
    return quoted !== undefined && cards.some((c) => c.includes(quoted));
  };
  for (const { id, errors, warnings } of results) {
    assert.deepEqual(errors, [], id);
    assert.deepEqual(warnings.filter((w) => mine.test(w) && !fromCard(w)), [], id);
  }
});

// ---------- the final whole-branch review's fixes (C4-T4, C6-T6-F3) ----------

/** Every string in a value, however deep. */
const stringsOf = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(stringsOf) : v && typeof v === "object" ? Object.values(v).flatMap(stringsOf) : []);
const sentencesOf = (s) => s.split(/(?<=[.?!])\s+/);

test("Government: each Local chip names its state, in 40 characters or fewer (C4-T4-F6)", () => {
  const local = industry("government").obligationChips.filter((c) => c.jurisdiction === "local");
  assert.ok(local.length >= 4);
  for (const c of local) {
    assert.match(c.label, /^(?:NSW|Vic|Qld) councils: /, `the Local chip "${c.label}" reads as general`);
    assert.ok(c.label.length <= 40, `"${c.label}" is over 40 characters`);
  }
});

test("Government: the independence line and the council FAQ say only what the page shows (C4-T4-F1, C4-T4-F2)", () => {
  // The page's own evidence rows name acceptance tests (spec §4.4): what we never do is an
  // independent evaluation of our own work, so no industry page says we don't evaluate it at all.
  for (const f of readdirSync(join(ROOT, "src/content/industries")).filter((x) => x.endsWith(".yaml"))) {
    for (const s of stringsOf(readYaml(`src/content/industries/${f}`))) {
      assert.doesNotMatch(s, /\b(?:don't|do not|never|won't) evaluate\b/i, `${f}: "${s}"`);
    }
  }
  assert.ok(industry("government").dontDo.includes("We don't independently evaluate a system we built, configured or advised on for the same agency."));
  // The Local section lists Victoria's PROV records rule only, so the council FAQ names no Victorian privacy rule.
  const council = industry("government").faq.find((f) => /council/i.test(f.q));
  assert.match(council.a, /\bPROV's recordkeeping policy for Victorian records\b/);
  assert.doesNotMatch(council.a, /\bin Victoria\b/);
  const vic = rows("government").filter((r) => r.jurisdictions.includes("local") && /^local-vic-/.test(r.id)).map((r) => r.id);
  assert.deepEqual(vic, ["local-vic-prov-ai-records"]);
});

test("the report or data note records the vendor's published processing location, never a per-request one (C4-T4-F4)", () => {
  const sources = [
    ...["government", "financial-services"].map((id) => [`src/content/industries/${id}.yaml`, stringsOf(readYaml(`src/content/industries/${id}.yaml`))]),
    ...SOLUTION_IDS.map((id) => [`src/content/solutions/${id}.yaml`, stringsOf(readYaml(`src/content/solutions/${id}.yaml`))]),
    ["src/content/documents/evaluation-method.md", [readFileSync(join(ROOT, "src/content/documents/evaluation-method.md"), "utf8")]],
  ];
  let checked = 0;
  for (const [file, strings] of sources) {
    for (const s of strings.flatMap(sentencesOf).filter((x) => /\b(?:report|data note) records\b/.test(x) && /\blocation\b|\bwhere that is\b/.test(x))) {
      checked += 1;
      assert.match(s, /\bpublish(?:ed|es)\b/, `${file}: "${s}"`);
    }
  }
  assert.ok(checked >= 10, `only ${checked} sentences checked`);
});

test("Accounting: the A1 kit marker covers the Industries hub, which shows the same package name (C6-T6-F3)", () => {
  const lines = readFileSync(join(ROOT, "src/content/industries/accounting.yaml"), "utf8").split("\n");
  const at = lines.findIndex((l) => l.includes("- name: Admin Hours Audit + Switch-On, with the accounting Safe-Use Kit"));
  assert.equal(lines[at - 1].trim(), "# ⚑ owner: the accounting Safe-Use Kit must be lawyer-reviewed and published before the Accounting page or the Industries hub launches (spec §12 item 6; research index A1)");
});
