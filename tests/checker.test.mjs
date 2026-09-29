// Phase D Task 6: the "What you already pay for" checker (spec §8.7; the ⑤ demo, §8.8), live at
// /resources/what-you-already-pay-for/.
// - checkerView() over the real src/data/platform-ai.json: every entry once, by vendor and then product,
//   with one checkbox per vendor (a visitor knows which vendors they pay; a product name in the file is
//   the research's name for a feature family, not something they buy on its own); each processing location "Not published" or its recorded statement, word for word (Phase D Review Focus 4); ①–③
//   and the kit links through the site context.
// - statusText(): the one summary the status line announces per tick.
// - Both builds: the page, its checker (form and results hidden until the script runs) and the full
//   no-JS table; Review Focus 4 on the rendered text; no network API in any script on the page; the
//   checker's script only on pages that render the checker.
// Run `npm run build && npm run build:preview` first. tests/e2e/checker.spec.mjs and
// tests/e2e/prod-checker.spec.mjs drive the checker in a browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDist, readPreviewDist, visibleText } from "./helpers.mjs";
import { elements, elementsWith, htmlFiles, loadYaml, readText, relPath } from "../scripts/ci/lib.mjs";
import { platformAiFile } from "../src/content/schemas.ts";
import { PAGES, slugify } from "../src/data/nav.ts";
import { CHECKER_BADGE } from "../src/lib/fixed-copy.ts";
import { pageDescription, pageTitle } from "../src/lib/meta.ts";
import { siteContext } from "../src/lib/site.ts";
import { KIT_TITLES, NOT_PUBLISHED, checkerView, processing } from "../src/lib/views/checker.ts";
import { EMPTY_STATUS, statusText } from "../src/scripts/checker.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const FILE = platformAiFile.parse(JSON.parse(readFileSync(join(ROOT, "src/data/platform-ai.json"), "utf8")));
const PROD = checkerView(FILE, siteContext(false));
const PREVIEW = checkerView(FILE, siteContext(true));
const PATH = "/resources/what-you-already-pay-for/";
const PAGE = "resources/what-you-already-pay-for/index.html";
/** Each build's page with the view it renders from; read when a test needs it, so the view tests run before a build. */
const builds = () => [["dist", readDist(PAGE), PROD], ["dist-preview", readPreviewDist(PAGE), PREVIEW]];
/** Words that place something in Australia. */
const AUSTRALIAN = /\bAustralian?\b|\bAU\b|\bSydney\b|\bonshore\b|\bin[\s-]country\b/i;
/** A sentence that says where processing happens, in Australia. */
const PLACES_PROCESSING = /\b(?:process\w*|runs?|hosted|stor(?:ed|es)|stays?|kept)\b[^.]{0,60}?\b(?:in Australia|in an Australian region|onshore|in Sydney)\b/i;
/** Browser APIs that reach the network or keep what a visitor ticks. */
const NETWORK = /\bfetch\s*\(|\bXMLHttpRequest\b|\bsendBeacon\b|\bWebSocket\b|\bEventSource\b|\bimport\s*\(|\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/;

const products = (view) => view.vendors.flatMap((g) => g.products);
/** A vendor's features, product by product, as its one tick shows them. */
const featuresOf = (g) => g.products.flatMap((p) => p.features);
const entriesOf = (vendor, product) => FILE.entries.filter((e) => e.vendor === vendor && (product === undefined || e.product === product));
const mainOf = (html) => elements(html, (t) => t.name === "main")[0]?.inner ?? "";
const text = (html) => visibleText(html).trim();
const tagged = (html, name) => elements(html, (t) => t.name === name);
function one(html, attr, value) {
  const found = elementsWith(html, attr, value);
  assert.equal(found.length, 1, `expected one [${attr}${value === undefined ? "" : `="${value}"`}], found ${found.length}`);
  return found[0];
}
/** The module scripts a built page runs: each inline body, and each file it loads with its static imports. */
function moduleScripts(dir, html) {
  const out = [];
  const seen = new Set();
  const load = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const code = readFileSync(join(dir, rel), "utf8");
    out.push(code);
    for (const m of code.matchAll(/(?:from|import)\s*["'](\.{1,2}\/[^"']+\.js)["']/g)) {
      load(new URL(m[1], `file:///${rel}`).pathname.slice(1));
    }
  };
  for (const tag of elements(html, (t) => t.name === "script" && t.attrs.type === "module")) {
    if (tag.attrs.src) load(tag.attrs.src.replace(/^\//, ""));
    else out.push(tag.inner);
  }
  return out;
}

test("checkerView: every platform-ai.json entry once, grouped by vendor and then product, in the file's order", () => {
  assert.deepEqual(PROD.vendors.map((g) => g.vendor), [...new Set(FILE.entries.map((e) => e.vendor))]);
  for (const g of PROD.vendors) {
    const mine = entriesOf(g.vendor);
    assert.equal(g.id, slugify(g.vendor));
    assert.deepEqual(g.categories, [...new Set(mine.map((e) => e.category).filter((c) => c !== "general"))], g.vendor);
    assert.deepEqual(g.products.map((p) => p.name), [...new Set(mine.map((e) => e.product))], g.vendor);
    assert.deepEqual(g.rows.map((r) => [r.product, r.feature]), mine.map((e) => [e.product, e.feature]), g.vendor);
    for (const p of g.products) {
      const own = entriesOf(g.vendor, p.name);
      assert.deepEqual(p.features.map((f) => [f.text, f.included, f.plans, f.source.href]), own.map((e) => [e.feature, e.included, e.plans, e.source]), p.name);
      assert.deepEqual(p.features.map((f) => f.inclusion), own.map((e) => (e.included === "included" ? "Included" : "Add-on")), p.name);
    }
    // The vendor is what a visitor ticks, so its one tick covers every entry the file lists under it.
    assert.equal(featuresOf(g).length, mine.length, g.vendor);
  }
  const ids = PROD.vendors.map((g) => g.id);
  assert.equal(products(PROD).flatMap((p) => p.features).length, FILE.entries.length);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], "two vendors share an id");
  for (const id of ids) assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, id);
  assert.deepEqual(PROD.asAt, { iso: FILE.asAt.toISOString().slice(0, 10), text: FILE.asAt.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) });
});

