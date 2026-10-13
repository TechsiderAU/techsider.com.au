// CI check 13 (go-global §10.2): anchors and regions, against synthetic trees in a temp dir.
// Every clock is fixed: no test reads the real date, the real content or the real build.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  ANCHORS_DIR, INDUSTRY_PAGE, INSIGHTS_DIR, NAME, WARN_DAYS, daysUntil, industryFindings, regionFindings, reviewByLevel, run,
} from "../scripts/ci/checks/13-anchors-and-regions.mjs";
import { CHECKS, LAUNCH_GATES } from "../scripts/ci/run-all.mjs";

const temps = [];
after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway repo tree. String bodies are written as-is, anything else as JSON. */
function tree(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "ci-checks-c-"));
  temps.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, typeof body === "string" ? body : JSON.stringify(body, null, 2));
  }
  return { root, dist: join(root, "dist") };
}

const page = (body) => `<!doctype html><html lang="en"><head><title>Fixture</title></head><body><main>${body}</main></body></html>`;

// An industry page laid out as go-global §5.1 asks: the Rules block first, then the Australia band
// holding every regulatory row and jurisdiction section.
const RULES = `<section id="rules-that-travel"><h2>Rules that travel</h2><p>Fixture paragraph.</p></section>`;
const ROWS = `<section id="regulatory-map"><table><tbody><tr id="reg-fixture-row-1" data-regulatory-row><th>Fixture obligation</th></tr></tbody></table></section>`;
const JURISDICTION = `<section id="local" data-jurisdiction-section="local"><div id="reg-local-fixture-row-2" data-regulatory-row>Fixture obligation</div></section>`;
const band = (inner = `${ROWS}${JURISDICTION}`, region = ' data-region="au"') =>
  `<section id="australia"${region} aria-labelledby="australia-heading"><h2 id="australia-heading">Fixture band</h2>${inner}</section>`;
const INDUSTRY = page(`<h1>Fixture industry</h1>${RULES}<section id="problem"><h2>Fixture problem</h2></section>${band()}<section id="faq"><h2>Fixture questions</h2></section>`);
const FILE = "dist/industries/fixture-industry/index.html";

// The five clock positions go-global §10.2 names, around the first real reviewBy date.
const REVIEW_BY = "2027-01-12";
const at = (iso) => new Date(`${iso}T00:00:00Z`);
const CLOCK = {
  "31 days before": at("2026-12-12"),
  "30 days before": at("2026-12-13"),
  "29 days before": at("2026-12-14"),
  "the day itself": at("2027-01-12"),
  "the day after": at("2027-01-13"),
};

const anchor = (id, extra = {}) => ({
  id,
  name: "Fixture Act",
  issuer: "Fixture Commission",
  kind: "law",
  binding: "Fixture binding line",
  status: "in-force",
  asks: "Fixture asks for a fixture register.",
  evidence: "Fixture evidence pack",
  source: "https://example.com/fixture-act",
  asAt: "2026-10-01",
  lastReviewed: "2026-10-12",
  solutions: ["fixture-solution"],
  featured: true,
  checkLevel: "P",
  ...extra,
});
const post = (frontmatter = "") => `---\ntitle: "Fixture post."\ntype: article\n${frontmatter}---\n\nFixture body.\n`;

/** A tree with nothing to report: every structure in place, every reviewBy far off. */
const CLEAN = {
  "dist/index.html": page("<p>Fixture home</p>"),
  [FILE]: INDUSTRY,
  [`${ANCHORS_DIR}/README.md`]: "# Anchors\n\nOnly *.json files are loaded; this README is ignored.\n",
  [`${ANCHORS_DIR}/shared.json`]: {
    anchors: [anchor("fixture-x1"), anchor("fixture-x7", { status: "applies-from", statusDate: "2027-12-02", reviewBy: "2027-06-30" })],
  },
  [`${INSIGHTS_DIR}/fixture-post.md`]: post("reviewBy: 2027-06-30\n"),
  [`${INSIGHTS_DIR}/fixture-undated.md`]: post(),
};

// ---------- constants ----------

test("13: its constants, and INDUSTRY_PAGE matches the built industry pages only", () => {
  assert.equal(NAME, "13-anchors-and-regions");
  assert.equal(WARN_DAYS, 30);
  assert.deepEqual([ANCHORS_DIR, INSIGHTS_DIR], ["src/data/anchors", "src/content/insights"]);
  for (const rel of ["industries/government/index.html", "industries/resources-and-energy/index.html"]) assert.match(rel, INDUSTRY_PAGE);
  for (const rel of ["industries/index.html", "preview/templates/industry/index.html", "industries/government/faq/index.html", "solutions/government/index.html"]) {
    assert.doesNotMatch(rel, INDUSTRY_PAGE);
  }
});

// ---------- wiring ----------

