// The industry template (spec §8.5, as amended by go-global §5) as built on its two gallery
// specimens in dist-preview/: /preview/templates/industry/ (single mode) and
// /preview/templates/industry-government/ (jurisdiction mode). Expected values come from
// fixtureIndustryView(), the view the specimens render, so these tests pin the markup, not the
// fixture copy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { blockWords, readPreviewDist, visibleText } from "./helpers.mjs";
import { elements, elementsWith, startTags } from "../scripts/ci/lib.mjs";
import { run as regulatoryKits } from "../scripts/ci/checks/08-regulatory-kits.mjs";
import { industryFindings, regionFindings } from "../scripts/ci/checks/13-anchors-and-regions.mjs";
import { SECTION_TITLE } from "../src/content/schemas.ts";
import {
  AU_BAND_HEADING, AU_BAND_INTRO, NOT_LEGAL_ADVICE, RULES_CLOSING, RULES_HEADING, RULES_SHARED_LABEL, SCENARIO_LABEL,
} from "../src/lib/fixed-copy.ts";
import { REGION_LABEL } from "../src/lib/fixed-copy.ts";
import { industryFixtures } from "../src/fixtures/index.ts";
import { fixtureIndustryView } from "../src/preview/specimens/industry-view.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const read = (kind) => readPreviewDist(`preview/templates/${kind}/index.html`);
const single = fixtureIndustryView("fixture-industry");
const gov = fixtureIndustryView("fixture-government");

const SECTION_IDS = [
  "rules-that-travel", "problem", "workflow", "packages", "scenario", "first-engagement", "australia", "designed-around",
  "commonwealth", "state", "local", "regulatory-map", "faq-au", "insights", "faq", "contact",
];
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>"));
const text = (html) => visibleText(html).trim();
const byId = (html, id) => elements(html, (t) => t.attrs.id === id)[0];
const linksIn = (html) => startTags(html).filter((t) => t.name === "a").map((t) => t.attrs.href);
const headerLabels = (html) => elements(elements(html, (t) => t.name === "thead")[0].inner, (t) => t.name === "th").map((th) => text(th.inner));
// Dates print as the template prints them: "1 September 2026", in UTC.
const formatDate = (d) => d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const PAGES = [["industry", single], ["industry-government", gov]];
/** pageWords' rule over a plain string: whitespace-separated tokens holding a letter or a digit. */
const wordsOf = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const withClass = (html, cls) => elements(html, (t) => (t.attrs.class ?? "").split(/\s+/).includes(cls));
const faqQuestions = (html) => withClass(html, "faq-q").map((q) => text(q.inner));
const faqPages = (html) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).filter((b) => b["@type"] === "FAQPage");

test("each industry specimen renders one template root, one h1 (the promise) and headings that never skip a level", () => {
  for (const [kind, view] of PAGES) {
    const main = mainOf(read(kind));
    assert.deepEqual(elementsWith(main, "data-template").map((r) => r.attrs["data-template"]), ["industry"], kind);
    const levels = startTags(main).filter((t) => /^h[1-6]$/.test(t.name)).map((t) => Number(t.name[1]));
    assert.equal(levels[0], 1, `${kind}: the first heading is not the h1`);
    assert.equal(levels.filter((l) => l === 1).length, 1, `${kind}: more than one h1`);
    levels.forEach((l, i) => assert.ok(i === 0 || l <= levels[i - 1] + 1, `${kind}: h${levels[i - 1]} is followed by h${l}`));
    assert.equal(text(elements(main, (t) => t.name === "h1")[0].inner), view.promise);
  }
});

