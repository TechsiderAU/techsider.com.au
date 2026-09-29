// The restyled Insights pages in the production build (Phase B2 Task 13, spec §8.9): the index is a
// carbon PageHero plus a bone "All posts" section of InsightCards; each post is a carbon PageHero
// (breadcrumb, type eyebrow, sentence-case H1, meta line), a bone Prose body and the §10.1
// contextual closing prompt, with BlogPosting JSON-LD (§11.3). /contact/ is live (Phase C Task 7),
// so each closing link is /contact/ with the post's query. No legacy colour alias or serif class survives.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { allHtmlFiles, readDist, visibleText } from "./helpers.mjs";
import { elements, elementsWith, readFrontmatter, startTags } from "../scripts/ci/lib.mjs";
import { INSIGHT_TYPE_LABEL } from "../src/content/schemas.ts";
import { PAGES } from "../src/data/nav.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const INSIGHTS = PAGES.find((p) => p.path === "/insights/");

// Published posts from their frontmatter, newest first (ties by id), as the index lists them.
const POSTS = readdirSync(join(ROOT, "src/content/insights"))
  .filter((f) => f.endsWith(".md"))
  .map((f) => ({ id: f.replace(/\.md$/, ""), fm: readFrontmatter(join(ROOT, "src/content/insights", f)) }))
  .filter((p) => p.fm.draft !== true)
  .sort((a, b) => new Date(b.fm.publishDate) - new Date(a.fm.publishDate) || a.id.localeCompare(b.id));
const INSIGHT_PAGES = allHtmlFiles().filter((f) => f.startsWith("insights/"));

const main = (html) => elements(html, (t) => t.name === "main")[0].inner;
const one = (html, attr, where) => {
  const found = elementsWith(html, attr);
  assert.equal(found.length, 1, `${where}: expected one [${attr}], found ${found.length}`);
  return found[0];
};
const classesOf = (el) => (el.attrs.class ?? "").split(/\s+/).filter(Boolean);
const text = (html) => visibleText(html).trim();
const DATE = /^\d{1,2} [A-Z][a-z]+ \d{4}$/;
const shortName = (path) => PAGES.find((p) => p.path === path).shortName;
// PostLayout's eyebrow is the type's label in lower case, not its id: "reference-scenario" reads
// "[ reference scenario ]".
const eyebrowOf = (type) => `[ ${INSIGHT_TYPE_LABEL[type].toLowerCase()} ]`;
// Spec §10.1: the first solution reference, else the first industry, else plain "Talk to us".
function expectedClosing({ solutions = [], industries = [] }) {
  if (solutions.length > 0) {
    return {
      label: `Talk to us about ${shortName(`/solutions/${solutions[0]}/`)}`, prompt: `> talk_to_us --about=${solutions[0]}`,
      href: `/contact/?interest=${solutions[0]}`,
    };
  }
  if (industries.length > 0) {
    return {
      label: `Talk to us about AI for ${shortName(`/industries/${industries[0]}/`).toLowerCase()}`, prompt: `> talk_to_us --about=${industries[0]}`,
      href: `/contact/?industry=${industries[0]}`,
    };
  }
  return { label: "Talk to us", prompt: "> talk_to_us", href: "/contact/" };
}

test("the insights pages are the index plus one page per published post", () => {
  assert.deepEqual(INSIGHT_PAGES.sort(), ["insights/index.html", ...POSTS.map((p) => `insights/${p.id}/index.html`)].sort());
  assert.ok(POSTS.length >= 3, "the three migrated posts are published");
});

test("index: pageTitle, a carbon hero with the [resources] eyebrow, the H1 'Insights.' and the nav one-liner", () => {
  const html = readDist("insights/index.html");
  assert.match(html, /<title>Insights \| Techsider<\/title>/);
  const hero = one(main(html), "data-page-hero", "index");
  assert.equal(hero.name, "header");
  assert.ok(classesOf(hero).includes("bg-carbon") && classesOf(hero).includes("scanlines"), "the hero is carbon with scan lines");
  assert.equal(text(elements(hero.inner, (t) => t.attrs.class === "page-hero-eyebrow")[0].inner), "[ resources ]");
  const h1s = elements(html, (t) => t.name === "h1");
  assert.equal(h1s.length, 1, "exactly one <h1>");
  assert.equal(text(h1s[0].inner), "Insights.");
  assert.ok(classesOf(h1s[0]).includes("type-display"), "the index H1 is display type");
  assert.equal(text(elements(hero.inner, (t) => t.attrs.class === "page-hero-sub")[0].inner), INSIGHTS.oneLiner);
  assert.equal(elements(hero.inner, (t) => t.name === "nav").length, 0, "the index has no breadcrumb");
});

