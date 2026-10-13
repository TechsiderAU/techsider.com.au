// go-global S1 (spec §1, §10.3): no built page says Techsider is Australian, serves Australian
// organisations or targets Australia outside the contexts spec §1 allows, and every page is
// <html lang="en">. tests/support/s1-scan.mjs defines the scan. The first tests pin it on synthetic
// markup: every banned string is found wherever it sits in a page, near misses pass, and each
// allowed context, and nothing else, is skipped. The rest run it over every page of the production
// build, the pages spec §1 names first, and hold the allowed contexts to what spec §1 allows, so no
// wrapper can excuse a whole page. There is no known-violations list: a hit is fixed in the copy or
// moved into its Australia-only wrapper, never excused here (go-global §10.1).
// Run `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { elements, htmlFiles, listFiles, pageUrl, readFrontmatter, readText, startTags } from "../scripts/ci/lib.mjs";
import { visibleText } from "./helpers.mjs";
import { S1_BANNED, allowedElement, bannedRegExp, s1Hits } from "./support/s1-scan.mjs";
import { PAGES, SITE, hqLine, isShown } from "../src/data/nav.ts";
import { PLATFORM_REGION_LABEL, REGION_EXAMPLE_LABEL, REGION_LABEL } from "../src/lib/fixed-copy.ts";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const INSIGHTS = fileURLToPath(new URL("../src/content/insights/", import.meta.url));
const BUILT = htmlFiles(DIST).map((file) => ({ url: pageUrl(DIST, file), html: readText(file) }));
/** go-global §6.1: the posts tagged region: "au", by URL. Their search and sharing tags are an S1 allowed context. */
const REGION_POSTS = new Set(
  listFiles(INSIGHTS, (rel) => !rel.includes("/") && rel.endsWith(".md") && rel !== "README.md")
    .filter((file) => readFrontmatter(file).region === "au")
    .map((file) => `/insights/${basename(file, ".md")}/`),
);
/** Spec §1: the pages S1 names. "Every solution and industry page" counts both hubs. */
const NAMED = [
  "/", "/about/", "/contact/", "/services/",
  ...PAGES.filter((p) => (p.group === "solutions" || p.group === "industries") && isShown(p, false)).map((p) => p.path),
  "/resources/what-you-already-pay-for/", "/demos/ai-switch-on/", "/insights/", "/insights/sovereign-llm-hosting-decision-matrix/",
];
const LABELS = [REGION_LABEL, REGION_EXAMPLE_LABEL, PLATFORM_REGION_LABEL];
/** A built page's S1 hits as `<url> "<phrase>": …words around it…`. /legal/* pages are allowed whole. */
const hitsOn = ({ url, html }) =>
  url.startsWith("/legal/")
    ? []
    : s1Hits(html, { regionPost: REGION_POSTS.has(url), summary: SITE.summary }).map(({ phrase, at }) => `${url} "${phrase}": ${at}`);
const textOf = (el) => visibleText(el.inner).trim();

const SYNTHETIC = { regionPost: false, summary: "Fixture summary sentence." };
const page = (head, body) => `<!DOCTYPE html><html lang="en"><head>${head}</head><body>${body}</body></html>`;
const count = (hits) => Object.fromEntries(S1_BANNED.map((phrase) => [phrase, hits.filter((h) => h.phrase === phrase).length]));

test("S1 scan: each banned string is found in the head, the text, attributes and JSON-LD, in any case, through entities, curly apostrophes and line breaks", () => {
  const hits = s1Hits(
    page(
      `<title>AI Automation in Australia | Fixture</title><meta name="description" content="For Australian teams">` +
        `<script type="application/ld+json">{"description":"An AUSTRALIAN AI company"}</script>`,
      `<main><p>Built for Australian\n    organisations. Australia&#39;s leading, and Australia’s leading.</p>` +
        `<img src="/x.png" alt="Australian&#8209;owned"><p>The most Australian of fixtures.</p></main>`,
    ),
    SYNTHETIC,
  );
  assert.deepEqual(count(hits), {
    "Australian organisations": 1, "for Australian": 2, "in Australia |": 1, "Australia's leading": 2,
    "Australian AI": 1, "Australian teams": 1, "Australian-owned": 1, "most Australian": 1,
  });
  assert.ok(hits.every((h) => typeof h.at === "string" && h.at.length > 0), "each hit carries the words around it");
});

test("S1 scan: near misses pass: another word's tail, Australia as a place, and Australian spelling", () => {
  const near = page(
    "<title>Fixture | Techsider</title>",
    "<p>Almost Australian. Offices in Australia, and work anywhere. Australian English spelling. An Australian example. Australia: our detailed map.</p>",
  );
  assert.deepEqual(s1Hits(near, SYNTHETIC), []);
  assert.equal(bannedRegExp("in Australia |").test("in Australia, then"), false);
});

