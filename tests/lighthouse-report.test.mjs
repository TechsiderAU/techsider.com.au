// scripts/ci/lighthouse-report.mjs, the weekly report-only Lighthouse job's summary (spec §1
// criteria 4 and 5). Lighthouse itself runs in CI only (npx fetches it), so these tests feed the
// summary reports shaped as Lighthouse writes them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIGHTHOUSE, TARGETS, summarise, table } from "../scripts/ci/lighthouse-report.mjs";

/** A Lighthouse JSON report (LHR), cut down to the fields the summary reads. */
const lhr = ({ performance = 0.97, accessibility = 1, lcp = 1480.4, cls = 0.0123 } = {}) => ({
  categories: { performance: { score: performance }, accessibility: { score: accessibility } },
  audits: { "largest-contentful-paint": { numericValue: lcp }, "cumulative-layout-shift": { numericValue: cls } },
});

test("a page that meets spec §1 and §11.4 has its scores, LCP and CLS, and nothing below target", () => {
  assert.deepEqual(summarise("/", lhr()), { path: "/", performance: 97, accessibility: 100, lcpMs: 1480, cls: 0.012, misses: [] });
  assert.deepEqual(TARGETS, { performance: 90, accessibility: 100, lcpMs: 2000, cls: 0.05 });
});

test("each target a page misses is named, and a missing score means Lighthouse couldn't measure the page", () => {
  const row = summarise("/industries/government/", lhr({ performance: 0.84, accessibility: 0.96, lcp: 2310, cls: 0.07 }));
  assert.deepEqual(row.misses, ["performance 84 < 90", "accessibility 96 < 100", "LCP 2310 ms ≥ 2000 ms", "CLS 0.07 ≥ 0.05"]);
  assert.throws(() => summarise("/", lhr({ performance: null })), /\/: Lighthouse has no performance score/);
});

test("the table has one row per page and the pinned version, and reports rather than fails", () => {
  const md = table([summarise("/", lhr()), summarise("/solutions/ai-evaluation/", lhr({ performance: 0.88 }))]);
  assert.equal(LIGHTHOUSE, "lighthouse@13.5.0");
  assert.match(md, /Lighthouse \(mobile\), lighthouse@13\.5\.0: report only/);
  assert.match(md, /^\| `\/` \| 97 \| 100 \| 1480 ms \| 0\.012 \| none \|$/m);
  assert.match(md, /^\| `\/solutions\/ai-evaluation\/` \| 88 \| 100 \| 1480 ms \| 0\.012 \| performance 88 < 90 \|$/m);
});
