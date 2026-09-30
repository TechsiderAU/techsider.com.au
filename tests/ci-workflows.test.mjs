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
const VITALS_SPECS = "**/prod-vitals.spec.mjs";
/** withastro/action v6.1.3, pinned by commit (https://github.com/withastro/action/releases/tag/v6.1.3). */
const WITHASTRO_ACTION = "withastro/action@3eafd002e65cc31b4f0eae0bb05450d521562247";
const WEEKLY_REBUILD = "0 20 * * 0";
const DAILY_WATCH = "30 21 * * *";

test("test:e2e builds production and preview before Playwright starts", () => {
  assert.equal(pkg.scripts["test:e2e"], "npm run build && npm run build:preview && playwright test");
});

test("Playwright runs the preview specs in three engines and prod-* specs against dist/", async () => {
  const { default: config } = await import("../playwright.config.mjs");
  const projects = Object.fromEntries(config.projects.map((p) => [p.name, p]));
  assert.deepEqual(Object.keys(projects), ["chromium", "webkit", "firefox", "prod-chromium", "prod-vitals"]);
  for (const name of ["chromium", "webkit", "firefox"]) {
    assert.equal(projects[name].use.defaultBrowserType, name, name);
    assert.equal(projects[name].use.baseURL, PREVIEW, name);
    assert.equal(projects[name].testIgnore, PROD_SPECS, name);
  }
  assert.equal(projects["prod-chromium"].use.defaultBrowserType, "chromium");
  assert.equal(projects["prod-chromium"].use.baseURL, PROD);
  assert.equal(projects["prod-chromium"].testMatch, PROD_SPECS);
  assert.equal(projects["prod-chromium"].testIgnore, VITALS_SPECS, "the vitals gate runs in prod-vitals only");
  assert.equal(projects.firefox.use.launchOptions?.firefoxUserPrefs?.["accessibility.tabfocus"], 7);
  assert.deepEqual(
    config.webServer.map((s) => [s.command, s.url]),
    [
      ["node tests/support/static-server.mjs dist-preview 4322", `${PREVIEW}/`],
      ["node tests/support/static-server.mjs dist 4323", `${PROD}/`],
      ["node tests/support/mock-form.mjs 4324", "http://127.0.0.1:4324/"],
    ],
  );
});

test("prod-vitals runs the vitals gate alone: after every other project, one load at a time, in the real Chrome build", async () => {
  const { default: config } = await import("../playwright.config.mjs");
  const vitals = config.projects.find((p) => p.name === "prod-vitals");
  assert.equal(vitals.testMatch, VITALS_SPECS);
  assert.deepEqual(vitals.dependencies, ["chromium", "webkit", "firefox", "prod-chromium"]);
  assert.equal(vitals.workers, 1);
  assert.equal(vitals.fullyParallel, false);
  assert.equal(vitals.use.defaultBrowserType, "chromium");
  assert.equal(vitals.use.channel, "chromium", "new headless: the real Chrome build, not the headless shell");
  assert.equal(vitals.use.trace, "off", "a trace records DOM snapshots and a screencast during the load it measures");
  assert.equal(vitals.use.baseURL, undefined, "the spec serves dist/ itself, with latency");
});