test("checkerView fails the build when two vendor names give one checkbox id", () => {
  const [a, b] = FILE.entries.filter((e, i, all) => all.findIndex((x) => x.vendor === e.vendor) === i);
  const twin = `${a.vendor}!`;
  const clash = { ...FILE, entries: [a, { ...b, vendor: twin }] };
  assert.throws(() => checkerView(clash, siteContext(false)), { message: `platform-ai.json: the vendors "${a.vendor}" and "${twin}" share the id "${slugify(a.vendor)}"; name each vendor once` });
});

test("Review Focus 4: a location the vendor doesn't publish shows as 'Not published', and every other is its recorded statement, word for word", () => {
  assert.deepEqual(processing("Not published. The vendor names a host."), { status: "not-published", text: NOT_PUBLISHED });
  assert.deepEqual(processing("Not published for Australia. It names a UK region."), { status: "not-published", text: NOT_PUBLISHED });
  const stated = "No Australian option published. Regions are the United States or Europe.";
  assert.deepEqual(processing(stated), { status: "stated", text: stated });
  for (const g of PROD.vendors) {
    for (const p of g.products) {
      const own = entriesOf(g.vendor, p.name);
      const expected = [...new Set(own.map((e) => (e.processingLocation.startsWith(NOT_PUBLISHED) ? NOT_PUBLISHED : e.processingLocation)))];
      assert.deepEqual(p.processing.map((w) => w.text), expected, p.name);
      for (const w of p.processing) {
        assert.equal(w.status === "not-published", w.text === NOT_PUBLISHED, `${p.name}: "${w.text}" is labelled ${w.status}`);
        if (AUSTRALIAN.test(w.text)) {
          assert.ok(own.some((e) => e.processingLocation === w.text), `${p.name}: "${w.text}" places processing where no entry does`);
        }
      }
    }
    g.rows.forEach((row, i) => assert.equal(row.processed, entriesOf(g.vendor)[i].processingLocation, `${g.vendor} row ${i + 1}`));
  }
  // platform-ai.md, as at 29 September 2026: on the pages the research could read, eight vendors state
  // no processing location for Australian customers. Two of them, Actionstep and Adobe, have no entry
  // until their facts are re-checked (controller ruling 4), which leaves six. A re-check that changes
  // this changes the data and this line together.
  const unpublished = new Set(FILE.entries.filter((e) => e.processingLocation.startsWith(NOT_PUBLISHED)).map((e) => e.vendor));
  assert.deepEqual([...unpublished].sort(), ["Dext", "Karbon", "MYOB", "PropertyMe", "Smokeball", "Xero"]);
});

