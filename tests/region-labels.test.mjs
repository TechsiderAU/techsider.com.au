// Region labels (go-global §3.3, §6.1, §6.3): the visible "Australia", "Australian example" and
// "Australian plans and vendor pages" labels. Each is one RegionLabel, marked [data-region-label]
// (an allowed context for the go-global S1 rule), at the start of the element that carries
// data-region="au". Part 1A renders the component on its own; Part 5 adds the built-page checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { elementsWith } from "../scripts/ci/lib.mjs";
import { PLATFORM_REGION_LABEL, REGION_EXAMPLE_LABEL, REGION_LABEL } from "../src/lib/fixed-copy.ts";
import { visibleText } from "./helpers.mjs";
import { renderAstro } from "./support/render-astro.mjs";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDist } from "./helpers.mjs";
import { elements, readFrontmatter } from "../scripts/ci/lib.mjs";
import { SOLUTION_GUIDES } from "../src/lib/marketing.ts";
import { siteContext } from "../src/lib/site.ts";

const REGION_LABEL_COMPONENT = new URL("../src/components/ui/RegionLabel.astro", import.meta.url);

test("RegionLabel: one span marked data-region-label with its kind, carrying that kind's fixed label", async () => {
  for (const [props, kind, label] of [
    [{}, "region", REGION_LABEL],
    [{ kind: "region" }, "region", REGION_LABEL],
    [{ kind: "example" }, "example", REGION_EXAMPLE_LABEL],
    [{ kind: "platform" }, "platform", PLATFORM_REGION_LABEL],
  ]) {
    const html = await renderAstro(REGION_LABEL_COMPONENT, props);
    const found = elementsWith(html, "data-region-label");
    assert.equal(found.length, 1, JSON.stringify(props));
    const [span] = found;
    assert.equal(span.name, "span", kind);
    assert.equal(span.attrs["data-region-label"], kind);
    assert.match(span.attrs.class, /(?:^|\s)region-label(?:\s|$)/, kind);
    assert.equal(visibleText(span.inner).trim(), label, kind);
  }
});

// ---------- Part 5 (go-global §3.3, §3.5, §6.1–§6.3): region data, and the labels on the built pages ----------
// Each Australia-only item sits in an element marked data-region="au" that holds one RegionLabel
// (go-global contract §5); an Australian post's label sits in its header instead. Built-page tests
// read dist/ (npm run build), and the Safe-Use Kits test reads dist-preview/ (npm run build:preview),
// the only build that shows that page.

const REPO = fileURLToPath(new URL("../", import.meta.url));
const INSIGHTS_DIR = join(REPO, "src/content/insights");
/** Every published post's region ("au" or null), from its frontmatter. */
const POST_REGION = new Map(
  readdirSync(INSIGHTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => [f.slice(0, -3), readFrontmatter(join(INSIGHTS_DIR, f))])
    .filter(([, fm]) => fm.draft !== true)
    .map(([id, fm]) => [id, fm.region ?? null]),
);
/** go-global §6.1: the posts whose subject is an Australian rule, regulator, framework, platform or market. */
const AU_POSTS = [
  "ai-inside-your-practice-software", "ai-vendor-due-diligence-questions", "automated-decisions-privacy-policy",
  "copilot-agents-leaving-pilot", "copilot-confidential-client-information", "copilot-rollout-measure-before-after",
  "court-practice-notes-on-ai-verification", "nsw-ai-operational-policy-suppliers", "property-platform-ai-and-tenant-data",
  "rag-that-survives-an-apra-audit", "schools-framework-tested-before-use", "software-updates-are-procedure-changes",
  "sovereign-llm-hosting-decision-matrix", "test-an-ai-scribe-before-rollout", "water-utility-sop-assistant-scenario",
  "when-the-vendor-changes-the-model",
];
const PROD = siteContext(false);
const INDUSTRY_IDS = PROD.industries.map((i) => i.id);
const mainHtml = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>"));
const plainText = (html) => visibleText(html).trim();
const classList = (el) => (el.attrs.class ?? "").split(/\s+/);
/** The region labels in some markup, as [kind, text] pairs. */
const labelsIn = (html) => elementsWith(html, "data-region-label").map((l) => [l.attrs["data-region-label"], plainText(l.inner)]);
const AU_LABEL = [["region", REGION_LABEL]];