test("a failed e2e test keeps its trace for the CI artifact, and retries stay off", async () => {
  // Firefox and Linux WebKit first run in CI: a failure there must leave more than a screenshot.
  const { default: config } = await import("../playwright.config.mjs");
  assert.equal(config.use.trace, "retain-on-failure");
  assert.equal(config.use.screenshot, "only-on-failure");
  assert.equal(config.retries ?? 0, 0, "a flaky test must fail, not pass on a retry");
  for (const p of config.projects) assert.equal(p.retries, undefined, p.name);
  const upload = workflow("ci.yml").jobs.test.steps.find((s) => s.uses === "actions/upload-artifact@v7");
  assert.equal(upload.with.path, "test-results/", "the traces live in test-results/");
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

test("a report-only Lighthouse job runs weekly, on demand and on a pull request into main, never on a push", async () => {
  const ci = workflow("ci.yml");
  assert.deepEqual(ci.on.schedule, [{ cron: "0 21 * * 0" }]);
  assert.ok("workflow_dispatch" in ci.on, "no workflow_dispatch trigger");
  assert.equal(ci.concurrency.group, "ci-${{ github.event_name }}-${{ github.ref }}", "a scheduled run must not cancel a push to main");
  assert.equal(ci.jobs.test.if, "github.event_name == 'push' || github.event_name == 'pull_request'");
  const job = ci.jobs.lighthouse;
  // The launch pull request gets a report before the merge; no other pull request does.
  assert.equal(job.if, "github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' || (github.event_name == 'pull_request' && github.base_ref == 'main')");
  assert.deepEqual(
    job.steps.map((s) => s.uses ?? s.run),
    [
      "actions/checkout@v5",
      "actions/setup-node@v5",
      "npm ci",
      "npm run build",
      "npx playwright install --with-deps chromium",
      "node scripts/ci/lighthouse-report.mjs",
      "actions/upload-artifact@v7",
    ],
  );
  // Lighthouse 13.5.0 needs Node 22.19 or later: the latest 22, not the test job's floor.
  assert.equal(job.steps.find((s) => s.uses === "actions/setup-node@v5").with["node-version"], "22");
  const upload = job.steps.at(-1);
  assert.equal(upload.if, "always()");
  assert.equal(upload.with.path, "test-results/lighthouse/");
  const { LIGHTHOUSE } = await import("../scripts/ci/lighthouse-report.mjs");
  assert.equal(LIGHTHOUSE, "lighthouse@13.5.0", "one exact version: npx fetches it on every run");
});

// Interim, by the owner's decision of 2026-09-30: the site deploys before its launch items are
// cleared, so the deploy build reports the launch gates' open items instead of failing on them.
// At launch this goes back to { VERIFY_MODE: "gate" } (an item on the owner checklist).
test("the deploy build runs the CI checks in report mode during the owner's interim deploy", () => {
  const deploy = workflow("deploy.yml");
  assert.deepEqual(deploy.on.push, { branches: ["main"] });
  const build = deploy.jobs.build.steps.find((s) => s.uses?.startsWith("withastro/action@"));
  assert.equal(build.uses, WITHASTRO_ACTION);
  assert.deepEqual(build.env, { VERIFY_MODE: "report" });
});

test("withastro/action is pinned by commit to v6.1.3, a release that uploads dotfiles, so /.well-known/ reaches Pages", () => {
  // v6.1.0 put include-hidden-files: true on its upload-pages-artifact step, and v6.1.1 pinned that
  // action by commit; upload-pages-artifact otherwise leaves every dotfile out of the artifact.
  assert.match(WITHASTRO_ACTION, /^withastro\/action@[0-9a-f]{40}$/);
  const line = read(".github/workflows/deploy.yml").split("\n").find((l) => l.includes(WITHASTRO_ACTION));
  const version = line?.match(/# v(\d+)\.(\d+)\.(\d+)\s*$/)?.slice(1).map(Number);
  assert.ok(version, "the pinned line names its release in a trailing comment, e.g. # v6.1.3");
  const [major, minor, patch] = version;
  assert.ok(major === 6 && (minor > 1 || (minor === 1 && patch >= 1)), `withastro/action v${version.join(".")}: v6.1.1 or a later v6.x`);
});

test("the deploy workflow rebuilds weekly, so Home's 45-day insights rule and security.txt's Expires stay fresh without a push", () => {
  const deploy = workflow("deploy.yml");
  assert.deepEqual(Object.keys(deploy.on).sort(), ["push", "schedule", "workflow_dispatch"]);
  assert.deepEqual(deploy.on.schedule, [{ cron: WEEKLY_REBUILD }, { cron: DAILY_WATCH }]);
  assert.deepEqual(Object.keys(deploy.jobs), ["build", "deploy", "live-check"]);
  // The weekly run builds the same way as a push: one build job, gated, then the deploy. Only the
  // daily live watch skips them, and the deploy follows the build.
  assert.equal(deploy.jobs.build.if, `github.event.schedule != '${DAILY_WATCH}'`, "the build job must skip only the daily live watch");
  assert.equal(deploy.jobs.deploy.needs, "build");
  assert.equal(deploy.jobs.deploy.if, undefined, "the deploy job must follow the build job");
  // A run queued in a group cancels the one pending there, so the watch, which deploys nothing,
  // stays out of `pages`, where it could cancel a push waiting to deploy.
  assert.deepEqual(deploy.concurrency, { group: `\${{ github.event.schedule == '${DAILY_WATCH}' && 'live-watch' || 'pages' }}`, "cancel-in-progress": false });
});

test("live-check checks the live domain after every deploy and daily, on main only, with read access only", () => {
  const job = workflow("deploy.yml").jobs["live-check"];
  assert.equal(job.needs, "deploy");
  // !cancelled() lets the daily watch run with the build and deploy skipped; the rest keeps it to
  // main and to a deploy that succeeded.
  assert.equal(
    job.if,
    `\${{ !cancelled() && github.ref == 'refs/heads/main' && (needs.deploy.result == 'success' || github.event.schedule == '${DAILY_WATCH}') }}`,
  );
  assert.deepEqual(job.permissions, { contents: "read" });
  assert.equal(job["timeout-minutes"], 25, "15 minutes of freshness polling, then the checks");
  // Exit 3 is warnings alone (security.txt's Content-Type, while STRICT_TXT_TYPE is false): the step
  // passes, and the script's ::warning:: line annotates the run (controller ruling 4).
  assert.deepEqual(job.steps.map((s) => s.uses ?? s.run), ["actions/checkout@v5", "actions/setup-node@v5", "node scripts/ci/live-check.mjs || test $? -eq 3"]);
  assert.equal(job.steps[1].with["node-version"], "22.18", "the engines floor, as in ci.yml");
  assert.equal(job.steps.some((s) => /npm (ci|install)/.test(s.run ?? "")), false, "the check has no dependencies to install");
  assert.deepEqual(job.steps[2].env, { EXPECT_SHA: "${{ needs.deploy.result == 'success' && github.sha || '' }}" });
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
