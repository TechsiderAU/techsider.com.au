// CI checks 7, 8, 10 and 11 (spec §11.5) against synthetic trees in a temp dir, and
// the runner against the real production build in dist/ (run `npm run build` first).
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findAll, normalizeQuotes, phraseRegExp } from "../scripts/ci/lib.mjs";
import { run as verifyMarkers } from "../scripts/ci/checks/07-verify-markers.mjs";
import { run as regulatoryKits } from "../scripts/ci/checks/08-regulatory-kits.mjs";
import { run as packageStatus } from "../scripts/ci/checks/10-package-status.mjs";
import { CURRENCY, run as pricing } from "../scripts/ci/checks/11-pricing.mjs";
import { CHECKS, formatReport, modeFromEnv, runAll } from "../scripts/ci/run-all.mjs";
import { allHtmlFiles, readDist, visibleText } from "./helpers.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = join(ROOT, "dist");
const RUN_ALL = join(ROOT, "scripts/ci/run-all.mjs");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const temps = [];
after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway repo tree. String bodies are written as-is, anything else as JSON (which is also valid YAML). */
function tree(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "ci-checks-b-"));
  temps.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, typeof body === "string" ? body : JSON.stringify(body, null, 2));
  }
  return { root, dist: join(root, "dist") };
}