test("the blocks come in go-global §5.1 order: Rules that travel first, the Australian blocks inside the band, Government's per jurisdiction", () => {
  const order = (html) => startTags(mainOf(html)).map((t) => t.attrs.id).filter((id) => SECTION_IDS.includes(id));
  const head = ["rules-that-travel", "problem", "workflow", "packages", "scenario", "first-engagement", "australia", "designed-around"];
  const tail = (view) => [...(view.faqAu.length ? ["faq-au"] : []), ...(view.insights.length ? ["insights"] : []), "faq", "contact"];
  assert.ok(single.faqAu.length > 0 && gov.faqAu.length > 0, "both specimens render #faq-au");
  assert.deepEqual(order(read("industry")), [...head, "regulatory-map", ...tail(single)]);
  assert.deepEqual(order(read("industry-government")), [...head, "commonwealth", "state", "local", ...tail(gov)]);
});

test("ids are unique on both industry pages", () => {
  for (const [kind] of PAGES) {
    const ids = startTags(read(kind)).map((t) => t.attrs.id).filter(Boolean);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    assert.deepEqual(dupes, [], `${kind}: duplicate ids`);
  }
});

test("hero: the breadcrumb, the industry eyebrow, the view's hero sub (none on the fixtures), never the constraint set, and both CTAs", () => {
  for (const [kind, view] of PAGES) {
    const hero = elementsWith(read(kind), "data-page-hero")[0];
    assert.ok(hero, `${kind}: no [data-page-hero]`);
    const t = text(hero.inner);
    assert.match(t, /\bindustry\b/, `${kind}: no [industry] eyebrow`);
    // The fixtures' short names have no AUTOMATION line, so heroSub is null and no sub renders (go-global §5.1).
    assert.equal(view.heroSub, null, kind);
    assert.deepEqual(elements(hero.inner, (tag) => (tag.attrs.class ?? "").split(/\s+/).includes("page-hero-sub")), [], `${kind}: a hero sub without a heroSub`);
    assert.ok(!t.includes(industryFixtures[view.id].constraintSet), `${kind}: the constraint set renders`);
    assert.match(hero.inner, /aria-label="Breadcrumb"/);
    const links = elements(hero.inner, (tag) => tag.name === "a").map((a) => [text(a.inner), a.attrs.href]);
    for (const cta of [view.ctas.primary, view.ctas.secondary]) {
      assert.ok(links.some(([label, href]) => label === cta.label && href === cta.href), `${kind}: no CTA "${cta.label}" → ${cta.href}`);
    }
    assert.equal(view.ctas.secondary.href, "#scenario");
  }
});

test("single mode: Designed around chips link to rows of the regulatory map below, and Works alongside names each method", () => {
  const html = read("industry");
  const designed = byId(html, "designed-around");
  assert.deepEqual(linksIn(designed.inner), single.single.chips.map((c) => c.href));
  assert.ok(single.single.chips.some((c) => /\S{60}/.test(c.label)), "no long chip label on the single industry page (Review Focus 3)");
  const t = text(designed.inner);
  for (const w of single.single.works) assert.ok(t.includes(w.system) && t.includes(w.methodLabel), `${w.system}: ${w.methodLabel}`);
  const map = byId(html, "regulatory-map");
  const rows = elementsWith(map.inner, "data-regulatory-row");
  assert.deepEqual(rows.map((r) => r.attrs.id), single.single.rows.map((r) => r.anchor));
  for (const c of single.single.chips) assert.ok(rows.some((r) => `#${r.attrs.id}` === c.href), `${c.href} lands on no row`);
  assert.equal(elementsWith(html, "data-regulatory-row").length, rows.length, "a regulatory row outside #regulatory-map");
  assert.equal(elementsWith(html, "data-jurisdiction-section").length, 0);
});

