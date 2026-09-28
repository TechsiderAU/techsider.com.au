// CI checks 1–6 (spec §11.5), each run against a synthetic repo + build tree in a temp dir:
// a clean tree passes every check, and each seeded violation is reported.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { stringify } from "yaml";
import {
  elementsWith, excepted, hrefsIn, idsIn, matchesGlob, phraseRegExp, resolveDistPath, result, visibleText,
} from "../scripts/ci/lib.mjs";
import { visibleText as helperVisibleText } from "./helpers.mjs";
import * as slugs from "../scripts/ci/checks/01-slugs.mjs";
import * as links from "../scripts/ci/checks/02-links.mjs";
import * as anchors from "../scripts/ci/checks/03-anchors.mjs";
import * as banned from "../scripts/ci/checks/04-banned-phrases.mjs";
import * as captions from "../scripts/ci/checks/05-captions.mjs";
import * as provenance from "../scripts/ci/checks/06-provenance.mjs";

const CHECKS = [slugs, links, anchors, banned, captions, provenance];

// --- The synthetic tree -------------------------------------------------------

// A cut-down nav.ts with the exports the checks read: PAGES, NAV_GROUPS, EXEMPT_PATHS, slugify.
const PAGES = [
  ["Home", "/", "/", "live"],
  ["Solutions", "/", "/solutions/", "live"],
  ["Alpha Fixture", "/solutions/", "/solutions/alpha-fixture/", "live"],
  ["Beta Fixture", "/solutions/", "/solutions/beta-fixture/", "planned"],
  ["Industries", "/", "/industries/", "planned"],
  ["Gamma & Fixture", "/industries/", "/industries/gamma-and-fixture/", "live"],
];
const navTs = (pages = PAGES) => `// Synthetic nav.ts for tests/ci-checks-a.test.mjs
export const EXEMPT_PATHS = ["/", "/404"];
export function slugify(name) {
  return name.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9\\s-]/g, "").trim().replace(/[\\s-]+/g, "-");
}
export const PAGES = ${JSON.stringify(pages.map(([shortName, base, path, status]) => ({ shortName, fullName: shortName, base, path, status })))};
const hub = (path) => PAGES.find((p) => p.path === path);
export const NAV_GROUPS = ["solutions", "industries"]
  .map((id) => ({ id, label: id, hub: hub(\`/\${id}/\`), items: PAGES.filter((p) => p.base === \`/\${id}/\`), anchors: [] }))
  .filter((g) => g.hub);
`;

const solution = () => ({
  job: "Turns fixture paperwork into a register a person can check.",
  byIndustry: ["gamma-and-fixture"],
  demo: "alpha-fixture",
  matrix: { "gamma-and-fixture": "Fixture register of leases" },
  faq: [{ q: "Is this a fixture?", a: "Yes, every word of this entry is fictional fixture copy." }],
});
const useCase = (name) => ({ name, solution: "alpha-fixture", status: "launch" });
const industry = () => ({
  promise: "Fixture promise for a fictional industry.",
  leadSolutions: ["alpha-fixture"],
  flagshipUseCases: [useCase("Fixture use case one"), useCase("Fixture use case two")],
  obligationChips: [{ label: "Fixture obligation", row: "fixture-row-1" }],
  workflow: [{ id: "intake", stage: "Fixture intake", useCases: [useCase("Fixture intake register")] }],
  scenario: { title: "Fixture scenario", trace: "fixture-trace" },
});
const regulatory = () => ({
  rows: [{ id: "fixture-row-1", obligation: "Fixture obligation", source: "https://example.com/fixture-standard", asAt: "2026-09-01" }],
});
const kit = () => ({ industry: "gamma-and-fixture", title: "Fixture safe-use kit" });
const post = (fm = "industries: [gamma-and-fixture] # a YAML comment is fine\nsolutions: [alpha-fixture]") =>
  `---\ntitle: "Fixture post"\ntype: article\n${fm}\n---\n\nFixture body copy about working with your documents and a benchmark.\n`;
