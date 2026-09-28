import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";

// Spec §11.5: CI runs the build gate, the CI checks and every test suite on each push and PR;
// the e2e suite runs in Chromium, WebKit and Firefox, plus a production-build shell check.
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
const workflow = (name) => parse(read(`.github/workflows/${name}`));
const pkg = JSON.parse(read("package.json"));
const PREVIEW = "http://127.0.0.1:4322";
const PROD = "http://127.0.0.1:4323";
const PROD_SPECS = "**/prod-*.spec.mjs";

test("test:e2e builds production and preview before Playwright starts", () => {
  assert.equal(pkg.scripts["test:e2e"], "npm run build && npm run build:preview && playwright test");
});

test("Playwright runs the preview specs in three engines and prod-* specs against dist/", async () => {
  const { default: config } = await import("../playwright.config.mjs");
  const projects = Object.fromEntries(config.projects.map((p) => [p.name, p]));
  assert.deepEqual(Object.keys(projects), ["chromium", "webkit", "firefox", "prod-chromium"]);
  for (const name of ["chromium", "webkit", "firefox"]) {
    assert.equal(projects[name].use.defaultBrowserType, name, name);
    assert.equal(projects[name].use.baseURL, PREVIEW, name);
    assert.equal(projects[name].testIgnore, PROD_SPECS, name);
  }
  assert.equal(projects["prod-chromium"].use.defaultBrowserType, "chromium");
  assert.equal(projects["prod-chromium"].use.baseURL, PROD);
  assert.equal(projects["prod-chromium"].testMatch, PROD_SPECS);
  assert.equal(projects.firefox.use.launchOptions?.firefoxUserPrefs?.["accessibility.tabfocus"], 7);
  assert.deepEqual(
    config.webServer.map((s) => [s.command, s.url]),
    [
      ["node tests/support/static-server.mjs dist-preview 4322", `${PREVIEW}/`],
      ["node tests/support/static-server.mjs dist 4323", `${PROD}/`],
    ],
  );
});

test("CI runs on every branch push and every pull request", () => {
  const ci = workflow("ci.yml");
  assert.deepEqual(ci.on.push, { branches: ["**"] });
  assert.ok("pull_request" in ci.on, "no pull_request trigger");
  assert.deepEqual(ci.permissions, { contents: "read" });
});

test("CI builds, checks and tests in order, on the engines-floor Node", () => {
  const job = workflow("ci.yml").jobs.test;
  assert.equal(job["runs-on"], "ubuntu-latest");
  assert.deepEqual(
    job.steps.map((s) => s.uses ?? s.run),
    [
      "actions/checkout@v5",
      "actions/setup-node@v5",
      "npm ci",
      "npm run build",
      "npm run build:preview",
      "npm test",
      "npx playwright install --with-deps chromium webkit firefox",
      "npx playwright test",
      "actions/upload-artifact@v7",
    ],
  );
  const node = job.steps.find((s) => s.uses === "actions/setup-node@v5");
  assert.equal(node.with["node-version"], "22.18");
  assert.equal(pkg.engines.node, ">=22.18.0", "CI pins the lowest Node that package.json allows");
  assert.equal(job.steps.at(-1).if, "failure()");
});

test("CI gates only pull requests into main; every other run reports", () => {
  const build = workflow("ci.yml").jobs.test.steps.find((s) => s.run === "npm run build");
  assert.equal(build.env.VERIFY_MODE, "${{ github.event_name == 'pull_request' && github.base_ref == 'main' && 'gate' || 'report' }}");
});

test("the deploy build runs the CI checks in gate mode", () => {
  const deploy = workflow("deploy.yml");
  assert.deepEqual(deploy.on.push, { branches: ["main"] });
  const build = deploy.jobs.build.steps.find((s) => s.uses?.startsWith("withastro/action@"));
  assert.equal(build.uses, "withastro/action@v6");
  assert.deepEqual(build.env, { VERIFY_MODE: "gate" });
});

test("focusKeys presses Option+Tab only in WebKit on macOS", async () => {
  const { focusKeys } = await import("./support/keys.mjs");
  assert.deepEqual(focusKeys("webkit", "darwin"), { next: "Alt+Tab", prev: "Alt+Shift+Tab" });
  for (const [browser, platform] of [["webkit", "linux"], ["chromium", "darwin"], ["chromium", "linux"], ["firefox", "darwin"], ["firefox", "linux"]]) {
    assert.deepEqual(focusKeys(browser, platform), { next: "Tab", prev: "Shift+Tab" }, `${browser} on ${platform}`);
  }
});

test("e2e specs move focus with focusKeys(), never a bare Tab key (macOS WebKit skips links on Tab)", () => {
  const dir = new URL("./e2e/", import.meta.url);
  const specs = readdirSync(dir).filter((f) => f.endsWith(".spec.mjs"));
  assert.ok(specs.length > 0);
  for (const f of specs) {
    const bare = readFileSync(new URL(f, dir), "utf8").match(/["'`](?:Shift\+)?Tab["'`]/g);
    assert.equal(bare, null, `${f} presses ${bare?.join(", ")}; use focusKeys(browserName) from tests/support/keys.mjs`);
  }
});
