// The real Home page (spec §8.1), which Phase D Task 8 moved from the legacy sections to
// HomeTemplate. In both builds / renders the template over the real data, with the ② demo in the
// #demo band, and keeps every spec §7.1 anchor on the block it names (CI check 03; Review Focus 5).
// The legacy Home is gone for good: its ten components, the legacy colour aliases, and the
// banned-phrase exceptions that existed only for its copy.
// Run `npm run build && npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDist, readPreviewDist, visibleText } from "./helpers.mjs";
import {
  decodeEntities, elements, elementsWith, hrefsIn, htmlFiles, idsIn, listFiles, readFrontmatter, readText, relPath, startTags,
} from "../scripts/ci/lib.mjs";
import { HOME_ANCHORS, run as checkAnchors } from "../scripts/ci/checks/03-anchors.mjs";
import { AUTOMATION } from "../src/lib/marketing.ts";
import { HOME } from "../src/data/home.ts";
import { SERVICES } from "../src/data/services.ts";
import { HOME_TRUST_QUESTION } from "../src/lib/fixed-copy.ts";
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
const faqFor = (site) => HOME.faq.map((f) =>
  (f.q === HOME_TRUST_QUESTION && site.page("trust").href !== null ? { q: f.q, a: `${f.a} ${HOME.trustPageLine}` } : f));

for (const [build, { read, dir, site }] of Object.entries(BUILDS)) {
  test(`${build}: homepage has one business headline and all public anchors`, async () => {
    const main = mainOf(read("index.html"));
    const template = one(main, "data-template", "home");
    assert.equal(tagged(main, "h1").length, 1);
    assert.equal(inlineText(tagged(main, "h1")[0].inner), AUTOMATION.title);
    const ids = idsIn(template.outer);
    for (const id of HOME_ANCHORS) assert.ok(ids.has(id), id);
    for (const id of HOME_ANCHORS.filter(id => id !== "contact")) {
      assert.equal(one(template.inner, "id", id).attrs["aria-labelledby"], `${id}-heading`);
    }
    assert.deepEqual((await checkAnchors({dist:dir})).errors, []);
    assert.equal(pageTitle(HOME_PAGE), "AI Automation Solutions in Australia | Techsider");
    assert.ok(HOME_PAGE.description.includes("AI automation"));
    const hero = one(main, "data-page-hero");
    assert.ok(text(hero.inner).includes(AUTOMATION.sub));
    assert.deepEqual(tagged(hero.inner, "a").map(a=>[text(a.inner),a.attrs.href]), [["Talk about your workflow",site.contact()],["Explore solutions","#services"]]);
    const services = one(main,"id","services");
    const capabilities = elementsWith(services.inner,"data-capability");
    assert.deepEqual(capabilities.map(c=>c.attrs["data-capability"]), ["workflow","documents","knowledge"]);
    for(const solution of site.solutions) assert.ok(hrefsIn(services.inner).includes(solution.href),solution.id);
    const industryCards = elementsWith(one(main,"id","industries").inner,"data-link-card");
    assert.equal(industryCards.length,9);
    industryCards.forEach((card,i)=>assert.deepEqual(hrefsIn(card.inner),[site.industries[i].href]));
    assert.deepEqual(tagged(one(main,"id","approach").inner,"h3").map(h=>text(h.inner)),AUTOMATION.process.map(p=>p.title));
    const demo=one(main,"id","demo");
    assert.equal(elementsWith(demo.inner,"data-demo-frame").length,0,"full replays belong on demo pages");
    assert.equal(one(demo.inner,"data-all-demos").attrs.href,site.page("demos").href);
    assert.ok(text(demo.inner).includes("Illustrative examples"));
    // The introduction stays concise; deep policy and demo transcripts have their own pages.
    assert.ok(text(main).split(/\s+/).length < 1000, "homepage exceeded its copy budget");
  });
  test(`${build}: original responsive application images are labelled and reserve layout space`,()=>{
    const main=mainOf(read("index.html"));
    const art=elementsWith(main,"data-business-artwork");
    assert.equal(art.length,5);
    for(const figure of art){
      const [img]=tagged(figure.inner,"img");
      assert.ok(img.attrs.alt.length>30,"meaningful image description");
      assert.equal(img.attrs.width,"1536"); assert.equal(img.attrs.height,"1024");
      assert.match(img.attrs.srcset,/640w.*1280w/);
      assert.equal(text(tagged(figure.inner,"figcaption")[0].inner),"Illustrative application concept");
      assert.ok(existsSync(join(ROOT,"public",img.attrs.src)));
    }
    assert.equal(tagged(art[0].inner,"img")[0].attrs.fetchpriority,"high");
    assert.equal(tagged(art[0].inner,"img")[0].attrs.loading,"eager");
    for(const figure of art.slice(1)) assert.equal(tagged(figure.inner,"img")[0].attrs.loading,"lazy");
  });
}