// Review finding T7-F4: the "Designed around" heading was followed by a chip-row label with the same
// text, so a screen reader announced it twice. The heading now names the obligation chips' list,
// and "Works alongside" keeps its own visible label.
test("Designed around is said once: its heading names the obligation chips, and Works alongside keeps its label", () => {
  const html = read("industry");
  const blocks = [
    [byId(html, "designed-around"), "designed-around-obligations", "designed-around-heading", "designed-around-systems"],
    ...gov.sections.map((s) => [byId(read("industry-government"), `${s.id}-designed-around`), `${s.id}-obligations`, `${s.id}-designed-around-heading`, `${s.id}-systems`]),
  ];
  for (const [block, rowId, headingId, systemsId] of blocks) {
    assert.equal((text(block.inner).match(/Designed around/g) ?? []).length, 1, `#${block.attrs.id}: "Designed around" is said more than once`);
    assert.equal(text(byId(block.inner, headingId).inner), "Designed around");
    const row = byId(block.inner, rowId);
    assert.deepEqual(elements(row.inner, (t) => t.name === "p").length, 0, `#${rowId} has a visible label`);
    const [list] = elements(row.inner, (t) => t.name === "ul");
    assert.equal(list.attrs["aria-labelledby"], headingId, `#${rowId}'s list is not named by the heading`);
    assert.ok(elements(list.inner, (t) => t.name === "li").length >= 4, `#${rowId} lost its chips`);
    const systems = byId(block.inner, systemsId);
    assert.equal(text(byId(systems.inner, `${systemsId}-label`).inner), "Works alongside");
    assert.equal(elements(systems.inner, (t) => t.name === "ul")[0].attrs["aria-labelledby"], `${systemsId}-label`);
  }
});

test("single mode: the regulatory map's columns, source links, last-reviewed date and not-legal-advice line", () => {
  const map = byId(read("industry"), "regulatory-map");
  assert.deepEqual(headerLabels(map.inner), ["Obligation", "What it means for an AI system", "How we design for it", "Evidence you get", "Source"]);
  for (const r of single.single.rows) {
    const row = byId(map.inner, r.anchor);
    const t = text(row.inner);
    for (const field of [r.obligation, r.meaning, r.design, r.evidence]) assert.ok(t.includes(field), `${r.anchor}: no "${field}"`);
    const source = elements(row.inner, (tag) => tag.name === "a" && tag.attrs.href === r.source);
    assert.equal(source.length, 1, `${r.anchor}: no link to ${r.source}`);
    assert.equal(text(source[0].inner), `Source, as at ${formatDate(r.asAt)}`);
  }
  assert.ok(text(map.inner).includes(`Last reviewed ${formatDate(single.single.lastReviewed)}`));
  assert.deepEqual(elementsWith(map.inner, "data-notice").map((n) => text(n.inner)), [NOT_LEGAL_ADVICE]);
});