const page = (body) => `<!doctype html><html lang="en-AU"><head><title>Fixture</title></head><body><main>${body}</main></body></html>`;
const sorted = (list) => [...list].sort();
/** `file[:line]: "match"`: a finding without check 04's category and excerpt. */
const where = (finding) => finding.replace(/ \(.*$/, "");

// ---------- 07: verify markers (launch gate) ----------

const MARKED = {
  "src/content/industries/fixture-industry.yaml": "promise: Fixture promise ⚑ check the figure\n",
  "src/data/regulatory/fixture-industry.json": '{ "rows": [], "note": "VERIFY: Fixture source date" }\n',
  "src/pages/fixture.astro": "<p>Fixture page</p>\n<p>VERIFY the Fixture claim</p>\n",
  "src/components/FixtureCard.astro": "<p>Fixture card ⚑</p>\n",
};
const MARKER_FINDINGS = [
  "src/components/FixtureCard.astro:1: open ⚑ marker",
  "src/content/industries/fixture-industry.yaml:1: open ⚑ marker",
  "src/data/regulatory/fixture-industry.json:1: open VERIFY marker",
  "src/pages/fixture.astro:2: open VERIFY marker",
];

test("07: ⚑ and VERIFY markers in content, data, pages and components are warnings in report mode", async () => {
  const r = await verifyMarkers({ ...tree(MARKED), mode: "report" });
  assert.equal(r.name, "07-verify-markers");
  assert.deepEqual(r.errors, []);
  assert.deepEqual(sorted(r.warnings), MARKER_FINDINGS);
});

test("07: the same markers are errors in gate mode", async () => {
  const r = await verifyMarkers({ ...tree(MARKED), mode: "gate" });
  assert.deepEqual(sorted(r.errors), MARKER_FINDINGS);
  assert.deepEqual(r.warnings, []);
});

test("07: lower-case verify, longer words, the exception lists and files outside the scopes pass", async () => {
  const t = tree({
    "src/content/insights/fixture-post.md": "We verify every Fixture figure. Unverified claims are cut. VERIFYING is another word.\n",
    "src/data/banned-phrase-exceptions.json": '[{ "file": "dist", "phrase": "VERIFY", "reason": "Fixture ⚑" }]\n',
    "src/data/metric-exceptions.json": '[{ "file": "dist", "token": "VERIFY", "reason": "Fixture ⚑" }]\n',
    "src/fixtures/fixture.ts": 'export const note = "VERIFY ⚑";\n',
    "src/lib/fixture.ts": "// VERIFY ⚑\n",
    "src/styles/fixture.css": "/* VERIFY ⚑ */\n",
  });
  const clean = { name: "07-verify-markers", errors: [], warnings: [] };
  assert.deepEqual(await verifyMarkers({ ...t, mode: "gate" }), clean);
  assert.deepEqual(await verifyMarkers({ ...tree(), mode: "gate" }), clean);
});

// ---------- 08: regulatory rows and kits (launch gate) ----------

const REG = "src/data/regulatory";
const row = (id, extra = {}) => ({
  id,
  obligation: "Fixture obligation",
  meaning: "Fixture meaning",
  design: "Fixture design response",
  evidence: "Fixture evidence pack",
  source: "https://example.com/fixture-source",
  asAt: "2026-07-01",
  lastReviewed: "2026-09-01",
  ...extra,
});
const kitData = (extra = {}) => ({
  industry: "fixture-industry",
  title: "Fixture kit",
  summary: "Fixture kit summary",
  contents: ["Fixture checklist"],
  source: { label: "Fixture source", url: "https://example.com/fixture-kit-source", asAt: "2026-07-01" },
  asAt: "2026-07-01",
  lawyerReviewedAt: "2026-09-01",
  download: "/downloads/fixture-kit.pdf",
  ...extra,
});
const clean08 = { name: "08-regulatory-kits", errors: [], warnings: [] };

test("08: complete rows, a government.json covering cth, a state and local, and a reviewed kit pass in gate mode", async () => {
  const t = tree({
    [`${REG}/README.md`]: "# Regulatory rows\n",
    [`${REG}/fixture-industry.json`]: { rows: [row("fixture-row-1")] },
    [`${REG}/government.json`]: {
      rows: [
        row("fixture-row-1", { jurisdictions: ["cth"] }),
        row("fixture-row-2", { jurisdictions: ["nsw", "vic"] }),
        row("fixture-row-3", { jurisdictions: ["local"] }),
      ],
    },
    "src/content/kits/README.md": "# Safe-Use Kits\n",
    "src/content/kits/fixture-kit.yaml": kitData(),
  });
  assert.deepEqual(await regulatoryKits({ ...t, mode: "gate" }), clean08);
});

test("08: with no regulatory files or kits yet (the Phase B1 state), there is nothing to report", async () => {
  const readmesOnly = tree({ [`${REG}/README.md`]: "# Regulatory rows\n", "src/content/kits/README.md": "# Safe-Use Kits\n" });
  for (const t of [tree(), readmesOnly]) assert.deepEqual(await regulatoryKits({ ...t, mode: "gate" }), clean08);
});

test("08: a row without lastReviewed, a null asAt and an invalid source are reported", async () => {
  const { lastReviewed, ...unreviewed } = row("fixture-row-2");
  const t = tree({
    [`${REG}/fixture-industry.json`]: { rows: [row("fixture-row-1", { asAt: null }), unreviewed, row("fixture-row-3", { source: "not a url" })] },
  });
  const { errors } = await regulatoryKits({ ...t, mode: "gate" });
  assert.equal(errors.length, 3, errors.join("\n"));
  assert.equal(errors[0], `${REG}/fixture-industry.json: row "fixture-row-1" has no asAt`);
  assert.equal(errors[1], `${REG}/fixture-industry.json: row "fixture-row-2" has no lastReviewed`);
  assert.match(errors[2], /^src\/data\/regulatory\/fixture-industry\.json: rows\.2\.source: /);
});

test("08: government.json needs jurisdictions on every row, and rows covering cth, a state and local", async () => {
  const t = tree({ [`${REG}/government.json`]: { rows: [row("fixture-row-1", { jurisdictions: ["cth"] }), row("fixture-row-2")] } });
  const { errors } = await regulatoryKits({ ...t, mode: "gate" });
  assert.deepEqual(errors, [
    `${REG}/government.json: row "fixture-row-2" has no jurisdictions`,
    `${REG}/government.json: no row covers a state (nsw, vic or qld)`,
    `${REG}/government.json: no row covers local government (local)`,
  ]);
});

test("08: a kit awaiting lawyer review is a warning in report mode and an error in gate mode", async () => {
  const t = tree({ "src/content/kits/fixture-kit.yaml": kitData({ lawyerReviewedAt: null }) });
  const finding = "src/content/kits/fixture-kit.yaml: lawyerReviewedAt is not set, so the kit has not been lawyer-reviewed";
  assert.deepEqual(await regulatoryKits({ ...t, mode: "report" }), { ...clean08, warnings: [finding] });
  assert.deepEqual(await regulatoryKits({ ...t, mode: "gate" }), { ...clean08, errors: [finding] });
});

test("08: a kit without a source, and unreadable JSON or YAML, are reported", async () => {
  const { source, ...unsourced } = kitData();
  const t = tree({
    "src/content/kits/fixture-kit.yaml": unsourced,
    "src/content/kits/fixture-broken.yaml": "title: [unclosed\n",
    [`${REG}/fixture-broken.json`]: "{ not json",
  });
  const { errors } = await regulatoryKits({ ...t, mode: "gate" });
  assert.equal(errors.length, 3, errors.join("\n"));
  assert.ok(errors.includes("src/content/kits/fixture-kit.yaml: has no source"), errors.join("\n"));
  assert.ok(errors.some((e) => e.startsWith("src/content/kits/fixture-broken.yaml: not valid YAML")), errors.join("\n"));
  assert.ok(errors.some((e) => e.startsWith(`${REG}/fixture-broken.json: not valid JSON`)), errors.join("\n"));
});

// ---------- 10: package status ----------

test("10: launch tabs, listed on-request packages and a flagged onshore pillar pass", async () => {
  const t = tree({
    "dist/index.html": page('<a title="1 > 0" href="/">Fixture home</a>'),
    "dist/solutions/fixture-solution/index.html": page(`
      <section data-package-tab data-package-status="launch" data-onshore="true">
        <div data-onshore-pillar data-onshore="true">Fixture onshore pillar</div>
      </section>
      <ul><li data-package-status="on-request">Fixture on-request package</li></ul>
      <p>data-package-status="internal" is only text here</p>
      <script type="application/json">{ "html": "<div data-package-status='internal' data-package-tab>" }</script>
      <!-- <div data-package-status="internal"> -->`),
  });
  assert.deepEqual(await packageStatus({ ...t, mode: "gate" }), { name: "10-package-status", errors: [], warnings: [] });
});

test("10: internal packages, non-launch tabs and unflagged onshore pillars fail", async () => {
  const t = tree({
    "dist/solutions/fixture-solution/index.html": page(`
      <li title="Fixture > internal" data-package-status="internal">Fixture internal package</li>
      <section data-package-tab data-package-status="on-request">Fixture on-request tab</section>
      <section data-package-tab>Fixture tab without a status</section>
      <div data-onshore-pillar>Fixture pillar without the flag</div>
      <div data-onshore-pillar data-onshore="false">Fixture pillar on an offshore package</div>`),
  });
  const r = await packageStatus({ ...t, mode: "report" });
  const at = "dist/solutions/fixture-solution/index.html: ";
  assert.deepEqual(r.errors, [
    `${at}an internal package renders: <li title="Fixture > internal" data-package-status="internal">`,
    `${at}a package tab or full block needs data-package-status="launch", found data-package-status="on-request": <section data-package-tab data-package-status="on-request">`,
    `${at}a package tab or full block needs data-package-status="launch", found no data-package-status: <section data-package-tab>`,
    `${at}the onshore pillar renders without data-onshore="true": <div data-onshore-pillar>`,
    `${at}the onshore pillar renders without data-onshore="true": <div data-onshore-pillar data-onshore="false">`,
  ]);
  assert.deepEqual(r.warnings, []);
});

test("10 and 11 never pass an empty build", async () => {
  const t = tree();
  for (const check of [packageStatus, pricing]) {
    const { errors } = await check({ ...t, mode: "report" });
    assert.deepEqual(errors, [`${t.dist}: no built HTML found (run the build first)`]);
  }
});

// ---------- 11: pricing ----------

test("11: the currency rule catches A$, AU$ and bare $ figures, and leaves 'from $n' to the pricing list", () => {
  const currency = (text) => findAll(text, CURRENCY.re).map((h) => h.match);
  assert.deepEqual(currency("Costs A$4,500, AU$ 12.50, US$30 or $3."), ["A$4", "AU$ 1", "$3", "$3"]);
  assert.deepEqual(currency("from $900, From A$90 and from AU$ 9"), []);
  assert.deepEqual(currency("Section 3, clause $ref, 30 dollars"), []);
});

test("11: offer copy without pricing passes; regulatory data, platform-ai.json and insights are out of scope", async () => {
  const t = tree({
    "src/content/solutions/fixture-solution.yaml": "scope: Fixture scope with referral fees, a tradie quote and fee earners\n",
    "src/content/solutions/README.md": "Never write $5 or a fixed price in these files.\n",
    "src/data/regulatory/fixture-industry.json": { rows: [{ note: "Fixture penalty up to $1.5 million on a fixed fee" }] },
    "src/data/platform-ai.json": { plan: "Fixture plan at A$30 per user" },
    "src/content/insights/fixture-post.md": "A fixed price is a trap; $5 buys a Fixture coffee.\n",
    "dist/index.html": page("<p>Fixture home: scope, inclusions, client time, timeline and the gate.</p>"),
    "dist/insights/fixture-post/index.html": page("<p>A Fixture post about a fixed price of $5.</p>"),
  });
  assert.deepEqual(await pricing({ ...t, mode: "gate" }), { name: "11-pricing", errors: [], warnings: [] });
});

test("11: pricing phrases and currency figures fail in every offer source and offer page", async () => {
  const t = tree({
    "src/content/solutions/fixture-solution.yaml": "genericPackage:\n  scope: Fixture scope on a fixed-price basis\n",
    "src/content/kits/fixture-kit.yaml": "summary: Fixture kit for A$450\n",
    "src/data/demos/fixture-demo.json": { title: "Fixture demo", note: "from $900 ex GST" },
    "src/data/services.ts": 'export const services = [{ name: "Fixture service", note: "Day rate on request" }];\n',
    "src/data/contact.ts": 'export const contact = { note: "Fixture price list attached" };\n',
    "dist/index.html": page("<p>Fixture home: two-week discovery</p>"),
    "dist/solutions/fixture-solution/index.html": page("<p>Fixture payback in a quarter</p>"),
    "dist/services/fixture-service/index.html": page("<p>Fixture seats at AU$ 12</p>"),
    "dist/contact/index.html": page("<p>Fixture fee credit</p>"),
  });
  const r = await pricing({ ...t, mode: "report" });
  assert.deepEqual(sorted(r.errors.map(where)), sorted([
    'src/content/solutions/fixture-solution.yaml:2: "fixed-price"',
    'src/content/kits/fixture-kit.yaml:1: "A$4"',
    'src/data/demos/fixture-demo.json:3: "from $9"',
    'src/data/demos/fixture-demo.json:3: "ex GST"',
    'src/data/services.ts:1: "Day rate"',
    'src/data/contact.ts:1: "price list"',
    'dist/index.html: "two-week discovery"',
    'dist/solutions/fixture-solution/index.html: "payback"',
    'dist/services/fixture-service/index.html: "AU$ 1"',
    'dist/contact/index.html: "fee credit"',
  ]));
  assert.ok(r.errors.some((e) => e.includes('"AU$ 1" (currency figure (D4))')), r.errors.join("\n"));
  assert.ok(r.errors.some((e) => e.includes('"payback" (pricing language (D4))')), r.errors.join("\n"));
  assert.deepEqual(r.warnings, []);
});

test("11: banned-phrase-exceptions.json entries excuse a phrase only in the files and context they name", async () => {
  const t = tree({
    "src/data/banned-phrase-exceptions.json": [
      { file: "dist", phrase: "Fixed-Price legacy copy", reason: "Fixture legacy section" },
      { file: "src/content/solutions/*.yaml", phrase: "day rate", reason: "Fixture reason" },
      { file: "src/data/demos/**", phrase: "$900", reason: "Fixture reason" },
    ],
    "src/content/solutions/fixture-solution.yaml": "note: Fixture day-rate example\n",
    "src/content/kits/fixture-kit.yaml": "note: Fixture day rate\n",
    "src/data/demos/nested/fixture-demo.json": { note: "Fixture $900" },
    "dist/index.html": page("<p>Fixture Fixed-Price legacy copy</p>"),
    "dist/services/fixture-service/index.html": page("<p>Fixture fixed price</p>"),
  });
  const { errors } = await pricing({ ...t, mode: "report" });
  assert.deepEqual(sorted(errors.map(where)), [
    'dist/services/fixture-service/index.html: "fixed price"',
    'src/content/kits/fixture-kit.yaml:1: "day rate"',
  ]);
});

test("11: an exception without a reason is reported and excuses nothing", async () => {
  const t = tree({
    "src/data/banned-phrase-exceptions.json": [{ file: "dist", phrase: "payback" }],
    "dist/index.html": page("<p>Fixture payback</p>"),
  });
  const { errors } = await pricing({ ...t, mode: "report" });
  assert.equal(errors.length, 2, errors.join("\n"));
  assert.match(errors[0], /^src\/data\/banned-phrase-exceptions\.json\[0\]: /);
  assert.equal(where(errors[1]), 'dist/index.html: "payback"');
});

// ---------- the repo's exception lists ----------

test("the exception lists are well-formed, and every banned-phrase exception is still needed", () => {
  const phrases = JSON.parse(readFileSync(join(ROOT, "src/data/banned-phrase-exceptions.json"), "utf8"));
  const metrics = JSON.parse(readFileSync(join(ROOT, "src/data/metric-exceptions.json"), "utf8"));
  assert.ok(Array.isArray(phrases) && Array.isArray(metrics));
  const filled = (v) => typeof v === "string" && v.trim() !== "";
  for (const e of metrics) {
    assert.deepEqual(Object.keys(e).sort(), ["file", "reason", "token"], JSON.stringify(e));
    assert.ok(filled(e.file) && filled(e.token) && filled(e.reason), JSON.stringify(e));
  }
  const pages = allHtmlFiles().map((f) => normalizeQuotes(visibleText(readDist(f))));
  for (const e of phrases) {
    assert.deepEqual(Object.keys(e).sort(), ["file", "phrase", "reason"], JSON.stringify(e));
    assert.ok(filled(e.file) && filled(e.phrase) && filled(e.reason), JSON.stringify(e));
    if (e.file.includes("*")) continue; // a glob may rightly match nothing yet
    const found = (text) => phraseRegExp(e.phrase, { bounded: false }).test(text);
    if (e.file === "dist") {
      assert.ok(pages.some(found), `stale exception: "${e.phrase}" is no longer in dist/, so remove it`);
    } else {
      const path = join(ROOT, e.file);
      assert.ok(existsSync(path), `stale exception: ${e.file} no longer exists, so remove its entries`);
      assert.ok(found(normalizeQuotes(readFileSync(path, "utf8"))), `stale exception: "${e.phrase}" is no longer in ${e.file}`);
    }
  }
});

// ---------- run-all ----------

test("run-all runs checks 01-08, 10 and 11 in order (09 is the build gate, 12 the Playwright axe suite)", async () => {
  assert.deepEqual(CHECKS, [
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
  ]);
  for (const id of CHECKS) {
    const mod = await import(new URL(`../scripts/ci/checks/${id}.mjs`, import.meta.url));
    assert.equal(typeof mod.run, "function", `${id} exports run()`);
  }
});

test("VERIFY_MODE=gate is the only way into gate mode", () => {
  assert.equal(modeFromEnv({}), "report");
  assert.equal(modeFromEnv({ VERIFY_MODE: "report" }), "report");
  assert.equal(modeFromEnv({ VERIFY_MODE: "yes" }), "report");
  assert.equal(modeFromEnv({ VERIFY_MODE: "gate" }), "gate");
});

test("runAll: a launch-gate finding fails the run only in gate mode", async () => {
  const t = tree({ "src/content/solutions/fixture-solution.yaml": "job: Fixture job ⚑\n" });
  const report = await runAll({ ...t, mode: "report", checks: ["07-verify-markers"] });
  assert.equal(report.failed, false);
  assert.match(
    formatReport(report, "dist"),
    /^ {2}warn 07-verify-markers \(1 warning; launch gate, fails with VERIFY_MODE=gate\)\n {9}! src\/content\/solutions\/fixture-solution\.yaml:1: open ⚑ marker$/m,
  );
  const gate = await runAll({ ...t, mode: "gate", checks: ["07-verify-markers"] });
  assert.equal(gate.failed, true);
  const text = formatReport(gate, "dist");
  assert.match(text, /^verify: 1 check against dist \(VERIFY_MODE=gate\)$/m);
  assert.match(text, /^ {2}FAIL 07-verify-markers \(1 error\)\n {9}x src\/content\/solutions\/fixture-solution\.yaml:1: open ⚑ marker$/m);
  assert.match(text, /^verify: 1 check failed$/m);
});

test("runAll: a check that throws counts as a failure", async () => {
  const t = tree();
  const r = await runAll({ ...t, mode: "report", checks: ["no-such-check"] });
  assert.equal(r.failed, true);
  assert.match(r.results[0].errors[0], /^the check crashed: /);
});

const verify = (args = [], mode = "report") =>
  spawnSync(process.execPath, [RUN_ALL, ...args], { cwd: ROOT, encoding: "utf8", env: { ...process.env, VERIFY_MODE: mode } });

test("the production build passes every check in report mode", () => {
  const r = verify();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^verify: 10 checks against dist \(VERIFY_MODE=report\)$/m);
  for (const id of CHECKS) assert.match(r.stdout, new RegExp(`^ {2}(ok|warn) +${id}\\b`, "m"), id);
  assert.match(r.stdout, /^verify: all 10 checks passed/m);
});

test("run-all exits 1 and names the check when a built page breaks a rule", () => {
  const copy = mkdtempSync(join(tmpdir(), "ci-dist-"));
  temps.push(copy);
  cpSync(DIST, copy, { recursive: true });
  const home = join(copy, "index.html");
  const html = readFileSync(home, "utf8");
  assert.ok(html.includes("</main>"));
  writeFileSync(home, html.replace("</main>", '<div data-package-status="internal">Fixture internal package</div></main>'));
  const r = verify(["--dist", copy]);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /^ {2}FAIL 10-package-status \(1 error\)$/m);
  assert.match(r.stdout, /^ {9}x dist\/index\.html: an internal package renders: <div data-package-status="internal">$/m);
  assert.match(r.stdout, /^verify: 1 check failed$/m);
});

test("run-all refuses a dist folder that does not exist", () => {
  const r = verify(["--dist", "no-such-dist"]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /verify: no-such-dist does not exist; build the site first/);
});

test("npm run build ends with the checks, and npm run verify runs them on their own", () => {
  assert.equal(pkg.scripts.build, "astro check && node scripts/ci/build.mjs && node scripts/ci/run-all.mjs");
  assert.equal(pkg.scripts.verify, "node scripts/ci/run-all.mjs");
});
