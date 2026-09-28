import { test } from "node:test";
import assert from "node:assert/strict";
import { readPreviewDist, visibleText } from "./helpers.mjs";

// The static components A (BracketChip, SectionHeader, PromptBlock, Breadcrumb, FaqList) as the
// preview build renders them on /preview/components/: once on carbon, once inside .surface-bone.
const html = readPreviewDist("preview/components/index.html");
const SURFACES = ["carbon", "bone"];

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
const startOf = (id) => html.search(new RegExp(`<div[^>]*data-gallery="static-a"[^>]*data-gallery-surface="${id}"`));
const gallery = (id) => {
  const start = startOf(id);
  assert.ok(start >= 0, `no <div data-gallery="static-a" data-gallery-surface="${id}"> on /preview/components/`);
  return elementAt(html, start);
};
const text = (s) => visibleText(s).trim();
const jsonLdIn = (s) => [...s.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const ofType = (s, type) => jsonLdIn(s).map((b) => JSON.parse(b)).filter((d) => d["@type"] === type);

test("every component renders on carbon and inside a surface-bone section", () => {
  for (const id of SURFACES) {
    const g = gallery(id);
    for (const hook of ["data-bracket-chip", "data-section-header", "data-prompt-block", 'aria-label="Breadcrumb"', 'class="faq"']) {
      assert.ok(g.includes(hook), `${id}: missing ${hook}`);
    }
    // The nearest <section> opening before the gallery is its surface.
    const sections = [...html.slice(0, startOf(id)).matchAll(/<section\b[^>]*>/g)];
    const section = sections.at(-1)?.[0] ?? "";
    if (id === "bone") assert.match(section, /class="[^"]*\bsurface-bone\b/, "the bone gallery is not inside .surface-bone");
    else assert.doesNotMatch(section, /surface-bone/, "the carbon gallery sits inside .surface-bone");
  }
});

test("BracketChip wraps its label in decorative brackets, as a link or as plain text", () => {
  const CHIP = /<(a|span)\b([^>]*)\bdata-bracket-chip\b([^>]*)><span aria-hidden="true"[^>]*>\[<\/span>([^<]+)<span aria-hidden="true"[^>]*>\]<\/span><\/\1>/g;
  for (const id of SURFACES) {
    const chips = [...gallery(id).matchAll(CHIP)];
    assert.deepEqual(chips.map((m) => m[4]), ["fixture-industry", "fixture solution", "fixture link chip", "fixture island chip"], id);
    for (const m of chips) assert.match(m[2] + m[3], /class="bracket-chip"/);
    const [plain, plain2, link, island] = chips;
    assert.equal(link[1], "a");
    assert.match(link[2] + link[3], /\bhref="\/preview\/"/);
    for (const m of [plain, plain2, island]) {
      assert.equal(m[1], "span");
      assert.doesNotMatch(m[2] + m[3], /\bhref=/);
    }
  }
  // Every chip on the page has exactly that structure.
  assert.equal([...html.matchAll(CHIP)].length, (html.match(/\bdata-bracket-chip\b/g) ?? []).length);
});

test("SectionHeader: decorative prompt, the heading at its level with its id, then the lede", () => {
  const HEADER = (level) =>
    new RegExp(`<div class="section-header"[^>]*data-section-header[^>]*>\\s*<p class="section-prompt" aria-hidden="true"[^>]*>((?:(?!</p>)[\\s\\S])*)</p>\\s*<h${level} id="([^"]+)"[^>]*>([^<]+)</h${level}>\\s*<p class="section-lede"[^>]*>([^<]+)</p>\\s*</div>`);
  for (const id of SURFACES) {
    const g = gallery(id);
    const main = g.match(HEADER(2)); // level defaults to 2
    assert.ok(main, `${id}: level-2 header markup`);
    assert.equal(text(main[1]), `> preview --components a --surface ${id}`);
    assert.equal(main[2], `gallery-a-${id}`);
    assert.equal(main[3], `Static components A on ${id}`);

    const demo = g.match(HEADER(3));
    assert.ok(demo, `${id}: level-3 header markup`);
    assert.equal(text(demo[1]), "> fixture --level 3");
    assert.equal(demo[2], `gallery-a-header-${id}`);

    // Optional parts render nothing when absent: no id, no empty prompt or lede paragraph.
    const bare = g.match(/<div class="section-header"[^>]*data-section-header[^>]*>\s*<h3(?![^>]*\bid=)[^>]*>([^<]+)<\/h3>\s*<\/div>/);
    assert.ok(bare, `${id}: title-only header markup`);
    assert.equal(bare[1], "Fixture title-only header");
  }
});