test("jurisdiction mode: #designed-around jumps to Commonwealth, State and Local sections, each with its own chips, packages and map", () => {
  const html = read("industry-government");
  assert.deepEqual(gov.sections.map((s) => s.id), ["commonwealth", "state", "local"]);
  assert.deepEqual(linksIn(byId(html, "designed-around").inner), ["#commonwealth", "#state", "#local"]);
  const sections = elementsWith(html, "data-jurisdiction-section");
  assert.deepEqual(sections.map((s) => [s.name, s.attrs.id, s.attrs["data-jurisdiction-section"]]), gov.sections.map((s) => ["section", s.id, s.id]));
  for (const [i, s] of gov.sections.entries()) {
    const el = sections[i];
    // One level lower inside the Australia band (go-global §5.4): the section is h3, its sub-blocks h4.
    assert.equal(text(elements(el.inner, (t) => t.name === "h3")[0].inner), SECTION_TITLE[s.id]);
    assert.equal(elements(el.inner, (t) => t.name === "h2").length, 0, `#${s.id} holds an h2`);
    for (const sub of ["designed-around", "packages", "regulatory-map"]) {
      const block = byId(el.inner, `${s.id}-${sub}`);
      assert.ok(block, `no #${s.id}-${sub} inside #${s.id}`);
      assert.equal(elements(block.inner, (t) => t.name === "h4").length, 1, `#${s.id}-${sub} has no h4`);
    }
    const titles = elements(byId(el.inner, `${s.id}-packages`).inner, (t) => /^h[1-6]$/.test(t.name)).map((h) => h.name);
    assert.deepEqual(titles, ["h4", ...s.packages.map(() => "h5")], `#${s.id}-packages: an h4, then h5 card titles`);
    const chips = linksIn(byId(el.inner, `${s.id}-designed-around`).inner);
    assert.deepEqual(chips, s.chips.map((c) => c.href));
    assert.ok(chips.length >= 4 && chips.length <= 6, `${s.id}: ${chips.length} chips`);
    const rows = elementsWith(el.inner, "data-regulatory-row").map((r) => r.attrs.id);
    assert.deepEqual(rows, s.rows.map((r) => r.anchor));
    for (const href of chips) assert.ok(rows.includes(href.slice(1)), `${s.id}: ${href} lands outside its own section`);
    const cards = elementsWith(byId(el.inner, `${s.id}-packages`).inner, "data-package-status");
    assert.deepEqual(cards.map((c) => c.attrs["data-package-status"]), s.packages.map((p) => p.status));
    assert.ok(cards.length >= 3 && cards.length <= 4, `${s.id}: ${cards.length} packages`);
    const map = byId(el.inner, `${s.id}-regulatory-map`);
    assert.equal(headerLabels(map.inner).includes("Applies to"), s.id === "state", `${s.id}: Applies to column`);
    assert.ok(text(map.inner).includes(`Last reviewed ${formatDate(s.lastReviewed)}`));
    assert.deepEqual(elementsWith(map.inner, "data-notice").map((n) => text(n.inner)), [NOT_LEGAL_ADVICE]);
  }
  assert.equal(byId(html, "regulatory-map"), undefined, "a page-wide #regulatory-map on the Government page");
});

test("jurisdiction mode: a row shared by two sections renders in both, under two anchors", () => {
  const html = read("industry-government");
  const ids = elementsWith(html, "data-regulatory-row").map((r) => r.attrs.id);
  assert.ok(ids.includes("reg-commonwealth-fixture-gov-row-5"));
  assert.ok(ids.includes("reg-state-fixture-gov-row-5"));
  assert.equal(new Set(ids).size, ids.length);
  const shared = byId(byId(html, "state").inner, "reg-state-fixture-gov-row-5");
  assert.ok(text(shared.inner).includes("NSW"), "the state copy of the shared row names the state it applies to");
});

test("recommended packages: launch cards first, never a package tab, each linked to its solution tab or to contact", () => {
  const packages = byId(read("industry"), "packages");
  assert.doesNotMatch(packages.outer, /data-package-tab/);
  const cards = elementsWith(packages.inner, "data-package-status");
  const statuses = cards.map((c) => c.attrs["data-package-status"]);
  assert.deepEqual(statuses, single.single.packages.map((p) => p.status));
  assert.ok(statuses.includes("launch") && statuses.includes("on-request"), "the fixture exercises both statuses");
  assert.ok(statuses.lastIndexOf("launch") < statuses.indexOf("on-request"), "an on-request card before a launch card");
  for (const [i, p] of single.single.packages.entries()) {
    assert.ok(linksIn(cards[i].inner).includes(p.href), `${p.id}: no link to ${p.href}`);
    const t = text(cards[i].inner);
    assert.ok(t.includes(p.summary) && t.includes(`${p.solution.number} ${p.solution.shortName}`), p.id);
    assert.equal(/\bOn request\b/.test(t), p.status === "on-request", `${p.id}: On request label`);
  }
});

