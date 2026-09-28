import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyLine, gateExit, loadAllow, runGated, stripAnsi } from "../scripts/ci/build-lib.mjs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const ALLOW_FILE = fileURLToPath(new URL("../scripts/ci/build-allow.json", import.meta.url));

// Lines as Astro 7.3 prints them (only the timestamp varies between runs).
const INFO = "21:51:27 [build] 5 page(s) built in 544ms";
const GLOB_WARN = '21:51:26 [WARN] [glob-loader] No files found matching "*.yaml" in directory "src/content/solutions"';
const REF_ERROR =
  '21:51:26 [ERROR] [content] Invalid content reference: entry "fixture-industry" in collection "industries" references "missing" in collection "solutions", but that entry does not exist.';
// With CI=true (GitHub Actions) Astro colours the whole prefix: yellow, with a bold timestamp.
const COLOURED_WARN = "\x1b[33m\x1b[1m21:51:26\x1b[22m [WARN] [vite]\x1b[39m Some chunks are larger than 500 kB after minification.";

const entry = (match) => ({ match, reason: "test entry" });

test("info lines, blank lines and untagged mentions of warnings are ok", () => {
  assert.equal(classifyLine(INFO), "ok");
  assert.equal(classifyLine(""), "ok");
  assert.equal(classifyLine("21:51:27   ├─ /insights/index.html (+7ms)"), "ok");
  assert.equal(classifyLine("a warning about nothing in particular"), "ok");
});

test("[WARN] and [ERROR] lines fail, with or without ANSI colours", () => {
  assert.equal(classifyLine(GLOB_WARN), "fail");
  assert.equal(classifyLine(REF_ERROR), "fail");
  assert.equal(classifyLine(COLOURED_WARN), "fail");
});

test("a flagged line is allowed only by an entry whose match it contains", () => {
  assert.equal(classifyLine(GLOB_WARN, [entry('No files found matching "*.yaml"')]), "allowed");
  assert.equal(classifyLine(GLOB_WARN, [entry("Some chunks are larger than 500 kB")]), "fail");
  assert.equal(classifyLine(REF_ERROR, [entry('No files found matching "*.yaml"')]), "fail");
});

test("allow entries match the colour-stripped text, and never change an ok line", () => {
  assert.equal(stripAnsi(COLOURED_WARN), "21:51:26 [WARN] [vite] Some chunks are larger than 500 kB after minification.");
  assert.equal(classifyLine(COLOURED_WARN, [entry("[WARN] [vite] Some chunks are larger")]), "allowed");
  assert.equal(classifyLine(INFO, [entry("5 page(s) built in")]), "ok");
});

test("the shipped build-allow.json is a valid, empty allow list (B1 ships a pristine build)", () => {
  assert.deepEqual(loadAllow(ALLOW_FILE), []);
});