test("13: runs last in every build, and is neither a launch gate nor in the preview profile (go-global §10.2)", () => {
  assert.equal(CHECKS.at(-1), NAME);
  assert.ok(!LAUNCH_GATES.includes(NAME));
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const profile = pkg.scripts["build:preview"].match(/--checks (\S+)/)?.[1];
  assert.ok(profile, "build:preview runs no --checks profile");
  assert.ok(!profile.split(",").includes("13"), `the preview profile ${profile} runs check 13`);
});

// ---------- rule 2: the clock ----------

test("13: daysUntil counts whole UTC calendar days, whatever the time of day or the offset", () => {
  const expected = { "31 days before": 31, "30 days before": 30, "29 days before": 29, "the day itself": 0, "the day after": -1 };
  for (const [when, now] of Object.entries(CLOCK)) assert.equal(daysUntil(REVIEW_BY, now), expected[when], when);
  assert.equal(daysUntil(REVIEW_BY, new Date("2027-01-12T23:59:59.999Z")), 0);
  assert.equal(daysUntil(REVIEW_BY, new Date("2026-12-12T23:59:59.999Z")), 31);
  // 9 am on 13 January in Sydney (UTC+11) is still 12 January in UTC.
  assert.equal(daysUntil(REVIEW_BY, new Date("2027-01-13T09:00:00+11:00")), 0);
  assert.equal(daysUntil(new Date("2027-01-12T18:30:00Z"), CLOCK["31 days before"]), 31, "a Date counts by its UTC day");
  for (const bad of ["12/01/2027", "2027-1-12", "2027-02-30", "2027-01-12T00:00:00Z", ""]) {
    assert.throws(() => daysUntil(bad, CLOCK["the day itself"]), /is not a YYYY-MM-DD date/, bad);
  }
});

test("13: reviewByLevel is ok at 31 days, a warning from 30 days through the day itself, and an error from the day after", () => {
  const expected = { "31 days before": "ok", "30 days before": "warning", "29 days before": "warning", "the day itself": "warning", "the day after": "error" };
  for (const [when, now] of Object.entries(CLOCK)) assert.equal(reviewByLevel(REVIEW_BY, now), expected[when], when);
});

// ---------- rule 1: the helpers ----------

test("13: regionFindings passes rows and jurisdiction sections inside a [data-region=\"au\"] element, at any depth", () => {
  assert.deepEqual(regionFindings(INDUSTRY, FILE), []);
  const deep = page(`<div data-region="au"><section><div><table><tbody><tr data-regulatory-row><td>Fixture</td></tr></tbody></table></div></section></div>`);
  assert.deepEqual(regionFindings(deep, FILE), []);
});

test("13: regionFindings reports each row or section outside the band once, and ignores scripts and comments", () => {
  const html = page(`${RULES}
    <table><tbody><tr id="reg-fixture-row-9" data-regulatory-row><th>Fixture</th></tr><tr data-regulatory-row><th>Fixture</th></tr></tbody></table>
    <section id="state" data-jurisdiction-section="state" data-region="au"><div id="reg-state-fixture-row-3" data-regulatory-row>Fixture</div></section>
    <div data-region="nz"><p id="reg-nz-row" data-regulatory-row>Fixture</p></div>
    <!-- <tr data-regulatory-row> -->
    <script>document.write('<section data-jurisdiction-section="local">');</script>
    ${band()}`);
  const outside = `is outside every [data-region="au"] element (go-global §5.4)`;
  assert.deepEqual(regionFindings(html, FILE), [
    `${FILE}: [data-regulatory-row] <tr id="reg-fixture-row-9"> ${outside}`,
    `${FILE}: [data-regulatory-row] <tr> ${outside}`,
    // Its own data-region doesn't count, though it does hold the row inside it.
    `${FILE}: [data-jurisdiction-section="state"] <section id="state"> ${outside}`,
    `${FILE}: [data-regulatory-row] <p id="reg-nz-row"> ${outside}`,
  ]);
});

test("13: industryFindings needs #rules-that-travel, then #australia carrying data-region=\"au\"", () => {
  assert.deepEqual(industryFindings(INDUSTRY, FILE), []);
  assert.deepEqual(industryFindings(page(`<h1>Fixture industry</h1>${ROWS}`), FILE), [
    `${FILE}: no #rules-that-travel block (go-global §5.2)`,
    `${FILE}: no #australia band (go-global §5.4)`,
  ]);
  assert.deepEqual(industryFindings(page(`${RULES}${band(ROWS, "")}`), FILE), [`${FILE}: #australia does not carry data-region="au" (go-global §5.4)`]);
  assert.deepEqual(industryFindings(page(`${band()}${RULES}`), FILE), [
    `${FILE}: #rules-that-travel comes after #australia, and the Rules block goes first (go-global §5.1)`,
  ]);
  const hidden = page(`<!-- <section id="rules-that-travel"> --><script>document.write('<section id="australia" data-region="au">');</script>`);
  assert.equal(industryFindings(hidden, FILE).length, 2, "ids in a comment or a script are not the blocks");
});

