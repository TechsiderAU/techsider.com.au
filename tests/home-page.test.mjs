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
  decodeEntities, elements, elementsWith, hrefsIn, htmlFiles, idsIn, listFiles, loadYaml, readFrontmatter, readText, relPath, startTags,
} from "../scripts/ci/lib.mjs";
import { HOME_ANCHORS, run as checkAnchors } from "../scripts/ci/checks/03-anchors.mjs";
import { SITE } from "../src/data/nav.ts";
import { HOME } from "../src/data/home.ts";
import { POSITIONING } from "../src/data/positioning.ts";
import { SERVICES } from "../src/data/services.ts";
import { DELIVERY_LETTER, DEMO_BADGE, HOME_TRUST_QUESTION } from "../src/lib/fixed-copy.ts";
import { pageTitle } from "../src/lib/meta.ts";
import { pageAt } from "../src/lib/pages.ts";
import { traceProvenanceLabel } from "../src/lib/provenance.ts";
import { siteContext } from "../src/lib/site.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BUILDS = {
  dist: { read: readDist, dir: join(ROOT, "dist"), site: siteContext(false) },
  "dist-preview": { read: readPreviewDist, dir: join(ROOT, "dist-preview"), site: siteContext(true) },
};
const PROD = BUILDS.dist.site;
const HOME_PAGE = pageAt("/");
const HERO_TRACE = JSON.parse(readFileSync(join(ROOT, "src/data/traces", `${HOME.heroTrace}.json`), "utf8"));
const DEMO = JSON.parse(readFileSync(join(ROOT, "src/data/demos/knowledge-assistant.json"), "utf8"));
/** The ten legacy Home components that Phase D Task 8 deleted. */
const LEGACY_COMPONENTS = ["Hero", "TrustStrip", "Services", "Approach", "WhyUs", "Industries", "Demo", "Insights", "Faq", "Contact"];
/** The legacy colour aliases (formerly in src/styles/global.css), and the utilities and custom properties built on them. */
const LEGACY_COLOURS = ["bg", "bg-elev", "bg-deep", "text", "text-mute", "text-dim", "accent", "accent-ink", "border", "border-soft"];
const LEGACY_CLASS = new RegExp(`^(?:[a-z-]+:)*(?:font-serif|(?:text|bg|border|decoration|outline|ring|divide|fill|stroke|from|via|to|shadow)-(?:${LEGACY_COLOURS.join("|")})(?:\\/\\d+)?)$`);
const LEGACY_TOKEN = new RegExp(`--color-(?:${LEGACY_COLOURS.join("|")})(?![\\w-])|--font-serif\\b`);
/** The spec §7.1 anchors that head a titled block, with the block's heading. #contact is the closing prompt. */
const BLOCKS = [
  ["services", "Five solutions"],
  ["demo", "See it work"],
  ["approach", "Two ways in"],
  ["industries", "Built for your industry"],
  ["insights", "Latest insights"],
  ["faq", "Questions"],
];
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

for (const [build, { read, dir }] of Object.entries(BUILDS)) {
  test(`${build}: / is HomeTemplate, with one h1 and each spec §7.1 anchor on the block it names (check 03; Review Focus 5)`, async () => {
    const main = mainOf(read("index.html"));
    const template = one(main, "data-template", "home");
    const h1s = tagged(main, "h1");
    assert.equal(h1s.length, 1, "exactly one <h1>");
    assert.equal(inlineText(h1s[0].inner), SITE.slogan);
    const ids = idsIn(template.outer);
    assert.deepEqual(HOME_ANCHORS.filter((id) => !ids.has(id)), [], "an anchor is missing from the template");
    for (const [id, heading] of BLOCKS) {
      const block = one(template.inner, "id", id);
      assert.equal(block.name, "section", `#${id} is not a <section>`);
      assert.equal(text(one(block.inner, "id", `${id}-heading`).inner), heading, `#${id}`);
    }
    one(one(template.inner, "id", "contact").inner, "data-prompt-block");
    const { errors } = await checkAnchors({ dist: dir });
    assert.deepEqual(errors, []);
  });
}