test("index: a bone 'All posts' section lists every published post as an InsightCard, newest first", () => {
  const html = main(readDist("insights/index.html"));
  const section = elements(html, (t) => t.name === "section" && t.attrs.id === "posts")[0];
  assert.ok(section, "no <section id=\"posts\">");
  assert.equal(section.attrs["aria-labelledby"], "posts-heading");
  assert.ok(classesOf(section).includes("surface-bone"), "#posts is not a bone section");
  const h2 = elements(section.inner, (t) => t.name === "h2")[0];
  assert.equal(h2.attrs.id, "posts-heading");
  assert.equal(text(h2.inner), "All posts");
  const cards = elementsWith(section.inner, "data-insight-card");
  assert.equal(cards.length, POSTS.length);
  assert.equal(elementsWith(html, "data-insight-card").length, POSTS.length, "a card outside #posts");
  cards.forEach((card, i) => {
    const { id, fm } = POSTS[i];
    const link = elements(card.inner, (t) => t.name === "a" && t.attrs.class === "insight-card-link")[0];
    assert.equal(link.attrs.href, `/insights/${id}/`, `card ${i}: links to its post, with the trailing slash`);
    assert.equal(text(link.inner), fm.title);
    assert.equal(elements(card.inner, (t) => t.name === "h3").length, 1, `card ${i}: its title is an h3 under the h2`);
    const time = elements(card.inner, (t) => t.name === "time")[0];
    assert.equal(time.attrs.datetime, new Date(fm.publishDate).toISOString().slice(0, 10), `card ${i}: date`);
    assert.match(text(time.inner), DATE);
    assert.match(text(card.inner), /^\[ \w[\w ]* \] · \d{1,2} [A-Z][a-z]+ \d{4} · \d+ min read /, `card ${i}: type tag, date, reading time`);
  });
});

test("posts: a carbon hero with the breadcrumb, the type eyebrow, the title as the one H1 and the meta line", () => {
  assert.deepEqual(Object.keys(INSIGHT_TYPE_LABEL).map(eyebrowOf), ["[ article ]", "[ reference scenario ]", "[ platform guide ]"],
    "the eyebrow expectation reads each type's label, not its id");
  for (const { id, fm } of POSTS) {
    const html = readDist(`insights/${id}/index.html`);
    assert.match(html, new RegExp(`<title>${fm.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\| Techsider</title>`), id);
    const hero = one(main(html), "data-page-hero", id);
    assert.ok(classesOf(hero).includes("bg-carbon"), `${id}: the hero is not carbon`);
    const crumbs = elements(hero.inner, (t) => t.name === "nav" && t.attrs["aria-label"] === "Breadcrumb");
    assert.equal(crumbs.length, 1, `${id}: one breadcrumb, inside the hero`);
    const trail = elements(crumbs[0].inner, (t) => t.name === "li").map((li) => text(li.inner).replace(/^\/ /, ""));
    assert.deepEqual(trail, ["Home", "Insights", fm.title], `${id}: Home › Insights › the post`);
    assert.deepEqual(elements(crumbs[0].inner, (t) => t.name === "a").map((a) => a.attrs.href), ["/", "/insights/"]);
    const h1s = elements(html, (t) => t.name === "h1");
    assert.equal(h1s.length, 1, `${id}: exactly one <h1>`);
    assert.ok(hero.inner.includes(h1s[0].outer), `${id}: the H1 is in the hero`);
    assert.equal(text(h1s[0].inner), fm.title);
    assert.ok(!classesOf(h1s[0]).includes("type-display"), `${id}: a post title is a sentence, not display caps`);
    assert.equal(text(elements(hero.inner, (t) => t.attrs.class === "page-hero-eyebrow")[0].inner), eyebrowOf(fm.type), `${id}: type eyebrow`);
    const meta = one(hero.inner, "data-post-meta", id);
    const times = elements(meta.inner, (t) => t.name === "time");
    assert.equal(times[0].attrs.datetime, new Date(fm.publishDate).toISOString().slice(0, 10), `${id}: published`);
    assert.equal(times.length, fm.updatedDate ? 2 : 1, `${id}: "Updated" only with an updatedDate`);
    assert.match(text(meta.inner), fm.updatedDate
      ? /^\d{1,2} [A-Z][a-z]+ \d{4} · Updated \d{1,2} [A-Z][a-z]+ \d{4} · \d+ min read$/
      : /^\d{1,2} [A-Z][a-z]+ \d{4} · \d+ min read$/, `${id}: meta line`);
    assert.equal(fm.illustrative === true, elementsWith(html, "data-illustrative-label").length === 1, `${id}: illustrative label`);
  }
});