test("statusText: the empty state, then one short summary of the ticked vendors' features", () => {
  assert.equal(statusText(0, 0, 0), EMPTY_STATUS);
  assert.equal(EMPTY_STATUS, "Nothing ticked yet. Tick a vendor you pay for to see its AI features.");
  assert.equal(statusText(1, 1, 0), "1 vendor ticked: 1 AI feature, included in the plans listed.");
  assert.equal(statusText(1, 3, 0), "1 vendor ticked: 3 AI features, all included in the plans listed.");
  assert.equal(statusText(1, 0, 1), "1 vendor ticked: 1 AI feature, sold as an add-on.");
  assert.equal(statusText(1, 2, 2), "1 vendor ticked: 4 AI features, 2 included in the plans listed and 2 add-ons.");
  assert.equal(statusText(2, 0, 2), "2 vendors ticked: 2 AI features, all sold as add-ons.");
  assert.equal(statusText(2, 4, 1), "2 vendors ticked: 5 AI features, 4 included in the plans listed and 1 add-on.");
  assert.equal(statusText(3, 1, 3), "3 vendors ticked: 4 AI features, 1 included in the plans listed and 3 add-ons.");
});

test("①–③ link through the site context, and the kit links appear only while the Safe-Use Kits page is shown", () => {
  for (const [view, site] of [[PROD, siteContext(false)], [PREVIEW, siteContext(true)]]) {
    assert.deepEqual(view.builds, site.solutions.slice(0, 3).map((s) => ({ number: s.number, name: s.shortName, oneLiner: s.oneLiner, href: s.href })));
    const kits = site.page("safeUseKits").href;
    const served = Object.keys(KIT_TITLES).filter((c) => view.vendors.some((g) => g.categories.includes(c)));
    assert.deepEqual(view.kits, kits === null ? [] : served.map((c) => ({ category: c, title: KIT_TITLES[c], href: `${kits}#kit-${c}` })));
  }
  assert.deepEqual(PREVIEW.kits.map((k) => k.category), ["accounting", "legal", "property"], "a kit category has no vendor in platform-ai.json");
  for (const [category, title] of Object.entries(KIT_TITLES)) {
    assert.equal(loadYaml(join(ROOT, `src/content/kits/${category}.yaml`)).title, title, `src/content/kits/${category}.yaml`);
  }
});

test("nav: the checker's page is live, with its own title, its description and its own canonical URL", () => {
  const entry = PAGES.find((p) => p.path === PATH);
  assert.equal(entry.status, "live");
  const html = readDist(PAGE);
  assert.equal(pageTitle(entry), "What you already pay for | Techsider");
  assert.ok(html.includes(`<title>${pageTitle(entry)}</title>`), "the page's <title>");
  assert.ok(html.includes(`<meta name="description" content="${pageDescription(entry)}">`));
  assert.ok(html.includes(`<link rel="canonical" href="https://techsider.com.au${PATH}">`));
});

