// The live demos in the production build (Phase D Task 7; spec §7.1, §7.4, §8.3, §8.8, §9.1, §11.4):
// the Demos hub at /demos/, the five demo pages, the demo in each solution page's hero, and the demo
// link on each industry page. Expected values come from nav.ts, the production SiteContext and the
// data files, so they follow the content. What a replay does while it runs (pause, skip, replay,
// reduced motion, the log) is pinned by Tasks 2–4; this file pins where each demo renders, how it is
// badged and labelled, which page is canonical, which script each page loads, and where each links.
// Run `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { allHtmlFiles, readDist, visibleText } from "./helpers.mjs";
import { decodeEntities, elements, elementsWith, hrefsIn, pageUrl, startTags } from "../scripts/ci/lib.mjs";
import { SAMPLE_REPORT_CAPTION } from "../scripts/ci/checks/05-captions.mjs";
import { makeDemoSchema, makeSolutionSchema, plainRef, platformAiFile } from "../src/content/schemas.ts";
import { PAGES } from "../src/data/nav.ts";
import { CHECKER_BADGE, DEMO_BADGE, DEMO_CTA, REPORT_BADGE } from "../src/lib/fixed-copy.ts";
import { pageDescription, pageTitle } from "../src/lib/meta.ts";
import { siteContext } from "../src/lib/site.ts";
import { checkerView } from "../src/lib/views/checker.ts";

const ROOT = new URL("../", import.meta.url);
const DIST = fileURLToPath(new URL("dist/", ROOT));
const ORIGIN = "https://techsider.com.au";
const CHECKER_PATH = "/resources/what-you-already-pay-for/";
const WB4 = "Three replays, a sample report and a client-side tool. No live model.";
const SITE = siteContext(false);
const IDS = SITE.solutions.map((s) => s.id);
/** Spec §9.1: each solution's demo kind. */
const KIND = {
  "document-registers": "register", "knowledge-assistant": "assistant", "draft-for-approval": "inbox",
  "ai-evaluation": "report", "ai-switch-on": "checker",
};
/** ①–③: the canned replays, each with an engine. */
const REPLAYS = IDS.filter((id) => ["register", "assistant", "inbox"].includes(KIND[id]));

const read = (rel) => readFileSync(new URL(rel, ROOT), "utf8");
const DEMOS = Object.fromEntries(IDS.map((id) => [id, makeDemoSchema(plainRef).parse(JSON.parse(read(`src/data/demos/${id}.json`)))]));
const SOLUTIONS = Object.fromEntries(IDS.map((id) => [id, makeSolutionSchema(plainRef).parse(parseYaml(read(`src/content/solutions/${id}.yaml`)))]));
const CHECKER_VIEW = checkerView(platformAiFile.parse(JSON.parse(read("src/data/platform-ai.json"))), SITE);

const fileOf = (path) => `${path.slice(1)}index.html`;
const entryAt = (path) => PAGES.find((p) => p.path === path);
// Tags become spaces in visibleText(); a space before punctuation comes from markup ("<a>Name</a>.").
const text = (html) => visibleText(html).replace(/\s+([.,:;!?])/g, "$1").trim();
const mainOf = (html) => elements(html, (t) => t.name === "main")[0].inner;
const heroOf = (file) => elementsWith(mainOf(readDist(file)), "data-page-hero")[0].outer;
const sectionOf = (html, id) => elements(html, (t) => t.name === "section" && t.attrs.id === id)[0].outer;
const headOf = (html) => html.slice(0, html.indexOf("</head>"));
const headValue = (html, re) => {
  const m = headOf(html).match(re);
  return m ? decodeEntities(m[1]) : undefined;
};
function one(html, attr, value) {
  const found = elementsWith(html, attr, value);
  assert.equal(found.length, 1, `expected one [${attr}${value === undefined ? "" : `="${value}"`}], found ${found.length}`);
  return found[0];
}
/**
 * Each demo's badge by its kind: ⑤ is a client-side tool, and ④ a sample report, not a replay
 * (ledger ruling R4), so only ①–③ carry the canned-replay badge.
 */
const badgeOf = (id) => ({ checker: CHECKER_BADGE, report: REPORT_BADGE })[KIND[id]] ?? DEMO_BADGE;
/**
 * The module scripts a built page runs, each named by where it comes from: "src:<path>" for a file it
 * loads, "inline:<code>" for a script Astro inlined (it inlines a small one rather than emit a file).
 */
