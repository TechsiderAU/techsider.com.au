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

test("every post ends with a 'Talk to us' CTA", () => {
  for (const f of insightPages) {
    assert.match(visibleText(readDist(f)), /Talk to us/, f);
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
