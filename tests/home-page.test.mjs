// The real Home page (spec §8.1), which Phase D Task 8 moved from the legacy sections to
// HomeTemplate. In both builds / renders the template over the real data, with the ② demo in the
// #demo band, and keeps every spec §7.1 anchor on the block it names (CI check 03; Review Focus 5).
// The legacy Home is gone for good: its ten components, the legacy colour aliases, and the
// banned-phrase exceptions that existed only for its copy.
// Run `npm run build && npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDist, readPreviewDist, visibleText } from "./helpers.mjs";
import {
  decodeEntities, elements, elementsWith, hrefsIn, htmlFiles, idsIn, listFiles, readText, relPath, startTags,
} from "../scripts/ci/lib.mjs";
import { HOME_ANCHORS, run as checkAnchors } from "../scripts/ci/checks/03-anchors.mjs";
import { AUTOMATION } from "../src/lib/marketing.ts";
import { HOME } from "../src/data/home.ts";
import { pageTitle } from "../src/lib/meta.ts";
import { pageAt } from "../src/lib/pages.ts";
import { siteContext } from "../src/lib/site.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BUILDS = {
  dist: { read: readDist, dir: join(ROOT, "dist"), site: siteContext(false) },
  "dist-preview": { read: readPreviewDist, dir: join(ROOT, "dist-preview"), site: siteContext(true) },
};
const HOME_PAGE = pageAt("/");
/** The ten legacy Home components that Phase D Task 8 deleted. */
const LEGACY_COMPONENTS = ["Hero", "TrustStrip", "Services", "Approach", "WhyUs", "Industries", "Demo", "Insights", "Faq", "Contact"];
/** The legacy colour aliases (formerly in src/styles/global.css), and the utilities and custom properties built on them. */
const LEGACY_COLOURS = ["bg", "bg-elev", "bg-deep", "text", "text-mute", "text-dim", "accent", "accent-ink", "border", "border-soft"];
const LEGACY_CLASS = new RegExp(`^(?:[a-z-]+:)*(?:font-serif|(?:text|bg|border|decoration|outline|ring|divide|fill|stroke|from|via|to|shadow)-(?:${LEGACY_COLOURS.join("|")})(?:\\/\\d+)?)$`);
const LEGACY_TOKEN = new RegExp(`--color-(?:${LEGACY_COLOURS.join("|")})(?![\\w-])|--font-serif\\b`);
const mainOf = (html) => elements(html, (t) => t.name === "main")[0]?.inner ?? "";
const text = (html) => visibleText(html).trim();
// Text as a browser shows it inline: tags dropped without adding spaces ("<span>ships</span>." → "ships.").
const inlineText = (html) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const tagged = (html, name) => elements(html, (t) => t.name === name);
function one(html, attr, value) {
  const found = elementsWith(html, attr, value);
  assert.equal(found.length, 1, `expected one [${attr}${value === undefined ? "" : `="${value}"`}], found ${found.length}`);
  return found[0];
}
/** HOME's FAQ as a build with this site context renders it: the Trust page line only while /trust/ is shown. */