function pageScripts(file) {
  const out = new Set();
  for (const m of readDist(file).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (!/\btype="module"/.test(m[1])) continue;
    const src = m[1].match(/\bsrc="([^"]+)"/);
    out.add(src ? `src:${src[1]}` : `inline:${m[2].trim()}`);
  }
  return out;
}
const minus = (a, b) => [...a].filter((s) => !b.has(s)).sort();
/** A script's name, short enough for an assertion message. */
const shortName = (script) => (script.length > 80 ? `${script.slice(0, 80)}…` : script);

test("production builds /demos/ and the five demo pages, each with its nav title and description", () => {
  const built = allHtmlFiles().filter((f) => f.startsWith("demos/")).sort();
  assert.deepEqual(built, ["demos/index.html", ...IDS.map((id) => `demos/${id}/index.html`)].sort());
  for (const path of ["/demos/", ...IDS.map((id) => `/demos/${id}/`)]) {
    const entry = entryAt(path);
    const html = readDist(fileOf(path));
    assert.equal(entry.status, "live", path);
    assert.equal(headValue(html, /<title>([^<]*)<\/title>/), pageTitle(entry), path);
    assert.equal(headValue(html, /<meta name="description" content="([^"]*)"/), pageDescription(entry), path);
  }
});

test("③'s description counts what its demo drafts: one work order, so 'a work order', never 'work orders' (final review D7-F3)", () => {
  const description = entryAt("/demos/draft-for-approval/").description;
  const orders = DEMOS["draft-for-approval"].data.messages.filter((m) => m.draft?.startsWith("Work order")).length;
  assert.equal(orders, 1, "the ③ demo drafts one work order");
  assert.match(description, /\beight messages sorted, a work order and updates drafted, one escalated\b/);
  assert.doesNotMatch(description, /\bwork orders\b/);
});

test("each solution names its own demo, and each demo file is its solution's, of the spec §9.1 kind", () => {
  for (const id of IDS) {
    assert.equal(SOLUTIONS[id].demo, id, `src/content/solutions/${id}.yaml: demo`);
    assert.equal(DEMOS[id].solution, id, `src/data/demos/${id}.json: solution`);
    assert.equal(DEMOS[id].kind, KIND[id], `src/data/demos/${id}.json: kind`);
  }
});

test("WB-4: the Demos one-liner names the replays and the one client-side tool, and the hub's hero says it", () => {
  assert.equal(entryAt("/demos/").oneLiner, WB4);
  assert.equal(SITE.page("demos").oneLiner, WB4);
  assert.ok(text(heroOf("demos/index.html")).includes(WB4), "the hub's hero doesn't carry the one-liner");
});

test("the hub: one card per solution in spec §4.1 order, titled from its demo file, badged by kind, linking to its demo page", () => {
  const cards = elementsWith(sectionOf(mainOf(readDist("demos/index.html")), "demos"), "data-demo-kind");
  assert.deepEqual(cards.map((c) => c.attrs["data-demo-kind"]), IDS.map((id) => KIND[id]));
  cards.forEach((card, i) => {
    const id = IDS[i];
    const meta = elements(card.inner, (t) => (t.attrs.class ?? "").split(/\s+/).includes("link-card-meta"));
    assert.deepEqual(meta.map((m) => text(m.inner)), [badgeOf(id)], `${id}: badge`);
    const links = elements(card.inner, (t) => t.name === "a").map((a) => [text(a.inner), a.attrs.href]);
    assert.deepEqual(links, [[DEMOS[id].title, `/demos/${id}/`]], `${id}: link`);
  });
});