test("the page: the checker badge and the facts' date lead; one checkbox per vendor, whose results hold every feature listed under it; the form and the results wait for JavaScript", () => {
  for (const [build, html, view] of builds()) {
    const main = mainOf(html);
    one(main, "data-template", "pay-for");
    assert.equal(text(one(main, "data-hero-badge").inner), CHECKER_BADGE, build);
    assert.equal(text(one(main, "data-vendor-as-at").inner), `Vendor facts as at ${view.asAt.text}`, build);
    const checker = one(one(main, "id", "checker").inner, "data-checker");
    assert.ok(!("hidden" in one(checker.inner, "data-checker-nojs").attrs), `${build}: the no-JS note is hidden`);
    const form = one(checker.inner, "data-checker-form");
    assert.equal(form.name, "fieldset");
    assert.ok("hidden" in form.attrs, `${build}: the form shows before the script runs`);
    assert.equal(text(tagged(form.inner, "legend")[0].inner), "Tick each vendor you pay for");
    // One checkbox per vendor, labelled with the vendor's name: never one per product name, which is the
    // research's name for a feature family (two near-identical "Microsoft Copilot Chat" boxes, one holding
    // only an add-on, would tell a visitor their included chat is sold separately).
    const labels = tagged(form.inner, "label");
    assert.deepEqual(labels.map((l) => text(l.inner)), [...new Set(FILE.entries.map((e) => e.vendor))], build);
    assert.equal(tagged(form.inner, "input").length, labels.length, `${build}: a checkbox outside its label`);
    labels.forEach((l, i) => {
      const [box] = tagged(l.inner, "input");
      const g = view.vendors[i];
      assert.deepEqual(
        [box.attrs.type, box.attrs.value, box.attrs.id, box.attrs["data-checker-vendor"], box.attrs["data-categories"]],
        ["checkbox", g.id, `checker-vendor-${g.id}`, g.id, g.categories.join(" ")],
      );
    });
    const results = one(checker.inner, "data-checker-results");
    assert.ok("hidden" in results.attrs, `${build}: the results show before the script runs`);
    assert.equal(results.attrs["aria-labelledby"], "checker-results-heading");
    assert.equal(text(one(results.inner, "id", "checker-results-heading").inner), "Your results");
    const status = one(results.inner, "data-checker-status");
    assert.deepEqual([status.attrs.role, status.attrs["aria-live"], text(status.inner)], ["status", "polite", EMPTY_STATUS]);
    const sections = elementsWith(results.inner, "data-checker-section");
    assert.deepEqual(sections.map((s) => s.attrs["data-checker-section"]), view.kits.length ? ["features", "processing", "build", "kits"] : ["features", "processing", "build"], build);
    assert.ok(sections.every((s) => "hidden" in s.attrs), `${build}: a results block shows before anything is ticked`);
    assert.deepEqual(sections.map((s) => text(tagged(s.inner, "h4")[0].inner)), ["AI you already pay for", "Where it's processed", "What's left for a build", "Safe-Use Kits"].slice(0, sections.length));
    const items = elementsWith(results.inner, "data-vendor");
    assert.equal(items.length, 2 * view.vendors.length, `${build}: every vendor has its features and its locations`);
    assert.ok(items.every((item) => "hidden" in item.attrs), `${build}: a vendor's results show before it is ticked`);
    for (const g of view.vendors) {
      const group = elements(results.inner, (t) => "data-checker-features" in t.attrs && t.attrs["data-vendor"] === g.id);
      assert.equal(group.length, 1, g.id);
      assert.equal(text(tagged(group[0].inner, "p")[0].inner), g.vendor, g.id);
      // One tick shows every feature the file lists under the vendor, included and add-on alike, product
      // by product: the file's entries, not the view, set what must be there.
      const mine = entriesOf(g.vendor);
      const byProduct = [...new Set(mine.map((e) => e.product))].map((name) => [name, mine.filter((e) => e.product === name)]);
      const productItems = elementsWith(group[0].inner, "data-checker-product");
      assert.deepEqual(productItems.map((li) => text(tagged(li.inner, "p")[0].inner)), byProduct.map(([name]) => name), g.id);
      productItems.forEach((li, j) => {
        const own = byProduct[j][1];
        const features = elementsWith(li.inner, "data-checker-feature");
        assert.deepEqual(features.map((f) => f.attrs["data-included"]), own.map((e) => e.included), `${g.id}: ${byProduct[j][0]}`);
        features.forEach((f, k) => {
          const feature = g.products[j].features[k];
          assert.equal(feature.text, own[k].feature);
          assert.ok(text(f.inner).includes(feature.text), `${g.id}: ${feature.text}`);
          assert.equal(text(one(f.inner, "data-inclusion").inner), feature.inclusion);
          assert.ok(text(f.inner).includes(`Plans: ${own[k].plans.join(", ")}`), `${g.id}: ${feature.text}: its plans`);
          assert.deepEqual(tagged(f.inner, "a").map((a) => [a.attrs.href, text(a.inner)]), [[feature.source.href, feature.source.host]]);
        });
      });
      assert.equal(elementsWith(group[0].inner, "data-checker-feature").length, mine.length, `${g.id}: a feature listed under the vendor is missing from its tick`);
    }
    const buildItems = elementsWith(results.inner, "data-checker-build");
    assert.deepEqual(buildItems.map((b) => tagged(b.inner, "a").map((a) => a.attrs.href)), view.builds.map((b) => (b.href === null ? [] : [b.href])), build);
    assert.deepEqual(buildItems.map((b) => text(b.inner)), view.builds.map((b) => `${b.number} ${b.name} ${b.oneLiner}`), build);
    const kits = elementsWith(results.inner, "data-checker-kit");
    assert.deepEqual(kits.map((k) => [k.attrs["data-checker-kit"], "hidden" in k.attrs, tagged(k.inner, "a")[0].attrs.href, text(k.inner)]),
      view.kits.map((k) => [k.category, true, k.href, k.title]), build);
  }
});

