// The page kit (src/components/page/): splitHighlight(), and each component's markup contract as
// the preview build renders it on /preview/page-kit/, once on carbon and once on bone, from the
// fixtures. tests/e2e/page-kit.spec.mjs checks the rendered page in the browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readPreviewDist, visibleText } from "./helpers.mjs";
import { splitHighlight } from "../src/lib/highlight.ts";
import { crumbs, industryLink, solutionLink } from "../src/lib/site.ts";
import { insightCards } from "../src/lib/views/insights.ts";
import { NOT_LEGAL_ADVICE, WORKS_METHOD_LABEL } from "../src/lib/fixed-copy.ts";
import { fixtureSite, industryFixtures, insightFixtures } from "../src/fixtures/index.ts";

const SURFACES = ["carbon", "bone"];
const one = solutionLink(fixtureSite, "fixture-solution");
const longText = industryFixtures["fixture-industry-3"];

// Read on first use, so the splitHighlight tests run (and fail cleanly) without a preview build.
let cached;
const html = () => (cached ??= readPreviewDist("preview/page-kit/index.html").replace(/<script\b[\s\S]*?<\/script>/g, ""));
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const text = (s) => visibleText(s).trim();
const openTag = (el) => el.match(/^<[^>]*>/)[0];
const itemsOf = (s) => [...s.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);

// The whole element that opens at `start`, balancing nested tags of the same name.
function elementAt(src, start) {
  const tag = src.slice(start + 1).match(/^[a-z][a-z0-9]*/)[0];
  const re = new RegExp(`<${tag}\\b|</${tag}>`, "g");
  re.lastIndex = start;
  let depth = 0;
  for (let m; (m = re.exec(src)); ) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return src.slice(start, m.index + m[0].length);
  }
  throw new Error(`unbalanced <${tag}> at ${start}`);
}
function byId(id) {
  const start = html().search(new RegExp(`<[a-z][a-z0-9]*\\b[^>]*\\sid="${escapeRe(id)}"`));
  assert.ok(start >= 0, `no element with id="${id}" on /preview/page-kit/`);
  return elementAt(html(), start);
}
const firstElement = (src, re) => {
  const start = src.search(re);
  assert.ok(start >= 0, `no match for ${re}`);
  return elementAt(src, start);
};

test("splitHighlight wraps one whole word, case-insensitively, keeping the title's casing", () => {
  assert.deepEqual(splitHighlight("AI THAT SHIPS.", "ships"), { before: "AI THAT ", word: "SHIPS", after: "." });
  assert.deepEqual(splitHighlight("Solutions.", "Solutions"), { before: "", word: "Solutions", after: "." });
  assert.deepEqual(splitHighlight("Ship it, then ship it again.", "ship"), { before: "", word: "Ship", after: " it, then ship it again." });
  assert.deepEqual(splitHighlight("Tell us what you're trying to fix.", "you're"), { before: "Tell us what ", word: "you're", after: " trying to fix." });
});

test("splitHighlight throws unless the highlight is one whole word of the title", () => {
  const bad = [
    ["AI that ships.", "ship"], // the start of a word
    ["AI that ships.", "hips"], // inside a word
    ["AI that ships.", "demo"], // not in the title
    ["AI that ships.", "that ships"], // two words
    ["AI that ships.", ""],
    ["AI that ships.", "sh.ps"], // a pattern, not a word
  ];
  for (const [title, highlight] of bad) {
    assert.throws(() => splitHighlight(title, highlight), /^Error: PageHero: highlight /, `${JSON.stringify(highlight)} in ${JSON.stringify(title)}`);
  }
});

test("the gallery lists the page kit, and the specimen renders the kit on carbon and on bone", () => {
  assert.match(readPreviewDist("preview/index.html"), /<a\b[^>]*href="\/preview\/page-kit\/"/);
  assert.match(openTag(firstElement(html(), /<div\b[^>]*\bdata-page-kit\b/)), /\bdata-fixture\b/);
  for (const s of SURFACES) {
    assert.equal((byId(`kit-hero-${s}`).match(/\bdata-page-hero\b/g) ?? []).length, 1, `${s}: one PageHero`);
    const section = byId(`kit-section-${s}`);
    for (const hook of ["data-cta-links", "data-chip-row", "data-link-card", "data-notice", "data-insight-card", "data-prose"]) {
      assert.ok(section.includes(hook), `kit-section-${s} has no ${hook}`);
    }
  }
  assert.match(openTag(byId("kit-hero-bone")), /class="[^"]*\bsurface-bone\b/, "the bone hero specimen is not inside .surface-bone");
  assert.doesNotMatch(openTag(byId("kit-hero-carbon")), /surface-bone/);
});