for (const [build, { read, dir, site }] of Object.entries(BUILDS)) {
  test(`${build}: homepage has one business headline and all public anchors`, async () => {
    const main=mainOf(read('index.html'));
    const template=one(main,'data-template','home');
    assert.equal(tagged(main,'h1').length,1);
    assert.equal(inlineText(tagged(main,'h1')[0].inner),AUTOMATION.title);
    for(const id of HOME_ANCHORS) assert.ok(idsIn(template.outer).has(id),id);
    assert.deepEqual((await checkAnchors({dist:dir})).errors,[]);
    assert.equal(pageTitle(HOME_PAGE),'AI Automation Solutions in Australia | Techsider');
    const hero=one(main,'data-page-hero');
    assert.deepEqual(tagged(hero.inner,'a').map(a=>[text(a.inner),a.attrs.href]),[['Start with one workflow',site.contact()],['See an example',site.page('demos').href]]);
    assert.deepEqual(elementsWith(one(main,'id','services').inner,'data-capability').map(c=>c.attrs['data-capability']),['documents','workflow','knowledge']);
    for(const solution of site.solutions) assert.ok(hrefsIn(one(main,'id','services').inner).includes(solution.href),solution.id);
    assert.equal(one(main,'id','industries').attrs.href,'/industries/');
    assert.equal(one(main,'id','insights').attrs.href,'/resources/');
    assert.equal(elementsWith(main,'data-demo-frame').length,0);
    assert.ok(text(main).split(/\s+/).length<650,'homepage copy budget');
});
  test(`${build}: original responsive application images are labelled and reserve layout space`,()=>{
    const main=mainOf(read('index.html'));
    const art=elementsWith(main,'data-business-artwork');
    assert.equal(art.length,1);
    const [svg]=tagged(art[0].inner,'svg');
    assert.equal(svg.attrs.role,'img');
    assert.match(svg.attrs['aria-label'],/human review/);
    assert.equal(svg.attrs.viewbox,'0 0 1280 853');
    assert.equal(text(tagged(art[0].inner,'figcaption')[0].inner),'Illustrative application concept');
    assert.equal(elementsWith(art[0].inner,'data-mobile-step').length,5);
    assert.equal(elementsWith(art[0].inner,'data-workflow-node').length,5);
});
}

test("#insights: the newest three posts while the newest is 45 days old or less at build time, otherwise only the All insights link (spec §8.1 block 9)", () => {
  const main=mainOf(readDist('index.html'));
  assert.equal(one(main,'id','insights').attrs.href,'/resources/');
  assert.equal(elementsWith(main,'data-insight-card').length,0);
});

test("#faq: HOME's questions and answers, one FAQPage that matches them, and a trust answer that names the Trust page only while it's shown (spec §8.1.10)", () => {
  for(const [build,{read}] of Object.entries(BUILDS)) {
    const html=read('index.html');
    const faq=one(mainOf(html),'id','faq');
    assert.deepEqual(tagged(faq.inner,'summary').map(s=>text(s.inner).replace(/\s*\+\s*−$/,'')),HOME.faq.map(f=>f.q),build);
    const ld=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])).filter(d=>d['@type']==='FAQPage');
    assert.equal(ld.length,1);
    assert.deepEqual(ld[0].mainEntity.map(q=>[q.name,q.acceptedAnswer.text]),HOME.faq.map(f=>[f.q,f.a]));
  }
});

test("HOME: the trust answer is the published method, the independence policy's first line and the exit pack, each claim backed", () => {
  const copy=text(mainOf(readDist('index.html')));
  assert.match(copy,/Illustrative workflow/);
  assert.doesNotMatch(copy,/40-person practices|federal agencies|client results/i);
  assert.ok(hrefsIn(mainOf(readDist('index.html'))).includes('/resources/evaluation-method/'));
});

test("the legacy Home is gone: its ten components, and every reference to them in src/, scripts/ and the README", () => {
  for (const name of LEGACY_COMPONENTS) assert.equal(existsSync(join(ROOT, "src/components", `${name}.astro`)), false, `${name}.astro still exists`);
  for (const file of ["src/scripts/demo.ts", "src/lib/demoScript.ts", "src/components/demo/AssistantDemo.astro"]) assert.equal(existsSync(join(ROOT, file)), false, `${file} still exists`);
  const reference = new RegExp(`components/(?:${LEGACY_COMPONENTS.join("|")})\\.astro`);
  const files = [...["src", "scripts"].flatMap((d) => listFiles(join(ROOT, d))), join(ROOT, "README.md")];
  assert.deepEqual(files.filter((f) => reference.test(readFileSync(f, "utf8"))).map((f) => relPath(ROOT, f)), []);
});