// ---------- run() ----------

test("13: run() passes a clean tree in every mode, and never passes an empty build", async () => {
  const t = tree(CLEAN);
  for (const mode of ["report", "gate"]) {
    assert.deepEqual(await run({ ...t, mode, now: CLOCK["the day after"] }), { name: NAME, errors: [], warnings: [] }, mode);
  }
  const empty = tree({ [`${ANCHORS_DIR}/shared.json`]: { anchors: [anchor("fixture-x1")] } });
  assert.deepEqual(await run({ ...empty, mode: "report", now: CLOCK["the day after"] }), {
    name: NAME,
    errors: [`${empty.dist}: no built HTML found (run the build first)`],
    warnings: [],
  });
});

test("13: an anchor's or a post's reviewBy warns from 30 days before through the day itself, and fails from the day after, in every mode", async () => {
  const t = tree({
    ...CLEAN,
    [`${ANCHORS_DIR}/fixture-industry.json`]: {
      anchors: [anchor("fixture-annex-iii", { status: "applies-from", statusDate: "2027-12-02", reviewBy: REVIEW_BY }), anchor("fixture-standard")],
    },
    [`${INSIGHTS_DIR}/nested/fixture-dated.md`]: post(`reviewBy: ${REVIEW_BY}\n`),
  });
  const a = `${ANCHORS_DIR}/fixture-industry.json: anchor "fixture-annex-iii" reviewBy ${REVIEW_BY}`;
  const p = `${INSIGHTS_DIR}/nested/fixture-dated.md: post reviewBy ${REVIEW_BY}`;
  const move = ": review it and move the date (go-global §10.2)";
  const cases = [
    ["31 days before", [], []],
    ["30 days before", [], [`${a} is in 30 days${move}`, `${p} is in 30 days${move}`]],
    ["29 days before", [], [`${a} is in 29 days${move}`, `${p} is in 29 days${move}`]],
    ["the day itself", [], [`${a} is in 0 days${move}`, `${p} is in 0 days${move}`]],
    ["the day after", [`${a} passed 1 day ago${move}`, `${p} passed 1 day ago${move}`], []],
  ];
  for (const [when, errors, warnings] of cases) {
    for (const mode of ["report", "gate"]) {
      assert.deepEqual(await run({ ...t, mode, now: CLOCK[when] }), { name: NAME, errors, warnings }, `${when}, ${mode}`);
    }
  }
  const later = await run({ ...t, mode: "report", now: at("2027-02-12") });
  assert.deepEqual(later.errors, [`${a} passed 31 days ago${move}`, `${p} passed 31 days ago${move}`]);
});

test("13: a reviewBy that isn't a real YYYY-MM-DD date fails; READMEs, nested anchor folders and undated items are skipped", async () => {
  const t = tree({
    ...CLEAN,
    [`${ANCHORS_DIR}/fixture-bad.json`]: {
      anchors: [anchor("fixture-slashed", { reviewBy: "12/01/2027" }), anchor("fixture-impossible", { reviewBy: "2027-02-30" }), { reviewBy: 20270112 }],
    },
    [`${ANCHORS_DIR}/fixture-broken.json`]: "{ not json",
    [`${ANCHORS_DIR}/drafts/fixture-nested.json`]: { anchors: [anchor("fixture-nested", { reviewBy: "2020-01-01" })] },
    [`${INSIGHTS_DIR}/README.md`]: post("reviewBy: 2020-01-01\n"),
    [`${INSIGHTS_DIR}/fixture-timestamp.md`]: post("reviewBy: 2027-01-12T00:00:00Z\n"),
  });
  const { errors, warnings } = await run({ ...t, mode: "report", now: CLOCK["31 days before"] });
  assert.deepEqual(warnings, []);
  assert.equal(errors.length, 5, errors.join("\n"));
  assert.match(errors[0], /^src\/data\/anchors\/fixture-broken\.json: not valid JSON \(/);
  const notADate = "is not a YYYY-MM-DD date (go-global §10.2)";
  assert.deepEqual(errors.slice(1), [
    `${ANCHORS_DIR}/fixture-bad.json: anchor "fixture-slashed" reviewBy "12/01/2027" ${notADate}`,
    `${ANCHORS_DIR}/fixture-bad.json: anchor "fixture-impossible" reviewBy "2027-02-30" ${notADate}`,
    `${ANCHORS_DIR}/fixture-bad.json: anchor #3 reviewBy 20270112 ${notADate}`,
    `${INSIGHTS_DIR}/fixture-timestamp.md: post reviewBy "2027-01-12T00:00:00Z" ${notADate}`,
  ]);
});
