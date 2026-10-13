// go-global §5 on the nine industry pages and the Industries hub, as the production build renders
// them (dist/): "Rules that travel" first, the Australian blocks inside the [data-region="au"]
// band, the band's heading and contents, the FAQ split with its one FAQPage, the block word budgets
// (§5.2, §5.4) and the hub's labelled chip rows. Expected values come from the industry YAMLs and
// the anchor files, which every industry has (the route fails the build without one).
// Run `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { blockWords, readDist, visibleText } from "./helpers.mjs";
import { S1_BANNED, bannedRegExp } from "./support/s1-scan.mjs";
import { elements, elementsWith, loadYaml, normalizeQuotes, readJson, startTags } from "../scripts/ci/lib.mjs";
import { industryFindings, regionFindings } from "../scripts/ci/checks/13-anchors-and-regions.mjs";
import { anchorFile, makeIndustrySchema, plainRef } from "../src/content/schemas.ts";
import { anchorChipLabel } from "../src/lib/anchors.ts";
import {
  AU_BAND_HEADING, AU_BAND_INTRO, REGION_LABEL, RULES_CLOSING, RULES_HEADING, RULES_SHARED_LABEL,
} from "../src/lib/fixed-copy.ts";
import { AUTOMATION } from "../src/lib/marketing.ts";
import { siteContext } from "../src/lib/site.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const site = siteContext(false);
const IDS = site.industries.map((i) => i.id);
const industrySchema = makeIndustrySchema(plainRef);
const industry = (id) => industrySchema.parse(loadYaml(join(ROOT, `src/content/industries/${id}.yaml`)));
/** An anchors file, parsed as the route parses it: shared.json, or an industry's own. */
const anchorsOf = (name) => anchorFile.parse(readJson(join(ROOT, `src/data/anchors/${name}.json`)));
const page = (id) => readDist(`industries/${id}/index.html`);
const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>"));
const text = (html) => visibleText(html).trim();
const byId = (html, id) => elements(html, (t) => t.attrs.id === id)[0];
const withClass = (html, cls) => elements(html, (t) => (t.attrs.class ?? "").split(/\s+/).includes(cls));
/** pageWords' rule over a plain string: whitespace-separated tokens holding a letter or a digit. */
const wordsOf = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const faqQuestions = (html) => withClass(html, "faq-q").map((q) => text(q.inner));
const faqPages = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).filter((b) => b["@type"] === "FAQPage");
/** The blocks the band holds in each mode, besides #faq-au. */
const bandBlocks = (data) => (data.jurisdictions ? ["designed-around", "commonwealth", "state", "local"] : ["designed-around", "regulatory-map"]);
const ORDER = [
  "rules-that-travel", "problem", "workflow", "packages", "scenario", "first-engagement", "australia", "designed-around",
  "commonwealth", "state", "local", "regulatory-map", "faq-au", "insights", "faq", "contact",
];

test("each industry page's blocks come in go-global §5.1 order, Rules that travel first and the Australian blocks inside the band", () => {
  for (const id of IDS) {
    const data = industry(id);
    const found = startTags(mainOf(page(id))).map((t) => t.attrs.id).filter((x) => ORDER.includes(x));
    const expected = [
      "rules-that-travel", "problem", "workflow", "packages", "scenario", "first-engagement", "australia", ...bandBlocks(data),
      ...(data.faq.some((f) => f.region === "au") ? ["faq-au"] : []), ...(found.includes("insights") ? ["insights"] : []), "faq", "contact",
    ];
    assert.deepEqual(found, expected, id);
  }
});

test("the Australia band: data-region au, its h2 and intro line, every regulatory row and jurisdiction section inside it, and check 13's rule 1 passes (go-global §5.4, §10.2)", () => {
  for (const id of IDS) {
    const html = page(id);
    const band = byId(html, "australia");
    assert.equal(band.name, "section", id);
    assert.equal(band.attrs["data-region"], "au", id);
    const heading = byId(band.inner, "australia-heading");
    assert.deepEqual([heading.name, text(heading.inner)], ["h2", AU_BAND_HEADING], id);
    assert.deepEqual(withClass(band.inner, "section-lede").map((p) => text(p.inner)), [AU_BAND_INTRO], id);
    for (const block of bandBlocks(industry(id))) assert.ok(byId(band.inner, block), `${id}: #${block} is outside the band`);
    const rows = elementsWith(html, "data-regulatory-row").length;
    assert.ok(rows >= 4, `${id}: ${rows} regulatory rows`);
    assert.equal(elementsWith(band.inner, "data-regulatory-row").length, rows, `${id}: a regulatory row outside the band`);
    assert.equal(elementsWith(band.inner, "data-jurisdiction-section").length, elementsWith(html, "data-jurisdiction-section").length, id);
    const file = `dist/industries/${id}/index.html`;
    assert.deepEqual([...regionFindings(html, file), ...industryFindings(html, file)], [], id);
  }
});