const demo = () => ({
  solution: "alpha-fixture",
  title: "Fixture register demo",
  kind: "register",
  provenance: "illustrative",
  data: {
    rows: [{ label: "Fixture lease", status: "Checked on 2026-09-28 at 09:30" }],
    quote: "Report within 72 hours; 3/4 of fixture cases, 95% of the time",
    source: { label: "Fixture Standard ¶32", url: "https://example.com/fixture-standard/32/4" },
  },
});
const trace = () => ({
  title: "Fixture trace",
  provenance: "illustrative",
  lines: [
    { t: "00:00:01", op: "retrieve", detail: "Fixture index searched", metric: { value: 0.91, unit: "" } },
    { t: "00:00:02", op: "answer", detail: "Fixture answer drafted", metric: { value: 120, unit: "ms" } },
  ],
});
const measuredTrace = () => ({ ...trace(), title: "Fixture measured trace", provenance: "measured", run: "src/data/runs/fixture-run/" });

const HOME_IDS = ["services", "approach", "industries", "demo", "insights", "faq", "contact"];
const page = (body) => `<!doctype html>
<html lang="en-AU"><head><title>Fixture page</title><link rel="icon" href="/favicon.svg" /></head>
<body><a href="#main" class="skip-link">Skip to content</a>
<header><a href="/">Fixture home</a> <a href="/solutions/">Solutions</a></header>
<main id="main" tabindex="-1">${body}</main>
<footer><a href="mailto:hello@example.com">Email</a> <a href="https://example.com/">Example</a> <a href="tel:+61000000000">Call</a></footer>
</body></html>`;
const home = (ids = HOME_IDS) => page(`
  ${ids.map((id) => `<section id="${id}"><h2>Fixture ${id}</h2></section>`).join("\n  ")}
  <a href="/solutions/alpha-fixture/#how-it-works">How it works</a>
  <a href="/industries/gamma-and-fixture">Gamma</a>
  <a href="/solutions/alpha-fixture/index.html">Alpha (explicit file)</a>
  <a href="solutions/?view=matrix&amp;from=home">Matrix view</a>
  <a href="#faq">FAQ</a> <a href="#top">Back to top</a> <a href="#">Top</a>
  <script>document.body.insertAdjacentHTML("beforeend", '<a href="/not-built/">x</a>');</script>
  <!-- <a href="/commented-out/">old link</a> -->`);
const MOCK = `<figure class="mock-panel" data-mock-panel data-astro-cid-x><div class="mock-window"><p>Fixture panel</p></div>
  <figcaption class="mock-caption" data-astro-cid-x>Illustrative interface, fictional data</figcaption></figure>`;
const REPORT = `<article class="sample-report" data-sample-report><header><h2>Sample evaluation report</h2>
  <p class="sample-caption" data-sample-caption>Sample report: Techsider testing its own demo system, so not independent.</p></header>
  <p>Fixture system, laid out like an Independent Evaluation Report.</p></article>`;
const TRACE = `<figure class="trace-panel" data-trace-panel data-provenance="illustrative"><figcaption>Fixture trace
  <span data-provenance-label>Illustrative trace</span></figcaption><ol><li>00:00:01 retrieve</li></ol></figure>`;