test("each demo page: its title as the one h1, its frame badged by kind and labelled with the file's provenance, and the #next CTA", () => {
  for (const id of IDS) {
    const file = `demos/${id}/index.html`;
    const main = mainOf(readDist(file));
    const h1 = elements(main, (t) => t.name === "h1");
    assert.equal(h1.length, 1, `${id}: ${h1.length} h1 elements`);
    assert.equal(text(h1[0].inner), DEMOS[id].title, id);
    const frame = one(heroOf(file), "data-demo-frame");
    assert.equal(text(one(frame.outer, "data-demo-badge").inner), badgeOf(id), `${id}: badge`);
    // Ledger ruling R4: only the replays are called replays.
    assert.equal(text(frame.outer).includes("Canned replay"), REPLAYS.includes(id), `${id}: "Canned replay"`);
    assert.equal(frame.attrs["data-provenance"], DEMOS[id].provenance, `${id}: provenance`);
    const labelled = elementsWith(frame.outer, "data-provenance-label").some((l) => text(l.inner) === "Illustrative data");
    assert.equal(labelled, DEMOS[id].provenance === "illustrative", `${id}: the "Illustrative data" label`);
    // Controller ruling 6: ⑤ is real, dated vendor data ("sourced"), so its frame has no label;
    // ①–④ are illustrative and keep theirs.
    assert.equal(DEMOS[id].provenance, id === "ai-switch-on" ? "sourced" : "illustrative", `${id}: provenance`);
    assert.equal(labelled, id !== "ai-switch-on", `${id}: labelled`);
    // ④ is a report, not a replay: no engine. ⑤'s engine is the checker itself.
    assert.equal(elementsWith(frame.outer, "data-demo-engine").length, KIND[id] === "report" ? 0 : 1, `${id}: engine`);
    assert.equal(elementsWith(frame.outer, "data-demo-transcript").length, 1, `${id}: static transcript`);
    const next = sectionOf(main, "next");
    assert.equal(text(elements(next, (t) => t.attrs.id === "next-heading")[0].inner), DEMO_CTA, id);
    assert.deepEqual(hrefsIn(next), [SITE.contact({ interest: id }), `/solutions/${id}/`], `${id}: #next links`);
  }
});

test("①–③: each replay keeps spec §8.8's order and roles on the demo page and in the solution hero: hidden controls, an aria-hidden stage, one polite log", () => {
  for (const id of REPLAYS) {
    for (const file of [`demos/${id}/index.html`, `solutions/${id}/index.html`]) {
      const frame = one(heroOf(file), "data-demo-frame").outer;
      const root = one(frame, "data-demo-root").outer;
      // Pause/Resume, "Skip to result" and Replay, hidden until a run starts (no dead buttons without JavaScript).
      const controls = one(root, "data-demo-controls");
      assert.ok("hidden" in controls.attrs, `${file}: the controls show without JavaScript`);
      for (const control of ["data-demo-pause", "data-demo-skip", "data-demo-replay"]) one(controls.outer, control);
      // The typing renders into an aria-hidden stage that is never a live region; the log is the one polite live region.
      const stage = one(root, "data-demo-stage");
      assert.equal(stage.attrs["aria-hidden"], "true", `${file}: the stage isn't aria-hidden`);
      const log = one(root, "data-demo-log");
      assert.equal(log.attrs["aria-live"], "polite", `${file}: the log isn't a polite live region`);
      assert.ok((log.attrs.class ?? "").split(/\s+/).includes("sr-only"), `${file}: the log isn't visually hidden`);
      assert.deepEqual(startTags(frame).filter((t) => "aria-live" in t.attrs).map((t) => Object.keys(t.attrs).find((a) => a.startsWith("data-demo-"))), ["data-demo-log"], `${file}: live regions`);
      // Controls, then stage, then log, in DOM order (WCAG 2.2.2: the controls come before the animated region).
      const tags = startTags(root);
      const at = (attr) => tags.findIndex((t) => attr in t.attrs);
      assert.ok(at("data-demo-controls") < at("data-demo-stage") && at("data-demo-stage") < at("data-demo-log"), `${file}: not controls, stage, log`);
    }
  }
});

test("④: the demo page's frame summarises the sample report under its fixed caption and links down to it", () => {
  const report = DEMOS["ai-evaluation"].data;
  const file = "demos/ai-evaluation/index.html";
  const summary = one(one(heroOf(file), "data-demo-frame").outer, "data-report-summary");
  const t = text(summary.inner);
  for (const s of [SAMPLE_REPORT_CAPTION, report.system, `n = ${report.n}`, report.framework, report.regression.baseline, report.regression.candidate]) {
    assert.ok(t.includes(s), `the summary doesn't say "${s}"`);
  }
  assert.deepEqual(hrefsIn(summary.inner), ["#sample-report"]);
  const full = one(sectionOf(mainOf(readDist(file)), "sample-report"), "data-sample-report");
  assert.equal(text(one(full.inner, "data-sample-caption").inner), SAMPLE_REPORT_CAPTION);
});

