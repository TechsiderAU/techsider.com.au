// The lab vitals gate's arithmetic (tests/support/vitals.mjs): CLS as web.dev's session windows,
// and the median of five runs that tests/e2e/prod-vitals.spec.mjs gates (spec §11.4).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { CLS_BUDGET, LCP_BUDGET_MS, VITALS_PAGES, clsOf, median } from "./support/vitals.mjs";
import { readDist } from "./helpers.mjs";

const shift = (time, value) => ({ time, value });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

test("clsOf: no shift is 0, and shifts less than 1 s apart add up in one window", () => {
  assert.equal(clsOf([]), 0);
  close(clsOf([shift(100, 0.01)]), 0.01);
  close(clsOf([shift(100, 0.01), shift(900, 0.02), shift(1800, 0.03)]), 0.06);
});

test("clsOf: a gap of 1 s or more starts a new window, and the largest window is the score", () => {
  close(clsOf([shift(0, 0.02), shift(500, 0.02), shift(1500, 0.03)]), 0.04);
  close(clsOf([shift(0, 0.01), shift(2000, 0.03), shift(2500, 0.03)]), 0.06);
  close(clsOf([shift(2500, 0.03), shift(0, 0.01), shift(2000, 0.03)]), 0.06); // order doesn't matter
});

test("clsOf: a window ends before it spans 5 s, however close its shifts", () => {
  // A shift every 0.5 s from 0 s to 7 s: the first window takes 0 s to 4.5 s (ten shifts), and the
  // shift at 5 s opens a second window (5 s to 7 s, five shifts).
  const steady = Array.from({ length: 15 }, (_, i) => shift(i * 500, 0.01));
  close(clsOf(steady), 0.1);
});

test("median: the middle of an odd list, the mean of the middle two of an even one, and never of nothing", () => {
  assert.equal(median([1800, 900, 1200, 1100, 1000]), 1100);
  assert.equal(median([0.02, 0.01]), 0.015);
  assert.equal(median([7]), 7);
  assert.throws(() => median([]), /at least one value/);
});

test("the gate measures spec §11.4's pages against its targets, and every page is in the production build", () => {
  assert.deepEqual([LCP_BUDGET_MS, CLS_BUDGET], [2000, 0.05]);
  assert.equal(VITALS_PAGES[0], "/");
  assert.ok(VITALS_PAGES.some((p) => /^\/solutions\/[a-z0-9-]+\/$/.test(p)), "no solution page");
  assert.ok(VITALS_PAGES.some((p) => /^\/industries\/[a-z0-9-]+\/$/.test(p)), "no industry page");
  for (const path of VITALS_PAGES) {
    const rel = `${path.slice(1)}index.html`;
    assert.ok(existsSync(new URL(`../dist/${rel}`, import.meta.url)), `dist/${rel} is missing: run npm run build`);
    assert.match(readDist(rel), /<main\b/, `${path} has no <main>`);
  }
});
