// Phase C Task 6: the Healthcare, Resources & energy and Legal & professional industry pages and
// the Industries hub, as the production build renders them (dist/), and the content they are built
// from. Run `npm run build` first. Expected values come from the content files and nav.ts; the
// only literals are the held rows and keep-off strings the Phase C rulings name.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { pageWords, readDist, visibleText } from "./helpers.mjs";
import { decodeEntities, elements, elementsWith, idsIn, resolveDistPath, startTags } from "../scripts/ci/lib.mjs";
import { makeIndustrySchema, makeSolutionSchema, plainRef, regulatoryFile, traceFile } from "../src/content/schemas.ts";
import { PAGES, noJsLinks, visibleGroups } from "../src/data/nav.ts";
import { pageDescription } from "../src/lib/meta.ts";
import { siteContext } from "../src/lib/site.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = join(ROOT, "dist");
const TASK6 = ["healthcare", "resources-and-energy", "legal-and-professional"];
const site = siteContext(false);
const INDUSTRY_IDS = site.industries.map((i) => i.id);
const SOLUTION_IDS = site.solutions.map((s) => s.id);
const industrySchema = makeIndustrySchema(plainRef);
const solutionSchema = makeSolutionSchema(plainRef);

const readRel = (rel) => readFileSync(join(ROOT, rel), "utf8");
const industryData = (id) => industrySchema.parse(parse(readRel(`src/content/industries/${id}.yaml`)));
const solutionData = (id) => solutionSchema.parse(parse(readRel(`src/content/solutions/${id}.yaml`)));
const rowsOf = (id) => regulatoryFile.parse(JSON.parse(readRel(`src/data/regulatory/${id}.json`))).rows;
const pageAtPath = (path) => PAGES.find((p) => p.path === path);
const built = (path) => readDist(`${path.slice(1)}index.html`);
const mainOf = (html) => elements(html, (t) => t.name === "main")[0].inner;
const byId = (html, id) => elements(html, (t) => t.attrs.id === id)[0];
const text = (html) => visibleText(html).trim();
// Text as a browser shows it inline: tags dropped without adding spaces ("<span>Industries</span>." → "Industries.").
const inlineText = (html) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

// The section (paragraph, rule or item) a row's obligation cites: "¶9A", "s 8A(2)(c)–(d)", "r 9.1".
const pinpoint = (obligation) => obligation.match(/(?:¶|\b(?:ss?|rr?)\s)[0-9][0-9A-Za-z.()–-]*/)?.[0] ?? null;

// Rows the Phase C rulings hold (ruling 1 and the research index's keep-off list), and strings that
// must not reach these pages (rulings 1, 6, 7 and 10; index "Still unverified: keep off the site").
const HELD_ROWS = ["app-1-7-automated-decisions", "nsw-health-ai-framework", "epbc-approval-conditions", "fca-gpn-ai"];
const KEEP_OFF = {
  healthcare: ["NSW Health", "APP 1.7", "10 Dec 2026", "Heidi", "Lyrebird", "Bp Premier", "scribe panel", "38.7", "Practitioner Information Exchange", "Queensland Health"],
  "resources-and-energy": ["134(1A)", "control system", "SCADA", "Glean", "Rio Tinto", "Mind the Bridge", "decision time"],
  "legal-and-professional": ["GPN-AI", "Federal Court", "Trust Deed", "AU-hosted", "Queensland", "per fee earner"],
};