test("PageHero: a carbon, scan-lined header with its parts in order, CTAs before or after the slot", () => {
  const header = firstElement(byId("kit-hero-carbon"), /<header\b/);
  assert.match(openTag(header), /^<header class="page-hero bg-carbon scanlines"[^>]*\bdata-page-hero\b/);
  const parts = [
    /<nav aria-label="Breadcrumb"/,
    /<p class="page-hero-eyebrow"[^>]*>\s*<span class="bracket-chip"/,
    /<p class="page-hero-prompt" aria-hidden="true"/,
    /<h1\b/,
    /<p class="page-hero-proof"/,
    /<p class="page-hero-sub"/,
    /<div class="cta-links"/,
    /<div class="page-hero-slot"/,
  ].map((re) => [re, header.search(re)]);
  for (const [re, at] of parts) assert.ok(at >= 0, `no ${re} in the carbon hero`);
  const at = parts.map(([, i]) => i);
  assert.deepEqual(at, [...at].sort((a, b) => a - b), "the hero's parts are out of order");
  assert.match(header, /<\/h1>\s*<p class="page-hero-proof"[^>]*>Fixture proof line: measured before it ships\.<\/p>/, "the proof line sits directly under the H1");
  assert.equal(text(firstElement(header, /<p class="page-hero-prompt"/)), "> fixture_page --kit=hero");
  assert.match(text(firstElement(header, /<p class="page-hero-eyebrow"/)), /^\[ ?fixture page kit ?\]$/);
  assert.doesNotMatch(firstElement(header, /<p class="page-hero-eyebrow"/), /<a\b/, "the eyebrow is a label, not a link");

  // ctaPosition="after-slot", no prompt, no proof line.
  const bone = firstElement(byId("kit-hero-bone"), /<header\b/);
  assert.ok(bone.search(/<div class="page-hero-slot"/) >= 0 && bone.search(/<div class="page-hero-slot"/) < bone.search(/<div class="cta-links"/), "after-slot: the slot comes before the CTAs");
  assert.doesNotMatch(bone, /page-hero-proof|page-hero-prompt/);
});

test("PageHero wraps the highlighted word in .hl inside a display-caps H1; without one the H1 is plain", () => {
  const h1 = firstElement(byId("kit-hero-carbon"), /<h1\b/);
  assert.match(openTag(h1), /class="page-hero-title type-display page-hero-title-display"/);
  assert.match(h1, />Fixture kit that <span class="hl"[^>]*>ships<\/span>\.<\/h1>$/);
  const plain = firstElement(byId("kit-hero-bone"), /<h1\b/);
  assert.match(openTag(plain), /class="page-hero-title page-hero-title-sentence"/);
  assert.doesNotMatch(plain, /class="hl"/);
  assert.equal(text(plain), one.fullName);
});

test("PageHero renders crumbs() output as its breadcrumb, the last item as the current page", () => {
  const nav = firstElement(byId("kit-hero-carbon"), /<nav aria-label="Breadcrumb"/);
  const expected = crumbs(fixtureSite, ["solutions", { label: "Fixture page kit", path: "/preview/page-kit/" }]);
  const items = itemsOf(nav);
  assert.equal(items.length, expected.length);
  expected.slice(0, -1).forEach((c, i) => assert.match(items[i], new RegExp(`<a href="${escapeRe(c.href)}"[^>]*>${escapeRe(c.label)}</a>`)));
  assert.match(items.at(-1), /<span aria-current="page"[^>]*>Fixture page kit<\/span>/);
});

