// Phase C Task 8: the Insights content (spec §8.9, §8.5 block 9, §10.1). Nine new posts written from
// the Phase C research, the refs on the three migrated posts, and what the build makes of them:
// every industry page renders at least one related insight, every post ends with the contextual
// prompt its refs choose, and the RSS feed lists every post. Source tests read the markdown; the
// built tests read dist/ (run `npm run build` first) and, for check 08's A7 part, dist-preview/.
// tests/e2e/insights.spec.mjs holds every post to axe, one h1 and 320px in the browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDist, visibleText } from "./helpers.mjs";
import { decodeEntities, elements, elementsWith, readFrontmatter } from "../scripts/ci/lib.mjs";
import { insightFindings } from "../scripts/ci/checks/08-regulatory-kits.mjs";
import { PAGES, SITE } from "../src/data/nav.ts";
import { SCENARIO_LABEL } from "../src/lib/fixed-copy.ts";
import { siteContext } from "../src/lib/site.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIR = join(ROOT, "src/content/insights");
const DIST = join(ROOT, "dist");
const DIST_PREVIEW = join(ROOT, "dist-preview");

// Blueprint Task 8: the nine new posts, with their types and refs. The first solution ref chooses
// the post's closing prompt (spec §10.1), so the order of `solutions` is part of the content.
const NEW_POSTS = {
  "copilot-agents-leaving-pilot": { type: "article", industries: ["government"], solutions: ["ai-evaluation"] },
  "when-the-vendor-changes-the-model": { type: "article", industries: ["financial-services"], solutions: ["ai-evaluation"] },
  "ai-inside-your-practice-software": { type: "platform-guide", industries: ["accounting"], solutions: ["ai-switch-on"] },
  "schools-framework-tested-before-use": { type: "article", industries: ["education"], solutions: ["knowledge-assistant", "ai-evaluation"] },
  "software-updates-are-procedure-changes": { type: "article", industries: ["manufacturing"], solutions: ["knowledge-assistant"] },
  "property-platform-ai-and-tenant-data": { type: "platform-guide", industries: ["real-estate"], solutions: ["ai-switch-on", "document-registers"] },
  "test-an-ai-scribe-before-rollout": { type: "article", industries: ["healthcare"], solutions: ["ai-evaluation"] },
  "water-utility-sop-assistant-scenario": { type: "reference-scenario", industries: ["resources-and-energy"], solutions: ["knowledge-assistant", "ai-evaluation"] },
  "court-practice-notes-on-ai-verification": { type: "article", industries: ["legal-and-professional"], solutions: ["ai-evaluation", "ai-switch-on"] },
};
// The three posts migrated in Phase B2, with the refs the blueprint gives them.
const MIGRATED = {
  "evals-before-vibes": { industries: [], solutions: ["ai-evaluation"] },
  "rag-that-survives-an-apra-audit": { industries: ["financial-services"], solutions: ["knowledge-assistant", "ai-evaluation"] },
  "sovereign-llm-hosting-decision-matrix": { industries: ["government", "financial-services"], solutions: ["knowledge-assistant", "ai-evaluation"] },
};
// Spec §3.4 treats these subjects as mid-market pages: "agent(s)" only names a system the client runs.
const MID_MARKET = ["ai-inside-your-practice-software", "schools-framework-tested-before-use", "software-updates-are-procedure-changes", "property-platform-ai-and-tenant-data"];

