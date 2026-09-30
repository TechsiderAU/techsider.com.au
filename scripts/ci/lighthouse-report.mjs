// The Lighthouse report (spec §1 criteria 4 and 5), for ci.yml's report-only job:
//   node scripts/ci/lighthouse-report.mjs
// Mobile Lighthouse, performance and accessibility, on the vitals gate's pages
// (tests/support/vitals.mjs), against the production build in dist/ served locally. It writes each
// report to test-results/lighthouse/ and prints a table of the scores, LCP and CLS against the
// spec's targets, which the job summary shows too. A score below target fails nothing: the gate is
// tests/e2e/prod-vitals.spec.mjs. The script fails only when Lighthouse can't produce a report.
// Lighthouse isn't a dependency: npx fetches the pinned version on every run, so this runs in CI
// only, on Node 22.19 or later, with Playwright's Chromium as CHROME_PATH.
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "../../tests/support/serve.mjs";
import { CLS_BUDGET, LCP_BUDGET_MS, VITALS_PAGES } from "../../tests/support/vitals.mjs";
import { ROOT } from "./lib.mjs";

export const LIGHTHOUSE = "lighthouse@13.5.0";
/** Spec §1: Lighthouse (mobile) performance of at least 90 and accessibility of 100; §11.4: LCP and CLS. */
export const TARGETS = { performance: 90, accessibility: 100, lcpMs: LCP_BUDGET_MS, cls: CLS_BUDGET };
const OUT = join(ROOT, "test-results", "lighthouse");

/**
 * One page's row from its Lighthouse report (the JSON "LHR"). Throws when a category has no score,
 * which is Lighthouse reporting that it couldn't measure the page.
 * @param {string} path
 * @param {{ categories: Record<string, { score: number | null }>, audits: Record<string, { numericValue?: number }> }} lhr
 */
export function summarise(path, lhr) {
  const score = (id) => {
    const value = lhr.categories[id]?.score;
    if (typeof value !== "number") throw new Error(`${path}: Lighthouse has no ${id} score`);
    return Math.round(value * 100);
  };
  const performance = score("performance");
  const accessibility = score("accessibility");
  const lcpMs = Math.round(lhr.audits["largest-contentful-paint"]?.numericValue ?? NaN);
  const cls = Number((lhr.audits["cumulative-layout-shift"]?.numericValue ?? NaN).toFixed(3));
  const misses = [
    performance < TARGETS.performance && `performance ${performance} < ${TARGETS.performance}`,
    accessibility < TARGETS.accessibility && `accessibility ${accessibility} < ${TARGETS.accessibility}`,
    !(lcpMs < TARGETS.lcpMs) && `LCP ${lcpMs} ms ≥ ${TARGETS.lcpMs} ms`,
    !(cls < TARGETS.cls) && `CLS ${cls} ≥ ${TARGETS.cls}`,
  ].filter(Boolean);
  return { path, performance, accessibility, lcpMs, cls, misses };
}

/** The report as a Markdown table, one row per page. */
export function table(rows) {
  return [
    `### Lighthouse (mobile), ${LIGHTHOUSE}: report only`,
    "",
    "| Page | Performance | Accessibility | LCP | CLS | Below target |",
    "|---|---|---|---|---|---|",
    ...rows.map((r) => `| \`${r.path}\` | ${r.performance} | ${r.accessibility} | ${r.lcpMs} ms | ${r.cls} | ${r.misses.join("; ") || "none"} |`),
    "",
    `Targets: performance ≥ ${TARGETS.performance}, accessibility ${TARGETS.accessibility}, LCP < ${TARGETS.lcpMs} ms, CLS < ${TARGETS.cls} (spec §1, §11.4).`,
  ].join("\n");
}

/** Runs a command to completion, rejecting on a non-zero exit. */
function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", env: { ...process.env, ...env } });
    child.once("error", reject);
    child.once("exit", (code) => (code === 0 ? resolve(undefined) : reject(new Error(`${command} ${args.join(" ")} exited with ${code}`))));
  });
}

async function main() {
  const { chromium } = await import("@playwright/test");
  mkdirSync(OUT, { recursive: true });
  const server = await serve(join(ROOT, "dist"));
  try {
    const rows = [];
    for (const path of VITALS_PAGES) {
      const file = join(OUT, `${path.replace(/^\/|\/$/g, "").replaceAll("/", "-") || "home"}.json`);
      await run(
        "npx",
        [
          "--yes",
          LIGHTHOUSE,
          `${server.origin}${path}`,
          "--only-categories=performance,accessibility",
          "--output=json",
          `--output-path=${file}`,
          "--chrome-flags=--headless=new --no-sandbox",
          "--quiet",
        ],
        { CHROME_PATH: chromium.executablePath() },
      );
      rows.push(summarise(path, JSON.parse(readFileSync(file, "utf8"))));
    }
    const report = table(rows);
    console.log(report);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
  } finally {
    await server.close();
  }
}

/** True when this file is the script node was asked to run (not an import from a test). */
function invokedDirectly() {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false; // no script path: node -e, or a REPL
  }
}

if (invokedDirectly()) await main();