test("PageSection: a section named by its heading, on its surface, header first, nested at level 3", () => {
  for (const s of SURFACES) {
    const section = byId(`kit-section-${s}`);
    assert.match(
      openTag(section),
      new RegExp(`^<section id="kit-section-${s}" aria-labelledby="kit-section-${s}-heading" class="page-section ${s === "bone" ? "surface-bone" : "bg-carbon"}" data-surface="${s}"`),
    );
    assert.match(section, new RegExp(`<h2 id="kit-section-${s}-heading"[^>]*>Fixture page section on ${s}</h2>`));
    assert.ok(section.search(/\bdata-section-header\b/) < section.search(/<div class="page-section-body"/), `${s}: the header comes before the body`);
    const sub = byId(`kit-subsection-${s}`);
    assert.match(openTag(sub), new RegExp(`aria-labelledby="kit-subsection-${s}-heading"`));
    assert.match(sub, new RegExp(`<h3 id="kit-subsection-${s}-heading"[^>]*>Fixture subsection on ${s}</h3>`));
    assert.match(sub, /<div class="page-section-inner page-section-prose"/);
  }
});

test("ids are unique and every aria-labelledby names an id on the page", () => {
  const ids = [...html().matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], "duplicate ids");
  const known = new Set(ids);
  const refs = [...html().matchAll(/\saria-labelledby="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/));
  assert.ok(refs.length >= 8, `only ${refs.length} aria-labelledby references`);
  for (const ref of refs) assert.ok(known.has(ref), `aria-labelledby="${ref}" has no target`);
});

test("CtaLinks: the primary then the secondary button; nothing at all when both are null", () => {
  for (const s of SURFACES) {
    const row = firstElement(byId(`kit-section-${s}`), /<div class="cta-links"/);
    const links = [...row.matchAll(/<a href="([^"]+)" class="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => m.slice(1));
    assert.deepEqual(links, [
      [fixtureSite.contact({ interest: one.id }), "btn btn-primary cta-link", `Talk to us about ${one.shortName}`],
      ["/preview/", "btn btn-secondary cta-link cta-secondary", "Open the fixture gallery"],
    ]);
    const empty = byId(`kit-cta-empty-${s}`);
    assert.equal(empty.slice(openTag(empty).length, -"</div>".length), "", `${s}: CtaLinks with two null links rendered markup`);
  }
  const heroCtas = firstElement(byId("kit-hero-bone"), /<div class="cta-links"/);
  assert.equal((heroCtas.match(/<a\b/g) ?? []).length, 1, "a null secondary renders no link");
  assert.match(heroCtas, /class="btn btn-primary cta-link"/);
});

test("ChipRow: a labelled list of bracket chips; a null href is plain text; notes follow their chip", () => {
  assert.ok(fixtureSite.industries.some((i) => i.href === null), "fixtureSite has no unshown industry to render as text");
  assert.ok(longText.obligationChips.some((c) => /\S{60}/.test(c.label)), "fixture-industry-3 has no 60-character unbroken chip label");
  for (const s of SURFACES) {
    const row = byId(`kit-industries-${s}`);
    assert.match(row, new RegExp(`<p class="chip-row-label" id="kit-industries-${s}-label"[^>]*>Fixture industries</p>\\s*<ul class="chip-row-list" aria-labelledby="kit-industries-${s}-label"`));
    const items = itemsOf(row);
    assert.equal(items.length, fixtureSite.industries.length);
    fixtureSite.industries.forEach((industry, i) => {
      assert.match(text(items[i]), new RegExp(`^\\[ ?${escapeRe(industry.shortName)} ?\\]$`));
      if (industry.href === null) {
        assert.doesNotMatch(items[i], /<a\b/, `${industry.id} is a link although its page isn't shown`);
        assert.match(items[i], /^<span class="bracket-chip"/);
      } else {
        assert.match(items[i], new RegExp(`^<a href="${escapeRe(industry.href)}" class="bracket-chip"`));
      }
    });
    assert.equal(itemsOf(byId(`kit-designed-${s}`)).length, longText.obligationChips.length);

    // Without an id, the label paragraph has none and the list is named by aria-label.
    const works = byId(`kit-section-${s}`).match(
      /<div class="chip-row"(?![^>]*\sid=)[^>]*>\s*<p class="chip-row-label"(?![^>]*\sid=)[^>]*>Fixture works alongside<\/p>\s*<ul class="chip-row-list" aria-label="Fixture works alongside"[^>]*>([\s\S]*?)<\/ul>/,
    );
    assert.ok(works, `${s}: no unlabelled "Fixture works alongside" row named by aria-label`);
    const notes = itemsOf(works[1]);
    assert.equal(notes.length, longText.worksAlongside.length);
    longText.worksAlongside.forEach((w, i) => {
      assert.match(notes[i], /<\/span> <span class="chip-note"/, "the note follows its chip, after a space");
      assert.equal(text(notes[i]), `[ ${w.system} ] ${WORKS_METHOD_LABEL[w.method]}`);
    });
  }
});

