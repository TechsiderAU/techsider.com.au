// Page titles and meta descriptions (spec §11.3). Titles: `{fullName} | Techsider`, or `AI for
// {shortName} in Australia | Techsider` on industry pages, unique across the site and 60 characters
// or fewer. Descriptions: unique, 150–160 characters, written in nav.ts beside the page's names
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

test("pageTitle: Home, industry pages and every other page follow spec §11.3", () => {
  assert.equal(pageTitle(at("/")), "AI Automation Solutions in Australia | Techsider");
  assert.equal(pageTitle(at("/industries/government/")), "AI for Government in Australia | Techsider");
  assert.equal(pageTitle(at("/industries/legal-and-professional/")), "AI for Legal & professional in Australia | Techsider");
  assert.equal(pageTitle(at("/industries/")), "Industries | Techsider");
  assert.equal(pageTitle(at("/solutions/document-registers/")), "Document Registers & Evidence Packs | Techsider");
  assert.equal(pageTitle(at("/demos/ai-evaluation/")), "Independent AI Evaluation demo | Techsider");
  assert.equal(pageTitle(at("/insights/")), "Insights | Techsider");
  assert.equal(pageTitle(at("/legal/privacy/")), "Privacy policy | Techsider");
  assert.equal(pageTitle(at("/404")), "Not found | Techsider");
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
