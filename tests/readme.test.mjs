// The README is the repo's front page, and it had gone stale (B1 review finding BR-8). These tests
// keep it true to the repo: every command it runs is a package script, every repo path it names in
// prose exists, it covers the builds, the gallery, the test suites, the exception files and the
// fixtures rule, it describes no retired stack, and, like every other file here, it names no person,
// no headcount and no banned phrase.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { result } from "../scripts/ci/lib.mjs";
import { FAIL_PHRASES, WARN_PHRASES, scan } from "../scripts/ci/checks/04-banned-phrases.mjs";
import { CHECKS, LAUNCH_GATES } from "../scripts/ci/run-all.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const README = readFileSync(join(ROOT, "README.md"), "utf8");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
// Fenced blocks hold commands and sketches (such as a route that doesn't exist yet), so only the
// prose outside them is held to "every path exists".
const PROSE = README.replace(/^```[\s\S]*?^```/gm, "");
const REPO_PATH = /^(?:(?:\.github|public|scripts|src|tests)\/[\w./-]*|astro\.config\.mjs|playwright\.config\.mjs|package\.json)$/;
const HEADCOUNT =
  /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|a dozen)[\s-]+(?:person|people|staff|engineers?|consultants?|developers?|employees?|founders?)\b|\b(?:co-?founders?|founders?|headcount|our team of)\b/i;

test("every npm command in the README is a package script", () => {
  const scripts = [...README.matchAll(/\bnpm (?:run ([\w:-]+)|(test)\b)/g)].map((m) => m[1] ?? m[2]);
  assert.ok(scripts.length > 0, "the README runs no npm script");
  for (const name of new Set(scripts)) assert.ok(Object.hasOwn(pkg.scripts, name), `npm run ${name}: package.json has no such script`);
});

test("every repo path the README names in its prose exists", () => {
  const named = [...new Set([...PROSE.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]).filter((s) => REPO_PATH.test(s)))];
  assert.ok(named.length > 0, "the README names no repo path in backticks");
  assert.deepEqual(named.filter((p) => !existsSync(join(ROOT, p))), [], "the README names paths that don't exist");
});

test("the README covers both builds, the gallery, the test suites, the exception files, the fixtures and adding a page", () => {
  for (const s of [
    "npm run build", "npm run build:preview", "npm test", "npm run test:e2e", "npm run verify", "VERIFY_MODE",
    "TECHSIDER_NAV_PREVIEW=1", "/preview/", "src/preview/", "src/fixtures/", "src/templates/", "src/lib/views/",
    "scripts/ci/build-allow.json", "src/data/banned-phrase-exceptions.json", "src/data/metric-exceptions.json",
    "src/data/nav.ts", "siteContext(isPreview())",
  ]) {
    assert.ok(README.includes(s), `the README never mentions ${s}`);
  }
});

test("the README lists every CI check, names the launch gates, and gives the preview build's check profile", () => {
  for (const id of CHECKS) assert.ok(README.includes(`\`${id}\``), `the README doesn't list check ${id}`);
  for (const id of LAUNCH_GATES) {
    const row = README.split("\n").find((line) => line.includes(`\`${id}\``)) ?? "";
    assert.match(row, /launch gate/, `the README doesn't mark ${id} as a launch gate`);
  }
  const profile = pkg.scripts["build:preview"].match(/--checks (\S+)/)?.[1];
  assert.ok(profile, "the build:preview script runs no --checks profile");
  assert.ok(README.includes(`\`${profile}\``), `the README doesn't give build:preview's check profile ${profile}`);
});

test("the README names every Playwright project and the Node floor", async () => {
  const { default: config } = await import("../playwright.config.mjs");
  for (const { name } of config.projects) assert.ok(README.includes(`\`${name}\``), `the README doesn't name the ${name} project`);
  const floor = pkg.engines.node.replace(/^>=/, "").replace(/\.0$/, "");
  assert.ok(README.includes(`Node ${floor}`), `the README doesn't give the Node floor, ${floor}`);
});

test("the README's deploy notes match deploy.yml: main only, gated, and weekly when scheduled", () => {
  const deploy = parse(readFileSync(join(ROOT, ".github/workflows/deploy.yml"), "utf8"));
  assert.deepEqual(deploy.on.push, { branches: ["main"] });
  assert.ok(README.includes("`VERIFY_MODE=gate`"), "the README doesn't say the deploy build gates");
  const scheduled = Boolean(deploy.on.schedule);
  assert.equal(/\bweekly\b/.test(README), scheduled, scheduled ? "deploy.yml runs weekly, and the README doesn't say so" : "the README promises a weekly run that deploy.yml doesn't have");
});

test("the README describes no retired stack: Astro before 7, Three.js/WebGL, Garamond or Inter", () => {
  for (const re of [/\bAstro [1-6]\b/, /three\.js/i, /webgl/i, /garamond/i, /\bInter\b/]) {
    assert.equal(README.match(re)?.[0], undefined, `the README still describes the retired stack (${re})`);
  }
});

test("the README has no banned phrase, and names no person and no headcount", () => {
  const r = result();
  scan(README, "README.md", [], r, { lines: true, phrases: FAIL_PHRASES });
  scan(README, "README.md", [], r, { lines: true, phrases: WARN_PHRASES, kind: "warning" });
  assert.deepEqual([...r.errors, ...r.warnings], []);
  assert.equal(README.match(HEADCOUNT)?.[0], undefined, "the README gives a headcount or a role title");
  for (const email of README.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []) {
    assert.match(email, /@(?:techsider\.com\.au|example\.com)$/, `the README names a personal address: ${email}`);
  }
});

test("the README explains how a page goes live, and names the site-wide sweeps that hold every live page", () => {
  for (const s of [
    "### Putting a page live", "`planned`", "`live`", "`02-links`", "`07-verify-markers`", "⚑",
    "tests/site-sweep.test.mjs", "tests/e2e/prod-site-sweep.spec.mjs", "tests/content-language.test.mjs",
  ]) {
    assert.ok(README.includes(s), `the README never mentions ${s}`);
  }
});