test("the hero sub is the industry's AUTOMATION line, and the constraint set renders nowhere in the hero (go-global §5.1)", () => {
  for (const id of IDS) {
    const hero = elementsWith(page(id), "data-page-hero")[0];
    const shortName = site.industries.find((i) => i.id === id).shortName;
    assert.ok(AUTOMATION.industries[shortName], `${id}: no AUTOMATION line`);
    assert.deepEqual(withClass(hero.inner, "page-hero-sub").map((p) => text(p.inner)), [AUTOMATION.industries[shortName]], id);
    assert.ok(!text(hero.inner).includes(industry(id).constraintSet), `${id}: the constraint set renders in the hero`);
  }
});

test("Rules that travel: the heading, the industry's paragraph, its anchor files' chips in order, each linked to its source, and the closing line once (go-global §5.2)", () => {
  const shared = new Map(anchorsOf("shared").anchors.map((a) => [a.id, a]));
  for (const id of IDS) {
    const html = page(id);
    const data = industry(id);
    const anchors = anchorsOf(id);
    const block = byId(html, "rules-that-travel");
    assert.equal(text(byId(block.inner, "rules-that-travel-heading").inner), RULES_HEADING, id);
    assert.deepEqual(elementsWith(block.inner, "data-rules-paragraph").map((p) => text(p.inner)), [data.rulesThatTravel], id);
    assert.deepEqual(elementsWith(block.inner, "data-anchor-row").map((r) => r.attrs["data-anchor-row"]), ["shared", "sector"], `${id}: the chip rows`);
    const expected = [
      ...anchors.shared.map((sid) => [shared.get(sid), "shared"]),
      ...anchors.anchors.filter((a) => a.featured).map((a) => [a, "sector"]),
    ];
    const chips = elementsWith(block.inner, "data-anchor-id").map((a) => [
      a.attrs["data-anchor-id"], a.attrs["data-anchor-scope"], a.attrs.href,
      text(elementsWith(a.inner, "data-anchor-name")[0].inner), text(elementsWith(a.inner, "data-anchor-label")[0].inner),
    ]);
    assert.deepEqual(chips, expected.map(([a, scope]) => [a.id, scope, a.source, a.name, anchorChipLabel(a)]), id);
    const labels = elementsWith(block.inner, "data-anchor-row", "shared").map((r) => text(elements(r.inner, (t) => t.name === "p")[0].inner));
    assert.deepEqual(labels, [RULES_SHARED_LABEL], id);
    assert.deepEqual(elementsWith(html, "data-rules-closing").map((p) => text(p.inner)), [RULES_CLOSING], `${id}: the closing line, once`);
  }
});

test("FAQs: #faq shows the untagged questions, #faq-au in the band the region au ones, and one FAQPage carries every question in data order (go-global §5.6)", () => {
  for (const id of IDS) {
    const html = page(id);
    const data = industry(id);
    const au = data.faq.filter((f) => f.region === "au");
    assert.ok(au.length < data.faq.length, `${id}: no untagged question for #faq`);
    assert.deepEqual(faqQuestions(byId(html, "faq").inner), data.faq.filter((f) => f.region === undefined).map((f) => f.q), id);
    const faqAu = byId(html, "faq-au");
    if (au.length === 0) {
      assert.equal(faqAu, undefined, `${id}: an empty #faq-au`);
    } else {
      assert.ok(byId(byId(html, "australia").inner, "faq-au"), `${id}: #faq-au is outside the band`);
      assert.deepEqual(faqQuestions(faqAu.inner), au.map((f) => f.q), id);
    }
    const pages = faqPages(html);
    assert.equal(pages.length, 1, `${id}: FAQPage blocks`);
    assert.deepEqual(pages[0].mainEntity.map((q) => q.name), data.faq.map((f) => f.q), id);
  }
});

test("word budgets: Rules that travel at most 280 words, its paragraph at most 140, and the band's own words at most 20 (go-global §5.2, §5.4)", () => {
  for (const id of IDS) {
    const html = page(id);
    const data = industry(id);
    const rules = blockWords(html, "rules-that-travel");
    assert.ok(rules <= 280, `${id}: Rules that travel is ${rules} words`);
    assert.ok(wordsOf(data.rulesThatTravel) <= 140, `${id}: the paragraph is ${wordsOf(data.rulesThatTravel)} words`);
    const moved = bandBlocks(data).reduce((n, b) => n + blockWords(html, b), 0)
      + data.faq.filter((f) => f.region === "au").reduce((n, f) => n + wordsOf(`${f.q} ${f.a}`), 0);
    const own = blockWords(html, "australia") - moved;
    assert.ok(own <= 20, `${id}: the band adds ${own} words`);
  }
});

