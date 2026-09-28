// Pristine-build gate (spec §11.5). Runs `astro build` with any extra arguments
// (`node scripts/ci/build.mjs --outDir dist-preview`), streams its output, and
// exits non-zero if astro fails or logs a [WARN]/[ERROR] line that
// scripts/ci/build-allow.json does not allow.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gateExit, loadAllow, runGated } from "./build-lib.mjs";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const ALLOW_FILE = fileURLToPath(new URL("./build-allow.json", import.meta.url));
const astroBin = join(dirname(createRequire(import.meta.url).resolve("astro/package.json")), "bin", "astro.mjs");

const allow = loadAllow(ALLOW_FILE);
// Astro only colours a piped log when CI is set; keep colours for a person at a terminal.
const colour = process.stdout.isTTY && !process.env.NO_COLOR ? { FORCE_COLOR: "1" } : {};
const { code, failures, allowed } = await runGated(process.execPath, [astroBin, "build", ...process.argv.slice(2)], {
  allow,
  cwd: ROOT,
  env: { ...process.env, ...colour },
});

if (allowed.length) {
  console.log(`\nbuild gate: ${allowed.length} line(s) allowed by scripts/ci/build-allow.json`);
}
if (failures.length) {
  console.error(
    `\nbuild gate: ${failures.length} unexpected [WARN]/[ERROR] line(s). Fix the cause, or add a { "match", "reason" } entry to scripts/ci/build-allow.json:`,
  );
  for (const line of failures) console.error(`  ${line}`);
}
if (code !== 0) console.error(`\nbuild gate: astro build exited with code ${code}`);
process.exitCode = gateExit({ code, failures }); // not process.exit(): let piped output flush first
if (process.exitCode === 0) console.log("\nbuild gate: clean (no unexpected [WARN]/[ERROR] lines)");
