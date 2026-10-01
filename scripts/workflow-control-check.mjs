// Reproducible local control check. No model, credentials, customer data or network requests.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
export function permits(item) {
  if (item.paused || !item.authorised || !["read", "draft", "send", "update"].includes(item.action)) return false;
  if (["read", "draft"].includes(item.action)) return true;
  return item.canWrite && !item.alreadyExecuted && item.approval?.item === item.id && item.approval?.version === item.version;
}

export function evaluate(cases, policy = permits) {
  return cases.map((item) => {
    const allowed = Boolean(policy(item.input));
    return { id: item.id, control: item.control, expected: item.expected, observed: allowed, pass: allowed === item.expected };
  });
}

export function report() {
  const fixture = readFileSync(new URL("public/downloads/workflow-control-cases.json", root), "utf8");
  const cases = JSON.parse(fixture).cases;
  const results = evaluate(cases);
  // Deliberately unsafe comparison: ignores the approval version, pause and execution record.
  const mutation = evaluate(cases, (item) => item.authorised && ["read", "draft", "send", "update"].includes(item.action));
  return {
    name: "Synthetic workflow control check", version: "1.0", recordedDate: "2026-10-02",
    method: "Execute the local permission function against ten separately specified expected decisions. Also run a deliberately unsafe comparison to show which cases detect missing controls.",
    scope: "Deterministic permission decisions only. No AI model, external system or real message is used. These results do not measure AI accuracy, production security or time saved.",
    fixtureSha256: createHash("sha256").update(fixture).digest("hex"),
    command: "node scripts/workflow-control-check.mjs", cases: cases.length,
    passed: results.filter((r) => r.pass).length, results,
    deliberatelyUnsafeComparison: { passed: mutation.filter((r) => r.pass).length, results: mutation },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const output = report();
  const path = new URL("public/downloads/workflow-control-report.json", root);
  if (process.argv.includes("--check")) {
    if (readFileSync(path, "utf8") !== JSON.stringify(output, null, 2) + "\n") throw new Error("Recorded control report differs from the reproducible run.");
  } else writeFileSync(path, JSON.stringify(output, null, 2) + "\n");
  console.log(`${output.passed}/${output.cases} expected decisions; unsafe comparison ${output.deliberatelyUnsafeComparison.passed}/${output.cases}. No network actions.`);
  if (output.passed !== output.cases) process.exitCode = 1;
}