const BASE = {
  "package.json": { type: "module" },
  "src/data/nav.ts": navTs(),
  "src/content/solutions/alpha-fixture.yaml": solution(),
  "src/content/solutions/README.md": "# Solutions\n\nOnly *.yaml files here are content; this README is ignored.\n",
  "src/content/industries/gamma-and-fixture.yaml": industry(),
  "src/content/kits/gamma-fixture-kit.yaml": kit(),
  "src/content/insights/fixture-post.md": post(),
  "src/data/regulatory/gamma-and-fixture.json": regulatory(),
  "src/data/demos/alpha-fixture.json": demo(),
  "src/data/traces/fixture-trace.json": trace(),
  "src/data/traces/fixture-measured.json": measuredTrace(),
  "src/data/runs/fixture-run/results.json": { "fixture-score": 1 },
  "src/components/Hero.astro": "---\n---\n<h1>AI that ships.</h1>\n<p>Measured before it ships. Fixture copy.</p>\n",
  "src/fixtures/copy.ts": 'export const fixtureCopy = "Trusted by Fixture Bank, a world-class fixture";\n',
  "dist/index.html": home(),
  "dist/favicon.svg": "<svg xmlns='http://www.w3.org/2000/svg'/>",
  "dist/solutions/index.html": page(`<h1>Solutions</h1><a href="/solutions/alpha-fixture/">Alpha Fixture</a>`),
  "dist/solutions/alpha-fixture/index.html": page(`<h1>Alpha Fixture</h1><h2 id="how-it-works">How it works</h2>${MOCK}${REPORT}${TRACE}`),
  "dist/industries/gamma-and-fixture/index.html": page(`<h1>Gamma Fixture</h1><p>Fixture copy.</p>`),
};

const temps = [];
after(() => temps.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

/** Writes BASE with `overrides` (null drops a file; a key ending in "/" is an empty dir) to a fresh temp dir. */
function makeTree(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), "ci-checks-a-"));
  temps.push(root);
  for (const [rel, content] of Object.entries({ ...BASE, ...overrides })) {
    if (content === null) continue;
    const abs = join(root, rel);
    if (rel.endsWith("/")) {
      mkdirSync(abs, { recursive: true });
      continue;
    }
    mkdirSync(dirname(abs), { recursive: true });
    const text = typeof content === "string" ? content : rel.endsWith(".yaml") ? stringify(content) : JSON.stringify(content, null, 2);
    writeFileSync(abs, text);
  }
  return { root, dist: join(root, "dist"), mode: "report" };
}

const check = (mod, overrides) => mod.run(makeTree(overrides));
/** Asserts the errors match `patterns` one-to-one, in any order. */
function assertErrors(res, patterns) {
  assert.equal(res.errors.length, patterns.length, `errors:\n${res.errors.join("\n")}`);
  for (const p of patterns) assert.ok(res.errors.some((e) => p.test(e)), `no error matches ${p}:\n${res.errors.join("\n")}`);
}

// --- lib.mjs -----------------------------------------------------------------

test("yaml is a dev-only dependency on major 2 (lib.mjs parses content YAML and frontmatter with it)", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(pkg.devDependencies.yaml ?? "", /^\^2\./);
  assert.equal(pkg.dependencies.yaml, undefined);
});

test("lib: visibleText is the tests/helpers.mjs algorithm", () => {
  const html = `<p>A &amp; B &#x2014; &#39;x&#39; &quot;y&quot;</p><script>no</script><style>.no{}</style>\n<p>&lt;tag&gt;</p>`;
  assert.equal(visibleText(html), helperVisibleText(html));
  assert.equal(visibleText(html).trim(), `A & B — 'x' "y" <tag>`);
});

test("lib: hrefsIn and idsIn read attributes of real tags only, entity-decoded", () => {
  const html = home();
  const hrefs = hrefsIn(html);
  assert.ok(hrefs.includes("solutions/?view=matrix&from=home"));
  assert.ok(!hrefs.includes("/not-built/"), "markup inside <script> is not a link");
  assert.ok(!hrefs.includes("/commented-out/"), "markup inside a comment is not a link");
  const ids = idsIn(html);
  for (const id of ["main", ...HOME_IDS]) assert.ok(ids.has(id), id);
});

