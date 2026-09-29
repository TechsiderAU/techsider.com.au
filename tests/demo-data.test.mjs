// The Phase D demo data as committed (Task 1): the ② Knowledge Assistant demo
// (src/data/demos/knowledge-assistant.json) and the ⑤ checker's vendor facts (src/data/platform-ai.json).
// Both parse with their schemas; every citation lands on a source that says what the answer
// claims (Review Focus 3); the corpus attributions are the licence research's strings
// (.superpowers/research/2026-09-29/phase-c/demo-corpora.md §1.3 exactly, and §3.2 with its changes
// clause amended because the CPS 230 answer paraphrases; copied here because the research folder is
// never committed); and the vendor facts keep platform-ai.md's names, dates and "Not published"
// statements, less the entries the research flags as unverified (controller ruling 4). The CI-check
// test reads dist/, so run `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { makeDemoSchema, plainRef, platformAiFile } from "../src/content/schemas.ts";
import { attributionParts, attributionText } from "../src/lib/attribution.ts";
import { ROOT } from "../scripts/ci/lib.mjs";
import { runAll } from "../scripts/ci/run-all.mjs";

const read = (rel) => JSON.parse(readFileSync(new URL(`../${rel}`, import.meta.url), "utf8"));
const DEMO = makeDemoSchema(plainRef).parse(read("src/data/demos/knowledge-assistant.json"));
const PLATFORM = platformAiFile.parse(read("src/data/platform-ai.json"));
const scenario = (id) => DEMO.data.scenarios.find((s) => s.id === id);
const VIC = scenario("vic-genai-guideline");
const CPS = scenario("cps-230");
const sourceOf = (s, cite) => s.sources.find((src) => src.cite === cite);
const cited = (s) => s.turns.flatMap((t) => t.answer.filter((a) => a.cite !== undefined));

// demo-corpora.md §1.3 (Victoria), verbatim. §3.2 (APRA), verbatim except its changes clause: the
// CPS 230 answer paraphrases the paragraphs it cites, and CC BY 4.0 §3(a)(1)(B) asks for that to be
// indicated (demo-corpora.md §1.3's note; controller ruling 3).
const VIC_ATTRIBUTION = "Excerpts from *Administrative Guideline: The safe and responsible use of Generative AI in the Victorian Public Sector* (Number 2024/07, Issue 1.0), © State of Victoria (Department of Premier and Cabinet) November 2024, and from *Guidance for the safe and responsible use of generative artificial intelligence in the Victorian public sector* (updated 19 March 2025), © Copyright State Government of Victoria. Both are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Sources: [Guideline](https://www.vic.gov.au/administrative-guideline-safe-responsible-use-gen-ai-vps), [Guidance](https://www.vic.gov.au/guidance-safe-responsible-use-gen-ai-vps). Changes: split into passages and labelled with section references for retrieval; wording unchanged. No endorsement by the State of Victoria is implied.";
const APRA_ATTRIBUTION = "Excerpts from *Prudential Standard CPS 230 Operational Risk Management* (the version commencing 1 July 2026, made by Banking, Insurance, Life Insurance, Health Insurance and Superannuation (prudential standard) determination No. 1 of 2026). © Australian Prudential Regulation Authority 2024. Licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Source: [apra.gov.au/standards/cps-230](https://www.apra.gov.au/standards/cps-230). Answers paraphrase the cited paragraphs, which the source panel quotes verbatim; headings added for retrieval. No endorsement by APRA is implied.";
const CC_BY = "https://creativecommons.org/licenses/by/4.0/";

// The CPS 230 answer is migrated from the legacy demo and paraphrases its paragraphs, so each cited
// segment names the phrases that must appear, word for word, in both the segment and its source.
const CPS_KEY_PHRASES = new Map([
  [
    "as soon as possible, and no later than 72 hours after you become aware of it, where you determine it is likely to have a material financial impact or a material impact on your ability to maintain critical operations",
    ["as soon as possible", "72 hours", "material financial impact", "critical operations"],
  ],
  [
    "notify APRA as soon as possible, and within 24 hours, covering the nature of the disruption, the action taken, the likely impact and the timeframe for returning to normal operations",
    ["notify APRA as soon as possible", "24 hours", "the nature of the disruption, the action taken", "the timeframe for returning to normal operations"],
  ],
  [
    "“Critical operations” means processes that, if disrupted beyond tolerance levels, would have a material adverse impact on your depositors, policyholders, beneficiaries or other customers, or on your role in the financial system",
    ["if disrupted beyond tolerance levels", "material adverse impact", "depositors, policyholders, beneficiaries or other customers", "the financial system"],
  ],
  [
    "as soon as possible and within 20 business days of entering into or materially changing an agreement for a service a critical operation relies on",
    ["as soon as possible and", "20 business days", "materially changing an agreement", "critical operation"],
  ],
]);

