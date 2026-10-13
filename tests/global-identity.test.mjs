// go-global S1 (spec §1, §10.3): no built page says Techsider is Australian, serves Australian
// organisations or targets Australia outside the contexts spec §1 allows. tests/support/s1-scan.mjs
// defines the scan; these tests pin it on synthetic markup: every banned string is found wherever
// it sits in a page, near misses pass, and each allowed context, and nothing else, is skipped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { S1_BANNED, bannedRegExp, s1Hits } from "./support/s1-scan.mjs";

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