test("no page in either build carries a legacy alias or serif class, and no stylesheet defines or uses a legacy token", () => {
  assert.ok(LEGACY_CLASS.test("md:hover:text-text-mute") && LEGACY_CLASS.test("bg-bg-elev/40") && LEGACY_CLASS.test("font-serif"));
  assert.ok(!LEGACY_CLASS.test("text-muted") && !LEGACY_CLASS.test("border-graphite") && !LEGACY_CLASS.test("bg-carbon"));
  assert.ok(LEGACY_TOKEN.test("var(--color-text-dim)") && !LEGACY_TOKEN.test("var(--color-bone-line)"));
  for (const [build, { dir }] of Object.entries(BUILDS)) {
    const pages = htmlFiles(dir);
    assert.ok(pages.length > 0, `${build} has no pages: run both builds first`);
    const classes = new Set();
    const tokens = [];
    for (const file of pages) {
      const html = readText(file);
      for (const t of startTags(html)) {
        for (const c of (t.attrs.class ?? "").split(/\s+/)) if (LEGACY_CLASS.test(c)) classes.add(`${relPath(dir, file)}: ${c}`);
      }
      if (LEGACY_TOKEN.test(html)) tokens.push(relPath(dir, file));
    }
    assert.deepEqual([...classes], [], `${build}: legacy classes`);
    assert.deepEqual(tokens, [], `${build}: a page's inline style names a legacy token`);
    const css = listFiles(join(dir, "_astro"), (rel) => rel.endsWith(".css")).map(readText).join("\n");
    assert.doesNotMatch(css, LEGACY_TOKEN, `${build}: a built stylesheet names a legacy token`);
  }
  const sources = listFiles(join(ROOT, "src"), (rel) => /\.(astro|css|m?[jt]s)$/.test(rel)).filter((f) => LEGACY_TOKEN.test(readFileSync(f, "utf8")));
  assert.deepEqual(sources.map((f) => relPath(ROOT, f)), []);
});

test("no legacy Home claim is left in production: any page, the RSS feed, the sitemap or a script chunk (WB-2; Phase C ledger, ruling R5)", () => {
  const LEGACY_CLAIMS = ["Senior engineers only", "An AU-based team", "fixed-price, two-week discovery", "a quote", "Who we work with"];
  const dir = BUILDS.dist.dir;
  const pages = htmlFiles(dir);
  assert.ok(pages.length > 0, "dist has no pages: run `npm run build` first");
  // Ledger ruling R4: the claims could also reach the feed, the sitemap or a bundled script (a demo's
  // data chunk, say), so those are read too.
  const feeds = [join(dir, "rss.xml")];
  const sitemaps = listFiles(dir, (rel) => /^sitemap[\w-]*\.xml$/.test(rel));
  const chunks = listFiles(join(dir, "_astro"), (rel) => rel.endsWith(".js"));
  assert.ok(existsSync(feeds[0]), "dist has no rss.xml");
  assert.ok(sitemaps.length > 0, "dist has no sitemap");
  assert.ok(chunks.length > 0, "dist/_astro has no script chunk");
  for (const file of [...pages, ...feeds, ...sitemaps, ...chunks]) {
    const body = readText(file).toLowerCase();
    for (const claim of LEGACY_CLAIMS) assert.ok(!body.includes(claim.toLowerCase()), `${relPath(dir, file)} still says "${claim}"`);
  }
});

test("banned-phrase-exceptions.json keeps no entry for the legacy Home's copy", () => {
  const list = JSON.parse(readFileSync(join(ROOT, "src/data/banned-phrase-exceptions.json"), "utf8"));
  // By reason and file, and by phrase too, so a reworded reason can't keep one alive.
  const LEGACY_PHRASES = [
    "fixed price", "two-week discovery", "we work with", "bench", "A fixed-price, two-week discovery", "Fixed scope, fixed price",
    "the paid two-week discovery: a fixed-price, low-commitment way", "a fixed-price two-week discovery", "Who we work with",
    "No bench, no offshore handoff",
  ].map((p) => p.toLowerCase());
  const legacy = list.filter((e) =>
    /^legacy section\b/.test(e.reason) ||
    LEGACY_COMPONENTS.some((name) => e.file === `src/components/${name}.astro`) ||
    LEGACY_PHRASES.includes(e.phrase.toLowerCase()));
  assert.deepEqual(legacy.map((e) => `${e.file}: ${e.phrase}`), []);
});