test("the page-wide half of block 5: lead solutions, platform-first, what we don't do and the demo link", () => {
  for (const [kind, view] of PAGES) {
    const packages = byId(read(kind), "packages");
    const t = text(packages.inner);
    assert.ok(t.startsWith(`What we build for ${view.shortName.toLowerCase()}`), `${kind}: ${t.slice(0, 60)}`);
    for (const s of view.leadSolutions) assert.ok(t.includes(`${s.number} ${s.shortName}`), `${kind}: lead solution ${s.shortName}`);
    if (view.platformFirst) assert.ok(t.includes("Use your platform's AI first") && t.includes(view.platformFirst), kind);
    assert.ok(t.includes("What we don't do"), kind);
    for (const item of view.dontDo) assert.ok(t.includes(item), `${kind}: ${item}`);
    const demo = elements(packages.inner, (tag) => tag.name === "a").filter((a) => text(a.inner) === "Try the demo");
    assert.deepEqual(demo.map((a) => a.attrs.href), view.demoHref ? [view.demoHref] : [], kind);
    if (kind === "industry-government") assert.equal(elementsWith(packages.inner, "data-package-status").length, 0, "Government lists its packages per section");
  }
});

test("the problem: from, then to, then the independent source linked with its as-at date", () => {
  const problem = byId(read("industry"), "problem");
  const t = text(problem.inner);
  assert.ok(t.indexOf(single.problem.from) > -1 && t.indexOf(single.problem.from) < t.indexOf(single.problem.to));
  const source = elements(problem.inner, (tag) => tag.name === "a" && tag.attrs.href === single.problem.source.url);
  assert.equal(source.length, 1);
  assert.equal(text(source[0].inner), `${single.problem.source.label}, as at ${formatDate(single.problem.source.asAt)}`);
});

test("the workflow: one tab group of the stages, each use case tagged with its solution, then the MockPanel", () => {
  const workflow = byId(read("industry"), "workflow");
  const groups = elementsWith(workflow.inner, "data-tabs");
  assert.deepEqual(groups.map((g) => [g.attrs.id, g.attrs["data-tabs-label"]]), [[`${single.id}-workflow`, "How the work flows"]]);
  const panels = elementsWith(workflow.inner, "data-tab-panel");
  assert.deepEqual(panels.map((p) => [p.attrs.id, p.attrs["data-tab-label"]]), single.workflow.map((s) => [s.id, s.stage]));
  for (const [i, stage] of single.workflow.entries()) {
    const t = text(panels[i].inner);
    for (const u of stage.useCases) {
      assert.ok(t.includes(u.name) && t.includes(`${u.solution.number} ${u.solution.shortName}`), u.name);
      if (u.note) assert.ok(t.includes(u.note), u.note);
    }
    assert.equal((t.match(/\bOn request\b/g) ?? []).length, stage.useCases.filter((u) => u.onRequest).length, stage.id);
  }
  assert.ok(single.workflow.some((s) => s.useCases.some((u) => u.onRequest)), "the fixture has an on-request use case");
  assert.ok(workflow.inner.indexOf("data-mock-panel") > workflow.inner.lastIndexOf("data-tab-panel"), "the MockPanel follows the tabs");
  assert.equal(elementsWith(read("industry"), "data-mock-panel").length, 1, "one MockPanel per page");
});

test("go-global §3.3: an Australia-only package's card opens with the Australia label, and no other card has one", () => {
  for (const [kind, view] of PAGES) {
    const html = mainOf(read(kind));
    const cards = elements(html, (t) => t.name === "article" && (t.attrs.class ?? "").split(/\s+/).includes("ind-card"));
    const packages = view.single ? view.single.packages : view.sections.flatMap((s) => s.packages);
    assert.equal(cards.length, packages.length, kind);
    packages.forEach((p, i) => {
      assert.equal(cards[i].attrs["data-region"], p.region ?? undefined, `${kind}: ${p.id} data-region`);
      assert.deepEqual(elementsWith(cards[i].inner, "data-region-label").map((l) => text(l.inner)), p.region ? [REGION_LABEL] : [], `${kind}: ${p.id} label`);
    });
    assert.ok(packages.some((p) => p.region === "au") && packages.some((p) => p.region === null), `${kind}: the fixtures label some cards and not others`);
  }
});

