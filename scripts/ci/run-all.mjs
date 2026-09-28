// Runs the site CI checks (spec §11.5) against a built site:
//   node scripts/ci/run-all.mjs [--dist <dir>] [--checks <ids>]
// <dir> is relative to the repo root (default: dist). <ids> is a comma-separated list of check
// numbers or ids ("03,04" or "03-anchors"); the default is every check. `npm run build:preview`
// runs the preview profile (03, 04, 05, 06, 10, 11) against dist-preview/, where the components
// and templates render.
// Check 9 (type-check and pristine build) is `astro check` plus scripts/ci/build.mjs,
// and check 12 (axe smoke) is the Playwright suite, so neither runs here.
// VERIFY_MODE=gate turns the launch gates (07, 08) from warnings into errors; any
// other value, or none, is report mode. Exits 1 when any check reports an error.
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOT } from "./lib.mjs";

export const CHECKS = [
  "01-slugs",
  "02-links",
  "03-anchors",
  "04-banned-phrases",
  "05-captions",
  "06-provenance",
  "07-verify-markers",
  "08-regulatory-kits",
  "10-package-status",
  "11-pricing",
];
/** Open items here are printed on the branch and fail only the launch PR and the deploy. */
export const LAUNCH_GATES = ["07-verify-markers", "08-regulatory-kits"];

/**
 * The checks named by a --checks value, in CHECKS order: each item is a check's number ("03")
 * or full id ("03-anchors"). Throws on an empty list or an unknown item.
 * @param {string} value
 * @returns {string[]}
 */
export function parseChecks(value) {
  const items = String(value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) throw new Error("--checks needs a comma-separated list of check numbers or ids");
  const picked = new Set();
  for (const item of items) {
    const id = CHECKS.find((c) => c === item || c.split("-")[0] === item);
    if (!id) throw new Error(`--checks: unknown check "${item}" (known: ${CHECKS.join(", ")})`);
    picked.add(id);
  }
  return CHECKS.filter((c) => picked.has(c));
}

/** @returns {"gate" | "report"} */
export function modeFromEnv(env = process.env) {
  return env.VERIFY_MODE === "gate" ? "gate" : "report";
}

/**
 * Runs the checks in order. A check that throws counts as one error, so a
 * broken check can never pass silently.
 * @param {{ root?: string, dist: string, mode?: "gate" | "report", checks?: string[] }} options
 * @returns {Promise<{ mode: "gate" | "report", failed: boolean,
 *   results: { id: string, errors: string[], warnings: string[] }[] }>}
 */
export async function runAll({ root = ROOT, dist, mode = "report", checks = CHECKS }) {
  const results = [];
  for (const id of checks) {
    try {
      const { run } = await import(new URL(`./checks/${id}.mjs`, import.meta.url));
      const { errors = [], warnings = [] } = await run({ root, dist, mode });
      results.push({ id, errors: [...errors], warnings: [...warnings] });
    } catch (e) {
      results.push({ id, errors: [`the check crashed: ${e?.stack ?? e}`], warnings: [] });
    }
  }
  return { mode, failed: results.some((r) => r.errors.length > 0), results };
}

const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** A header, one line per check, one indented line per finding ("x" error, "!" warning), and a verdict. */
export function formatReport({ mode, failed, results }, distLabel) {
  const lines = [`verify: ${count(results.length, "check")} against ${distLabel} (VERIFY_MODE=${mode})`];
  for (const { id, errors, warnings } of results) {
    const status = errors.length ? "FAIL" : warnings.length ? "warn" : "ok";
    const tally = [errors.length && count(errors.length, "error"), warnings.length && count(warnings.length, "warning")]
      .filter(Boolean)
      .join(", ");
    const gate = mode === "report" && warnings.length && LAUNCH_GATES.includes(id) ? "; launch gate, fails with VERIFY_MODE=gate" : "";
    lines.push(`  ${status.padEnd(4)} ${id}${tally ? ` (${tally}${gate})` : ""}`);
    for (const e of errors) lines.push(`         x ${e}`);
    for (const w of warnings) lines.push(`         ! ${w}`);
  }
  const failing = results.filter((r) => r.errors.length > 0).length;
  const warned = results.reduce((n, r) => n + r.warnings.length, 0);
  lines.push(
    failed
      ? `verify: ${count(failing, "check")} failed`
      : `verify: all ${count(results.length, "check")} passed${warned ? ` (${count(warned, "warning")})` : ""}`,
  );
  return lines.join("\n");
}

const USAGE = "usage: node scripts/ci/run-all.mjs [--dist <dir>] [--checks <ids>]";

async function main(args) {
  const at = args.indexOf("--dist");
  const distArg = at === -1 ? "dist" : args[at + 1];
  const checksAt = args.indexOf("--checks");
  let checks = CHECKS;
  try {
    if (!distArg) throw new Error("--dist needs a directory");
    if (checksAt !== -1) checks = parseChecks(args[checksAt + 1]);
  } catch (e) {
    console.error(`${e.message}\n${USAGE}`);
    process.exitCode = 2;
    return;
  }
  const dist = resolve(ROOT, distArg);
  if (!existsSync(dist)) {
    console.error(`verify: ${distArg} does not exist; build the site first`);
    process.exitCode = 1;
    return;
  }
  const summary = await runAll({ root: ROOT, dist, mode: modeFromEnv(), checks });
  console.log(formatReport(summary, distArg));
  if (summary.failed) process.exitCode = 1; // not process.exit(): let the report flush
}

/** True when this file is the script node was asked to run (not an import from a test). */
function invokedDirectly() {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false; // no script path: node -e, or a REPL
  }
}

if (invokedDirectly()) await main(process.argv.slice(2));