// Blueprint ruling 1 (held rows), the research index's keep-off list, spec §3.4 and D4. None of these
// may appear in a new post. A post has no CTA of its own either: PostLayout adds the §10.1 prompt.
const KEEP_OFF = [
  [/\bAPP 1\.[789]\b/, "APP 1.7–1.9 is held until the OAIC guidance is re-read"],
  [/\bGPN-AI\b/, "the Federal Court GPN-AI row is held until the live page is checked"],
  [/NSW Health AI Framework/i, "the NSW Health AI Framework row is held"],
  [/\bEPBC\b/, "the EPBC row is held until after 1 Dec 2026"],
  [/Digital Work Systems/i, "the NSW Digital Work Systems Act hasn't commenced"],
  [/\bs(?:ections?|s)? ?30 and 40\b/i, "TPB ss 30 and 40 are held until re-read after 1 Oct 2026"],
  [/\bAI6\b/, "not a name for the Guidance for AI Adoption"],
  [/replaces? the (?:VAISS|Voluntary AI Safety Standard)/i, "the guidance evolves the VAISS; it doesn't replace it"],
  [/APES 320/, "the APES 320 AI-policy claim is unsupported"],
  [/\bIRAP\b/, "no IRAP claim"],
  [/notice to profession/i, "GPN-AI is a General Practice Note"],
  [/generally available|general availability|general release/i, "no GA claim or GA date for XeroForce"],
  [/Assurance Framework/i, "the Victorian framework's contents aren't public"],
  [/\bFirst AML\b/, "no gap claim against First AML"],
  [/PropertyMe Connector/i, "the PropertyMe Connector waits on legal review"],
  [/\b505BD\b/, "Vic RTA s 505BD waits on legal advice (research index A3)"],
  [/Sales Order Agent/i, "no 'agent' naming on a mid-market subject"],
  [/off control systems/i, "the control-systems commitment isn't in the standard terms yet"],
  [/\bsprint\b/i, "spec §3.4: no 'sprint'"],
  [/\btenancy\b/i, "spec §3.4: no 'tenancy'"],
  [/APRA audit/i, "spec §3.4: APRA supervises; it doesn't audit"],
  [/no additional cost|at no cost|free of charge|\bfree\b(?! of)/i, "D4: no pricing or 'free' wording"],
  [/\$\s?\d/, "D4: no dollar figures"],
  // "billing data" names the data a vendor's feature reads (Karbon, platform-ai.md), not a fee.
  [/pay-as-you-go|\bbilling\b(?! data\b)/i, "D4: no vendor billing wording"],
  [/talk to us|mailto:|\]\(\/contact\//i, "a post has no CTA of its own"],
  // Government fact-check: the DTA page ties the register entry to no deployment step, so a post
  // doesn't present the impact-assessment duties as an order of work (C8-T8-F2).
  [/order of work/i, "the DTA duties set no order: the register isn't tied to deployment"],
];

// Every fact traces to a primary source (spec §9.5; blueprint copy rules): a government, regulator,
// court or legislature page, or the vendor's own page for a vendor fact. No news, blog or law firm.
const PRIMARY_HOSTS = new Set([
  "apesb.org.au", "picscheme.org", "www.aitsl.edu.au",
  "learn.microsoft.com", "edu.google.com", "knowledge.workspace.google.com",
  "www.xero.com", "www.myob.com", "dext.com", "karbonhq.com", "mitti.com",
  "www.propertyme.com.au", "www.rexsoftware.com",
  "www.thomsonreuters.com.au", "developers.harvey.ai", "www.leaplegalsoftware.com", "www.lexisnexis.com",
]);
const primary = (host) => host.endsWith(".gov.au") || PRIMARY_HOSTS.has(host);

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---[ \t]*\r?\n/;
function post(id) {
  const file = join(DIR, `${id}.md`);
  assert.ok(existsSync(file), `src/content/insights/${id}.md is missing`);
  return { fm: readFrontmatter(file), body: readFileSync(file, "utf8").replace(FRONTMATTER, "") };
}
const PUBLISHED = readdirSync(DIR)
  .filter((f) => f.endsWith(".md"))
  .map((f) => ({ id: f.replace(/\.md$/, ""), fm: readFrontmatter(join(DIR, f)) }))
  .filter((p) => p.fm.draft !== true);
const text = (html) => visibleText(html).trim();
const words = (html) => visibleText(html).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
function proseOf(id) {
  const [prose] = elementsWith(readDist(`insights/${id}/index.html`), "data-prose");
  assert.ok(prose, `insights/${id}/: no [data-prose]`);
  return prose;
}

test("nine new posts, each with the type and refs the blueprint gives it, dated 2026-09-29 or later", () => {
  assert.equal(Object.keys(NEW_POSTS).length, 9);
  for (const [id, want] of Object.entries(NEW_POSTS)) {
    const { fm } = post(id);
    assert.equal(fm.type, want.type, `${id}: type`);
    assert.deepEqual(fm.industries, want.industries, `${id}: industries`);
    assert.deepEqual(fm.solutions, want.solutions, `${id}: solutions`);
    assert.ok(new Date(fm.publishDate) >= new Date("2026-09-29"), `${id}: publishDate ${fm.publishDate}`);
    assert.equal(fm.draft, false, `${id}: a draft has no page`);
    assert.equal(fm.illustrative === true, want.type === "reference-scenario", `${id}: only a reference scenario is illustrative`);
  }
  const count = (type) => Object.values(NEW_POSTS).filter((p) => p.type === type).length;
  assert.ok(count("article") >= 5 && count("article") <= 6, `${count("article")} articles; the blueprint wants 5–6`);
  assert.equal(count("platform-guide"), 2, "the blueprint wants 2 platform guides");
  assert.ok(count("reference-scenario") >= 1 && count("reference-scenario") <= 2, "the blueprint wants 1–2 reference scenarios");
});

test("the three migrated posts carry the blueprint's refs and no closing CTA of their own, with no Phase C placeholder left", () => {
  for (const [id, want] of Object.entries(MIGRATED)) {
    const { fm, body } = post(id);
    assert.deepEqual(fm.industries, want.industries, `${id}: industries`);
    assert.deepEqual(fm.solutions, want.solutions, `${id}: solutions`);
    // Blueprint correction WB-7: PostLayout's §10.1 prompt is the only CTA, so the Phase 0 body line goes.
    assert.doesNotMatch(body, /talk to us|mailto:/i, `${id}: the body still ends with its own "talk to us"`);
    assert.doesNotMatch(readFileSync(join(DIR, `${id}.md`), "utf8"), /Phase C/, `${id}: a placeholder comment is left`);
  }
});

test("every industry is the subject of at least one published post, and every post names an industry or a solution", () => {
  const industries = PAGES.filter((p) => p.base === "/industries/").map((p) => p.path.slice("/industries/".length, -1));
  assert.equal(industries.length, 9);
  const covered = new Set(PUBLISHED.flatMap((p) => p.fm.industries ?? []));
  assert.deepEqual(industries.filter((id) => !covered.has(id)), [], "an industry with no post (spec §8.5 block 9)");
  for (const p of PUBLISHED) {
    assert.ok((p.fm.industries ?? []).length + (p.fm.solutions ?? []).length > 0, `${p.id}: no refs, so its prompt is a plain "Talk to us"`);
  }
});

test("each new post's title is a short declarative ending in a period, and every post's description is 150–160 characters", () => {
  for (const id of Object.keys(NEW_POSTS)) {
    const { fm } = post(id);
    assert.match(fm.title, /^[A-Z].*\.$/, `${id}: "${fm.title}" isn't a sentence ending in a period (spec §3.3)`);
    const title = `${fm.title} | ${SITE.name}`;
    assert.ok(title.length <= 60, `${id}: "${title}" is ${title.length} characters (spec §11.3)`);
    assert.ok(fm.description.length >= 150 && fm.description.length <= 160, `${id}: the description is ${fm.description.length} characters`);
  }
  // The migrated posts too (blueprint correction: the sovereign post's 163-character description is trimmed).
  for (const p of PUBLISHED) {
    assert.ok(p.fm.description.length >= 150 && p.fm.description.length <= 160, `${p.id}: the description is ${p.fm.description.length} characters (spec §11.3)`);
  }
  for (const key of ["title", "description"]) {
    const all = PUBLISHED.map((p) => p.fm[key]);
    assert.deepEqual(all.filter((v, i) => all.indexOf(v) !== i), [], `two posts share a ${key}`);
  }
});

test("no new post carries held or keep-off content, pricing words or a CTA of its own", () => {
  for (const id of Object.keys(NEW_POSTS)) {
    const { fm, body } = post(id);
    const all = `${fm.title}\n${fm.description}\n${body}`.replace(/[‘’]/g, "'");
    for (const [re, why] of KEEP_OFF) {
      const hit = all.match(re);
      assert.equal(hit, null, `${id}: "${hit?.[0]}" (${why})`);
    }
  }
});

test("a new post's heading quotes only words a blockquote in the post quotes from its source (C8-T8-F3)", () => {
  for (const id of Object.keys(NEW_POSTS)) {
    const { body } = post(id);
    const quoted = body.split("\n").filter((l) => l.startsWith(">")).join("\n").replace(/[“”]/g, '"');
    for (const heading of body.split("\n").filter((l) => /^#{2,6} /.test(l))) {
      for (const [, phrase] of heading.replace(/[“”]/g, '"').matchAll(/"([^"]+)"/g)) {
        assert.ok(quoted.includes(phrase), `${id}: the heading "${heading}" quotes "${phrase}", which no blockquote says`);
      }
    }
  }
});

test("posts on mid-market subjects use 'agent' only to name a vendor's own feature", () => {
  for (const id of MID_MARKET) {
    const prose = post(id).body.replace(/\]\([^)]*\)/g, "]").replace(/agents in SharePoint/g, "");
    assert.doesNotMatch(prose, /\bagents?\b/i, id);
  }
});

