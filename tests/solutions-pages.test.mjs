// The live Solutions pages in the production build (Phase C Task 3; spec §8.2, §8.3): the hub at
// /solutions/ and the five solution pages, rendered from src/content/solutions/*.yaml. Expected
// values come from the same view builders the routes call, fed the parsed content, the shared
// services copy and the production SiteContext, so a planned page (Contact, the demos, the
// evaluation method, the industries) is plain text or email here. The package markup is CI check
// 10's contract; tests/solution-template.test.mjs pins the template itself on the gallery.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { allHtmlFiles, readDist, visibleText } from "./helpers.mjs";
import { decodeEntities, elements, elementsWith, idsIn, startTags } from "../scripts/ci/lib.mjs";
import { run as packageStatusCheck } from "../scripts/ci/checks/10-package-status.mjs";
import { makeSolutionSchema, plainRef } from "../src/content/schemas.ts";
import { PAGES } from "../src/data/nav.ts";
import { SERVICES } from "../src/data/services.ts";
import { pageDescription, pageTitle } from "../src/lib/meta.ts";
import { siteContext } from "../src/lib/site.ts";
import { solutionView } from "../src/lib/views/solution.ts";
import { solutionsHubView } from "../src/lib/views/hubs.ts";
import { ONSHORE_PILLAR, PROCESSING_NOTE } from "../src/lib/fixed-copy.ts";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const DIR = fileURLToPath(new URL("../src/content/solutions/", import.meta.url));
const SITE = siteContext(false);
const IDS = SITE.solutions.map((s) => s.id);
const schema = makeSolutionSchema(plainRef);
const DATA = Object.fromEntries(IDS.map((id) => [id, schema.parse(parseYaml(readFileSync(`${DIR}${id}.yaml`, "utf8")))]));
const VIEWS = Object.fromEntries(IDS.map((id) => [id, solutionView({ id, data: DATA[id], shared: SERVICES, site: SITE })]));
const HUB = solutionsHubView({ solutions: DATA, site: SITE });
const SECTIONS = ["job", "who", "packages", "program", "testing", "where-it-runs", "independence", "limits", "faq", "contact"];

const fileOf = (path) => `${path.slice(1)}index.html`;
const entryAt = (path) => PAGES.find((p) => p.path === path);
// Tags become spaces in visibleText(); a space before punctuation comes from markup ("<a>Name</a>: …").
const text = (s) => visibleText(s).replace(/\s+([.,:;!?])/g, "$1").trim();
const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>"));
const page = (id) => readDist(`solutions/${id}/index.html`);
const sectionOf = (html, id) => elements(html, (t) => t.name === "section" && t.attrs.id === id)[0];
const hrefsIn = (html) => startTags(html).filter((t) => t.name === "a").map((t) => t.attrs.href);
const internalOf = (d) => d.packages.filter((p) => p.status === "internal");