test("Task 6 content validates: three industry entries, their regulatory maps and illustrative scenario traces", () => {
  for (const id of TASK6) {
    const data = industryData(id);
    const rows = rowsOf(id);
    // Ruling 15: the commitment marker ends the header comment and covers the regulatory map's design lines.
    const marker = `# ⚑ owner: every commitment in this file, and in the design lines of src/data/regulatory/${id}.json, must be in the standard engagement terms (spec §12 item 2)`;
    assert.ok(readRel(`src/content/industries/${id}.yaml`).split("\n").includes(marker), `${id}: no commitment marker`);
    assert.equal(data.jurisdictions, undefined, `${id} is a single-map page`);
    assert.ok(rows.length >= 4 && rows.length <= 6, `${id}: ${rows.length} rows`);
    const ids = new Set(rows.map((r) => r.id));
    for (const chip of data.obligationChips) assert.ok(ids.has(chip.row), `${id}: chip "${chip.label}" names no row`);
    assert.ok(data.obligationChips.every((c) => c.label.length <= 40), `${id}: a chip label is over 40 characters`);
    assert.ok(data.constraintHook.length <= 70, `${id}: the hook is over 70 characters`);
    assert.equal(data.scenario.trace, `${id}-scenario`);
    const trace = traceFile.parse(JSON.parse(readRel(`src/data/traces/${id}-scenario.json`)));
    assert.equal(trace.provenance, "illustrative", `${id}: the scenario trace is not illustrative`);
    for (const row of rows) {
      assert.match(row.source, /^https:\/\//, `${id}/${row.id}: source is not https`);
      assert.equal(row.lastReviewed.toISOString().slice(0, 10), "2026-09-29", `${id}/${row.id}: lastReviewed`);
      assert.ok(row.asAt <= row.lastReviewed, `${id}/${row.id}: asAt is after lastReviewed`);
      assert.doesNotMatch(row.evidence, /\b(compl(?:y|ies|iant|iance)|meets?|satisf\w*|ensures?)\b/i, `${id}/${row.id}: evidence claims compliance`);
    }
  }
});

test("rows that share a source cite different paragraphs, and no held row is published", () => {
  for (const id of TASK6) {
    const bySource = Map.groupBy(rowsOf(id), (r) => r.source);
    for (const [source, rows] of bySource) {
      if (rows.length === 1) continue;
      const cited = rows.map((r) => pinpoint(r.obligation));
      assert.ok(cited.every(Boolean), `${id}: a row sharing ${source} names no paragraph or section`);
      assert.equal(new Set(cited).size, cited.length, `${id}: rows sharing ${source} cite the same paragraph`);
    }
    for (const held of HELD_ROWS) assert.ok(!rowsOf(id).some((r) => r.id === held), `${id}: held row ${held} is published`);
  }
});

test("the three industry pages and the hub are live, each with its own 150–160 character description", () => {
  for (const path of ["/industries/", ...TASK6.map((id) => `/industries/${id}/`)]) {
    const entry = pageAtPath(path);
    assert.equal(entry.status, "live", `${path} is not live`);
    assert.equal(pageDescription(entry), entry.description);
    assert.ok(resolveDistPath(DIST, path), `${path} was not built`);
  }
});

test("each page renders its promise as the one h1, the §8.5 sections in order, and the talk CTA", () => {
  const ORDER = ["designed-around", "problem", "workflow", "packages", "regulatory-map", "scenario", "first-engagement", "insights", "faq", "contact"];
  for (const id of TASK6) {
    const data = industryData(id);
    const main = mainOf(built(`/industries/${id}/`));
    const h1 = elements(main, (t) => t.name === "h1");
    assert.equal(h1.length, 1, `${id}: ${h1.length} h1 elements`);
    assert.equal(text(h1[0].inner), data.promise);
    assert.ok(data.promise.endsWith("."), `${id}: the promise is not a declarative ending in a period`);
    const [template] = elementsWith(main, "data-template", "industry");
    assert.ok(template, `${id}: no industry template root`);
    const found = startTags(template.inner).map((t) => t.attrs.id).filter((x) => ORDER.includes(x));
    const expected = ORDER.filter((x) => x !== "insights" || found.includes("insights"));
    assert.deepEqual(found, expected, `${id}: sections`);
    const talk = `Talk to us about AI for ${site.industries.find((i) => i.id === id).shortName.toLowerCase()}`;
    const ctas = elements(main, (t) => t.name === "a").filter((a) => text(a.inner) === talk);
    assert.ok(ctas.length >= 2, `${id}: the hero and closing talk links`);
    for (const a of ctas) assert.equal(a.attrs.href, site.contact({ industry: id }), `${id}: talk link`);
  }
});

test("every Designed around chip links to a regulatory-map row on its own page", () => {
  for (const id of TASK6) {
    const main = mainOf(built(`/industries/${id}/`));
    const chips = elements(byId(main, "designed-around-obligations").outer, (t) => t.name === "a");
    assert.equal(chips.length, industryData(id).obligationChips.length, `${id}: chip count`);
    const rowIds = new Set(elementsWith(main, "data-regulatory-row").map((r) => r.attrs.id));
    assert.equal(rowIds.size, rowsOf(id).length, `${id}: rendered rows`);
    for (const chip of chips) {
      assert.match(chip.attrs.href, /^#reg-/, `${id}: chip ${chip.attrs.href}`);
      assert.ok(rowIds.has(chip.attrs.href.slice(1)), `${id}: ${chip.attrs.href} lands on no row`);
    }
    assert.match(text(byId(main, "regulatory-map").inner), /Last reviewed 29 September 2026 General information, not legal advice\./);
  }
});

test("each industry page runs 900–1,400 words, counting tables and FAQ (spec §8.5)", () => {
  for (const id of TASK6) {
    const words = pageWords(built(`/industries/${id}/`));
    assert.ok(words >= 900 && words <= 1400, `${id}: ${words} words`);
  }
});

test("recommended packages lead with launch packages, and on-request ones say so", () => {
  for (const id of TASK6) {
    const cards = elementsWith(byId(mainOf(built(`/industries/${id}/`)), "packages").outer, "data-package-status");
    const statuses = cards.map((c) => c.attrs["data-package-status"]);
    assert.equal(statuses.length, industryData(id).packages.length, `${id}: package cards`);
    assert.deepEqual(statuses, [...statuses].sort((a, b) => Number(a !== "launch") - Number(b !== "launch")), `${id}: launch first`);
    for (const card of cards.filter((c) => c.attrs["data-package-status"] === "on-request")) {
      assert.match(text(card.inner), /On request/, `${id}: an on-request card has no label`);
    }
  }
});

test("each page's FAQPage JSON-LD carries its questions, and no held or keep-off wording renders", () => {
  for (const id of TASK6) {
    const html = built(`/industries/${id}/`);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const faq = blocks.filter((b) => b["@type"] === "FAQPage");
    assert.equal(faq.length, 1, `${id}: FAQPage blocks`);
    assert.deepEqual(faq[0].mainEntity.map((q) => q.name), industryData(id).faq.map((f) => f.q));
    const words = text(mainOf(html));
    for (const s of KEEP_OFF[id]) assert.ok(!words.includes(s), `${id}: "${s}" renders`);
    // §3.4: no "agents", "sprint", "tenancy" or "APRA audit" in Techsider's voice on these pages.
    assert.doesNotMatch(words, /\bagents?\b|\bsprints?\b|\btenancy\b|APRA audit/i, `${id}: §3.4 wording`);
    // §4.4 bars an independent evaluation of a system we built, configured or advised on, not
    // every test of it (acceptance tests are labelled "not independent"), so no FAQ says "never evaluate".
    assert.doesNotMatch(words, /\bnever evaluates?\b/i, `${id}: §4.4 independence wording`);
  }
});

test("the Industries hub is live in the production nav: the group links to its hub", () => {
  const industries = visibleGroups(false).find((g) => g.id === "industries");
  assert.equal(industries.hubHref, "/industries/");
  assert.deepEqual(industries.items.map((i) => i.path), site.industries.map((i) => i.path));
  assert.ok(noJsLinks(false).some((l) => l.href === "/industries/" && l.label === "Industries"));
  assert.equal(site.page("industries").href, "/industries/");
});

test("hub: one h1, then nine cards in nav order, each heading linking to its live industry page", () => {
  const main = mainOf(built("/industries/"));
  const h1 = elements(main, (t) => t.name === "h1");
  assert.equal(h1.length, 1);
  assert.equal(inlineText(h1[0].inner), "Industries.");
  const cards = elementsWith(main, "data-industry-card");
  assert.deepEqual(cards.map((c) => c.attrs["data-industry-card"]), INDUSTRY_IDS);
  for (const [i, card] of cards.entries()) {
    const industry = site.industries[i];
    const heading = elements(card.inner, (t) => t.name === "h3")[0];
    assert.deepEqual(elements(heading.inner, (t) => t.name === "a").map((a) => [a.attrs.href, text(a.inner)]), [[industry.path, industry.shortName]]);
  }
});

test("hub: each card shows its hook, three flagship use cases and three chips that land on regulatory rows", () => {
  const cards = elementsWith(mainOf(built("/industries/")), "data-industry-card");
  for (const card of cards) {
    const id = card.attrs["data-industry-card"];
    const data = industryData(id);
    assert.ok(text(card.inner).includes(data.constraintHook), `${id}: hook`);
    const uses = elements(elements(card.inner, (t) => /industry-card-uses/.test(t.attrs.class ?? ""))[0].inner, (t) => t.name === "li");
    assert.equal(uses.length, 3, `${id}: use cases`);
    data.flagshipUseCases.slice(0, 3).forEach((u, k) => {
      const line = text(uses[k].inner);
      assert.ok(line.includes(u.name), `${id}: use case ${k}`);
      assert.equal(/On request/.test(line), u.status === "on-request", `${id}: "${u.name}" On request label`);
    });
    const chips = elements(byId(card.inner, `industry-${id}-chips`).outer, (t) => t.name === "a");
    assert.equal(chips.length, 3, `${id}: chips`);
    for (const chip of chips) {
      const [path, frag] = chip.attrs.href.split("#");
      assert.equal(path, `/industries/${id}/`);
      const target = resolveDistPath(DIST, chip.attrs.href);
      assert.ok(target && idsIn(readFileSync(target, "utf8")).has(frag), `${id}: ${chip.attrs.href} lands on nothing`);
    }
  }
});

test("hub: the matrix has a row per industry and a column per solution, and every entry links to its solution page", () => {
  const main = mainOf(built("/industries/"));
  const rows = elementsWith(byId(main, "matrix").outer, "data-matrix-row");
  assert.deepEqual(rows.map((r) => r.attrs.id), INDUSTRY_IDS.map((id) => `matrix-${id}`));
  const solutions = Object.fromEntries(SOLUTION_IDS.map((id) => [id, solutionData(id)]));
  for (const [r, row] of rows.entries()) {
    const industryId = INDUSTRY_IDS[r];
    const cells = elements(row.inner, (t) => t.name === "th" || t.name === "td");
    assert.equal(cells.length, 1 + SOLUTION_IDS.length, `${industryId}: cells`);
    let linked = 0;
    SOLUTION_IDS.forEach((solutionId, c) => {
      const entry = solutions[solutionId].matrix[industryId];
      const links = elements(cells[c + 1].inner, (t) => t.name === "a");
      if (entry === undefined) {
        assert.equal(links.length, 0, `${industryId} × ${solutionId}`);
        return;
      }
      linked++;
      const path = site.solutions[c].path;
      assert.deepEqual(links.map((a) => [a.attrs.href, text(a.inner)]), [[path, entry]], `${industryId} × ${solutionId}`);
      assert.ok(resolveDistPath(DIST, path), `${path} is not built`);
    });
    assert.ok(linked >= 1, `${industryId}: no solution names this industry`);
  }
});

test("cross-links (spec §7.4): each solution lists, in nav order, exactly the industries whose page names it, each with a matrix cell", () => {
  const named = (data) => new Set([
    ...data.leadSolutions,
    ...data.flagshipUseCases.map((u) => u.solution),
    ...data.workflow.flatMap((s) => s.useCases.map((u) => u.solution)),
    ...data.packages.map((p) => p.solution),
  ]);
  const industries = Object.fromEntries(INDUSTRY_IDS.map((id) => [id, named(industryData(id))]));
  for (const solutionId of SOLUTION_IDS) {
    const data = solutionData(solutionId);
    const expected = INDUSTRY_IDS.filter((id) => industries[id].has(solutionId));
    assert.deepEqual(data.byIndustry, expected, `${solutionId}: byIndustry`);
    assert.deepEqual(Object.keys(data.matrix).sort(), [...expected].sort(), `${solutionId}: matrix keys`);
    for (const id of TASK6.filter((x) => Object.hasOwn(data.matrix, x))) {
      const words = data.matrix[id].trim().split(/\s+/).length;
      assert.ok(words >= 3 && words <= 6, `${solutionId} × ${id}: "${data.matrix[id]}" is ${words} words (spec §8.2: 3–6)`);
    }
  }
});