test("each new post's body runs 800–1,400 words", () => {
  for (const id of Object.keys(NEW_POSTS)) {
    const n = words(proseOf(id).inner);
    assert.ok(n >= 800 && n <= 1400, `${id}: ${n} words`);
  }
});

test("each researched post cites four primary sources and its internal links resolve", () => {
  for (const id of Object.keys(NEW_POSTS)) {
    const hrefs = elements(proseOf(id).inner, (t) => t.name === "a").map((a) => a.attrs.href);
    for (const href of hrefs.filter((href) => href.startsWith("/"))) {
      const local = href.split(/[?#]/)[0];
      assert.ok(existsSync(join(DIST, local, local.endsWith("/") ? "index.html" : "")), `${id}: ${href} is missing`);
    }
    const sources = hrefs.filter((href) => !href.startsWith("/"));
    for (const href of sources) {
      assert.match(href, /^https:\/\//, `${id}: ${href} is not an https source link`);
      assert.ok(primary(new URL(href).host), `${id}: ${new URL(href).host} is not a primary-source host`);
    }
    assert.ok(new Set(sources).size >= 4, `${id}: ${new Set(sources).size} distinct sources`);
  }
});

test("the reference scenario says it's fictional first, and renders the illustrative label", () => {
  for (const [id] of Object.entries(NEW_POSTS).filter(([, p]) => p.type === "reference-scenario")) {
    const html = readDist(`insights/${id}/index.html`);
    const [article] = elementsWith(html, "data-post");
    assert.equal(article.attrs["data-provenance"], "illustrative", `${id}: no data-provenance="illustrative"`);
    assert.equal(text(elementsWith(article.inner, "data-illustrative-label")[0]?.inner ?? ""), SCENARIO_LABEL, `${id}: label`);
    assert.match(post(id).fm.title, /\bfictional\b/, `${id}: the title says it's fictional`);
    const [first] = elements(proseOf(id).inner, (t) => t.name === "p");
    assert.match(text(first.inner), /\bfictional\b/, `${id}: the first paragraph says it's fictional`);
  }
});

test("every industry page renders one to three related insight cards, each a published post about that industry", () => {
  const live = PAGES.filter((p) => p.base === "/industries/" && p.status === "live");
  assert.equal(live.length, 9, "Phase C Tasks 4–6 put the nine industry pages live");
  const posts = new Map(PUBLISHED.map((p) => [`/insights/${p.id}/`, p]));
  for (const page of live) {
    const id = page.path.slice("/industries/".length, -1);
    const html = readDist(`${page.path.slice(1)}index.html`);
    const [section] = elements(html, (t) => t.name === "section" && t.attrs.id === "insights");
    assert.ok(section, `${page.path}: no #insights section`);
    const cards = elementsWith(section.inner, "data-insight-card");
    assert.ok(cards.length >= 1 && cards.length <= 3, `${page.path}: ${cards.length} insight cards`);
    for (const card of cards) {
      const href = elements(card.inner, (t) => t.name === "a" && t.attrs.class === "insight-card-link")[0]?.attrs.href;
      assert.ok(posts.has(href), `${page.path}: a card links to ${href}, which is no published post`);
      assert.ok((posts.get(href).fm.industries ?? []).includes(id), `${page.path}: ${href} doesn't name ${id}`);
    }
  }
  assert.deepEqual(insightFindings(DIST), [], "check 08's A7 part on dist/");
  assert.ok(existsSync(join(DIST_PREVIEW, "industries/government/index.html")), "run `npm run build:preview` first");
  assert.deepEqual(insightFindings(DIST_PREVIEW), [], "check 08's A7 part on dist-preview/");
});

test("every post ends with the §10.1 contextual prompt: its first solution's interest, else its first industry", () => {
  const site = siteContext(false);
  assert.equal(site.contact({ interest: "ai-evaluation" }), "/contact/?interest=ai-evaluation", "/contact/ is live from Phase C Task 7");
  for (const { id, fm } of PUBLISHED) {
    const [closing] = elementsWith(readDist(`insights/${id}/index.html`), "data-post-closing");
    assert.ok(closing, `${id}: no closing prompt`);
    const [prompt] = elementsWith(closing.inner, "data-prompt-block");
    const links = elements(prompt.inner, (t) => t.name === "a");
    assert.equal(links.length, 1, `${id}: one link in the closing prompt`);
    const [solution] = fm.solutions ?? [];
    const [industry] = fm.industries ?? [];
    const want = solution
      ? { href: site.contact({ interest: solution }), label: `Talk to us about ${site.solutions.find((s) => s.id === solution).shortName}`, line: `> talk_to_us --about=${solution}` }
      : industry
        ? { href: site.contact({ industry }), label: `Talk to us about AI for ${site.industries.find((i) => i.id === industry).shortName.toLowerCase()}`, line: `> talk_to_us --about=${industry}` }
        : { href: site.contact(), label: "Talk to us", line: "> talk_to_us" };
    assert.equal(links[0].attrs.href, want.href, `${id}: prompt link`);
    assert.equal(text(links[0].inner), want.label, `${id}: prompt label`);
    assert.equal(text(elements(prompt.inner, (t) => t.name === "p")[0].inner), want.line, `${id}: prompt line`);
  }
});

test("the RSS feed lists every published post once, newest first, with its title and description", () => {
  const items = [...readDist("rss.xml").matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  const field = (item, tag) => {
    const m = item.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
    return m === null ? null : decodeEntities(m[1].replace(/&apos;/g, "'"));
  };
  const url = (id) => `https://techsider.com.au/insights/${id}/`;
  assert.equal(items.length, PUBLISHED.length, "one <item> per published post");
  assert.deepEqual(items.map((i) => field(i, "link")).sort(), PUBLISHED.map((p) => url(p.id)).sort());
  for (const item of items) {
    const p = PUBLISHED.find((x) => url(x.id) === field(item, "link"));
    assert.equal(field(item, "title"), p.fm.title, `${p.id}: title`);
    assert.equal(field(item, "description"), p.fm.description, `${p.id}: description`);
  }
  const dates = items.map((i) => new Date(field(i, "pubDate")).getTime());
  assert.deepEqual(dates, [...dates].sort((a, b) => b - a), "the feed is newest first");
});
