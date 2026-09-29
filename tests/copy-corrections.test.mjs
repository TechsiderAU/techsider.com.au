import { test } from "node:test";
import assert from "node:assert/strict";
import { readDist, visibleText, allHtmlFiles } from "./helpers.mjs";

const insightPages = allHtmlFiles().filter((f) => f.startsWith("insights/") && f !== "insights/index.html");

test("insight posts exist in the build", () => {
  assert.ok(insightPages.length >= 3, `expected ≥3 insight posts, found ${insightPages.length}`);
});

test("no post or post footer offers a 'paid two-week discovery'", () => {
  for (const f of insightPages) {
    assert.doesNotMatch(visibleText(readDist(f)), /two-week discovery/i, f);
  }
});

test("no post body carries a CTA of its own: PostLayout's §10.1 closing prompt is the only one", () => {
  // Phase 0 (spec §9.4) closed each migrated post with a neutral "talk to us" mailto in place of the
  // paid-discovery line. From Phase C (blueprint correction WB-7) that line is gone, and PostLayout's
  // contextual prompt closes every post. Look only at the markdown body (PostLayout's Prose div, up to
  // the layout's closing prompt block), so the layout's own CTA doesn't count.
  for (const f of insightPages) {
    const html = readDist(f);
    const start = html.indexOf("data-prose");
    assert.ok(start >= 0, `${f}: Prose body not found`);
    const end = html.indexOf("data-post-closing", start);
    assert.ok(end > start, `${f}: no closing prompt after the post body`);
    const body = html.slice(start, end);
    assert.doesNotMatch(body, /href="(?:mailto:|\/contact\/)/, `${f}: the post body links to contact`);
    assert.doesNotMatch(visibleText(body), /\btalk to us\b/i, `${f}: the post body has its own "talk to us"`);
  }
});

test("renamed post keeps its URL and drops 'APRA audit'", () => {
  const page = visibleText(readDist("insights/rag-that-survives-an-apra-audit/index.html"));
  assert.match(page, /stands up to APRA scrutiny/);
  assert.doesNotMatch(page, /APRA audit/);
  const rss = readDist("rss.xml");
  assert.match(rss, /stands up to APRA scrutiny/);
  assert.doesNotMatch(rss, /survives an APRA audit/);
});

test("evals post example checks completeness (72 and 24 hours)", () => {
  const page = visibleText(readDist("insights/evals-before-vibes/index.html"));
  // Shiki may wrap each quote in its own <span>, so allow any non-word chars between tokens.
  assert.match(page, /must_contain\W+72 hours\W+24 hours/);
});

test("Industries copy makes no IRAP/ISM alignment claim", () => {
  const home = visibleText(readDist("index.html"));
  assert.doesNotMatch(home, /IRAP-aligned|ISM- and IRAP/);
});

test("no page links to the GitHub org", () => {
  for (const f of allHtmlFiles()) {
    assert.doesNotMatch(readDist(f), /github\.com\/TechsiderAU/i, f);
  }
});