test("lib: resolveDistPath maps hrefs to built files", () => {
  const { dist } = makeTree();
  const homeFile = join(dist, "index.html");
  const alpha = join(dist, "solutions/alpha-fixture/index.html");
  assert.equal(resolveDistPath(dist, "/"), homeFile);
  assert.equal(resolveDistPath(dist, "/solutions/alpha-fixture/"), alpha);
  assert.equal(resolveDistPath(dist, "/solutions/alpha-fixture"), alpha);
  assert.equal(resolveDistPath(dist, "/solutions/alpha-fixture/index.html"), alpha);
  assert.equal(resolveDistPath(dist, "/solutions/alpha-fixture/#how-it-works"), alpha);
  assert.equal(resolveDistPath(dist, "/solutions/?view=matrix"), join(dist, "solutions/index.html"));
  assert.equal(resolveDistPath(dist, "/favicon.svg"), join(dist, "favicon.svg"));
  assert.equal(resolveDistPath(dist, "#faq", homeFile), homeFile);
  assert.equal(resolveDistPath(dist, "alpha-fixture/", join(dist, "solutions/index.html")), alpha);
  assert.equal(resolveDistPath(dist, "../../index.html", alpha), homeFile);
  assert.equal(resolveDistPath(dist, "/solutions/beta-fixture/"), null);
  assert.equal(resolveDistPath(dist, "/../package.json"), null, "never escapes the build dir");
  assert.equal(resolveDistPath(dist, "/x%2F..%2F..%2Fpackage.json"), null, "not even through encoded slashes");
  assert.equal(resolveDistPath(dist, "https://example.com/"), null);
});

test("lib: elementsWith returns whole elements, balancing nested tags of the same name", () => {
  const html = `<div data-x><div>inner <b>bold</b></div> tail</div><div>after</div><img data-x alt="">`;
  const [div, img] = elementsWith(html, "data-x");
  assert.equal(div.inner, "<div>inner <b>bold</b></div> tail");
  assert.equal(img.name, "img");
  assert.equal(img.inner, "");
  assert.equal(elementsWith(TRACE, "data-provenance", "illustrative").length, 1);
});

test("lib: phrases match whole words, any case, with hyphen and space interchangeable", () => {
  const re = phraseRegExp("cutting-edge");
  assert.equal("A Cutting Edge idea and a cutting-edge one".match(re).length, 2);
  assert.equal("benchmark".match(phraseRegExp("bench")), null);
  assert.ok(matchesGlob("src/content/insights/*.md", "src/content/insights/a.md"));
  assert.ok(!matchesGlob("src/content/insights/*.md", "src/content/insights/sub/a.md"));
  assert.ok(matchesGlob("src/content/**/*.md", "src/content/insights/sub/a.md"));
  const text = "Tested by a CREST-accredited firm. We are accredited.";
  const list = [{ file: "dist", phrase: "CREST accredited", reason: "names a third party's accreditation" }];
  const [first, second] = [...text.matchAll(phraseRegExp("accredited"))];
  assert.ok(excepted(list, "phrase", "dist/index.html", text, first.index, first.index + 10));
  assert.ok(!excepted(list, "phrase", "dist/index.html", text, second.index, second.index + 10));
  assert.ok(!excepted(list, "phrase", "src/components/Trust.astro", text, first.index, first.index + 10));
});

test("lib: result() sorts findings into errors and warnings", () => {
  const r = result();
  r.add("error", "e");
  r.add("warning", "w");
  assert.deepEqual([r.errors, r.warnings], [["e"], ["w"]]);
  assert.throws(() => r.add("info", "x"), /unknown kind/);
});

// --- Every check on the clean tree -----------------------------------------------

test("checks 1–6 each export run() and pass the clean synthetic tree", async () => {
  const inputs = makeTree();
  for (const mod of CHECKS) {
    const res = await mod.run(inputs);
    assert.equal(res.name, mod.NAME);
    assert.deepEqual(res.errors, [], `${mod.NAME} errors`);
    assert.deepEqual(res.warnings, [], `${mod.NAME} warnings`);
  }
  assert.deepEqual(CHECKS.map((m) => m.NAME), ["01-slugs", "02-links", "03-anchors", "04-banned-phrases", "05-captions", "06-provenance"]);
});

// --- 01 slugs, parity and cross-references ------------------------------------------