test("posts: the body is Prose on bone, then the contextual closing prompt, linked to the live /contact/", () => {
  assert.equal(PAGES.find((p) => p.path === "/contact/").status, "live", "/contact/ is planned: its links fall back to a mailto");
  for (const { id, fm } of POSTS) {
    const html = main(readDist(`insights/${id}/index.html`));
    const body = elements(html, (t) => classesOf(t).includes("post-body"))[0];
    assert.ok(body && classesOf(body).includes("surface-bone"), `${id}: the body is not on bone`);
    const prose = one(body.inner, "data-prose", id);
    const closing = one(body.inner, "data-post-closing", id);
    assert.ok(body.inner.indexOf(prose.outer) < body.inner.indexOf(closing.outer), `${id}: the closing prompt follows the body`);
    const prompt = one(closing.inner, "data-prompt-block", id);
    const links = elements(prompt.inner, (t) => t.name === "a");
    assert.equal(links.length, 1);
    const expected = expectedClosing(fm);
    assert.equal(text(links[0].inner), expected.label, `${id}: contextual CTA label`);
    assert.equal(links[0].attrs.href, expected.href, `${id}: contextual CTA link`);
    assert.equal(text(elements(prompt.inner, (t) => t.name === "p")[0].inner), expected.prompt);
    // Industry chips render only for a post that names industries.
    assert.equal(elementsWith(body.inner, "data-chip-row").length, (fm.industries ?? []).length > 0 ? 1 : 0);
  }
});

test("posts: BlogPosting JSON-LD, authored and published by the Organization", () => {
  for (const { id, fm } of POSTS) {
    const html = readDist(`insights/${id}/index.html`);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    assert.deepEqual(blocks.map((b) => b["@type"]).sort(), ["BlogPosting", "BreadcrumbList", "Organization"], id);
    const post = blocks.find((b) => b["@type"] === "BlogPosting");
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)[1];
    const organization = { "@type": "Organization", name: "Techsider", url: "https://techsider.com.au" };
    assert.equal(post.headline, fm.title);
    assert.equal(post.description, fm.description);
    assert.equal(post.datePublished, new Date(fm.publishDate).toISOString());
    assert.equal("dateModified" in post, fm.updatedDate !== undefined);
    assert.equal(post.mainEntityOfPage, canonical);
    assert.equal(post.url, `https://techsider.com.au/insights/${id}/`);
    assert.deepEqual(post.author, organization);
    assert.deepEqual(post.publisher, organization);
    assert.doesNotMatch(JSON.stringify(blocks), /"Person"|"Article"/, `${id}: a person or the old Article type`);
  }
});

// The legacy aliases (src/styles/global.css, removed in Phase C) and the retired serif face.
const LEGACY_COLOURS = ["bg", "bg-elev", "bg-deep", "text", "text-mute", "text-dim", "accent", "accent-ink", "border", "border-soft"];
const LEGACY_CLASS = new RegExp(`^(?:[a-z-]+:)*(?:font-serif|(?:text|bg|border|decoration|outline|ring|divide|fill|stroke|from|via|to|shadow)-(?:${LEGACY_COLOURS.join("|")})(?:\\/\\d+)?)$`);

test("no legacy alias or serif class on any insights page", () => {
  assert.ok(LEGACY_CLASS.test("text-text-mute") && LEGACY_CLASS.test("md:group-hover:text-accent") && LEGACY_CLASS.test("font-serif"));
  assert.ok(!LEGACY_CLASS.test("text-muted") && !LEGACY_CLASS.test("border-graphite") && !LEGACY_CLASS.test("bg-carbon"));
  for (const f of INSIGHT_PAGES) {
    const legacy = startTags(readDist(f)).flatMap((t) => (t.attrs.class ?? "").split(/\s+/)).filter((c) => LEGACY_CLASS.test(c));
    assert.deepEqual([...new Set(legacy)], [], f);
  }
});

test("the insights sources use no legacy colour token or serif font", () => {
  const files = ["src/pages/insights/index.astro", "src/pages/insights/[...id].astro", "src/layouts/PostLayout.astro", "src/lib/views/post.ts"];
  const token = new RegExp(`--color-(?:${LEGACY_COLOURS.join("|")})\\b|--font-serif\\b|\\bfont-serif\\b`);
  for (const f of files) assert.doesNotMatch(readFileSync(join(ROOT, f), "utf8"), token, f);
});