test("/ has the Home title in both builds, and a description that keeps ruling 12's range and promises only live demos", () => {
  assert.equal(pageTitle(HOME_PAGE), "Techsider: AI that ships. Measured before it ships.");
  for (const [build, { read }] of Object.entries(BUILDS)) {
    const head = read("index.html").split("</head>")[0];
    assert.equal(decodeEntities(head.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""), pageTitle(HOME_PAGE), build);
  }
  assert.equal(
    HOME_PAGE.description,
    "AI that ships. Measured before it ships. Five AI solutions for Australian organisations, from 40-person practices to federal agencies, with demos to try.",
  );
  const range = "from 40-person practices to federal agencies";
  assert.ok(POSITIONING.subPromise.includes(range), "the sub-promise no longer carries ruling 12's range: change the Home description with it");
  for (const s of PROD.solutions) assert.notEqual(PROD.demo(s.id), null, `the description promises a demo of ${s.id}, but production has no page for it`);
});

test("the hero: the slogan lock-up, the sub-promise from positioning.ts, both CTAs and the illustrative home-hero trace", () => {
  const hero = one(mainOf(readDist("index.html")), "data-page-hero");
  assert.match(hero.inner, /<\/h1>\s*<p\b[^>]*>Measured before it ships\.<\/p>/);
  assert.ok(text(hero.inner).includes(POSITIONING.subPromise), "no sub-promise");
  assert.deepEqual(tagged(hero.inner, "a").map((a) => [text(a.inner), a.attrs.href]), [
    ["Talk to us", PROD.contact()],
    ["See a demo", PROD.page("demos").href ?? "#demo"],
  ]);
  assert.equal(HOME.heroTrace, "home-hero");
  assert.equal(HERO_TRACE.provenance, "illustrative");
  assert.equal(one(hero.inner, "data-hero-trace").attrs["aria-hidden"], "true");
  const copy = one(hero.inner, "data-hero-trace-text");
  assert.equal(text(tagged(copy.inner, "p")[0].inner), `${HERO_TRACE.title} (${traceProvenanceLabel(HERO_TRACE)})`);
});

test("#services and #industries: every solution and industry from its content entry, linked to its live page", () => {
  const main = mainOf(readDist("index.html"));
  const rows = elementsWith(one(main, "id", "services").inner, "data-solution-row");
  assert.equal(rows.length, 5);
  rows.forEach((row, i) => {
    const s = PROD.solutions[i];
    const { forLine } = loadYaml(join(ROOT, "src/content/solutions", `${s.id}.yaml`));
    assert.deepEqual(tagged(row.inner, "a").map((a) => [text(a.inner), a.attrs.href]), [[s.shortName, s.href]], s.id);
    assert.ok(text(row.inner).includes(s.oneLiner), `${s.id}: one-liner`);
    assert.ok(text(row.inner).includes(`For: ${forLine}`), `${s.id}: for line`);
  });
  const cards = elements(one(main, "id", "industries").inner, (t) => /(^|\s)link-card(\s|$)/.test(t.attrs.class ?? ""));
  assert.equal(cards.length, 9);
  cards.forEach((card, i) => {
    const industry = PROD.industries[i];
    const { constraintHook } = loadYaml(join(ROOT, "src/content/industries", `${industry.id}.yaml`));
    assert.ok(text(card.inner).includes(constraintHook), `${industry.id}: constraint hook`);
    assert.deepEqual(hrefsIn(card.inner), [industry.href], industry.id);
  });
});