test("LinkCard: the heading holds the link at its level, or plain text for a null href", () => {
  const two = solutionLink(fixtureSite, "fixture-solution-2");
  const privacy = fixtureSite.page("privacy");
  assert.equal(privacy.href, null, "fixtureSite shows the privacy page, so the null-href card tests nothing");
  for (const s of SURFACES) {
    const section = byId(`kit-section-${s}`);
    const cards = [...section.matchAll(/<article class="link-card[^"]*"[^>]*\bdata-link-card\b/g)].map((m) => elementAt(section, m.index));
    assert.equal(cards.length, 4, `${s}: three cards in the grid and one in the subsection`);
    const [first, second, unlinked, nested] = cards;
    for (const [card, sol] of [[first, one], [second, two]]) {
      assert.match(openTag(card), /^<article class="link-card link-card-linked"/);
      assert.match(card, new RegExp(`<h3\\b[^>]*class="link-card-title link-card-title-3"[^>]*><a href="${escapeRe(sol.href)}" class="link-card-link"[^>]*>${escapeRe(`${sol.number} ${sol.shortName}`)}</a></h3>`));
      assert.match(card, /<p class="link-card-eyebrow"[^>]*>fixture solution<\/p>/);
    }
    assert.match(openTag(unlinked), /^<article class="link-card"/);
    assert.doesNotMatch(unlinked, /<a\b/);
    assert.match(unlinked, new RegExp(`<h3\\b[^>]*>${escapeRe(privacy.label)}</h3>`));
    assert.match(unlinked, /<p class="link-card-meta"[^>]*>Fixture meta: no link<\/p>/);
    assert.match(nested, /<h4\b[^>]*class="link-card-title link-card-title-4"[^>]*><a href="\/preview\/" class="link-card-link"/);
  }
});

test("Notice renders its text as a plain paragraph", () => {
  for (const s of SURFACES) {
    assert.match(byId(`kit-section-${s}`), new RegExp(`<p class="notice" data-notice[^>]*>${escapeRe(NOT_LEGAL_ADVICE)}</p>`));
  }
});

test("InsightCard: type tag, date and reading time, the title link, then industry chips", () => {
  const [latest, second] = insightCards(insightFixtures, fixtureSite);
  const industries = ["fixture-industry", "fixture-industry-9"].map((id) => industryLink(fixtureSite, id));
  const expected = [latest, { ...second, industries: industries.map((i) => ({ label: i.shortName, href: i.href })) }];
  for (const s of SURFACES) {
    const section = byId(`kit-section-${s}`);
    const rendered = [...section.matchAll(/<article class="insight-card"[^>]*\bdata-insight-card\b/g)].map((m) => elementAt(section, m.index));
    assert.equal(rendered.length, expected.length, `${s}: insight cards`);
    expected.forEach((card, i) => {
      const r = rendered[i];
      const shown = card.date.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
      assert.match(text(r), new RegExp(`^\\[ ?${escapeRe(card.typeLabel.toLowerCase())} ?\\] · ${escapeRe(shown)} · ${card.minutes} min read `));
      assert.match(r, new RegExp(`<time datetime="${card.date.toISOString().slice(0, 10)}"`));
      assert.match(r, new RegExp(`<h3\\b[^>]*><a href="${escapeRe(card.href)}" class="insight-card-link"`));
      const chips = itemsOf(r);
      assert.equal(chips.length, card.industries.length);
      card.industries.forEach((industry, j) => {
        if (industry.href === null) assert.doesNotMatch(chips[j], /<a\b/, `${industry.label} is a link although its page isn't shown`);
        else assert.match(chips[j], new RegExp(`^<a href="${escapeRe(industry.href)}" class="bracket-chip"`));
      });
    });
  }
});

test("Prose wraps the rendered markdown, holding every element it styles", () => {
  for (const s of SURFACES) {
    const prose = firstElement(byId(`kit-section-${s}`), /<div class="prose"[^>]*\bdata-prose\b/);
    for (const tag of ["h2", "h3", "p", "ul", "ol", "a", "code", "pre", "blockquote", "table"]) {
      assert.match(prose, new RegExp(`<${tag}\\b`), `${s}: no <${tag}> inside .prose`);
    }
  }
});
