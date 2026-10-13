// Page titles and meta descriptions (spec §11.3; go-global §3.4). Titles: `{fullName} | Techsider`,
// or `AI for {shortName} | Techsider` on industry pages, unique across the site, 60 characters or
// fewer, and naming no country. Descriptions: unique, 150–160 characters, written in nav.ts beside the page's names
// through describe(), and required of every live page; BaseLayout takes no default, so a route
// can't leave one out. Their words are held to the §3.5 banned phrases (FAIL and WARN lists), the
// §3.4 terms no audience may use and currency figures, and every nav page either build renders
// carries exactly its own description, for search and for sharing.
// The build tests read dist/ and dist-preview/: run `npm run build && npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodeEntities, findAll, htmlFiles, looseRegExp, normalizeQuotes, readText, relPath, resolveDistPath } from "../scripts/ci/lib.mjs";
import { FAIL_PHRASES, WARN_PHRASES } from "../scripts/ci/checks/04-banned-phrases.mjs";
import { CURRENCY } from "../scripts/ci/checks/11-pricing.mjs";
import { PAGES } from "../src/data/nav.ts";
import { DESCRIPTION_LENGTH, pageDescription, pageTitle } from "../src/lib/meta.ts";

const at = (path) => PAGES.find((p) => p.path === path);
const BUILDS = {
  dist: fileURLToPath(new URL("../dist/", import.meta.url)),
  "dist-preview": fileURLToPath(new URL("../dist-preview/", import.meta.url)),
};
/**
 * Spec §3.4 terms that no audience may use and check 04 doesn't list: a regulatory error (APRA
 * supervises; it doesn't audit), overclaims, and billing cadence, which signals a price (D4). A
 * space in the source also matches a hyphen, as in check 04.
 */
const AUDIENCE_TERMS = [
  ["APRA audit", "\\bAPRA audit"],
  ["board-ready", "\\bboard ready\\b"],
  ["health check", "\\bhealth checks?\\b"],
  ["bake-off", "\\bbake offs?\\b"],
  ["retainer", "\\bretainers?\\b"],
  ["per month", "\\bper month\\b"],
  ["monthly", "\\bmonthly\\b"],
].map(([label, source]) => ({ label: `"${label}" (spec §3.4)`, re: looseRegExp(source) }));
/** The content of `<meta {attr}="{value}" content="…">`, decoded; undefined when the page has none. */
function metaContent(html, attr, value) {
  const m = html.match(new RegExp(`<meta ${attr}="${value}" content="([^"]*)"`));
  return m ? decodeEntities(m[1]) : undefined;
}

test("pageTitle: Home, search titles, industry pages and every other page follow spec §11.3 and go-global §3.4", () => {
  assert.equal(pageTitle(at("/")), "AI Automation Solutions | Techsider");
  assert.equal(pageTitle(at("/industries/government/")), "AI Evaluation for Government Agencies | Techsider");
  assert.equal(pageTitle(at("/industries/education/")), "AI for Education | Techsider");
  assert.equal(pageTitle(at("/industries/real-estate/")), "AI for Real Estate | Techsider", "industry short names are Title Case in a <title>");
  assert.equal(pageTitle(at("/industries/legal-and-professional/")), "AI for Law Firms and Professional Services | Techsider");
  assert.equal(pageTitle(at("/industries/")), "AI Solutions by Industry | Techsider");
  assert.equal(pageTitle(at("/solutions/document-registers/")), "Intelligent Document Processing | Techsider");
  assert.equal(pageTitle(at("/demos/ai-evaluation/")), "Independent AI Evaluation demo | Techsider");
  assert.equal(pageTitle(at("/insights/")), "AI Guides and Field Notes | Techsider");
  assert.equal(pageTitle(at("/about/")), "About Techsider | AI Automation Company, Sydney");
  assert.equal(pageTitle(at("/legal/privacy/")), "Privacy policy | Techsider");
  assert.equal(pageTitle(at("/404")), "Not found | Techsider");
});