test("#insights: the newest three posts while the newest is 45 days old or less at build time, otherwise only the All insights link (spec §8.1 block 9)", () => {
  const posts = listFiles(join(ROOT, "src/content/insights"), (rel) => rel.endsWith(".md"))
    .map((file) => ({ id: basename(file, ".md"), fm: readFrontmatter(file) }))
    .filter((p) => p.fm.draft !== true)
    .map((p) => ({ id: p.id, date: new Date(p.fm.publishDate) }))
    .sort((a, b) => b.date - a.date);
  const block = one(one(mainOf(readDist("index.html")), "id", "insights").inner, "data-latest-insights");
  const mode = block.attrs["data-latest-insights"];
  // The build ran shortly before this test, so the mode is checked except within a day of the boundary.
  const age = (Date.now() - posts[0].date.getTime()) / 86_400_000;
  if (age <= 44) assert.equal(mode, "cards", `the newest post is ${Math.floor(age)} days old`);
  if (age >= 46) assert.equal(mode, "link", `the newest post is ${Math.floor(age)} days old`);
  const cards = elementsWith(block.inner, "data-insight-card");
  const shown = cards.map((c) => hrefsIn(c.inner).find((h) => h.startsWith("/insights/")));
  const dateOf = (href) => posts.find((p) => `/insights/${p.id}/` === href).date.getTime();
  // Compared by date, so posts that share a publish date may be shown in either order.
  const expected = mode === "cards" ? posts.slice(0, 3).map((p) => p.date.getTime()) : [];
  assert.deepEqual(shown.map(dateOf).sort(), expected.sort());
  assert.deepEqual(hrefsIn(block.inner).filter((h) => h === "/insights/"), ["/insights/"], "no single All insights link");
});

test("#faq: HOME's questions and answers, one FAQPage that matches them, and a trust answer that names the Trust page only while it's shown (spec §8.1.10)", () => {
  for (const [build, { read, site }] of Object.entries(BUILDS)) {
    const html = read("index.html");
    const faq = one(mainOf(html), "id", "faq");
    const expected = faqFor(site);
    const questions = tagged(faq.inner, "summary").map((s) => text(s.inner).replace(/\s*\+\s*−$/, ""));
    assert.deepEqual(questions, expected.map((f) => f.q), build);
    const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const pages = ld.filter((d) => d["@type"] === "FAQPage");
    assert.equal(pages.length, 1, `${build}: one FAQPage`);
    assert.deepEqual(pages[0].mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), expected.map((f) => [f.q, f.a]), build);
    const trust = expected.find((f) => f.q === HOME_TRUST_QUESTION).a;
    assert.equal(/\bTrust page\b/.test(trust), site.page("trust").href !== null, `${build}: the trust answer and /trust/ disagree`);
  }
});

test("HOME: the trust answer is the published method, the independence policy's first line and the exit pack, each claim backed", () => {
  assert.equal(HOME.faq.filter((f) => f.q === HOME_TRUST_QUESTION).length, 1);
  const trust = HOME.faq.find((f) => f.q === HOME_TRUST_QUESTION).a;
  assert.ok(trust.includes(SERVICES.independence[0]), "the independence policy's first line isn't quoted word for word");
  assert.match(trust, /\bpublished evaluation method\b/);
  assert.match(trust, /\bexit pack: code, data, configuration and runbook\b/);
  // Ledger ruling R4: the reader checks the published method and the demos. "Check the work" would
  // imply delivered client work, and there is none to check.
  assert.match(trust, /Check our published evaluation method and illustrative demos/);
  assert.doesNotMatch(trust, /\bcheck the work\b/i, "the trust answer points at client work that doesn't exist");
  assert.doesNotMatch(trust, /\bTrust page\b/, "the Trust page belongs in trustPageLine, which homeView() adds only while /trust/ is shown");
  assert.match(HOME.trustPageLine, /\bTrust page\b/);
  // Research index B10: "the method is published" holds only while the method's page is live, and
  // the demos the answer points at are live too (Phase D Task 7).
  assert.equal(pageAt("/resources/evaluation-method/").status, "live");
  assert.equal(pageAt("/demos/").status, "live");
  const src = readFileSync(join(ROOT, "src/data/home.ts"), "utf8");
  assert.match(src, /⚑ owner: every commitment in this file must be in the standard engagement terms \(spec §12 item 2\)/);
  assert.match(src, /⚑ owner: "our evaluation method is published" .*\(research index B10\)/);
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