test("hub: each card's Designed around chips sit in one [data-region=au] wrapper that opens with the Australia label (go-global §5.1)", () => {
  const cards = elementsWith(mainOf(readDist("industries/index.html")), "data-industry-card");
  assert.deepEqual(cards.map((c) => c.attrs["data-industry-card"]), IDS);
  for (const card of cards) {
    const id = card.attrs["data-industry-card"];
    // Only the wrapper that holds the chip row: Part 5 marks Australia-only flagship use cases in the
    // same card <li data-region="au"> (contract §5 rule 5), and those don't count here.
    const wrappers = elementsWith(card.inner, "data-region", "au").filter((w) => byId(w.inner, `industry-${id}-chips`));
    assert.equal(wrappers.length, 1, `${id}: [data-region=au] wrappers around the chip row`);
    const [wrapper] = wrappers;
    assert.ok((wrapper.attrs.class ?? "").split(/\s+/).includes("industry-region"), `${id}: the wrapper isn't .industry-region`);
    assert.match(wrapper.inner, /^\s*<span\b[^>]*\bdata-region-label="region"[^>]*>/, `${id}: the label doesn't open the wrapper`);
    assert.deepEqual(elementsWith(wrapper.inner, "data-region-label").map((l) => text(l.inner)), [REGION_LABEL], id);
    assert.equal(elementsWith(wrapper.inner, "data-bracket-chip").length, elementsWith(card.inner, "data-bracket-chip").length, `${id}: a chip outside the wrapper`);
  }
});

test("the measured prototype: Manufacturing shows five shared and three sector chips, Government four and two, each under its own paragraph (go-global §5.7)", () => {
  for (const [id, shared, sector] of [["manufacturing", 5, 3], ["government", 4, 2]]) {
    const block = byId(page(id), "rules-that-travel");
    assert.equal(elementsWith(block.inner, "data-anchor-scope", "shared").length, shared, id);
    assert.equal(elementsWith(block.inner, "data-anchor-scope", "sector").length, sector, id);
    assert.equal(elementsWith(block.inner, "data-rules-paragraph").length, 1, id);
  }
});

// ---------- go-global §5.2, §5.5, §5.6: the nine Rules paragraphs, the travel sentences, the "What we
// don't do" lines and the Australia-only FAQs, in the content and on the production pages ----------

/** The nine industry pages, in nav order. */
const RULES_PAGE_IDS = ["government", "financial-services", "accounting", "education", "manufacturing", "real-estate", "healthcare", "resources-and-energy", "legal-and-professional"];
/** Spec §5.5: the sentence that ends each page's Rules paragraph, word for word. Financial services and Manufacturing have none. */
const TRAVEL_SENTENCES = {
  government: "For government, we only claim to know Australia's rules. Outside Australia, we test unclassified systems on public or synthetic data.",
  "financial-services": null,
  accounting: "Your own regulator's rules always come first.",
  education: "Your own education authority's rules always come first.",
  manufacturing: null,
  "real-estate": "Property rules are set locally, and we only claim to know Australia's. Outside Australia, we'd map your local rules with your compliance lead first.",
  healthcare: "Each country's regulator decides when an AI scribe becomes a medical device. We don't make that call; we measure what the scribe gets wrong, and your regulatory team decides.",
  "resources-and-energy": "Your own regulators set the conditions; we make them easy to check.",
  "legal-and-professional": "Your own court's practice notes and conduct rules always come first.",
};
/** Spec §1, S1: the banned strings in a plain text, as tests/support/s1-scan.mjs matches them. The Rules paragraph and the FAQPage JSON-LD (which carries the Australia-tagged FAQs) are not allowed contexts. */
const s1In = (copy) => S1_BANNED.filter((s) => bannedRegExp(s).test(normalizeQuotes(copy)));