test("the ② demo is an illustrative assistant demo of knowledge-assistant: the Victorian scenario first, then CPS 230", () => {
  assert.deepEqual([DEMO.solution, DEMO.kind, DEMO.provenance, DEMO.run], ["knowledge-assistant", "assistant", "illustrative", undefined]);
  assert.deepEqual(DEMO.data.scenarios.map((s) => s.id), ["vic-genai-guideline", "cps-230"]);
  // Neither state corpus binds councils, so the persona is a state agency officer (demo-corpora.md §0.4).
  assert.match(VIC.title, /\bstate agency officer\b/);
  assert.doesNotMatch(VIC.title, /council/i);
  // A scenario title renders as a heading, so it is a short declarative ending in a period (spec §3.3;
  // ledger ruling R4): one sentence, capitalised, no other sentence punctuation.
  for (const s of DEMO.data.scenarios) assert.match(s.title, /^[A-Z][^.?!]{0,80}\.$/, s.id);
});

test("each corpus carries the licence research's attribution string (demo-corpora.md §1.3; §3.2 with its changes clause amended)", () => {
  assert.equal(VIC.corpus.attribution, VIC_ATTRIBUTION);
  assert.equal(CPS.corpus.attribution, APRA_ATTRIBUTION);
  const links = (s) => attributionParts(s.corpus.attribution).filter((p) => p.kind === "link").map((p) => [p.text, p.href]);
  const titles = (s) => attributionParts(s.corpus.attribution).filter((p) => p.kind === "title").map((p) => p.text);
  assert.deepEqual(links(VIC), [
    ["CC BY 4.0", CC_BY],
    ["Guideline", "https://www.vic.gov.au/administrative-guideline-safe-responsible-use-gen-ai-vps"],
    ["Guidance", "https://www.vic.gov.au/guidance-safe-responsible-use-gen-ai-vps"],
  ]);
  assert.deepEqual(titles(VIC), [
    "Administrative Guideline: The safe and responsible use of Generative AI in the Victorian Public Sector",
    "Guidance for the safe and responsible use of generative artificial intelligence in the Victorian public sector",
  ]);
  assert.deepEqual(links(CPS), [["CC BY 4.0", CC_BY], ["apra.gov.au/standards/cps-230", "https://www.apra.gov.au/standards/cps-230"]]);
  assert.deepEqual(titles(CPS), ["Prudential Standard CPS 230 Operational Risk Management"]);
  for (const s of [VIC, CPS]) {
    assert.equal(s.corpus.licence, "CC BY 4.0", s.id);
    assert.ok(links(s).some(([, href]) => href === s.corpus.url), `${s.id}: the corpus url is not linked from its attribution`);
    assert.match(attributionText(s.corpus.attribution), /No endorsement by (the State of Victoria|APRA) is implied\.$/, s.id);
  }
});

test("every source is a passage from its publisher's own site, and nothing in the file holds an email address, a keep-off framework or a price", () => {
  const hosts = { "vic-genai-guideline": "www.vic.gov.au", "cps-230": "www.apra.gov.au" };
  for (const s of DEMO.data.scenarios) {
    assert.deepEqual(s.sources.map((src) => src.cite), s.sources.map((_, i) => i + 1), `${s.id}: sources are numbered 1, 2, 3…`);
    for (const src of s.sources) {
      const url = new URL(src.href);
      assert.deepEqual([url.protocol, url.host], ["https:", hosts[s.id]], `${s.id} [${src.cite}]`);
    }
  }
  // The whole file, not only the passages: questions, answers, `caught` and trace details too
  // (demo-corpora.md §5 and the research index's keep-off list: no email addresses, no Victorian
  // AI Assurance Framework, no dollar thresholds).
  assert.doesNotMatch(readFileSync(new URL("../src/data/demos/knowledge-assistant.json", import.meta.url), "utf8"), /@|Assurance Framework|\$\s?\d/);
});