test("⑤: the demo page names the checker's own page as its canonical URL; every other page is its own", () => {
  assert.deepEqual(PAGES.filter((p) => p.canonicalPath !== undefined).map((p) => [p.path, p.canonicalPath]), [["/demos/ai-switch-on/", CHECKER_PATH]]);
  // The loop below proves nothing on an empty or stale dist/, so it must see the ⑤ page and the checker's.
  for (const file of ["demos/ai-switch-on/index.html", `${CHECKER_PATH.slice(1)}index.html`]) assert.ok(allHtmlFiles().includes(file), `dist/${file} is missing`);
  for (const file of allHtmlFiles()) {
    if (file === "404.html") continue; // GitHub Pages serves it at any address, so it has no URL of its own
    const html = readDist(file);
    const want = file === "demos/ai-switch-on/index.html" ? `${ORIGIN}${CHECKER_PATH}` : `${ORIGIN}${pageUrl(DIST, `${DIST}${file}`)}`;
    assert.equal(headValue(html, /<link rel="canonical" href="([^"]*)"/), want, `${file}: canonical`);
    assert.equal(headValue(html, /<meta property="og:url" content="([^"]*)"/), want, `${file}: og:url`);
  }
});

test("the sitemap lists the Demos hub and every demo page but ⑤'s, whose canonical URL is the checker's page", () => {
  const locs = [...readDist("sitemap-0.xml").matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.includes(`${ORIGIN}/demos/`), "the sitemap has no /demos/");
  for (const id of IDS) assert.equal(locs.includes(`${ORIGIN}/demos/${id}/`), id !== "ai-switch-on", `/demos/${id}/`);
  assert.ok(locs.includes(`${ORIGIN}${CHECKER_PATH}`), "the sitemap has no checker page");
});

test("each solution hero holds its demo above the CTAs: a replay frame on ①–③, the sample report on ④, the compact checker frame on ⑤", () => {
  for (const id of IDS) {
    const hero = heroOf(`solutions/${id}/index.html`);
    const slot = one(hero, "data-solution-demo");
    const frames = elementsWith(slot.outer, "data-demo-frame");
    if (KIND[id] === "report") {
      assert.equal(frames.length, 0, `${id}: the sample report sits in a demo frame`);
      const report = one(slot.outer, "data-sample-report");
      assert.equal(text(one(report.inner, "data-sample-caption").inner), SAMPLE_REPORT_CAPTION);
    } else {
      assert.equal(frames.length, 1, `${id}: expected one demo frame`);
      const [frame] = frames;
      assert.equal(text(one(frame.outer, "data-demo-badge").inner), badgeOf(id), `${id}: badge`);
      assert.equal(frame.attrs["data-provenance"], DEMOS[id].provenance, `${id}: provenance`);
      // Controller ruling 6: the replays are labelled illustrative; ⑤'s dated vendor facts are not.
      assert.equal(elementsWith(frame.outer, "data-provenance-label").length, KIND[id] === "checker" ? 0 : 1, `${id}: the "Illustrative data" label`);
      // The compact checker frame is static: the checker itself lives on its own page.
      assert.equal(elementsWith(frame.outer, "data-demo-engine").length, KIND[id] === "checker" ? 0 : 1, `${id}: engine`);
      assert.equal(elementsWith(frame.outer, "data-demo-transcript").length, 1, `${id}: static transcript`);
      assert.equal(text(elements(frame.outer, (t) => t.name === "figcaption").at(-1).inner), DEMOS[id].title, `${id}: caption`);
    }
    // Spec §8.3: the demo sits in the hero slot, and the CTAs move below it.
    const tryIt = elements(hero, (t) => t.name === "a" && t.attrs.href === `/demos/${id}/`);
    assert.equal(tryIt.length, 1, `${id}: expected one link to its demo page`);
    assert.equal(text(tryIt[0].inner), "Try the demo");
    assert.ok(hero.indexOf(tryIt[0].outer) >= hero.indexOf(slot.outer) + slot.outer.length, `${id}: "Try the demo" comes before the demo`);
  }
});