test("PromptBlock: a decorative prompt line and a real primary link", () => {
  for (const id of SURFACES) {
    const m = gallery(id).match(/<div class="prompt-block[^"]*"[^>]*data-prompt-block[^>]*>\s*<p class="prompt-line" aria-hidden="true"[^>]*>([\s\S]*?)<\/p>\s*<a href="([^"]+)" class="btn btn-primary"[^>]*>([^<]+)<\/a>\s*<\/div>/);
    assert.ok(m, `${id}: prompt block markup`);
    assert.equal(text(m[1]), "> fixture --open preview-index");
    assert.equal(m[2], "/preview/");
    assert.equal(m[3], "Open the fixture index");
  }
});

test("Breadcrumb: an ordered trail, separators hidden, the last item the current page as text", () => {
  for (const id of SURFACES) {
    const nav = gallery(id).match(/<nav aria-label="Breadcrumb"[^>]*>\s*<ol[^>]*>([\s\S]*?)<\/ol>\s*<\/nav>/)?.[1];
    assert.ok(nav, `${id}: breadcrumb markup`);
    const items = [...nav.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]);
    assert.equal(items.length, 3, id);
    items.forEach((li, i) => {
      if (i === 0) assert.doesNotMatch(li, /breadcrumb-sep/);
      else assert.match(li, /^\s*<span class="breadcrumb-sep" aria-hidden="true"[^>]*>\/<\/span>/);
    });
    assert.match(items[0], /<a href="\/"[^>]*>Home<\/a>/);
    assert.match(items[1], /<a href="\/preview\/"[^>]*>Preview<\/a>/);
    assert.match(items[2], /<span aria-current="page"[^>]*>Components<\/span>/);
    assert.doesNotMatch(items[2], /<a\b/);
    assert.doesNotMatch(items.slice(0, 2).join(""), /aria-current/);
  }
});

test("every JSON-LD block on the page parses; the components' blocks never hold a raw '<'", () => {
  const blocks = jsonLdIn(html);
  assert.ok(blocks.length >= 5, `found ${blocks.length} JSON-LD blocks`); // Organization + 2 × (BreadcrumbList + FAQPage)
  for (const b of blocks) assert.doesNotThrow(() => JSON.parse(b), b.slice(0, 80));
  for (const id of SURFACES) {
    const own = jsonLdIn(gallery(id));
    assert.equal(own.length, 2, `${id}: one BreadcrumbList and one FAQPage`);
    for (const b of own) assert.doesNotMatch(b, /</);
  }
});

test("Breadcrumb emits a BreadcrumbList with absolute URLs from the site", () => {
  for (const id of SURFACES) {
    const lists = ofType(gallery(id), "BreadcrumbList");
    assert.equal(lists.length, 1, id);
    assert.equal(lists[0]["@context"], "https://schema.org");
    assert.deepEqual(lists[0].itemListElement, [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://techsider.com.au/" },
      { "@type": "ListItem", position: 2, name: "Preview", item: "https://techsider.com.au/preview/" },
      { "@type": "ListItem", position: 3, name: "Components", item: "https://techsider.com.au/preview/components/" },
    ]);
  }
});

test("FaqList: one <details> per item with a hidden +/− indicator, and a FAQPage that matches", () => {
  for (const id of SURFACES) {
    const g = gallery(id);
    assert.match(g, new RegExp(`<div class="faq" id="gallery-a-faq-${id}"`));
    const details = [...g.matchAll(/<details class="faq-item"[^>]*>\s*<summary class="faq-question"[^>]*>([\s\S]*?)<\/summary>\s*<div class="faq-answer"[^>]*>([\s\S]*?)<\/div>\s*<\/details>/g)];
    assert.ok(details.length >= 3, `${id}: ${details.length} FAQ items`);
    assert.equal(details.length, (g.match(/<details\b/g) ?? []).length, `${id}: every <details> has the FAQ structure`);
    for (const [, summary] of details) {
      assert.match(summary, /<span class="faq-indicator" aria-hidden="true"[^>]*><span class="faq-plus"[^>]*>\+<\/span><span class="faq-minus"[^>]*>−<\/span><\/span>/);
    }
    const questions = details.map(([, summary]) => text(summary.match(/<span class="faq-q"[^>]*>([\s\S]*?)<\/span>/)[1]));
    const answers = details.map(([, , answer]) => text(answer));
    const pages = ofType(g, "FAQPage");
    assert.equal(pages.length, 1, id);
    assert.equal(pages[0]["@context"], "https://schema.org");
    assert.deepEqual(
      pages[0].mainEntity,
      questions.map((q, i) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: answers[i] } })),
    );
  }
});
