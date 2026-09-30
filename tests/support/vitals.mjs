// The lab vitals gate (spec §1 criterion 4, §11.4): the pages it measures, its budgets and its
// arithmetic. tests/e2e/prod-vitals.spec.mjs is the gate; scripts/ci/lighthouse-report.mjs
// reports on the same pages without gating.

/**
 * Home, one solution page and one industry page (spec §1 criterion 4). The solution is ④ AI
 * Evaluation, the lead offer to enterprise and government (spec §1), whose six-package tab group is
 * the site's largest; the industry is Government, the longest industry page.
 */
export const VITALS_PAGES = ["/", "/solutions/ai-evaluation/", "/industries/government/"];

/** Spec §11.4's mobile targets: LCP under 2.0 s and CLS under 0.05. */
export const LCP_BUDGET_MS = 2000;
export const CLS_BUDGET = 0.05;

/**
 * Cumulative Layout Shift as web.dev defines it: the largest session window, where a window
 * gathers shifts less than 1 s apart and spans less than 5 s. The caller leaves out shifts that
 * had recent input.
 * @param {{ time: number, value: number }[]} shifts
 * @returns {number}
 */
export function clsOf(shifts) {
  let best = 0;
  let sum = 0;
  let first = 0;
  let prev = 0;
  let open = false;
  for (const { time, value } of [...shifts].sort((a, b) => a.time - b.time)) {
    if (open && time - prev < 1000 && time - first < 5000) {
      sum += value;
    } else {
      sum = value;
      first = time;
      open = true;
    }
    prev = time;
    best = Math.max(best, sum);
  }
  return best;
}

/**
 * The median of a non-empty list: the middle value, or the mean of the middle two.
 * @param {number[]} values
 * @returns {number}
 */
export function median(values) {
  if (values.length === 0) throw new Error("median() needs at least one value");
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
