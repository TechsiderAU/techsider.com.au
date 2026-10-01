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
import { CHECKS, formatReport, modeFromEnv, parseChecks, runAll } from "../scripts/ci/run-all.mjs";
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

test("07: layouts and lib hold copy too (BaseLayout's site-wide text, the fixed copy in src/lib)", async () => {
  const t = tree({
    "src/layouts/FixtureLayout.astro": "<footer>Fixture footer ⚑ check the ABN</footer>\n",
    "src/lib/fixtureScript.ts": 'export const line = "Fixture demo line";\nexport const note = "VERIFY the Fixture figure";\n',
  });
  const r = await verifyMarkers({ ...t, mode: "gate" });
  assert.deepEqual(sorted(r.errors), ["src/layouts/FixtureLayout.astro:1: open ⚑ marker", "src/lib/fixtureScript.ts:2: open VERIFY marker"]);
});

test("07: lower-case verify, longer words, the exception lists and files outside the scopes pass", async () => {
  const t = tree({
    "src/content/insights/fixture-post.md": "We verify every Fixture figure. Unverified claims are cut. VERIFYING is another word.\n",
    "src/data/banned-phrase-exceptions.json": '[{ "file": "dist", "phrase": "VERIFY", "reason": "Fixture ⚑" }]\n',
    "src/data/metric-exceptions.json": '[{ "file": "dist", "token": "VERIFY", "reason": "Fixture ⚑" }]\n',
    "src/fixtures/fixture.ts": 'export const note = "VERIFY ⚑";\n',
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

// The built-HTML part (blueprint Task 7): the Government industry page renders one section per
// jurisdiction, and each must hold a regulatory-map row. A launch gate like the source part.
const GOV_PAGE = "dist/preview/templates/industry-government/index.html";

test("08: built jurisdiction sections that each hold a regulatory row pass, nested sections included", async () => {
  const t = tree({
    [GOV_PAGE]: page(`
      <section id="commonwealth" data-jurisdiction-section="commonwealth">
        <section id="commonwealth-designed-around"><p>Fixture chips</p></section>
        <section id="commonwealth-regulatory-map"><table><tbody><tr id="reg-commonwealth-fixture-row-1" data-regulatory-row><th>Fixture obligation</th></tr></tbody></table></section>
      </section>
      <section id="local" data-jurisdiction-section="local"><div id="reg-local-fixture-row-2" data-regulatory-row>Fixture obligation</div></section>`),
    "dist/index.html": page("<p>Fixture home without jurisdiction sections</p>"),
  });
  assert.deepEqual(await regulatoryKits({ ...t, mode: "gate" }), clean08);
});

test("08: a built jurisdiction section without a regulatory row is a warning in report mode and an error in gate mode", async () => {
  const t = tree({
    [GOV_PAGE]: page(`
      <section id="commonwealth" data-jurisdiction-section="commonwealth"><table><tbody><tr data-regulatory-row><th>Fixture obligation</th></tr></tbody></table></section>
      <section id="state" data-jurisdiction-section="state">
        <section id="state-regulatory-map"><p>Fixture map with no rows</p></section>
      </section>
      <section id="local" data-jurisdiction-section="local">
        <!-- <tr data-regulatory-row> -->
        <script type="application/json">{ "html": "<tr data-regulatory-row>" }</script>
        <p>data-regulatory-row is only text here</p>
      </section>`),
  });
  const findings = [
    `${GOV_PAGE}: jurisdiction section "state" has no regulatory row ([data-regulatory-row])`,
    `${GOV_PAGE}: jurisdiction section "local" has no regulatory row ([data-regulatory-row])`,
  ];
  assert.deepEqual(await regulatoryKits({ ...t, mode: "report" }), { ...clean08, warnings: findings });
  assert.deepEqual(await regulatoryKits({ ...t, mode: "gate" }), { ...clean08, errors: findings });
});

// The A7 part (Phase C Task 8, spec §8.5 block 9): every built industry page renders at least one
// related insight card. The Industries hub, the gallery's specimens and every other page need none.
// A launch gate like the rest of 08.
const INDUSTRY_PAGE = "dist/industries/fixture-industry/index.html";

test("08: built industry pages that each render an insight card pass; the hub, the gallery and other pages need none", async () => {
  const t = tree({
    [INDUSTRY_PAGE]: page(`<section id="insights"><ul><li><article class="insight-card" data-insight-card><h3><a href="/insights/fixture-post/">Fixture post</a></h3></article></li></ul></section>`),
    "dist/industries/fixture-industry-2/index.html": page("<article data-insight-card>Fixture card one</article><article data-insight-card>Fixture card two</article>"),
    "dist/industries/index.html": page("<p>Fixture industries hub without insight cards</p>"),
    "dist/preview/templates/industry/index.html": page("<p>Fixture industry specimen without insight cards</p>"),
    "dist/insights/fixture-post/index.html": page("<p>Fixture post</p>"),
  });
  assert.deepEqual(await regulatoryKits({ ...t, mode: "gate" }), clean08);
});

test("08: a built industry page with no insight card is a warning in report mode and an error in gate mode", async () => {
  const t = tree({
    [INDUSTRY_PAGE]: page(`
      <section id="faq"><h2>Fixture questions</h2></section>
      <!-- <article data-insight-card> -->
      <script type="application/json">{ "html": "<article data-insight-card>" }</script>
      <p>data-insight-card is only text here</p>`),
    "dist/industries/fixture-industry-2/index.html": page("<article data-insight-card>Fixture card</article>"),
  });
  const finding = `${INDUSTRY_PAGE}: industry page renders no related insight ([data-insight-card]); spec §8.5 block 9 needs at least one`;
  assert.deepEqual(await regulatoryKits({ ...t, mode: "report" }), { ...clean08, warnings: [finding] });
  assert.deepEqual(await regulatoryKits({ ...t, mode: "gate" }), { ...clean08, errors: [finding] });
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

// ---------- 10 and 11, hardened in Phase E (WB-10, WB-11) ----------

const PILLAR = '<p data-onshore-pillar data-onshore="true">Your data stays onshore.</p>';
const NOTE = "<p data-processing-note>We show you where your data is processed.</p>";
const block = (id, body) => `<section id="${id}" data-package-tab data-package-status="launch" data-package-id="${id}">${body}</section>`;
const onshoreSolution = {
  genericPackage: { id: "fixture-generic", status: "launch", onshore: true },
  packages: [
    { id: "fixture-onshore", status: "launch", onshore: true },
    { id: "fixture-offshore", status: "launch", onshore: false },
    { id: "fixture-listed", status: "on-request", oneLiner: "Fixture on-request package" },
  ],
};

test("10: on a solution's page each block shows the onshore pillar exactly when its package has onshore: true in the YAML (WB-10)", async () => {
  const clean = tree({
    "src/content/solutions/fixture-solution.yaml": onshoreSolution,
    "dist/solutions/fixture-solution/index.html": page(
      `${block("fixture-generic", PILLAR)}${block("fixture-onshore", PILLAR)}${block("fixture-offshore", NOTE)}`,
    ),
  });
  assert.deepEqual(await packageStatus({ ...clean, mode: "gate" }), { name: "10-package-status", errors: [], warnings: [] });

  const t = tree({
    "src/content/solutions/fixture-solution.yaml": onshoreSolution,
    "dist/solutions/fixture-solution/index.html": page(`
      ${block("fixture-generic", NOTE)}
      ${block("fixture-offshore", PILLAR)}
      <section data-package-tab data-package-status="launch">${NOTE}</section>
      ${block("fixture-listed", NOTE)}`),
  });
  const at = "dist/solutions/fixture-solution/index.html: ";
  assert.deepEqual((await packageStatus({ ...t, mode: "report" })).errors, [
    `${at}package "fixture-generic" has onshore: true in src/content/solutions/fixture-solution.yaml, but its block shows no onshore pillar`,
    `${at}package "fixture-offshore" has onshore: false in src/content/solutions/fixture-solution.yaml, but its block shows the onshore pillar`,
    `${at}a package block has no data-package-id, so its onshore pillar can't be checked against the data`,
    `${at}data-package-id "fixture-listed" is not a launch package in src/content/solutions/fixture-solution.yaml, so its onshore pillar can't be checked against the data`,
  ]);
});

test("10: the pillar's words outside a flagged pillar fail in any package block, the gallery's included (WB-10)", async () => {
  const t = tree({
    "dist/preview/templates/solution/index.html": page(`
      <section data-package-tab data-package-status="launch"><p>Your data stays onshore.</p>${NOTE}</section>
      <section data-package-tab data-package-status="launch">${PILLAR}</section>
      <p>Your data stays onshore.</p>`),
  });
  assert.deepEqual((await packageStatus({ ...t, mode: "report" })).errors, [
    'dist/preview/templates/solution/index.html: a package block shows "Your data stays onshore." outside its [data-onshore-pillar] element',
  ]);
});

test("11: in the preview build, the gallery's offer templates follow the currency rule; its other templates don't (WB-11)", async () => {
  const t = tree({
    "dist/preview/templates/solution/index.html": page("<p>Fixture package at A$5,000</p>"),
    "dist/preview/templates/home-stale-insights/index.html": page("<p>Fixture home from $900</p>"),
    "dist/preview/templates/contact-no-endpoint/index.html": page("<p>Fixture day rate</p>"),
    "dist/preview/templates/sent/index.html": page("<p>Fixture fee credit</p>"),
    "dist/preview/templates/industry/index.html": page("<p>Fixture penalty up to $1.5 million</p>"),
    "dist/preview/templates/demo/index.html": page("<p>Fixture owner repair limit $500</p>"),
  });
  const { errors } = await pricing({ ...t, mode: "report" });
  assert.deepEqual(sorted(errors.map(where)), [
    'dist/preview/templates/contact-no-endpoint/index.html: "day rate"',
    'dist/preview/templates/home-stale-insights/index.html: "from $9"',
    'dist/preview/templates/sent/index.html: "fee credit"',
    'dist/preview/templates/solution/index.html: "A$5"',
  ]);
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

test("--checks picks checks by number or full id, in CHECKS order, and refuses anything else", () => {
  assert.deepEqual(parseChecks("03,04,05,06,10,11"), ["03-anchors", "04-banned-phrases", "05-captions", "06-provenance", "10-package-status", "11-pricing"]);
  assert.deepEqual(parseChecks("11-pricing, 05"), ["05-captions", "11-pricing"]);
  for (const bad of ["09", "12", "4", "anchors", "03,nope", "", ","]) assert.throws(() => parseChecks(bad), /--checks/, JSON.stringify(bad));
});

// Every component and every B2 template renders only in dist-preview/, so checks that read
// built pages must run there too: on the production dist/ they pass vacuously (no SampleReport,
// no illustrative element, no package tab, no jurisdiction section). 01, 02 and 07 read sources
// or the production nav and stay with the production build. 08 runs with both: its source part
// reads src/ either way, and its built-HTML part needs the Government industry specimen and, from
// Phase C, the real industry pages, which the preview build shows whether or not they are live.
const PREVIEW_PROFILE = "--dist dist-preview --checks 03,04,05,06,08,10,11";

test("npm run build:preview ends with the preview profile of the checks", () => {
  assert.equal(pkg.scripts["build:preview"], `TECHSIDER_NAV_PREVIEW=1 node scripts/ci/build.mjs --outDir dist-preview && node scripts/ci/run-all.mjs ${PREVIEW_PROFILE}`);
});

test("the preview build passes the preview profile, and the profile really reads the gallery", () => {
  const r = verify(PREVIEW_PROFILE.split(" "));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^verify: 7 checks against dist-preview \(VERIFY_MODE=report\)$/m);
  for (const id of ["03-anchors", "04-banned-phrases", "05-captions", "06-provenance", "08-regulatory-kits", "10-package-status", "11-pricing"]) {
    assert.match(r.stdout, new RegExp(`^ {2}(ok|warn) +${id}\\b`, "m"), id);
  }
  // Not vacuous: the gallery holds what checks 05, 06(c) and 10 look for.
  const gallery = readFileSync(join(ROOT, "dist-preview/preview/components/index.html"), "utf8");
  assert.match(gallery, /data-sample-report/);
  assert.match(gallery, /data-mock-panel/);
  assert.match(gallery, /data-provenance="illustrative"/);
  assert.match(readFileSync(join(ROOT, "dist-preview/preview/tabs/index.html"), "utf8"), /data-package-tab/);
});

test("run-all --checks with a bad or missing list is a usage error", () => {
  for (const args of [["--checks"], ["--checks", "09"]]) {
    const r = verify(args);
    assert.equal(r.status, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /usage: node scripts\/ci\/run-all\.mjs \[--dist <dir>\] \[--checks <ids>\]/);
  }
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
  assert.equal(pkg.scripts.build, "astro check --minimumFailingSeverity hint && node scripts/ci/build.mjs && node scripts/ci/run-all.mjs");
  assert.equal(pkg.scripts.verify, "node scripts/ci/run-all.mjs");
});