/** Go-global §3.4: every title the spec rewrites, word for word. */
const GLOBAL_TITLES = {
  "/": "AI Automation Solutions | Techsider",
  "/solutions/": "AI Solutions for Organisations | Techsider",
  "/solutions/document-registers/": "Intelligent Document Processing | Techsider",
  "/solutions/draft-for-approval/": "AI Workflow Automation | Techsider",
  "/solutions/ai-evaluation/": "Independent AI and LLM Evaluation | Techsider",
  "/solutions/ai-switch-on/": "Copilot & AI Implementation Consulting | Techsider",
  "/industries/": "AI Solutions by Industry | Techsider",
  "/industries/government/": "AI Evaluation for Government Agencies | Techsider",
  "/industries/financial-services/": "AI Validation for Regulated Financial Firms | Techsider",
  "/industries/healthcare/": "AI Scribe Evaluation for Healthcare | Techsider",
  "/industries/manufacturing/": "AI for Manufacturing | Techsider",
  "/industries/resources-and-energy/": "AI for Resources & Energy | Techsider",
  "/services/": "AI Consulting Services | Techsider",
  "/insights/": "AI Guides and Field Notes | Techsider",
  "/about/": "About Techsider | AI Automation Company, Sydney",
};
/** Go-global §3.4: the 16 descriptions rewritten location-free, word for word. */
const GLOBAL_DESCRIPTIONS = {
  "/": "AI automation for organisations in nine industries. We design, build and support workflows that connect systems, process documents and keep people in control.",
  "/solutions/": "Five AI solutions for organisations of any size: document registers, cited assistants, draft-for-approval automation, independent evaluation and AI switch-on.",
  "/solutions/document-registers/": "AI document processing for your teams. Extract deeds, agreements and other documents into a register, with source links and exceptions for human review.",
  "/solutions/draft-for-approval/": "AI workflow automation for your business. Connect repeated tasks across systems, prepare drafts and route exceptions, with people approving each action.",
  "/solutions/ai-switch-on/": "AI implementation and adoption for your organisation. Assess tools you already license, configure suitable features, train staff and measure the change.",
  "/industries/government/": "Independent evaluation of AI in government: measured tests on your own questions, with each finding mapped to the AI policy and frameworks your agency follows.",
  "/industries/financial-services/": "Independent validation of vendor AI for regulated financial institutions: your own test set, re-run when the model may change, every failure listed for review.",
  "/industries/accounting/": "AI automation for accounting firms. Review documents, organise trust deed registers and assess your existing software, with people checking the results.",
  "/industries/education/": "AI for schools and universities: a staff policy assistant that cites its source, and an independent evaluation of the AI tools you've already deployed.",
  "/industries/manufacturing/": "AI for manufacturers: SOP answers in your crews' languages, citing the page, each language tested first, designed around workplace safety, food and GMP rules.",
  "/industries/real-estate/": "AI for property managers: a management agreement register where every field links to its page, read-only on your trust ledger, with platform AI tried first.",
  "/industries/healthcare/": "Test AI scribes on your own scripted consultations before rollout and after each vendor update, counting omissions and additions. For health services.",
  "/industries/resources-and-energy/": "Turn approval conditions into a register you can check, answer crews from current procedures, and map AI use to critical-infrastructure rules in your sector.",
  "/industries/legal-and-professional/": "AI for law firms and professional services. Evaluate vendor tools, organise internal knowledge and assess existing software, with clear review controls.",
  "/resources/": "Free resources from Techsider for teams putting AI to work in regulated industries: demos, tools and field notes on retrieval, evaluation and model hosting.",
  "/insights/": "Field notes and guides on shipping AI in regulated work: retrieval that cites its sources, evaluation before launch, and choosing where models are hosted.",
};

test("go-global §3.4: the rewritten titles and the 16 descriptions, word for word, and no title or description names Australia", () => {
  for (const [path, title] of Object.entries(GLOBAL_TITLES)) assert.equal(pageTitle(at(path)), title, path);
  assert.equal(Object.keys(GLOBAL_DESCRIPTIONS).length, 16);
  for (const [path, description] of Object.entries(GLOBAL_DESCRIPTIONS)) assert.equal(at(path).description, description, path);
  for (const p of PAGES) {
    assert.doesNotMatch(pageTitle(p), /\bAustralia/, `${p.path}: the title names Australia`);
    if (p.description !== undefined) assert.doesNotMatch(p.description, /\bAustralia/, `${p.path}: the description names Australia`);
  }
});

test("pageTitle: every nav page's title is unique and 60 characters or fewer", () => {
  const titles = PAGES.map(pageTitle);
  for (const [i, title] of titles.entries()) {
    assert.ok(title.length <= 60, `${PAGES[i].path}: "${title}" is ${title.length} characters`);
  }
  const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
  assert.deepEqual(dupes, []);
});

test("pageDescription: the page's own description, 150–160 characters (spec §11.3)", () => {
  assert.deepEqual(DESCRIPTION_LENGTH, { min: 150, max: 160 });
  const entry = { ...at("/trust/"), description: `${"x".repeat(149)}.` };
  assert.equal(pageDescription(entry), entry.description);
  assert.equal(pageDescription({ ...entry, description: `${"x".repeat(159)}.` }).length, 160);
});