test("loadAllow rejects a non-array, a missing reason and a match that is only a level tag", () => {
  const dir = mkdtempSync(join(tmpdir(), "build-allow-"));
  try {
    const write = (name, value) => {
      const path = join(dir, name);
      writeFileSync(path, JSON.stringify(value));
      return path;
    };
    assert.throws(() => loadAllow(write("object.json", { match: "x", reason: "y" })), /expected a JSON array/);
    assert.throws(() => loadAllow(write("no-reason.json", [{ match: 'No files found matching "*.yaml"' }])), /\[0\].*reason/);
    assert.throws(() => loadAllow(write("tag-only.json", [{ match: "[WARN] [vite]", reason: "too broad" }])), /\[0\].*match/);
    const ok = [{ match: 'No files found matching "*.yaml"', reason: "an empty collection on purpose" }];
    assert.deepEqual(loadAllow(write("ok.json", ok)), ok);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// runGated drives a real child process; `node -e` stands in for `astro build`.
function sink() {
  const chunks = [];
  return { write: (s) => chunks.push(String(s)), text: () => chunks.join("") };
}
async function gate(code, allow = []) {
  const out = sink();
  const err = sink();
  const result = await runGated(process.execPath, ["-e", code], { allow, out, err });
  return { ...result, out: out.text(), err: err.text() };
}

test("runGated streams stdout and stderr through and passes a clean run", async () => {
  const r = await gate(`console.log(${JSON.stringify(INFO)}); console.error("plain stderr line");`);
  assert.equal(r.code, 0);
  assert.deepEqual(r.failures, []);
  assert.equal(r.out, `${INFO}\n`);
  assert.equal(r.err, "plain stderr line\n");
});

test("runGated flags a [WARN] on stderr even though the command exits 0", async () => {
  const r = await gate(`console.log(${JSON.stringify(INFO)}); console.error(${JSON.stringify(COLOURED_WARN)});`);
  assert.equal(r.code, 0);
  assert.deepEqual(r.failures, [stripAnsi(COLOURED_WARN)]);
  assert.ok(r.err.includes(COLOURED_WARN), "the flagged line is still streamed through");
});

test("runGated reports allowed lines separately from failures", async () => {
  const r = await gate(`console.error(${JSON.stringify(GLOB_WARN)});`, [entry('No files found matching "*.yaml"')]);
  assert.deepEqual(r.failures, []);
  assert.deepEqual(r.allowed, [GLOB_WARN]);
});

test("runGated classifies a last line that has no trailing newline", async () => {
  const r = await gate(`process.stderr.write(${JSON.stringify(REF_ERROR)});`);
  assert.deepEqual(r.failures, [REF_ERROR]);
});

test("runGated passes a non-zero exit code back, and reports a signal kill as 1", async () => {
  assert.equal((await gate("process.exit(3)")).code, 3);
  assert.equal((await gate('process.kill(process.pid, "SIGTERM")')).code, 1);
});

// The verdict every `npm run build` rests on (Review Focus #1): astro's exit code alone is not enough.
test("gateExit fails a flagged line even when astro exits 0, passes astro's own failure code through, and passes a clean run", () => {
  const WARN = stripAnsi(COLOURED_WARN);
  assert.equal(gateExit({ code: 0, failures: [WARN] }), 1, "a [WARN] line with exit code 0 fails");
  assert.equal(gateExit({ code: 0, failures: [WARN, REF_ERROR] }), 1);
  assert.equal(gateExit({ code: 3, failures: [] }), 3, "astro's non-zero code passes through");
  assert.equal(gateExit({ code: 3, failures: [WARN] }), 3, "and wins over the line count");
  assert.equal(gateExit({ code: 1, failures: [] }), 1, "a signal kill (reported as 1) fails");
  assert.equal(gateExit({ code: 0, failures: [] }), 0, "clean");
});

test("build.mjs sets its exit code from gateExit and nothing else", () => {
  const src = readFileSync(new URL("../scripts/ci/build.mjs", import.meta.url), "utf8");
  assert.match(src, /import \{[^}]*\bgateExit\b[^}]*\} from "\.\/build-lib\.mjs"/);
  assert.match(src, /process\.exitCode = gateExit\(\{ code, failures \}\)/);
  assert.equal(src.match(/process\.exitCode\s*=(?!=)/g).length, 1, "one place sets the exit code");
  assert.doesNotMatch(src.replace(/\/\/.*$/gm, ""), /process\.exit\(/, "no immediate exit: piped output must flush first");
});

// A pristine build has no type diagnostics at all: astro check exits 0 on warnings and hints
// unless told otherwise (a deprecated API is a hint, ts6385).
const CHECK = "astro check --minimumFailingSeverity hint";

test("package.json runs astro check before the gated build, and gates the preview build", () => {
  assert.equal(pkg.scripts.check, CHECK);
  assert.ok(
    pkg.scripts.build.startsWith(`${CHECK} && node scripts/ci/build.mjs`),
    `build script: ${pkg.scripts.build}`,
  );
  assert.doesNotMatch(pkg.scripts.build, /(^|&&\s*)astro build/, "build must go through scripts/ci/build.mjs");
  assert.ok(
    pkg.scripts["build:preview"].startsWith("TECHSIDER_NAV_PREVIEW=1 node scripts/ci/build.mjs --outDir dist-preview && "),
    `build:preview script: ${pkg.scripts["build:preview"]}`,
  );
});

test("the type-check toolchain is dev-only, on TypeScript 5 (@astrojs/check 0.9 does not support 7)", () => {
  assert.equal(pkg.devDependencies["@astrojs/check"], "^0.9.10");
  assert.equal(pkg.devDependencies.typescript, "^5.9.3");
  assert.equal(pkg.dependencies["@astrojs/check"], undefined);
  assert.equal(pkg.dependencies.typescript, undefined);
  const ts = JSON.parse(readFileSync(new URL("../node_modules/typescript/package.json", import.meta.url), "utf8"));
  assert.equal(Number(ts.version.split(".")[0]), 5, `installed typescript ${ts.version}`);
});
