// The Phase D carry-overs (Phase D ledger ruling R6; Phase E controller ruling 8), each held by a test:
// - NB-1: a table of seven or more columns (the ⑤ vendor facts) is marked wide, and stays as cards
//   until 53rem: from 768px to 832px it was wider than its DemoFrame on /demos/ai-switch-on/, and
//   "September" broke mid-word. tests/e2e/prod-site-sweep.spec.mjs measures it at 768px, 800px and
//   832px;
// - the ④ demo frame says "Illustrative" once: its badge (REPORT_BADGE) says so and is the frame's
//   label, with no "Illustrative data" beside it;
// - the "What you already pay for" nav one-liner names add-ons as well as what a plan includes;
// - no comment still calls the ③ drafts internal: they go to a contractor, a property manager or
//   an owner, never a tenant (final review D9-F4);
// - the APRA post's refusal paragraph escalates "to a person", with no em dash.
// The fixed-copy pin's title (tests/fixed-copy.test.mjs) and the mid-market language guard on the ⑤
// demo page (tests/content-language.test.mjs) are held in those files.
// Run `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, elementsWith, htmlFiles, listFiles, pageUrl, readText, relPath, visibleText } from "../scripts/ci/lib.mjs";
import { PAGES } from "../src/data/nav.ts";
import { REPORT_BADGE } from "../src/lib/fixed-copy.ts";

const DIST = join(ROOT, "dist");
const text = (html) => visibleText(html).trim();

test("NB-1: a table of seven or more columns, and only such a table, is marked wide; the ⑤ vendor tables are", () => {
  const wide = new Set();
  for (const file of htmlFiles(DIST)) {
    for (const wrapper of elementsWith(readText(file), "data-data-table")) {
      const columns = (wrapper.inner.split("</thead>")[0].match(/<th\b/g) ?? []).length;
      const marked = (wrapper.attrs.class ?? "").split(/\s+/).includes("data-table-wide");
      assert.equal(marked, columns >= 7, `${pageUrl(DIST, file)}: a ${columns}-column table ${marked ? "is" : "isn't"} marked wide`);
      if (marked) wide.add(pageUrl(DIST, file));
    }
  }
  assert.deepEqual([...wide].sort(), ["/demos/ai-switch-on/", "/resources/what-you-already-pay-for/"]);
});

test("④'s demo frame says 'Illustrative' once: its badge is the frame's label, with no 'Illustrative data' beside it", () => {
  const frames = elementsWith(readText(join(DIST, "demos/ai-evaluation/index.html")), "data-demo-frame");
  assert.equal(frames.length, 1);
  const [frame] = frames;
  assert.equal((text(frame.outer).match(/\bIllustrative\b/g) ?? []).length, 1, "the frame says Illustrative more than once");
  const [badge] = elementsWith(frame.inner, "data-demo-badge");
  assert.equal(text(badge.inner), REPORT_BADGE);
  assert.ok("data-provenance-label" in badge.attrs, "the badge isn't the frame's label");
  assert.deepEqual(elementsWith(frame.inner, "data-provenance-label").map((l) => text(l.inner)), [REPORT_BADGE]);
});

test("the checker's nav one-liner names add-ons as well as what a plan includes", () => {
  const entry = PAGES.find((p) => p.path === "/resources/what-you-already-pay-for/");
  assert.match(entry.oneLiner, /\badd-ons?\b/);
  assert.doesNotMatch(entry.oneLiner, /\balready includes\b/);
});

test("no comment in src/ or tests/ still calls the ③ drafts internal: they go to a contractor, a property manager or an owner (D9-F4)", () => {
  const stale = /^\s*(?:\/\/|\*|#).*\bdrafts are internal\b/im;
  const files = [...listFiles(join(ROOT, "src")), ...listFiles(join(ROOT, "tests"))].filter((f) => /\.(astro|ts|mjs|md|ya?ml)$/.test(f));
  assert.deepEqual(files.filter((f) => stale.test(readFileSync(f, "utf8"))).map((f) => relPath(ROOT, f)), []);
});

test("the APRA post's refusal paragraph: the system escalates to a person, and it has no em dash", () => {
  const post = readFileSync(join(ROOT, "src/content/insights/rag-that-survives-an-apra-audit.md"), "utf8");
  const paragraph = post.split("\n").find((line) => line.startsWith("The single most valuable behaviour"));
  assert.ok(paragraph, "the refusal paragraph is gone");
  assert.match(paragraph, /\bthe system escalates to a person rather than guessing\b/);
  assert.doesNotMatch(paragraph, /\bhuman\b/);
  assert.doesNotMatch(paragraph, /—/);
});