test("the scenario: a carbon section marked illustrative, opening with the fixed label, then the steps and a TracePanel", () => {
  for (const [kind, view] of PAGES) {
    const scenario = byId(read(kind), "scenario");
    assert.equal(scenario.name, "section");
    assert.equal(scenario.attrs["data-provenance"], "illustrative");
    assert.doesNotMatch(scenario.attrs.class ?? "", /surface-bone/, `${kind}: the scenario is not carbon`);
    assert.match(scenario.inner, new RegExp(`^\\s*<p\\b[^>]*>${escapeRe(SCENARIO_LABEL)}</p>`), `${kind}: the label is not the first child`);
    const t = text(scenario.inner);
    const steps = [view.scenario.title, "Problem", view.scenario.problem, "Approach", view.scenario.approach, "How we'd measure", ...view.scenario.measure, "What ships first", view.scenario.shipsFirst];
    const at = steps.map((s) => t.indexOf(s));
    assert.ok(at.every((p, i) => p > -1 && (i === 0 || p > at[i - 1])), `${kind}: scenario steps out of order: ${at}`);
    assert.equal(elementsWith(scenario.inner, "data-trace-panel").length, 1);
  }
});

test("a first engagement, related insights, one FAQ and the closing prompt", () => {
  for (const [kind, view] of PAGES) {
    const html = read(kind);
    assert.equal(text(byId(html, "first-engagement-heading").inner), `A first engagement in ${view.shortName.toLowerCase()}`, `${kind}: first-engagement heading`);
    const engagement = text(byId(html, "first-engagement").inner);
    for (const s of ["What we need from you", ...view.firstEngagement.needFromYou, "What you get", ...view.firstEngagement.youGet, "The exit ramp", view.firstEngagement.exitRamp]) {
      assert.ok(engagement.includes(s), `${kind}: ${s}`);
    }
    const insights = byId(html, "insights");
    if (view.insights.length === 0) assert.equal(insights, undefined, `${kind}: an empty #insights`);
    else assert.deepEqual(elementsWith(insights.inner, "data-insight-card").length, view.insights.length);
    assert.equal((html.match(/"@type":"FAQPage"/g) ?? []).length, 1, `${kind}: FAQPage JSON-LD`);
    const contact = byId(html, "contact");
    const prompt = elementsWith(contact.inner, "data-prompt-block");
    assert.equal(prompt.length, 1);
    assert.ok(text(prompt[0].inner).includes("Let’s discuss your workflow."));
    assert.deepEqual(elements(prompt[0].inner, (t) => t.name === "a").map((a) => [text(a.inner), a.attrs.href]), [[view.closing.label, view.closing.href]]);
  }
});