test("⑤: the hero's compact frame names every vendor the dated facts cover and their date, links to the full checker, and embeds no checker", () => {
  const frame = one(heroOf("solutions/ai-switch-on/index.html"), "data-demo-frame").outer;
  const summary = one(frame, "data-checker-summary");
  const t = text(summary.inner);
  for (const group of CHECKER_VIEW.vendors) assert.ok(t.includes(group.vendor), `no ${group.vendor}`);
  assert.ok(t.includes(`Vendor facts as at ${CHECKER_VIEW.asAt.text}`), "no as-at date");
  assert.ok(summary.inner.includes(`datetime="${CHECKER_VIEW.asAt.iso}"`), "the date has no datetime");
  // Six of the eleven vendors publish no processing location, so neither the frame nor the demo
  // page's description may read as though every vendor says where its AI is processed.
  assert.ok(t.includes("whether each vendor says"), "the summary implies every vendor says where its AI is processed");
  // A visitor ticks vendors, and the results list add-ons as well as what a plan includes (final review D6-M1).
  assert.ok(t.includes("The checker shows the AI each vendor includes or sells as an add-on,"), t);
  assert.ok(entryAt("/demos/ai-switch-on/").description.includes("whether the vendor says"), "the ⑤ demo page's description implies every vendor says where its AI is processed");
  assert.deepEqual(hrefsIn(summary.inner), [CHECKER_PATH]);
  // The vendors' feature texts stay off this mid-market page (spec §3.4): no checker, no vendor table.
  assert.equal(elementsWith(frame, "data-checker").length, 0, "the hero embeds the checker");
  assert.equal(elementsWith(frame, "data-platform-facts").length, 0, "the hero embeds the vendor table");
});

test("⑤: the demo page's frame holds the checker in its engine slot and the full vendor table in its transcript slot", () => {
  const frame = one(heroOf("demos/ai-switch-on/index.html"), "data-demo-frame").outer;
  one(one(frame, "data-demo-engine").outer, "data-checker");
  one(one(frame, "data-demo-transcript").outer, "data-platform-facts");
  assert.equal(elementsWith(frame, "data-checker-summary").length, 0, "the demo page shows the compact summary instead of the table");
});

test("a demo's scripts run only where a demo renders: its demo page, its solution hero, Home's band and the checker's page (spec §11.4)", () => {
  // The hub renders no demo, so the scripts it runs are the ones every page runs.
  const shared = pageScripts("demos/index.html");
  const own = Object.fromEntries(IDS.map((id) => [id, minus(pageScripts(`demos/${id}/index.html`), shared)]));
  for (const id of IDS) {
    if (KIND[id] === "report") assert.deepEqual(own[id].map(shortName), [], "the sample report page runs a script of its own");
    else assert.ok(own[id].length > 0, `/demos/${id}/ runs no script of its own`);
  }
  // ④'s solution page runs no demo script, so it is the baseline for the other solution pages: ①–③
  // run their demo page's scripts, and ⑤'s compact frame runs none.
  const baseline = pageScripts("solutions/ai-evaluation/index.html");
  for (const id of IDS) {
    const hero = minus(pageScripts(`solutions/${id}/index.html`), baseline);
    assert.deepEqual(hero.map(shortName), (REPLAYS.includes(id) ? own[id] : []).map(shortName), `/solutions/${id}/`);
  }
  // No other page runs a demo's script, except Home, whose band replays ② (spec §8.1), and the
  // checker's own page, which runs ⑤'s.
  const allowed = new Set([
    ...IDS.map((id) => `demos/${id}/index.html`),
    ...REPLAYS.map((id) => `solutions/${id}/index.html`),
    "index.html",
    "resources/what-you-already-pay-for/index.html",
  ]);
  const demoScripts = new Set(IDS.flatMap((id) => own[id]));
  for (const file of allHtmlFiles()) {
    if (allowed.has(file)) continue;
    assert.deepEqual([...pageScripts(file)].filter((script) => demoScripts.has(script)).map(shortName), [], `${file} runs a demo's script`);
  }
});

test("each industry page links to its lead solution's demo (spec §7.4)", () => {
  for (const industry of SITE.industries) {
    const lead = parseYaml(read(`src/content/industries/${industry.id}.yaml`)).leadSolutions[0];
    const main = mainOf(readDist(`industries/${industry.id}/index.html`));
    const links = elements(main, (t) => t.name === "a" && (t.attrs.href ?? "").startsWith("/demos/"));
    assert.ok(links.length > 0, `${industry.id}: no demo link`);
    for (const a of links) assert.deepEqual([text(a.inner), a.attrs.href], ["Try the demo", `/demos/${lead}/`], industry.id);
  }
});
