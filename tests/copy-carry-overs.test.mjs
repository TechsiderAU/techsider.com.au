// The copy the Phase C final review left for Phase E (Phase C ledger, ruling R5): every line now
// says only what the page can show.
// - A report, data note or record of a vendor's or tool's location states what the vendor
//   publishes (or says), never where a request actually runs: C4-T4-F4's rule, applied to every
//   industry, solution, regulatory, insight and method source, not only the ones it listed.
// - "Do you evaluate systems you built…?" no longer opens with a bare "No." on pages that also
//   show acceptance tests of our own builds.
// - ④'s Agentic AI Control Evaluation, a configuration review, doesn't print the standard
//   inclusion that promises a test on your own examples.
// Run `npm run build` first (the package blocks are read from dist/).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { ROOT, elements, elementsWith } from "../scripts/ci/lib.mjs";
import { readDist, visibleText } from "./helpers.mjs";
import { launchPackage } from "../src/content/schemas.ts";
import { SERVICES } from "../src/data/services.ts";
import { isTestInclusion } from "../src/lib/views/offer.ts";

const SOLUTION_IDS = ["document-registers", "knowledge-assistant", "draft-for-approval", "ai-evaluation", "ai-switch-on"];
const read = (rel) => readFileSync(join(ROOT, rel), "utf8");
const filesIn = (dir, ext) => readdirSync(join(ROOT, dir)).filter((f) => f.endsWith(ext)).map((f) => `${dir}/${f}`);
const stringsOf = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(stringsOf) : v && typeof v === "object" ? Object.values(v).flatMap(stringsOf) : []);
const sentencesOf = (s) => s.split(/(?<=[.?!])\s+/);
const text = (html) => visibleText(html).trim();

// A sentence that records or names where a vendor's, tool's or platform's AI stores or processes data.
const RECORDS = /\b(?:data note|report|record(?:s|ed)?)\b/i;
const LOCATION = /\bwhere\b[^.]*\b(?:runs?|stor(?:es|ed)|process(?:es|ed))\b|\b(?:processing|storage) locations?\b|\blocation\b/i;
const VENDOR = /\b(?:vendor|tool|system under test|platform)(?:s|'s)?\b/i;

test("a recorded vendor or tool location is what the vendor publishes or says, in every content source (C4-T4-F4's rule; Phase C carry-over)", () => {
  const sources = [
    ...[...filesIn("src/content/industries", ".yaml"), ...filesIn("src/content/solutions", ".yaml")].map((f) => [f, stringsOf(parse(read(f)))]),
    ...filesIn("src/data/regulatory", ".json").map((f) => [f, stringsOf(JSON.parse(read(f)))]),
    ...[...filesIn("src/content/insights", ".md"), "src/content/documents/evaluation-method.md"].map((f) => [f, [read(f)]]),
  ];
  let checked = 0;
  for (const [file, strings] of sources) {
    for (const s of strings.flatMap(sentencesOf).filter((x) => RECORDS.test(x) && LOCATION.test(x) && VENDOR.test(x))) {
      checked += 1;
      assert.match(s, /\bpublish(?:ed|es)?\b|\bsays?\b/, `${file}: "${s}"`);
    }
  }
  assert.ok(checked >= 20, `only ${checked} sentences checked`);
  // The lines the Phase C review named, as they now read.
  const fs = JSON.parse(read("src/data/regulatory/financial-services.json")).rows.find((r) => r.id === "cps230-service-providers");
  assert.equal(fs.design, "Vendor AI is tested on your cases before you sign, and the data note records the vendor's published processing location, with its date.");
  const legal = parse(read("src/content/industries/legal-and-professional.yaml"));
  assert.match(legal.faq.find((f) => /client files leave the firm/.test(f.q)).a, /a data note first records each vendor's published storage and processing locations, with their dates\./);
  assert.match(read("src/content/insights/court-practice-notes-on-ai-verification.md"), /\*\*A data note per tool\.\*\* It records the vendor's published storage and processing locations, with their dates, and the tool's retention and training settings\./);
});

test("'Do you evaluate systems you built…?' answers 'Not independently' and names the acceptance-test label, not a bare 'No.' (Phase C carry-over)", () => {
  const faqs = [
    ["src/content/industries/government.yaml", parse(read("src/content/industries/government.yaml")).faq],
    ["src/content/solutions/ai-evaluation.yaml", parse(read("src/content/solutions/ai-evaluation.yaml")).faq],
  ];
  for (const [file, faq] of faqs) {
    const item = faq.find((f) => /^Do you evaluate systems you built\b/.test(f.q));
    assert.ok(item, `${file}: the question is gone`);
    assert.doesNotMatch(item.a, /^No\./, file);
    assert.match(item.a, /^Not independently, and no\. /, file);
    assert.match(item.a, /"acceptance test \(not independent\)"/, file);
    assert.match(item.a, /\bno resale margin or referral fees\b/, file);
  }
});

test("only ④'s Agentic AI Control Evaluation turns the test inclusion off, and a launch package can only turn it off", () => {
  const flagged = [];
  for (const id of SOLUTION_IDS) {
    const data = parse(read(`src/content/solutions/${id}.yaml`));
    for (const p of [data.genericPackage, ...data.packages]) if (p.testInclusion !== undefined) flagged.push(`${id}/${p.id}: ${p.testInclusion}`);
  }
  assert.deepEqual(flagged, ["ai-evaluation/agentic-ai-control-evaluation: false"]);
  const agentic = parse(read("src/content/solutions/ai-evaluation.yaml")).packages.find((p) => p.id === "agentic-ai-control-evaluation");
  assert.equal(launchPackage.safeParse(agentic).success, true);
  assert.equal(launchPackage.safeParse({ ...agentic, testInclusion: true }).success, false);
});

test("every launch block lists the standard inclusions, less the test line on the Agentic AI Control Evaluation (Phase C carry-over)", () => {
  const testLines = SERVICES.standardInclusions.filter(isTestInclusion);
  assert.equal(testLines.length, 1, "one standard line promises a test on your own examples");
  let blocks = 0;
  for (const id of SOLUTION_IDS) {
    for (const block of elementsWith(readDist(`solutions/${id}/index.html`), "data-package-tab")) {
      blocks += 1;
      const fact = elements(block.inner, (t) => t.name === "div" && /\bpackage-fact\b/.test(t.attrs.class ?? ""))
        .find((f) => /<dt\b[^>]*>Every package includes<\/dt>/.test(f.inner));
      assert.ok(fact, `${id}: a block without "Every package includes"`);
      const listed = elements(fact.inner, (t) => t.name === "li").map((li) => text(li.inner));
      const agentic = block.attrs["data-package-id"] === "agentic-ai-control-evaluation";
      const expected = agentic ? SERVICES.standardInclusions.filter((l) => !isTestInclusion(l)) : SERVICES.standardInclusions;
      assert.deepEqual(listed, expected, `${id} ${block.attrs["data-package-id"]}`);
    }
  }
  assert.ok(blocks >= 10, `only ${blocks} package blocks checked`);
});