test("every cited answer segment says what its source says: Victorian quotes are verbatim, CPS 230 keeps its key phrases (Review Focus 3)", () => {
  // Every turn that answers, rightly or falsely, cites a source, so the loops below never run empty.
  for (const s of DEMO.data.scenarios) {
    for (const [i, t] of s.turns.entries()) {
      if (t.outcome !== "refused") assert.ok(t.answer.some((a) => a.cite !== undefined), `${s.id} turn ${i + 1} answers without a citation`);
    }
  }
  // The Victorian attribution says "wording unchanged", so each cited segment is a quotation, in
  // curly quotes, cut word for word from the passage it cites.
  for (const a of cited(VIC)) {
    const quote = a.text.match(/^“(.+)”$/)?.[1];
    assert.ok(quote, `a cited Victorian segment is not a quotation: ${a.text}`);
    assert.ok(sourceOf(VIC, a.cite).text.includes(quote), `[${a.cite}] does not contain: ${quote}`);
  }
  const cps = cited(CPS);
  assert.deepEqual(cps.map((a) => a.text).sort(), [...CPS_KEY_PHRASES.keys()].sort(), "every cited CPS 230 segment has key phrases here");
  for (const a of cps) {
    for (const phrase of CPS_KEY_PHRASES.get(a.text)) {
      assert.ok(a.text.includes(phrase), `the segment lost "${phrase}"`);
      assert.ok(sourceOf(CPS, a.cite).text.includes(phrase), `[${a.cite}] ${sourceOf(CPS, a.cite).label} does not say "${phrase}"`);
    }
  }
  // ¶60(a) reads "as soon as possible and not more than 20 business days after…", so its paraphrase
  // opens with the same first limb, not the 20-day limit alone (ledger ruling R4).
  assert.match(cps.find((a) => sourceOf(CPS, a.cite).label.endsWith("¶60(a)")).text, /^as soon as possible and within 20 business days /);
});

test("every retrieved snippet is cut from the source it names, and a distractor never poses as a quote", () => {
  for (const s of DEMO.data.scenarios) {
    for (const [i, t] of s.turns.entries()) {
      for (const r of t.retrieved) {
        const where = `${s.id} turn ${i + 1}`;
        if (r.cite === 0) {
          assert.match(r.snippet, /^\(.+\)$/, `${where}: a distractor snippet is a bracketed description`);
          continue;
        }
        const pieces = r.snippet.split("…").map((p) => p.trim()).filter(Boolean);
        assert.ok(pieces.length > 0, `${where}: [${r.cite}] has an empty snippet`);
        for (const piece of pieces) {
          assert.ok(sourceOf(s, r.cite).text.includes(piece), `${where}: [${r.cite}] does not contain "${piece}"`);
        }
      }
    }
  }
});

test("the demo shows spec §9.1's behaviours: answers, the council refusal, a caught false answer and the full CPS 230 answer", () => {
  assert.deepEqual(VIC.turns.map((t) => t.outcome), ["answered", "answered", "false-answer-caught", "refused"]);
  assert.deepEqual(CPS.turns.map((t) => t.outcome), ["answered", "refused"]);
  // The council question is a refusal test: the answer quotes the scope clause and says the documents don't settle it.
  const council = VIC.turns.find((t) => /\bcouncil\b/i.test(t.question));
  assert.equal(council.outcome, "refused");
  assert.deepEqual(council.answer.filter((a) => a.cite).map((a) => sourceOf(VIC, a.cite).label), ["Guideline · Scope (p. 3)"]);
  assert.match(council.answer.map((a) => a.text).join(""), /don’t say whether councils are covered, so I won’t guess/);
  // The caught false answer: a real citation, a wrong conclusion, and what the test caught.
  const caught = VIC.turns.find((t) => t.outcome === "false-answer-caught");
  assert.match(caught.answer.map((a) => a.text).join(""), /approved/);
  assert.match(caught.caught, /approves none of them/);
  // Spec §9.4: the notification answer covers ¶32 and ¶41 and names ¶60 as a separate obligation.
  const labels = cited(CPS).map((a) => sourceOf(CPS, a.cite).label);
  for (const para of ["¶32", "¶41", "¶34", "¶60(a)"]) assert.ok(labels.some((l) => l.endsWith(para)), para);
  // Every source is used: cited in an answer, or retrieved.
  for (const s of DEMO.data.scenarios) {
    const used = new Set(s.turns.flatMap((t) => [...t.retrieved.map((r) => r.cite), ...t.answer.map((a) => a.cite)]));
    for (const src of s.sources) assert.ok(used.has(src.cite), `${s.id}: [${src.cite}] ${src.label} is never retrieved or cited`);
  }
});