// CI check 08's built-HTML part (blueprint Task 7) against the real Government specimen: it
// passes as built, and fails once the State section's rows lose their marker.
test("check 08 reads the Government specimen: every jurisdiction section holds rows, and one that loses them fails", async () => {
  const html = read("industry-government");
  assert.equal((html.match(/<section\b[^>]*\bdata-jurisdiction-section="/g) ?? []).length, gov.sections.length);
  const built = await regulatoryKits({ root: ROOT, dist: join(ROOT, "dist-preview"), mode: "gate" });
  assert.deepEqual([...built.errors, ...built.warnings].filter((f) => f.includes("jurisdiction section")), []);
  const tmp = mkdtempSync(join(tmpdir(), "industry-08-"));
  try {
    const state = elements(html, (t) => t.attrs.id === "state")[0].outer;
    mkdirSync(join(tmp, "preview"));
    writeFileSync(join(tmp, "preview/index.html"), html.replace(state, state.replace(/\sdata-regulatory-row(?:="[^"]*")?/g, "")));
    const broken = await regulatoryKits({ root: tmp, dist: tmp, mode: "gate" });
    assert.deepEqual(broken.errors, ['dist/preview/index.html: jurisdiction section "state" has no regulatory row ([data-regulatory-row])']);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ---------- go-global §5: Rules that travel, the Australia band, the FAQ split, budgets, check 13 ----------

test("Rules that travel: the heading, the paragraph, the Everywhere row, the unlabelled sector row and the closing line once (go-global §5.2)", () => {
  for (const [kind, view] of PAGES) {
    const block = byId(read(kind), "rules-that-travel");
    assert.equal(block.name, "section", kind);
    assert.equal(text(byId(block.inner, "rules-that-travel-heading").inner), RULES_HEADING, kind);
    assert.deepEqual(elementsWith(block.inner, "data-rules-paragraph").map((p) => text(p.inner)), [view.rules.paragraph], kind);
    const rows = elementsWith(block.inner, "data-anchor-row");
    assert.deepEqual(rows.map((r) => r.attrs["data-anchor-row"]), ["shared", "sector"], kind);
    const [shared, sector] = rows;
    assert.equal(text(byId(shared.inner, "rules-that-travel-shared-label").inner), RULES_SHARED_LABEL, kind);
    assert.equal(elements(shared.inner, (t) => t.name === "ul")[0].attrs["aria-labelledby"], "rules-that-travel-shared-label", kind);
    assert.equal(elements(sector.inner, (t) => t.name === "p").length, 0, `${kind}: the sector row has a visible label`);
    for (const [row, chips] of [[shared, view.rules.shared], [sector, view.rules.sector]]) {
      const links = elementsWith(row.inner, "data-anchor-id");
      assert.deepEqual(
        links.map((a) => [a.name, a.attrs["data-anchor-id"], a.attrs["data-anchor-scope"], a.attrs.href]),
        chips.map((c) => ["a", c.id, c.scope, c.href]),
        kind,
      );
      links.forEach((a, i) => {
        assert.deepEqual(elementsWith(a.inner, "data-anchor-name").map((n) => text(n.inner)), [chips[i].name]);
        assert.deepEqual(elementsWith(a.inner, "data-anchor-label").map((n) => text(n.inner)), [chips[i].label]);
      });
    }
    assert.deepEqual(elementsWith(read(kind), "data-rules-closing").map((p) => text(p.inner)), [RULES_CLOSING], `${kind}: the closing line, once per page`);
  }
});

test("the Australia band: one bone section marked data-region=au, its h2 and intro line, then the Australian blocks one level lower (go-global §5.4)", () => {
  for (const [kind, view] of PAGES) {
    const html = read(kind);
    const band = byId(html, "australia");
    assert.equal(band.name, "section", kind);
    assert.equal(band.attrs["data-region"], "au", kind);
    assert.equal(band.attrs["aria-labelledby"], "australia-heading", kind);
    assert.match(band.attrs.class, /\bsurface-bone\b/, kind);
    const heading = byId(band.inner, "australia-heading");
    assert.deepEqual([heading.name, text(heading.inner)], ["h2", AU_BAND_HEADING], kind);
    assert.deepEqual(withClass(band.inner, "section-lede").map((p) => text(p.inner)), [AU_BAND_INTRO], kind);
    // One band. Part 5 marks other Australia-only items data-region="au" too (package cards, use
    // cases, the scenario: contract §5), so count the band by its id, not by the attribute.
    assert.equal(elements(html, (t) => t.attrs.id === "australia").length, 1, `${kind}: one Australia band`);
    // Every Australian block, row and jurisdiction section sits inside the band.
    const inside = view.single ? ["designed-around", "regulatory-map"] : ["designed-around", "commonwealth", "state", "local"];
    for (const id of [...inside, ...(view.faqAu.length ? ["faq-au"] : [])]) assert.ok(byId(band.inner, id), `${kind}: #${id} is outside the band`);
    assert.equal(elementsWith(band.inner, "data-regulatory-row").length, elementsWith(html, "data-regulatory-row").length, `${kind}: a regulatory row outside the band`);
    assert.equal(elementsWith(band.inner, "data-jurisdiction-section").length, elementsWith(html, "data-jurisdiction-section").length, kind);
    for (const id of ["designed-around", ...(view.single ? ["regulatory-map"] : [])]) {
      assert.equal(elements(byId(band.inner, id).inner, (t) => /^h[1-6]$/.test(t.name))[0].name, "h3", `${kind}: #${id} is not an h3 block`);
    }
    for (const id of ["rules-that-travel", "problem", "workflow", "packages", "scenario", "first-engagement", "faq"]) {
      assert.equal(byId(band.inner, id), undefined, `${kind}: #${id} is inside the band`);
    }
  }
});

test("FAQs: #faq shows the untagged questions, #faq-au in the band the region au ones, and one FAQPage carries every question in data order (go-global §5.6)", () => {
  for (const [kind, view] of PAGES) {
    const html = read(kind);
    const faqAu = byId(html, "faq-au");
    assert.equal(text(byId(faqAu.inner, "faq-au-heading").inner), "Questions", kind);
    assert.equal(byId(faqAu.inner, "faq-au-heading").name, "h3", kind);
    assert.deepEqual(faqQuestions(faqAu.inner), view.faqAu.map((f) => f.q), kind);
    assert.deepEqual(faqQuestions(byId(html, "faq").inner), view.faqNeutral.map((f) => f.q), kind);
    assert.equal(faqAu.inner.includes("application/ld+json"), false, `${kind}: #faq-au emits JSON-LD`);
    const pages = faqPages(html);
    assert.equal(pages.length, 1, `${kind}: FAQPage blocks`);
    assert.deepEqual(pages[0].mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), view.faq.map((f) => [f.q, f.a]), kind);
  }
});

test("word budgets: Rules that travel at most 280 words and its paragraph at most 140; the band adds at most 20 (go-global §5.2, §5.4)", () => {
  for (const [kind, view] of PAGES) {
    const html = read(kind);
    assert.ok(blockWords(html, "rules-that-travel") <= 280, `${kind}: Rules that travel is ${blockWords(html, "rules-that-travel")} words`);
    assert.ok(wordsOf(view.rules.paragraph) <= 140, `${kind}: the paragraph is ${wordsOf(view.rules.paragraph)} words`);
    const blocks = view.single ? ["designed-around", "regulatory-map"] : ["designed-around", ...view.sections.map((s) => s.id)];
    const moved = blocks.reduce((n, id) => n + blockWords(html, id), 0) + view.faqAu.reduce((n, f) => n + wordsOf(`${f.q} ${f.a}`), 0);
    const own = blockWords(html, "australia") - moved;
    assert.equal(own, wordsOf(`${AU_BAND_HEADING} ${AU_BAND_INTRO} Questions`), `${kind}: the band's own words`);
    assert.ok(own <= 20, `${kind}: the band adds ${own} words`);
  }
});

test("check 13's structure rule passes on both specimens, and fails once the band loses data-region or Rules that travel moves below it", () => {
  for (const [kind] of PAGES) {
    const html = read(kind);
    const file = `dist-preview/preview/templates/${kind}/index.html`;
    assert.deepEqual([...regionFindings(html, file), ...industryFindings(html, file)], [], kind);
    const unmarked = html.replace(/(<section id="australia"[^>]*?) data-region="au"/, "$1");
    assert.notEqual(unmarked, html, `${kind}: the band's data-region attribute wasn't found`);
    assert.ok(regionFindings(unmarked, file).length > 0, `${kind}: rows outside the band pass rule 1a`);
    assert.ok(industryFindings(unmarked, file).length > 0, `${kind}: an unmarked band passes rule 1b`);
    const rules = byId(html, "rules-that-travel").outer;
    const moved = html.replace(rules, "").replace("</main>", `${rules}</main>`);
    assert.ok(industryFindings(moved, file).length > 0, `${kind}: Rules that travel below the band passes rule 1b`);
  }
});