test("Review Focus 4 on the built page: each location reads 'Not published' or its recorded statement, and the page's own copy places processing nowhere", () => {
  assert.match("Your AI processing stays in Australia.", PLACES_PROCESSING, "the claim matcher misses a claim");
  for (const [build, html, view] of builds()) {
    const main = mainOf(html);
    for (const g of view.vendors) {
      const item = elements(main, (t) => "data-checker-where" in t.attrs && t.attrs["data-vendor"] === g.id);
      assert.equal(item.length, 1, `${build}: ${g.id}`);
      assert.equal(text(tagged(item[0].inner, "p")[0].inner), g.vendor);
      // Each of the vendor's products, with its own locations: a statement stays with the product it was recorded for.
      const pairs = tagged(item[0].inner, "div");
      assert.deepEqual(pairs.map((d) => text(tagged(d.inner, "dt")[0].inner)), g.products.map((p) => p.name), `${build}: ${g.id}`);
      pairs.forEach((pair, j) => {
        const p = g.products[j];
        const dds = tagged(pair.inner, "dd");
        assert.deepEqual(dds.map((d) => [d.attrs["data-processing"], text(d.inner)]), p.processing.map((w) => [w.status, w.text]), `${build}: ${g.id}: ${p.name}`);
        assert.ok(dds.filter((d) => d.attrs["data-processing"] === "not-published").every((d) => text(d.inner) === NOT_PUBLISHED));
      });
    }
    const facts = one(main, "data-platform-facts");
    for (const g of view.vendors) {
      const rows = tagged(tagged(one(facts.inner, "data-facts-vendor", g.id).inner, "tbody")[0].inner, "tr");
      rows.forEach((row, i) => {
        const cell = text(tagged(row.inner, "td")[3].inner).replace(/^Where it's processed /, "");
        assert.equal(cell, entriesOf(g.vendor)[i].processingLocation, `${build}: ${g.vendor} row ${i + 1}`);
      });
    }
    // Take away every vendor fact; what's left is the page's own copy, which never places processing.
    const data = FILE.entries.flatMap((e) => [e.processingLocation, e.feature, e.product, e.plans.join(", "), ...e.plans]).sort((a, b) => b.length - a.length);
    let own = text(one(main, "data-checker").outer + one(main, "data-platform-facts").outer);
    for (const s of data) own = own.split(s).join(" ");
    assert.doesNotMatch(own, PLACES_PROCESSING, `${build}: the checker's own copy places processing`);
  }
});

test("the no-JS table: every entry, one table per vendor, dated, each row linking its vendor page", () => {
  for (const [build, html, view] of builds()) {
    const section = one(mainOf(html), "id", "how-it-works");
    const facts = one(section.inner, "data-platform-facts");
    assert.equal(text(one(facts.inner, "data-facts-as-at").inner), `Vendor facts as at ${view.asAt.text}`);
    assert.equal(tagged(one(facts.inner, "data-facts-as-at").inner, "time")[0].attrs.datetime, view.asAt.iso);
    const tables = tagged(facts.inner, "table");
    assert.deepEqual(tables.map((t) => text(tagged(t.inner, "caption")[0].inner)), view.vendors.map((g) => g.vendor), build);
    assert.deepEqual(tagged(tagged(tables[0].inner, "thead")[0].inner, "th").map((th) => text(th.inner)),
      ["Product", "AI feature", "Included or add-on", "Plans", "Where it's processed", "Vendor page", "Checked"]);
    tables.forEach((table, i) => {
      const g = view.vendors[i];
      const rows = tagged(tagged(table.inner, "tbody")[0].inner, "tr");
      assert.equal(rows.length, entriesOf(g.vendor).length, `${build}: ${g.vendor}`);
      rows.forEach((row, j) => {
        const r = g.rows[j];
        assert.equal(text(tagged(row.inner, "th")[0].inner), r.product);
        const cells = tagged(row.inner, "td").map((td) => text(td.inner));
        const labels = ["AI feature", "Included or add-on", "Plans", "Where it's processed", "Vendor page", "Checked"];
        assert.deepEqual(cells, [r.feature, r.inclusion, r.plans, r.processed, r.source.text, r.checked].map((v, k) => `${labels[k]} ${v}`), `${build}: ${g.vendor} row ${j + 1}`);
        assert.deepEqual(tagged(row.inner, "a").map((a) => a.attrs.href), [r.source.href]);
      });
    });
  }
});

test("no script on the page reaches the network or keeps a tick, and the checker's script loads only where a checker renders", () => {
  for (const [build, dir] of [["dist", join(ROOT, "dist")], ["dist-preview", join(ROOT, "dist-preview")]]) {
    let checkers = 0;
    for (const file of htmlFiles(dir)) {
      const rel = relPath(dir, file);
      const html = readText(file);
      const scripts = moduleScripts(dir, html);
      const renders = /<[a-z]+[^>]*\sdata-checker[\s>]/.test(html);
      const loads = scripts.some((code) => code.includes("[data-checker-form]"));
      assert.equal(loads, renders, `${build}/${rel}: ${renders ? "renders the checker without its script" : "loads the checker's script without a checker"}`);
      if (renders) {
        checkers++;
        for (const code of scripts) assert.doesNotMatch(code, NETWORK, `${build}/${rel}: a script reaches the network or storage`);
      }
    }
    assert.ok(checkers >= 1, `${build}: no page renders the checker`);
  }
});