test("the demo's figures are typed metrics: scores from 0 to 1 with no unit, latencies in whole ms (spec §9.3)", () => {
  for (const s of DEMO.data.scenarios) {
    for (const t of s.turns) {
      for (const r of t.retrieved) {
        assert.equal(r.score.unit, undefined);
        assert.ok(r.score.value >= 0 && r.score.value <= 1, `${s.id}: score ${r.score.value}`);
      }
      for (const step of t.trace) {
        assert.equal(step.ms.unit, "ms");
        assert.ok(Number.isInteger(step.ms.value) && step.ms.value > 0, `${s.id}: ${step.label} ${step.ms.value}`);
      }
    }
  }
});

test("CI checks 01, 04, 06, 07 and 11 pass on dist/ and report nothing in the new data files", async () => {
  const checks = ["01-slugs", "04-banned-phrases", "06-provenance", "07-verify-markers", "11-pricing"];
  const { results } = await runAll({ root: ROOT, dist: join(ROOT, "dist"), mode: "report", checks });
  const mine = /src\/data\/(demos\/knowledge-assistant|platform-ai)\.json/;
  for (const { id, errors, warnings } of results) {
    assert.deepEqual(errors, [], id);
    assert.deepEqual(warnings.filter((w) => mine.test(w)), [], id);
  }
});

// --- src/data/platform-ai.json (platform-ai.md, researched 2026-09-29) ------------------------

const VENDORS = {
  Microsoft: { entries: 4, category: "general", hosts: ["learn.microsoft.com"] },
  Xero: { entries: 2, category: "accounting", hosts: ["www.xero.com"] },
  MYOB: { entries: 5, category: "accounting", hosts: ["www.myob.com"] },
  Dext: { entries: 4, category: "accounting", hosts: ["dext.com"] },
  Karbon: { entries: 3, category: "accounting", hosts: ["karbonhq.com"] },
  PropertyMe: { entries: 4, category: "property", hosts: ["www.propertyme.com.au"] },
  Rex: { entries: 1, category: "property", hosts: ["www.rexsoftware.com"] },
  LEAP: { entries: 4, category: "legal", hosts: ["www.leaplegalsoftware.com"] },
  Smokeball: { entries: 1, category: "legal", hosts: ["www.smokeball.com.au"] },
  Google: { entries: 4, category: "general", hosts: ["workspace.google.com"] },
  Zoom: { entries: 3, category: "general", hosts: ["zoom.us", "www.zoom.com"] },
};
// The vendors that don't say where AI processing runs for Australian customers (research index: eight,
// less Actionstep and Adobe, whose entries stay out until re-checked).
const NOT_PUBLISHED = ["Xero", "MYOB", "Dext", "Karbon", "PropertyMe", "Smokeball"];
const RAW_PLATFORM = readFileSync(new URL("../src/data/platform-ai.json", import.meta.url), "utf8");
const day = (d) => d.toISOString().slice(0, 10);

test("platform-ai.json: 35 entries from 11 vendors, each fact as at 29 September 2026", () => {
  assert.equal(day(PLATFORM.asAt), "2026-09-29");
  assert.equal(PLATFORM.entries.length, 35);
  const counts = {};
  for (const e of PLATFORM.entries) counts[e.vendor] = (counts[e.vendor] ?? 0) + 1;
  assert.deepEqual(counts, Object.fromEntries(Object.entries(VENDORS).map(([v, x]) => [v, x.entries])));
  for (const e of PLATFORM.entries) assert.equal(day(e.asAt), "2026-09-29", `${e.vendor}: ${e.feature}`);
});

test("platform-ai.json: one category per vendor, and each Safe-Use Kit category has entries", () => {
  for (const e of PLATFORM.entries) assert.equal(e.category, VENDORS[e.vendor].category, `${e.vendor}: ${e.feature}`);
  for (const kit of ["accounting", "legal", "property"]) assert.ok(PLATFORM.entries.some((e) => e.category === kit), kit);
});