test("data: the sixteen Australian posts, and only they, say region: au (go-global §6.1)", () => {
  assert.deepEqual([...POST_REGION].filter(([, region]) => region !== null).map(([id]) => id).sort(), AU_POSTS);
  for (const id of AU_POSTS) assert.equal(POST_REGION.get(id), "au", id);
});

test("posts: an Australian post shows one Australia label in its header and marks its body data-region=au; no other post does either", () => {
  for (const [id, region] of POST_REGION) {
    const main = mainHtml(readDist(`insights/${id}/index.html`));
    const [hero] = elementsWith(main, "data-page-hero");
    assert.deepEqual(labelsIn(hero.outer), region ? AU_LABEL : [], `${id}: header label`);
    const [body] = elements(main, (t) => classList(t).includes("post-body"));
    assert.equal(body.attrs["data-region"], region ?? undefined, `${id}: .post-body`);
  }
});

test("cards: every insight card opens with the Australia label exactly when its post is Australian: the index, Home, About, industry pages, Keep reading", () => {
  const pages = [
    "insights/index.html", "index.html", "about/index.html",
    ...INDUSTRY_IDS.map((id) => `industries/${id}/index.html`),
    ...[...POST_REGION.keys()].map((id) => `insights/${id}/index.html`),
  ];
  for (const page of pages) {
    for (const card of elementsWith(readDist(page), "data-insight-card")) {
      const href = elements(card.inner, (t) => t.name === "a" && t.attrs.class === "insight-card-link")[0].attrs.href;
      const region = POST_REGION.get(href.match(/^\/insights\/([a-z0-9-]+)\/$/)[1]);
      assert.equal(card.attrs["data-region"], region ?? undefined, `${page}: ${href}`);
      assert.deepEqual(labelsIn(card.inner), region ? AU_LABEL : [], `${page}: ${href} label`);
      if (region) assert.ok(plainText(card.inner).startsWith(`${REGION_LABEL} [ `), `${page}: ${href}: the label doesn't open the card`);
    }
  }
  const index = elementsWith(readDist("insights/index.html"), "data-insight-card");
  assert.equal(index.filter((c) => c.attrs["data-region"] === "au").length, AU_POSTS.length, "the index labels every Australian post");
});

test("Practical guides: a link to an Australian post opens with the Australia label, and no other guide has one (go-global §3.5)", () => {
  const labelled = [];
  for (const [id, guides] of Object.entries(SOLUTION_GUIDES)) {
    const [section] = elements(mainHtml(readDist(`solutions/${id}/index.html`)), (t) => t.attrs.id === "guides");
    const items = elements(section.inner, (t) => t.name === "li");
    assert.deepEqual(items.map((li) => elements(li.inner, (t) => t.name === "a")[0].attrs.href), guides.map((g) => g.href), id);
    guides.forEach((g, i) => {
      const region = POST_REGION.get(g.href.match(/^\/insights\/([a-z0-9-]+)\//)[1]);
      assert.equal(items[i].attrs["data-region"], region ?? undefined, `${id}: ${g.href}`);
      assert.deepEqual(labelsIn(items[i].inner), region ? AU_LABEL : [], `${id}: ${g.href} label`);
      if (region) labelled.push(`${id} ${g.href}`);
    });
  }
  assert.deepEqual(labelled, [
    "document-registers /insights/ai-inside-your-practice-software/",
    "knowledge-assistant /insights/water-utility-sop-assistant-scenario/",
    "knowledge-assistant /insights/sovereign-llm-hosting-decision-matrix/",
    "ai-switch-on /insights/ai-inside-your-practice-software/",
    "ai-evaluation /insights/copilot-agents-leaving-pilot/",
  ]);
});