test("01: a path off the slug rule and a duplicate path fail", async () => {
  const pages = PAGES.map((p) => (p[2] === "/solutions/beta-fixture/" ? ["Beta Fixture", "/solutions/", "/solutions/beta/", "planned"] : p));
  pages.push(["Home copy", "/", "/", "planned"]);
  const res = await check(slugs, { "src/data/nav.ts": navTs(pages) });
  assertErrors(res, [/"Beta Fixture" has path \/solutions\/beta\/, but the slug rule gives \/solutions\/beta-fixture\//, /duplicate path \/$/]);
});

test("01: a live page without its content file, and a content file without a nav entry, fail", async () => {
  // Deleting gamma-and-fixture.yaml also breaks every reference to that industry id.
  const res = await check(slugs, {
    "src/content/industries/gamma-and-fixture.yaml": null,
    "src/content/industries/delta-fixture.yaml": { ...industry() },
  });
  assertErrors(res, [
    /\/industries\/gamma-and-fixture\/ is live, but src\/content\/industries\/gamma-and-fixture\.yaml does not exist/,
    /src\/content\/industries\/delta-fixture\.yaml: no nav\.ts entry has the path \/industries\/delta-fixture\//,
    /src\/data\/regulatory\/delta-fixture\.json \(file missing\)/,
    /src\/content\/solutions\/alpha-fixture\.yaml: byIndustry\[0\] is "gamma-and-fixture"/,
    /src\/content\/solutions\/alpha-fixture\.yaml: matrix key is "gamma-and-fixture"/,
    /src\/content\/kits\/gamma-fixture-kit\.yaml: industry is "gamma-and-fixture"/,
    /src\/content\/insights\/fixture-post\.md: industries\[0\] is "gamma-and-fixture"/,
  ]);
});

test("01: every dangling cross-reference is reported (Astro's reference() only logs them)", async () => {
  const badUseCase = { ...useCase("Fixture use case"), solution: "missing-solution" };
  const res = await check(slugs, {
    "src/content/industries/gamma-and-fixture.yaml": {
      ...industry(),
      leadSolutions: ["alpha-fixture", "missing-lead"],
      flagshipUseCases: [useCase("Fixture use case one"), badUseCase],
      obligationChips: [{ label: "Fixture obligation", row: "missing-row" }],
      workflow: [{ id: "intake", stage: "Fixture intake", useCases: [badUseCase] }],
      scenario: { title: "Fixture scenario", trace: "missing-trace" },
    },
    "src/content/solutions/alpha-fixture.yaml": { ...solution(), byIndustry: ["missing-industry"], demo: "missing-demo", matrix: { "missing-key": "Fixture cell" } },
    "src/content/kits/gamma-fixture-kit.yaml": { ...kit(), industry: "missing-kit-industry" },
    "src/content/insights/fixture-post.md": post("industries: [missing-post-industry]\nsolutions: [missing-post-solution]"),
    "src/data/demos/alpha-fixture.json": { ...demo(), solution: "missing-demo-solution" },
  });
  assertErrors(res, [
    /leadSolutions\[1\] is "missing-lead", which is not an id in src\/content\/solutions\//,
    /flagshipUseCases\[1\]\.solution is "missing-solution"/,
    /workflow\[0\]\.useCases\[0\]\.solution is "missing-solution"/,
    /obligationChips\[0\]\.row is "missing-row", which is not a row id in src\/data\/regulatory\/gamma-and-fixture\.json$/,
    /scenario\.trace is "missing-trace", which is not an id in src\/data\/traces\//,
    /byIndustry\[0\] is "missing-industry", which is not an id in src\/content\/industries\//,
    /demo is "missing-demo", which is not an id in src\/data\/demos\//,
    /matrix key is "missing-key"/,
    /gamma-fixture-kit\.yaml: industry is "missing-kit-industry"/,
    /fixture-post\.md: industries\[0\] is "missing-post-industry"/,
    /fixture-post\.md: solutions\[0\] is "missing-post-solution"/,
    /src\/data\/demos\/alpha-fixture\.json: solution is "missing-demo-solution"/,
  ]);
});

test("01: an unparseable content file is an error, not a crash", async () => {
  const res = await check(slugs, { "src/content/kits/gamma-fixture-kit.yaml": "industry: [unclosed\n" });
  assertErrors(res, [/src\/content\/kits\/gamma-fixture-kit\.yaml: cannot parse/]);
});

// --- 02 links ------------------------------------------------------------------

test("02: a link to an unbuilt page and a fragment with no target fail", async () => {
  const res = await check(links, {
    "dist/solutions/alpha-fixture/index.html": page(
      `<h1 id="how-it-works">Alpha</h1><a href="/solutions/beta-fixture/">Beta</a> <a href="/#no-such-id">x</a> <a href="#nowhere">y</a>`,
    ),
  });
  assertErrors(res, [
    /solutions\/alpha-fixture\/index\.html: href="\/solutions\/beta-fixture\/" does not resolve/,
    /href="\/#no-such-id" points at #no-such-id, but index\.html has no id="no-such-id"/,
    /href="#nowhere" points at #nowhere, but solutions\/alpha-fixture\/index\.html has no id="nowhere"/,
  ]);
});

test("02: a live nav page that wasn't built fails (and so do the links to it)", async () => {
  const res = await check(links, { "dist/industries/gamma-and-fixture/index.html": null });
  assertErrors(res, [/index\.html: href="\/industries\/gamma-and-fixture" does not resolve/, /\/industries\/gamma-and-fixture\/ is live but was not built/]);
});

test("02: a built hub whose <main> links to no child page is empty", async () => {
  const res = await check(links, { "dist/solutions/index.html": page(`<h1>Solutions</h1><p>Coming soon.</p>`) });
  assertErrors(res, [/solutions\/index\.html: the \/solutions\/ hub is empty/]);
});

test("02: a missing build fails instead of passing vacuously", async () => {
  const inputs = makeTree();
  const res = await links.run({ ...inputs, dist: join(inputs.root, "no-such-dist") });
  assertErrors(res, [/no built HTML found/]);
});

// --- 03 anchors ------------------------------------------------------------------

test("03: Home without #faq or #contact fails", async () => {
  const res = await check(anchors, { "dist/index.html": home(HOME_IDS.filter((id) => id !== "faq" && id !== "contact")) });
  assertErrors(res, [/index\.html: no element has id="faq"/, /index\.html: no element has id="contact"/]);
  assertErrors(await check(anchors, { "dist/index.html": null }), [/index\.html: not found/]);
});

// --- 04 banned phrases ---------------------------------------------------------------

test("04: FAIL phrases in src/ and in built text fail, whatever the case or hyphenation", async () => {
  const res = await check(banned, {
    "src/components/Hero.astro": "---\n---\n<p>Trusted by leading banks.</p>\n<p>A cutting edge,\n  World-Class team. No bench.</p>\n",
    "src/content/solutions/alpha-fixture.yaml": { ...solution(), scope: "A fixed-price pilot, from $5k ex GST." },
    "dist/solutions/alpha-fixture/index.html": page(`<p>Our <em>clients</em> say it’s the world’s best.</p>`),
  });
  assertErrors(res, [
    /src\/components\/Hero\.astro:3: "Trusted by" \(implied clients or track record\)/,
    /src\/components\/Hero\.astro:3: "leading banks"/,
    /src\/components\/Hero\.astro:4: "cutting edge" \(hype\)/,
    /src\/components\/Hero\.astro:5: "World-Class" \(hype\)/,
    /src\/components\/Hero\.astro:5: "bench"/,
    /alpha-fixture\.yaml:\d+: "fixed-price" \(pricing language \(D4\)\)/,
    /alpha-fixture\.yaml:\d+: "from \$5" \(pricing language/,
    /alpha-fixture\.yaml:\d+: "ex GST" \(pricing language/,
    /dist\/solutions\/alpha-fixture\/index\.html: "Our clients"/,
    /dist\/solutions\/alpha-fixture\/index\.html: "world's best"/,
  ]);
});

test("04: near misses pass, and src/fixtures/ is not scanned", async () => {
  const res = await check(banned, {
    "src/components/Hero.astro": "<p>A benchmark, working with your documents, uncertified claims avoided, frontiersman.</p>",
    "src/fixtures/copy.ts": 'export const x = "Trusted by our clients, certified and seamless";\n',
  });
  assertErrors(res, []);
  const hit = await check(banned, { "src/components/Hero.astro": "<p>We look forward to working with Fixture Pty Ltd.</p>" });
  assertErrors(hit, [/"working with" \(implied clients/]);
});

test("04: WARN phrases are reported as warnings, not errors", async () => {
  const res = await check(banned, { "src/components/Hero.astro": "<p>Onshore, not sovereign; assurance is a warning word.</p>" });
  assertErrors(res, []);
  assert.equal(res.warnings.length, 2, res.warnings.join("\n"));
  assert.match(res.warnings.join("\n"), /"sovereign" \(warn\)[\s\S]*"assurance" \(warn\)|"assurance" \(warn\)[\s\S]*"sovereign" \(warn\)/);
});

test("04: exceptions cover a phrase only in the files and wording they name", async () => {
  const overrides = {
    "src/content/insights/fixture-post.md": post() + "\nFrontier models change monthly.\n",
    "src/components/Hero.astro": "<p>Tested by a CREST-accredited firm. Frontier AI.</p>",
    "dist/index.html": home().replace("</main>", "<p>A CREST-accredited fixture tester.</p></main>"),
    "src/data/banned-phrase-exceptions.json": [
      { file: "src/content/insights/*.md", phrase: "frontier model", reason: "technical term in insights" },
      { file: "dist", phrase: "CREST-accredited", reason: "names a third-party tester's accreditation" },
      { file: "src/components/Hero.astro", phrase: "CREST accredited", reason: "names a third-party tester's accreditation" },
    ],
  };
  const res = await check(banned, overrides);
  assertErrors(res, [/src\/components\/Hero\.astro:1: "Frontier" \(hype\)/]);
  const bad = await check(banned, { ...overrides, "src/data/banned-phrase-exceptions.json": [{ file: "dist", phrase: "frontier" }] });
  assert.ok(bad.errors.some((e) => /banned-phrase-exceptions\.json\[0\]: needs non-empty "file", "phrase" and "reason"/.test(e)), bad.errors.join("\n"));
});

// --- 05 captions ---------------------------------------------------------------------

test("05: a MockPanel whose caption is missing, altered or hidden fails", async () => {
  const altered = MOCK.replace("Illustrative interface, fictional data", "Illustrative interface");
  const hidden = MOCK.replace('class="mock-caption"', 'class="mock-caption sr-only"');
  const bare = `<figure data-mock-panel><div>Fixture panel</div></figure>`;
  const res = await check(captions, { "dist/solutions/alpha-fixture/index.html": page(`${altered}${hidden}${bare}${MOCK}`) });
  assertErrors(res, [/MockPanel 1 lacks/, /MockPanel 2 lacks/, /MockPanel 3 lacks/]);
});

test("05: a SampleReport without its caption, or titled as the independent report, fails", async () => {
  const noCaption = REPORT.replace(/<p class="sample-caption"[\s\S]*?<\/p>/, "");
  const titled = REPORT.replace("<h2>Sample evaluation report</h2>", "<h2>Independent Evaluation Report</h2>");
  const res = await check(captions, { "dist/solutions/alpha-fixture/index.html": page(`${noCaption}${titled}`) });
  assertErrors(res, [/SampleReport 1 lacks its visible \[data-sample-caption\]/, /SampleReport 2 is titled "Independent Evaluation Report"/]);
});

// --- 06 provenance -------------------------------------------------------------------

test("06: missing provenance, and measured data without a committed run, fail", async () => {
  const noProvenance = trace();
  delete noProvenance.provenance;
  const res = await check(provenance, {
    "src/data/traces/fixture-trace.json": noProvenance,
    "src/data/traces/fixture-measured.json": { ...measuredTrace(), run: undefined },
    "src/data/traces/fixture-missing-run.json": { ...measuredTrace(), run: "src/data/runs/no-such-run/" },
    "src/data/traces/fixture-empty-run.json": { ...measuredTrace(), run: "src/data/runs/empty-run/" },
    "src/data/runs/empty-run/": "",
    "src/data/demos/alpha-fixture.json": {
      ...demo(),
      data: { score: { value: 1, provenance: "measured", run: "runs/fixture-run" }, guess: { value: 2, provenance: "estimated" } },
    },
  });
  assertErrors(res, [
    /fixture-trace\.json: "provenance" must be "measured" or "illustrative" \(got undefined\)/,
    /fixture-measured\.json: measured, so "run" must be "src\/data\/runs\/<run-id>\/" \(got undefined\)/,
    /fixture-missing-run\.json: run src\/data\/runs\/no-such-run\/ does not exist/,
    /fixture-empty-run\.json: run src\/data\/runs\/empty-run\/ is empty/,
    /alpha-fixture\.json: data\.score: measured, so "run" must be/,
    /alpha-fixture\.json: data\.guess: "provenance" must be "measured" or "illustrative"/,
  ]);
});

test("06: metric-shaped numbers in free text fail unless the key is exempt or an exception lists them", async () => {
  const lines = [
    { t: "00:00:01", op: "retrieve", detail: "Recall 0.93 on the fixture set" },
    { t: "00:00:02", op: "score", detail: "Fixture accuracy 95 % overall, 0.5% drift" },
    { t: "00:00:03", op: "time", detail: "Answered in 120ms, 7 / 10 fixture checks" },
  ];
  const overrides = { "src/data/traces/fixture-trace.json": { ...trace(), lines } };
  const res = await check(provenance, overrides);
  assertErrors(res, [/lines\[0\]\.detail has the metric-shaped "0\.93"/, /"95 %"/, /"0\.5%"/, /"120ms"/, /"7 \/ 10"/]);
  const excused = await check(provenance, {
    ...overrides,
    "src/data/metric-exceptions.json": [{ file: "src/data/traces/*.json", token: "7 / 10 fixture checks", reason: "a count of fixture checks, not a metric" }],
  });
  assert.equal(excused.errors.length, 4, excused.errors.join("\n"));
  assert.ok(!excused.errors.some((e) => e.includes("7 / 10")));
});

test("06: provenance is still checked under exempt keys; only their free text is exempt", async () => {
  const res = await check(provenance, {
    "src/data/demos/alpha-fixture.json": {
      ...demo(),
      data: {
        ...demo().data,
        source: {
          label: "Fixture Standard ¶32, cited in 3/4 of fixture cases at 0.9 relevance",
          url: "https://example.com/fixture-standard/32/4",
          relevance: { value: 0.9, provenance: "measured" },
          recall: { value: 0.8, provenance: "measured", run: "src/data/runs/fixture-run/" },
        },
        answer: [{ text: "Fixture answer", quote: { excerpt: "Fixture recall 95%", score: { value: 1, provenance: "estimated" } } }],
      },
    },
  });
  assertErrors(res, [
    /alpha-fixture\.json: data\.source\.relevance: measured, so "run" must be "src\/data\/runs\/<run-id>\/" \(got undefined\)/,
    /alpha-fixture\.json: data\.answer\[0\]\.quote\.score: "provenance" must be "measured" or "illustrative"/,
  ]);
});

test("06: a built element marked illustrative must show its label", async () => {
  const res = await check(provenance, {
    "dist/solutions/alpha-fixture/index.html": page(
      `${TRACE}<figure data-trace-panel data-provenance="illustrative"><ol><li>00:00:01 retrieve</li></ol></figure><div data-provenance="made-up">x</div>`,
    ),
  });
  assertErrors(res, [/<figure data-provenance="illustrative"> renders no visible "Illustrative" label/, /<div data-provenance="made-up"> is neither measured nor illustrative/]);
});