test("go-global §5.2, §5.5: each industry page renders its own Rules paragraph, 140 words or fewer, ending with its travel sentence", () => {
  for (const id of RULES_PAGE_IDS) {
    const paragraph = industry(id).rulesThatTravel;
    assert.equal(typeof paragraph, "string", `${id}: no rulesThatTravel in src/content/industries/${id}.yaml`);
    assert.ok(wordsOf(paragraph) <= 140, `${id}: the Rules paragraph is ${wordsOf(paragraph)} words; §5.2 allows 140`);
    const travel = TRAVEL_SENTENCES[id];
    for (const [other, sentence] of Object.entries(TRAVEL_SENTENCES)) {
      if (other !== id && sentence !== null) assert.ok(!paragraph.includes(sentence), `${id} carries ${other}'s travel sentence`);
    }
    if (travel !== null) {
      assert.ok(paragraph.endsWith(` ${travel}`), `${id}: the paragraph doesn't end with its travel sentence`);
      assert.equal(paragraph.indexOf(travel), paragraph.length - travel.length, `${id}: the travel sentence appears twice`);
    }
    assert.deepEqual(s1In(paragraph), [], `${id}: an S1 string (spec §1, S1)`);
    const rendered = elements(page(id), (t) => "data-rules-paragraph" in t.attrs);
    assert.equal(rendered.length, 1, `${id}: ${rendered.length} [data-rules-paragraph] elements`);
    assert.equal(text(rendered[0].inner), paragraph, `${id}: the rendered paragraph isn't the content's`);
  }
});

/** Spec §5.5 (D13, D14, R7): the line each page adds to "What we don't do", in that list's own style. */
const DONT_DO_LINES = {
  "financial-services": "We don't take on work that supports a critical or important function of an EU bank or insurer under DORA.",
  education: "We don't build anything that admits, grades or monitors students.",
  healthcare: "Take on work that needs a US HIPAA business associate agreement.",
};

test("go-global §5.5: Financial services, Education and Healthcare each say what they don't take on, under What we don't do", () => {
  for (const [id, line] of Object.entries(DONT_DO_LINES)) {
    assert.ok(industry(id).dontDo.includes(line), `${id}: dontDo lacks "${line}"`);
    const items = elements(page(id), (t) => t.name === "li").map((li) => text(li.inner));
    assert.ok(items.includes(line), `${id}: "${line}" isn't rendered as a list item`);
  }
});

/** Spec §5.6: the FAQs only about an Australian rule, program or package, by page, in data order. Every other FAQ stays untagged. */
const AU_TAGGED_FAQS = {
  government: ["We're a council. What do you design around?"],
  // Final review F24: FYI's ATO SmartDocs integration is for the Australian Taxation Office's documents.
  accounting: ["Why not just use Karbon's AI, or FYI's ATO SmartDocs integration?"],
  education: ["Will your evaluation report satisfy TEQSA?"],
  manufacturing: ["Should we go to an AI Adopt Centre first?"],
  "real-estate": ["Is this an audit? Will our auditor accept it?", "Does AML/CTF Tranche 2 apply to property management?"],
  "resources-and-energy": ["We run a SOCI-covered asset. Where would our data be processed?", "Will this meet our CIRMP obligations?"],
};
/** The question text of each FAQ disclosure inside an element. */
const questionsIn = (html) => elements(html, (t) => /\bfaq-q\b/.test(t.attrs.class ?? "")).map((q) => text(q.inner));

test("go-global §5.6: the Australia-only FAQs are tagged and render in #faq-au inside the band, and the one FAQPage carries every FAQ and no S1 string", () => {
  for (const id of RULES_PAGE_IDS) {
    const faq = industry(id).faq;
    const tagged = faq.filter((f) => f.region === "au").map((f) => f.q);
    assert.deepEqual(tagged, AU_TAGGED_FAQS[id] ?? [], `${id}: the FAQs tagged region "au"`);
    const html = page(id);
    const [neutral] = elements(html, (t) => t.attrs.id === "faq");
    assert.deepEqual(questionsIn(neutral.outer), faq.filter((f) => f.region !== "au").map((f) => f.q), `${id}: #faq`);
    const [au] = elements(html, (t) => t.attrs.id === "faq-au");
    if (tagged.length === 0) {
      assert.equal(au, undefined, `${id}: #faq-au renders with nothing in it`);
    } else {
      const [band] = elements(html, (t) => t.attrs.id === "australia");
      assert.equal(band.attrs["data-region"], "au", `${id}: #australia isn't the Australia band`);
      assert.ok(band.outer.includes(au.outer), `${id}: #faq-au sits outside #australia`);
      assert.deepEqual(questionsIn(au.outer), tagged, `${id}: #faq-au`);
    }
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const faqPage = blocks.filter((b) => b["@type"] === "FAQPage");
    assert.equal(faqPage.length, 1, `${id}: FAQPage blocks`);
    assert.deepEqual(faqPage[0].mainEntity.map((q) => q.name), faq.map((f) => f.q), `${id}: the FAQPage questions`);
    assert.deepEqual(s1In(JSON.stringify(faqPage[0])), [], `${id}: the FAQPage carries an S1 string (spec §1, S1)`);
  }
});