test("S1 scan: every allowed context is skipped, and the same words outside it still count", () => {
  const banned = "for Australian organisations";
  for (const allowed of [
    `<section id="australia" data-region="au" aria-labelledby="h"><h2 id="h">Fixture</h2><div><p>${banned}</p></div></section>`,
    `<article data-insight-card data-region="au"><h3>${banned}</h3></article>`,
    `<p>© 2026 <span data-hq>${banned}</span></p>`,
    `<span class="region-label" data-region-label="region">${banned}</span>`,
    `<p class="contact-notice" data-collection-notice>${banned}</p>`,
    `<section id="enquiry-privacy" class="contact-privacy"><p>${banned}</p></section>`,
    `<p>Fixture summary ${banned}.</p>`,
  ]) {
    assert.deepEqual(s1Hits(page("<title>Fixture</title>", allowed), { regionPost: false, summary: `Fixture summary ${banned}.` }), [], allowed);
  }
  // Two phrases at each of two places: after an allowed wrapper closes, and in a wrapper for another region.
  const outside = page("<title>Fixture</title>", `<div data-region="au"><p>Fixture</p></div><p>${banned}</p><div data-region="nz"><p>${banned}</p></div>`);
  assert.equal(s1Hits(outside, SYNTHETIC).length, 4);
  // The summary is allowed only word for word.
  const longer = page("<title>Fixture</title>", `<p>Fixture summary ${banned}, and more.</p>`);
  assert.equal(s1Hits(longer, { regionPost: false, summary: `Fixture summary ${banned}.` }).length, 2);
});

test("S1 scan: a region post's title, description, og:* and twitter:* tags are allowed; its body, its JSON-LD and other posts' tags are not", () => {
  const banned = "for Australian organisations";
  const head =
    `<title>${banned} | Fixture</title><meta name="description" content="${banned}">` +
    `<meta property="og:title" content="${banned}"><meta name="twitter:title" content="${banned}">`;
  const post = page(head, "<main><h1>Fixture post.</h1></main>");
  assert.deepEqual(s1Hits(post, { ...SYNTHETIC, regionPost: true }), []);
  assert.equal(s1Hits(post, SYNTHETIC).length, 8, "four tags, two phrases each, on a post without region: au");
  const body = page(`<script type="application/ld+json">{"headline":"${banned}"}</script>`, `<main><p>${banned}</p></main>`);
  assert.equal(s1Hits(body, { ...SYNTHETIC, regionPost: true }).length, 4);
});

test("S1 reads the production build, and every page spec §1 names is built", () => {
  assert.ok(BUILT.length > 0, "dist/ holds no page: run `npm run build` first");
  assert.equal(NAMED.length, 24, "spec §1 names /, /about/, /contact/, /services/, both hubs, five solutions, nine industries and four more pages");
  const urls = new Set(BUILT.map((p) => p.url));
  assert.deepEqual(NAMED.filter((url) => !urls.has(url)), [], "pages S1 names that dist/ doesn't have");
});

test('every page is in English: <html lang="en"> (go-global §1 S1, §3.4)', () => {
  const others = BUILT.filter(({ html }) => startTags(html).find((t) => t.name === "html")?.attrs.lang !== "en").map((p) => p.url);
  assert.deepEqual(others, []);
});

test("the pages S1 names say nothing banned outside the allowed contexts, <head> and JSON-LD included (go-global §1 S1)", () => {
  assert.deepEqual(NAMED.flatMap((url) => hitsOn(BUILT.find((p) => p.url === url) ?? { url, html: "" })), []);
});

test("no other built page does either (go-global §1 S1)", () => {
  assert.deepEqual(BUILT.filter((p) => !NAMED.includes(p.url)).flatMap(hitsOn), []);
});

test("the allowed contexts stay what spec §1 allows: no page-wide wrapper, labels that only label, the HQ line, and the privacy notice on /contact/ only", () => {
  const found = BUILT.flatMap(({ url, html }) => {
    const out = [];
    for (const el of elements(html, allowedElement)) {
      if (["html", "head", "body", "main"].includes(el.name)) out.push(`${url}: <${el.name}> is an allowed context, which would excuse the whole page`);
    }
    for (const el of elements(html, (t) => "data-region-label" in t.attrs)) {
      if (!LABELS.includes(textOf(el))) out.push(`${url}: [data-region-label] reads "${textOf(el)}", not one of ${LABELS.join(" / ")}`);
    }
    for (const el of elements(html, (t) => "data-hq" in t.attrs)) {
      if (textOf(el) !== hqLine()) out.push(`${url}: [data-hq] reads "${textOf(el)}", not the HQ line`);
    }
    const notices = elements(html, (t) => "data-collection-notice" in t.attrs || t.attrs.id === "enquiry-privacy");
    if (notices.length > 0 && url !== "/contact/") out.push(`${url}: carries the contact form's privacy notice`);
    return out;
  });
  assert.deepEqual(found, []);
});