test("platform-ai.json: every fact links the vendor's own page over https", () => {
  for (const e of PLATFORM.entries) {
    const url = new URL(e.source);
    assert.equal(url.protocol, "https:", e.source);
    assert.ok(VENDORS[e.vendor].hosts.includes(url.host), `${e.vendor}: ${e.source}`);
  }
});

test("platform-ai.json: the six silent vendors read 'Not published', and nothing places Copilot processing in Australia", () => {
  for (const e of PLATFORM.entries) {
    assert.equal(e.processingLocation.startsWith("Not published"), NOT_PUBLISHED.includes(e.vendor), `${e.vendor}: ${e.processingLocation}`);
  }
  // Microsoft says only that in-country inferencing for Australia is "expected" by the end of 2026.
  for (const e of PLATFORM.entries.filter((x) => x.vendor === "Microsoft")) {
    assert.match(e.processingLocation, /'expected' by the end of 2026/);
    assert.doesNotMatch(e.processingLocation, /(processed|processing|runs|inference) in Australia/i);
  }
});

test("platform-ai.json: current product names, no prices, and nothing from the keep-off list", () => {
  // Renames (platform-ai.md): Microsoft 365 Copilot is now Microsoft Copilot; Zoom AI Companion is ZoomMate.
  assert.doesNotMatch(RAW_PLATFORM.replaceAll("formerly Microsoft 365 Copilot", ""), /Microsoft 365 Copilot/);
  assert.doesNotMatch(RAW_PLATFORM, /AI Companion|Console Cloud/);
  // No pricing (D4): no currency figure, and no "free" or "no additional cost".
  assert.doesNotMatch(RAW_PLATFORM, /\$\s?\d|\bfree\b|no additional cost|\bdiscount/i);
  // Left out as unverified or not AI-labelled (research index, "Still unverified: keep off the site").
  assert.doesNotMatch(RAW_PLATFORM, /XeroForce|Reapit|\bFYI\b|\bKai\b|AI Prospecting/);
});

test("platform-ai.json: the entries the research flags as unverified stay out until re-checked (controller ruling 4)", () => {
  // Adobe (WebFetch wording awaiting a browser re-check), Actionstep's Trace and Acumen (AU
  // availability unconfirmed) and Dext's sparkle-icon extraction feature (no AI legend).
  assert.doesNotMatch(RAW_PLATFORM, /Adobe|Acrobat|Actionstep|\bTrace\b|Acumen|Intelligent document extraction/);
  // Zoom's plan line-up came from a USD pricing page, so the included entries name the product's
  // plans, not its tiers or allowances.
  for (const e of PLATFORM.entries.filter((x) => x.vendor === "Zoom" && x.included === "included")) {
    assert.deepEqual(e.plans, ["Zoom Workplace plans"], e.feature);
  }
  assert.doesNotMatch(RAW_PLATFORM, /Basic \(limited\)|capped allowance|paid plans are unlimited/);
  // Whether LawY's lawyer verification or Smokeball's Archie Apps carry a charge is unconfirmed, so
  // neither a feature nor a processing note mentions them.
  assert.doesNotMatch(PLATFORM.entries.map((e) => `${e.feature}\n${e.processingLocation}`).join("\n"), /lawyer (for )?verification|Archie Apps/);
  // MYOB's pricing table has no Premier column, so AccountRight Premier's inclusion is only inferred.
  assert.doesNotMatch(RAW_PLATFORM, /AccountRight Premier/);
});

test("attributionParts splits italic titles and https links, and rejects any other markup", () => {
  assert.deepEqual(attributionParts("See *Test Title* at [example.com](https://example.com/test)."), [
    { kind: "text", text: "See " },
    { kind: "title", text: "Test Title" },
    { kind: "text", text: " at " },
    { kind: "link", text: "example.com", href: "https://example.com/test" },
    { kind: "text", text: "." },
  ]);
  assert.equal(attributionText("See *Test Title* at [example.com](https://example.com/test)."), "See Test Title at example.com.");
  for (const bad of ["An *unclosed title", "A [plain http link](http://example.com/test)", "A stray ] bracket", "[A link with no target]"]) {
    assert.throws(() => attributionParts(bad), /attribution: unmatched markup/, bad);
  }
  for (const s of [VIC_ATTRIBUTION, APRA_ATTRIBUTION]) assert.doesNotMatch(attributionText(s), /[*[\]]/);
});
