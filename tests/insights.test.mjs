import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDist, visibleText } from "./helpers.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const POSTS = ["evals-before-vibes", "rag-that-survives-an-apra-audit", "sovereign-llm-hosting-decision-matrix"];
const PILLARS = [
  "LLMOps & reliability", "RAG & retrieval", "Agentic systems",
  "Sovereignty & compliance", "Vendor-neutral platform", "How we deliver",
];

function assertNoPillar(text, where) {
  for (const p of PILLARS) assert.ok(!text.includes(p), `${where} still shows the pillar "${p}"`);
}

// The type label is Techsider's own eyebrow form (spec §6.4): a lower-case mono bracket tag,
// never Mistral's uppercase, letter-spaced eyebrow. The brackets are hidden from screen readers.
// The legacy Home section (src/components/Insights.astro, retired in Phase C) writes it as a
// mono <p> holding the bracket spans.
const TYPE_TAG = /<p class="([^"]*)"[^>]*>\s*<span aria-hidden="true"[^>]*>\[<\/span>article<span aria-hidden="true"[^>]*>\]<\/span>/g;
function typeTags(html, where) {
  const tags = [...html.matchAll(TYPE_TAG)];
  for (const [, cls] of tags) {
    assert.match(cls, /\bfont-mono\b/, `${where}: the type tag is not set in mono`);
    assert.doesNotMatch(cls, /\buppercase\b|\btracking-/, `${where}: the type tag is an uppercase, letter-spaced eyebrow`);
  }
  return tags.length;
}

// The restyled insights pages (Phase B2 Task 13) write it as a BracketChip, which sets the mono
// face in its own scoped style and never takes an uppercase or tracking class.
const CHIP_TAG = /<span class="bracket-chip"[^>]*\bdata-bracket-chip\b[^>]*><span aria-hidden="true"[^>]*>\[<\/span>article<span aria-hidden="true"[^>]*>\]<\/span><\/span>/g;
const chipTags = (html) => (html.match(CHIP_TAG) ?? []).length;

test("the migrated posts carry a type and no pillar or sectors", () => {
  for (const id of POSTS) {
    const src = readFileSync(join(ROOT, "src/content/insights", `${id}.md`), "utf8");
    const fm = src.slice(0, src.indexOf("\n---", 4));
    assert.match(fm, /^type: article$/m, id);
    assert.match(fm, /^industries: \[/m, `${id}: industries is written out`);
    assert.match(fm, /^solutions: \[/m, `${id}: solutions is written out`);
    assert.doesNotMatch(fm, /^(pillar|sectors):/m, id);
  }
});

test("each post shows its type as a bracket tag above the title, not the pillar", () => {
  for (const id of POSTS) {
    const html = readDist(`insights/${id}/index.html`);
    const start = html.indexOf("data-page-hero");
    const h1 = html.indexOf("<h1", start);
    assert.ok(start >= 0 && h1 > start, `${id}: no PageHero … <h1>`);
    const header = html.slice(start, h1);
    assert.match(visibleText(header), /\[ ?article ?\]/, `${id}: no "[article]" tag before the title`);
    const eyebrow = header.match(/<p class="page-hero-eyebrow"[^>]*>([\s\S]*?)<\/p>/);
    assert.ok(eyebrow, `${id}: no eyebrow before the title`);
    assert.equal(chipTags(eyebrow[1]), 1, `${id}: the eyebrow is not one [article] bracket chip`);
    assert.equal(chipTags(header), 1, `${id}: one type tag before the title`);
    assert.doesNotMatch(header, /class="[^"]*\b(?:uppercase|tracking-[^\s"]*)/, `${id}: an uppercase, letter-spaced eyebrow`);
    assertNoPillar(visibleText(html), id);
  }
});

test("the insights index tags every post with its type, then its date and reading time", () => {
  const html = readDist("insights/index.html");
  const cards = html.split("data-insight-card").slice(1);
  assert.equal(cards.length, POSTS.length, "one InsightCard per post");
  for (const card of cards) assert.equal(chipTags(card.slice(0, card.indexOf("<h3"))), 1, "a card without its [article] chip above the title");
  const text = visibleText(html);
  assert.equal(text.match(/\[ ?article ?\] · \d{1,2} [A-Z][a-z]+ \d{4} · \d+ min read/g)?.length, POSTS.length);
  assertNoPillar(text, "insights/index.html");
});

test("the home Insights section tags its cards by type", () => {
  const html = readDist("index.html");
  const start = html.indexOf('id="insights"');
  const end = html.indexOf("</section>", start);
  assert.ok(start >= 0 && end > start, "home #insights section not found");
  const section = html.slice(start, end);
  assert.equal(typeTags(section, "home #insights"), POSTS.length);
  assertNoPillar(visibleText(section), "home #insights");
});

test("the content layer registers all eight collections from the shared schemas", () => {
  const dir = join(ROOT, ".astro/collections");
  for (const name of ["insights", "solutions", "industries", "kits", "regulatory", "demos", "traces", "documents"]) {
    assert.ok(existsSync(join(dir, `${name}.schema.json`)), `.astro/collections/${name}.schema.json is missing (run npm run build)`);
  }
  const insights = JSON.parse(readFileSync(join(dir, "insights.schema.json"), "utf8"));
  assert.deepEqual(insights.properties.type?.enum, ["article", "reference-scenario", "platform-guide"], "insights schema has no type enum");
  assert.ok(!("pillar" in insights.properties) && !("sectors" in insights.properties), "insights schema still has pillar/sectors");
  const traces = JSON.parse(readFileSync(join(dir, "traces.schema.json"), "utf8"));
  assert.ok(traces.required?.includes("provenance"), "traces schema does not require provenance");
  const documents = JSON.parse(readFileSync(join(dir, "documents.schema.json"), "utf8"));
  assert.deepEqual(documents.required, ["title", "summary", "lastUpdated"], "documents schema (src/content/page-schemas.ts documentSchema)");
});