test("#demo: the ② demo in one DemoFrame, badged a canned replay and labelled illustrative, its controls first and hidden, then All demos", () => {
  const band = one(mainOf(readDist("index.html")), "id", "demo");
  assert.equal(elementsWith(band.inner, "data-demo-placeholder").length, 0, "the gallery's placeholder reached the real Home");
  const frame = one(band.inner, "data-demo-frame");
  assert.deepEqual([DEMO.solution, DEMO.kind, DEMO.provenance], ["knowledge-assistant", "assistant", "illustrative"]);
  assert.equal(frame.attrs["data-provenance"], DEMO.provenance);
  assert.equal(text(one(frame.inner, "data-demo-badge").inner), DEMO_BADGE);
  assert.equal(text(one(frame.inner, "data-provenance-label").inner), "Illustrative data");
  // DemoFrame's own figcaption closes the figure, after anything the transcript holds.
  assert.equal(text(tagged(frame.inner, "figcaption").at(-1).inner), DEMO.title);
  // Spec §8.8: the controls come before the animated region and stay hidden until the engine runs;
  // the typing stage is aria-hidden and never live; each finished step goes to the polite log.
  const controls = one(frame.inner, "data-demo-controls");
  const stage = one(frame.inner, "data-demo-stage");
  const log = one(frame.inner, "data-demo-log");
  assert.ok("hidden" in controls.attrs, "the controls show without JavaScript");
  assert.ok(frame.inner.indexOf(controls.outer) < frame.inner.indexOf(stage.outer), "the controls come after the stage");
  // Pause/Resume and Skip to result sit beside Replay, so Replay is never the only control, and
  // none ships disabled (spec §8.8; the engine disables Pause and Skip only once a run has ended).
  const buttons = tagged(controls.inner, "button");
  const HOOKS = ["data-demo-pause", "data-demo-skip", "data-demo-replay"];
  assert.deepEqual(buttons.map((b) => HOOKS.find((hook) => hook in b.attrs)), HOOKS, "the controls are Pause, Skip to result, Replay, in that order");
  for (const b of buttons) assert.ok(!("disabled" in b.attrs), `${text(b.inner)} ships disabled`);
  assert.equal(stage.attrs["aria-hidden"], "true");
  assert.ok(!("aria-live" in stage.attrs), "the typing stage is a live region");
  assert.equal(log.attrs["aria-live"], "polite");
  one(one(frame.inner, "data-demo-transcript").inner, "data-assistant-transcript");
  const all = one(band.inner, "data-all-demos");
  assert.deepEqual([all.attrs.href, text(all.inner)], [PROD.page("demos").href, "All demos →"]);
  assert.ok(band.inner.indexOf(frame.outer) < band.inner.indexOf(all.outer), "All demos comes before the demo");
});

test("#pillars: 'The four rules we build by', each pillar's mechanism and then 'Put simply:' with its plain version (WB-5, WB-6)", () => {
  const section = one(mainOf(readDist("index.html")), "id", "pillars");
  assert.equal(text(one(section.inner, "id", "pillars-heading").inner), "The four rules we build by");
  const pillars = elementsWith(section.inner, "data-pillar");
  assert.deepEqual(pillars.map((p) => p.attrs["data-pillar"]), POSITIONING.pillars.map((p) => p.id));
  pillars.forEach((p, i) => {
    const pillar = POSITIONING.pillars[i];
    assert.equal(text(tagged(p.inner, "h3")[0].inner), pillar.title);
    assert.deepEqual(tagged(p.inner, "p").map((x) => text(x.inner)), [pillar.mechanism, `Put simply: ${pillar.midMarket}`], pillar.id);
  });
  assert.doesNotMatch(text(section.inner), /hold us to/i);
});

test("#approach and #where-it-runs: the two routes in, the delivery choices and the onshore note from services.ts", () => {
  const main = mainOf(readDist("index.html"));
  const routes = elementsWith(one(main, "id", "approach").inner, "data-route");
  assert.deepEqual(routes.map((r) => text(tagged(r.inner, "h3")[0].inner)), [SERVICES.routes.midMarket.title, SERVICES.routes.enterprise.title]);
  assert.deepEqual(tagged(one(routes[1].inner, "data-partner-line").inner, "a").map((a) => [text(a.inner), a.attrs.href]), [
    [SERVICES.routes.enterprise.partnerLine, PROD.page("evaluationPartner").href],
  ]);
  const where = one(main, "id", "where-it-runs");
  const choices = [...SERVICES.deliveryChoices].sort((x, y) => DELIVERY_LETTER[x.id].localeCompare(DELIVERY_LETTER[y.id]));
  assert.deepEqual(
    elementsWith(where.inner, "data-delivery-letter").map((c) => text(tagged(c.inner, "h3")[0].inner)),
    choices.map((c) => `(${DELIVERY_LETTER[c.id]}) ${c.title}`),
  );
  assert.deepEqual(tagged(one(where.inner, "data-onshore-note").inner, "li").map((li) => text(li.inner)), SERVICES.onshoreNote);
});

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
  assert.match(trust, /\bevaluation method is published\b/);
  assert.match(trust, /\bexit pack of code, data, configuration and runbook\b/);
  // Ledger ruling R4: the reader checks the published method and the demos. "Check the work" would
  // imply delivered client work, and there is none to check.
  assert.match(trust, /\bcheck the method and the demos\b/);
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