test("production builds the Solutions hub and the five solution pages, each with its nav title and description", () => {
  const built = allHtmlFiles().filter((f) => f.startsWith("solutions/")).sort();
  assert.deepEqual(built, ["solutions/index.html", ...IDS.map((id) => `solutions/${id}/index.html`)].sort());
  for (const path of ["/solutions/", ...IDS.map((id) => `/solutions/${id}/`)]) {
    const html = readDist(fileOf(path));
    const entry = entryAt(path);
    assert.equal(entry.status, "live", path);
    assert.equal(decodeEntities(html.match(/<title>([^<]*)<\/title>/)[1]), pageTitle(entry), path);
    assert.equal(decodeEntities(html.match(/<meta name="description" content="([^"]*)"/)[1]), pageDescription(entry), path);
  }
});

test("each solution page: one h1 (the full name), the one-liner, and a primary CTA that falls back to email while Contact is planned", () => {
  for (const id of IDS) {
    const main = mainOf(page(id));
    const h1 = elements(main, (t) => t.name === "h1");
    assert.equal(h1.length, 1, id);
    assert.equal(text(h1[0].inner), VIEWS[id].fullName, id);
    assert.ok(text(main).includes(VIEWS[id].oneLiner), `${id}: no one-liner`);
    const [hero] = elementsWith(main, "data-page-hero");
    const cta = elements(hero.outer, (t) => t.name === "a" && t.attrs.href === VIEWS[id].ctas.primary.href);
    assert.equal(cta.length, 1, `${id}: no primary CTA to ${VIEWS[id].ctas.primary.href}`);
    assert.equal(text(cta[0].inner), `Talk to us about ${VIEWS[id].shortName}`);
    // Phase D Task 7: the demo sits in the hero, with "Try the demo" below it
    // (tests/demos-pages.test.mjs pins what the slot holds).
    assert.deepEqual(VIEWS[id].ctas.secondary, { label: "Try the demo", href: `/demos/${id}/` }, `${id}: the demo link`);
    assert.equal(elementsWith(hero.outer, "data-solution-demo").length, 1, `${id}: no demo slot`);
  }
});

test("the §8.3 sections in order: 'Engagements' on ④, a program on all but ⑤, the independence policy only on ④", () => {
  for (const id of IDS) {
    const main = mainOf(page(id));
    const found = startTags(main).filter((t) => t.name === "section" && SECTIONS.includes(t.attrs.id)).map((t) => t.attrs.id);
    const want = SECTIONS.filter((s) => (s !== "program" || id !== "ai-switch-on") && (s !== "independence" || id === "ai-evaluation"));
    assert.deepEqual(found, want, id);
    const [heading] = elements(main, (t) => t.attrs.id === "packages-heading");
    assert.equal(text(heading.inner), id === "ai-evaluation" ? "Engagements" : "Packages", id);
  }
  const independence = sectionOf(mainOf(page("ai-evaluation")), "independence").outer;
  for (const line of SERVICES.independence) assert.ok(text(independence).includes(line), `④ independence: "${line}"`);
});

test("packages: the generic package is the first full block, launch packages are tabs, on-request ones are listed and link to contact", () => {
  for (const id of IDS) {
    const v = VIEWS[id];
    const s = sectionOf(mainOf(page(id)), "packages").outer;
    const blocks = elementsWith(s, "data-package-tab");
    assert.deepEqual(blocks.map((b) => b.attrs.id), [v.generic.id, ...v.launch.map((p) => `${p.id}-block`)], id);
    const panels = elementsWith(s, "data-tab-panel");
    assert.deepEqual(panels.map((p) => [p.attrs.id, p.attrs["data-tab-label"]]), v.launch.map((p) => [p.id, p.name]), id);
    const listed = elementsWith(s, "data-package-status", "on-request");
    assert.deepEqual(listed.map((li) => text(li.inner)), v.onRequest.map((p) => `[ On request ] ${p.name}: ${p.oneLiner}`), id);
    for (const li of listed) assert.deepEqual(hrefsIn(li.inner), [SITE.contact({ interest: id })], id);
  }
  // ② shows its two audience variants as the two tabs (spec §8.3).
  assert.deepEqual(VIEWS["knowledge-assistant"].launch.map((p) => p.name), ["SOP & Work-Instruction Assistant", "Policy & Procedure Assistant"]);
  // ③ has no launch package beside its generic one, so no tab group.
  assert.equal(elementsWith(page("draft-for-approval"), "data-tabs").length, 0);
});

test("the onshore pillar renders only on onshore packages; every other launch package links to its own onshore note", () => {
  for (const id of IDS) {
    const s = sectionOf(mainOf(page(id)), "packages").outer;
    for (const pkg of [VIEWS[id].generic, ...VIEWS[id].launch]) {
      const blockId = pkg.id === VIEWS[id].generic.id ? pkg.id : `${pkg.id}-block`;
      const [block] = elements(s, (t) => t.attrs.id === blockId);
      const pillar = elementsWith(block.outer, "data-onshore-pillar");
      const note = elementsWith(block.outer, "data-processing-note");
      if (pkg.onshore) {
        assert.equal(pillar.length, 1, `${id} ${pkg.id}`);
        assert.equal(text(pillar[0].inner), ONSHORE_PILLAR);
        assert.equal(note.length, 0, `${id} ${pkg.id}`);
      } else {
        assert.equal(pillar.length, 0, `${id} ${pkg.id}: the onshore pillar on a package that isn't onshore`);
        assert.equal(text(note[0].inner), PROCESSING_NOTE);
        assert.deepEqual(hrefsIn(note[0].inner), [`#${blockId}-onshore-note`]);
        assert.ok(idsIn(block.outer).has(`${blockId}-onshore-note`), `${id} ${pkg.id}`);
      }
    }
  }
  assert.ok(!page("ai-switch-on").includes("data-onshore-pillar"), "⑤ shows the onshore pillar");
});

test("no internal package's name or one-liner appears anywhere in dist/", () => {
  const internal = IDS.flatMap((id) => internalOf(DATA[id]));
  assert.ok(internal.length >= 2, "the canonical set has internal packages on ① and ④");
  for (const file of allHtmlFiles()) {
    const html = readDist(file);
    const t = text(html);
    for (const p of internal) {
      assert.ok(!t.includes(p.name) && !html.includes(p.name), `dist/${file} shows "${p.name}"`);
      assert.ok(!t.includes(p.oneLiner), `dist/${file} shows the one-liner of ${p.id}`);
      assert.ok(!html.includes(`id="${p.id}"`) && !html.includes(`#${p.id}"`), `dist/${file} anchors ${p.id}`);
    }
  }
});

test("CI check 10 passes on the production build", async () => {
  const { errors } = await packageStatusCheck({ dist: DIST });
  assert.deepEqual(errors, []);
});

test("each solution page's FAQPage JSON-LD lists its FAQ questions, once", () => {
  for (const id of IDS) {
    const blocks = [...page(id).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const faqs = blocks.filter((b) => b["@type"] === "FAQPage");
    assert.equal(faqs.length, 1, id);
    assert.deepEqual(faqs[0].mainEntity.map((q) => q.name), DATA[id].faq.map((f) => f.q), id);
  }
});

test("the hub: five job cards linking to the live pages, a matrix row per industry, and every launch package under its buyers", () => {
  const main = mainOf(readDist("solutions/index.html"));
  const h1 = elements(main, (t) => t.name === "h1");
  assert.equal(h1.length, 1);
  assert.equal(text(h1[0].inner), "Solutions.");
  const byJob = elements(main, (t) => t.attrs.id === "by-job")[0].outer;
  assert.deepEqual(hrefsIn(byJob), IDS.map((id) => `/solutions/${id}/`));
  assert.equal(elementsWith(main, "data-matrix-row").length, SITE.industries.length);
  for (const [list, items] of [["buyer-mid-market", HUB.byBuyer.midMarket], ["buyer-enterprise", HUB.byBuyer.enterprise]]) {
    const [el] = elementsWith(main, "data-buyer-list", list);
    assert.deepEqual(hrefsIn(el.outer), items.map((i) => i.href), list);
    for (const item of items) {
      const [path, anchor] = item.href.split("#");
      assert.ok(idsIn(readDist(fileOf(path))).has(anchor), `${item.href} has no target`);
    }
  }
  // The generic packages, and ②'s Policy & Procedure Assistant, are for both buyers (blueprint).
  assert.ok(HUB.byBuyer.enterprise.some((i) => i.name === "Policy & Procedure Assistant"));
  assert.ok(HUB.byBuyer.midMarket.some((i) => i.name === "One system, one use case"));
});

test("production dist/ renders the solution template and package tabs only on the solution pages, and package cards only there, on the hub and on industry pages", () => {
  const solutionPages = new Set(IDS.map((id) => `solutions/${id}/index.html`));
  for (const file of allHtmlFiles()) {
    const html = readDist(file);
    if (solutionPages.has(file)) {
      assert.equal(elementsWith(html, "data-template", "solution").length, 1, file);
      continue;
    }
    assert.doesNotMatch(html, /data-template="solution"|data-package-tab/, file);
    // The Solutions hub lists packages by buyer, and each industry page recommends 3–4 (Phase C Task 4).
    if (file !== "solutions/index.html" && !file.startsWith("industries/")) assert.doesNotMatch(html, /data-package-status/, file);
  }
});
