// Page titles and meta descriptions (spec §11.3). Titles: `{fullName} | Techsider`, or `AI for
// {shortName} in Australia | Techsider` on industry pages, unique across the site and 60 characters
// or fewer. Descriptions: unique, 150–160 characters, written in nav.ts beside the page's names, and
// required of every live page; BaseLayout takes no default, so a route can't leave one out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDist, allHtmlFiles } from "./helpers.mjs";
import { decodeEntities } from "../scripts/ci/lib.mjs";
import { PAGES } from "../src/data/nav.ts";
import { DESCRIPTION_LENGTH, pageDescription, pageTitle } from "../src/lib/meta.ts";

const at = (path) => PAGES.find((p) => p.path === path);
const metaDescription = (html) => {
  const m = html.match(/<meta name="description" content="([^"]*)"/);
  return m ? decodeEntities(m[1]) : undefined;
};

test("pageTitle: Home, industry pages and every other page follow spec §11.3", () => {
  assert.equal(pageTitle(at("/")), "Techsider: AI that ships. Measured before it ships.");
  assert.equal(pageTitle(at("/industries/government/")), "AI for Government in Australia | Techsider");
  assert.equal(pageTitle(at("/industries/legal-and-professional/")), "AI for Legal & professional in Australia | Techsider");
  assert.equal(pageTitle(at("/industries/")), "Industries | Techsider");
  assert.equal(pageTitle(at("/solutions/document-registers/")), "Document Registers & Evidence Packs | Techsider");
  assert.equal(pageTitle(at("/demos/ai-evaluation/")), "Independent AI Evaluation demo | Techsider");
  assert.equal(pageTitle(at("/insights/")), "Insights | Techsider");
  assert.equal(pageTitle(at("/legal/privacy/")), "Privacy policy | Techsider");
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
  const entry = { ...at("/about/"), description: `${"x".repeat(149)}.` };
  assert.equal(pageDescription(entry), entry.description);
  assert.equal(pageDescription({ ...entry, description: `${"x".repeat(159)}.` }).length, 160);
});

test("pageDescription: fails the build for a page with no description, or one outside 150–160 characters", () => {
  const about = at("/about/");
  assert.equal(about.description, undefined, "the fixture page for this test already has a description");
  assert.throws(() => pageDescription(about), {
    message: "nav.ts: /about/ has no description. Every page needs a unique meta description of 150–160 characters (spec §11.3).",
  });
  for (const n of [149, 161]) {
    assert.throws(() => pageDescription({ ...about, description: "x".repeat(n) }), {
      message: `nav.ts: /about/'s description is ${n} characters; spec §11.3 needs 150–160.`,
    });
  }
  assert.throws(() => pageDescription({ ...about, description: ` ${"x".repeat(150)} ` }), /leading or trailing space/);
});

test("every live nav page has a description, and every description is unique and 150–160 characters", () => {
  for (const p of PAGES.filter((x) => x.status === "live")) assert.ok(p.description, `${p.path} is live but has no description`);
  const written = PAGES.filter((p) => p.description !== undefined);
  for (const p of written) assert.equal(pageDescription(p), p.description, p.path);
  const descriptions = written.map((p) => p.description);
  assert.deepEqual(descriptions.filter((d, i) => descriptions.indexOf(d) !== i), [], "a description repeats");
});

test("BaseLayout requires a description: no default, so a route can't fall back to shared copy", () => {
  const src = readFileSync(new URL("../src/layouts/BaseLayout.astro", import.meta.url), "utf8");
  const props = src.match(/interface Props \{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(props, /^\s*description: string;/m, "BaseLayout's description prop is optional");
  const destructure = src.match(/const \{([\s\S]*?)\} = Astro\.props;/)?.[1] ?? "";
  assert.doesNotMatch(destructure, /description\s*=/, "BaseLayout still defaults the description");
});

test("production: each live nav page carries its own description, and no two built pages share one", () => {
  for (const p of PAGES.filter((x) => x.status === "live")) {
    const file = p.path === "/" ? "index.html" : `${p.path.slice(1)}index.html`;
    assert.equal(metaDescription(readDist(file)), pageDescription(p), p.path);
  }
  const pages = allHtmlFiles().filter((f) => f.endsWith("index.html") && f !== "404/index.html");
  const seen = new Map();
  for (const f of pages) {
    const d = metaDescription(readDist(f));
    assert.ok(d, `${f} has no meta description`);
    assert.ok(!seen.has(d), `${f} repeats the description of ${seen.get(d)}`);
    seen.set(d, f);
  }
});