test("pageDescription: fails the build for a page with no description, or one outside 150–160 characters", () => {
  const trust = { ...at("/trust/") };
  delete trust.description;
  assert.throws(() => pageDescription(trust), {
    message: "nav.ts: /trust/ has no description. Every page needs a unique meta description of 150–160 characters (spec §11.3).",
  });
  for (const n of [149, 161]) {
    assert.throws(() => pageDescription({ ...trust, description: "x".repeat(n) }), {
      message: `nav.ts: /trust/'s description is ${n} characters; spec §11.3 needs 150–160.`,
    });
  }
  assert.throws(() => pageDescription({ ...trust, description: ` ${"x".repeat(150)} ` }), /leading or trailing space/);
});

test("every live nav page has a description, and every description is unique and 150–160 characters", () => {
  for (const p of PAGES.filter((x) => x.status === "live")) assert.ok(p.description, `${p.path} is live but has no description`);
  for (const path of ["/", "/404", "/insights/"]) assert.ok(at(path).description, `${path} has no description`);
  const written = PAGES.filter((p) => p.description !== undefined);
  for (const p of written) assert.equal(pageDescription(p), p.description, p.path);
  const descriptions = written.map((p) => p.description);
  assert.deepEqual(descriptions.filter((d, i) => descriptions.indexOf(d) !== i), [], "a description repeats");
});

test("no description has a banned phrase (spec §3.5, FAIL and WARN lists), a §3.4 term no audience may use, or a currency figure (D4)", () => {
  for (const p of PAGES.filter((x) => x.description !== undefined)) {
    const text = normalizeQuotes(p.description);
    for (const rule of [...FAIL_PHRASES, ...WARN_PHRASES, ...AUDIENCE_TERMS, CURRENCY]) {
      assert.deepEqual(findAll(text, rule.re).map((hit) => hit.match), [], `${p.path}: ${rule.label}`);
    }
  }
});

test("BaseLayout requires a description: no default, so a route can't fall back to shared copy", () => {
  const src = readFileSync(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");
  const props = src.match(/interface Props \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(props, /^\s*description: string;/m, "BaseLayout's description prop is optional");
  const destructure = src.match(/const \{([\s\S]*?)\} = Astro\.props;/)?.[1] ?? "";
  assert.doesNotMatch(destructure, /description\s*=/, "BaseLayout still defaults the description");
});

test("BaseLayout requires a title too: the legacy Home's default is gone, so every route names its own page (spec §11.3)", () => {
  const src = readFileSync(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");
  const props = src.match(/interface Props \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(props, /^\s*title: string;/m, "BaseLayout's title prop is optional");
  const destructure = src.match(/const \{([\s\S]*?)\} = Astro\.props;/)?.[1] ?? "";
  assert.doesNotMatch(destructure, /title\s*=/, "BaseLayout still defaults the title");
  assert.doesNotMatch(src, /Enterprise AI for Australian business/, "BaseLayout still carries the legacy Home's title");
});

for (const [build, dir] of Object.entries(BUILDS)) {
  test(`${build}: every nav page it builds carries its own description, for search and for sharing`, () => {
    const built = PAGES.filter((p) => resolveDistPath(dir, p.path) !== null);
    assert.ok(built.some((p) => p.path === "/404"), `${build} has no 404 page`);
    for (const p of built) {
      const html = readText(resolveDistPath(dir, p.path));
      assert.equal(metaContent(html, "name", "description"), pageDescription(p), `${build} ${p.path}: meta description`);
      assert.equal(metaContent(html, "property", "og:description"), p.description, `${build} ${p.path}: og:description`);
      assert.equal(metaContent(html, "name", "twitter:description"), p.description, `${build} ${p.path}: twitter:description`);
    }
  });

  test(`${build}: every built page outside the gallery has a description, and no two share one`, () => {
    const seen = new Map();
    for (const file of htmlFiles(dir)) {
      const rel = relPath(dir, file);
      if (rel.startsWith("preview/")) continue; // the gallery pages share PreviewLayout's notice
      const d = metaContent(readText(file), "name", "description");
      assert.ok(d, `${build}/${rel} has no meta description`);
      assert.ok(!seen.has(d), `${build}/${rel} repeats the description of ${seen.get(d)}`);
      seen.set(d, rel);
    }
    assert.ok(seen.has(at("/404").description), `${build}/404.html isn't in the sweep`);
  });
}
