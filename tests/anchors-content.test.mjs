// go-global Part 4B (spec §5.2, §5.3, Appendix A; contract §1): the "Rules that travel" anchor data
// in src/data/anchors/, read the way check 13 and the industry route read it (shared.json plus one
// file per industry, each parsed with anchorFile), and the chips the production build renders from
// it. The literals are the approved data: each page's shared row, the Appendix A featured and
// data-only sets, the r4 §5.5 watch-list review dates, every chip's text, the §5.2 rewrites, and the
// facts the research keeps off the site (00-brief "Facts still UNVERIFIED", the r4 Verification
// table, spec §5.3 corrections). The rendered-chip test reads dist/: run `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { readDist } from "./helpers.mjs";
import {
  ROOT, elements, elementsWith, listFiles, normalizeQuotes, readJson, readText, relPath, result, visibleText,
} from "../scripts/ci/lib.mjs";
import { FAIL_PHRASES, WARN_PHRASES, scan } from "../scripts/ci/checks/04-banned-phrases.mjs";
import { FEATURABLE_LEVELS, anchorFile } from "../src/content/schemas.ts";
import { PAGES } from "../src/data/nav.ts";
import { anchorChipLabel } from "../src/lib/anchors.ts";
import { ANCHOR_KIND_LABEL, RULES_CLOSING, RULES_HEADING, RULES_SHARED_LABEL } from "../src/lib/fixed-copy.ts";

const DIR = join(ROOT, "src/data/anchors");
const SOLUTIONS_DIR = join(ROOT, "src/content/solutions");
const SOLUTION_IDS = new Set(listFiles(SOLUTIONS_DIR, (rel) => !rel.includes("/") && rel.endsWith(".yaml")).map((f) => relPath(SOLUTIONS_DIR, f).slice(0, -".yaml".length)));
const INDUSTRY_IDS = PAGES.filter((p) => p.base === "/industries/").map((p) => p.path.slice("/industries/".length, -1));

/** A file as the route and check 13 read it (contract §1.1): its raw JSON, and parsed with anchorFile. */
const raw = (name) => readJson(join(DIR, `${name}.json`));
const parsed = (name) => anchorFile.parse(raw(name));
const SHARED = parsed("shared");
const sharedById = new Map(SHARED.anchors.map((a) => [a.id, a]));
/** The fields a person reads: the chip's name, and the data behind it. */
const TEXT_FIELDS = ["name", "issuer", "binding", "asks", "evidence"];
/** pageWords' rule (tests/helpers.mjs): whitespace-separated tokens holding a letter or a digit. */
const words = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
/** A chip's visible text: its name, then its label (contract §3). */
const chipText = (a) => `${a.name} ${anchorChipLabel(a)}`;
const day = (d) => d.toISOString().slice(0, 10);
const reviewDates = (anchors) => Object.fromEntries(anchors.filter((a) => a.reviewBy).map((a) => [a.id, day(a.reviewBy)]));

/** Spec §5.2: the "Everywhere" row; GDPR Art 22 (x8) joins it where Draft-for-Approval leads. */
const BASE_ROW = ["x1", "x4", "x6", "x7"];
const GDPR_ROW = [...BASE_ROW, "x8"];
/** Contract §1.1: shared.json holds x1–x8; x2, x3 and x5 are data only (x5 shows inside x4's chip). */
const SHARED_IDS = ["x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8"];
const SHARED_CHIPS = {
  x1: "ISO/IEC 42001: AI management system Standard · published Dec 2023 · as at Oct 2026",
  x4: "NIST AI RMF and the GenAI Profile Guidance · published Jan 2023 · as at Oct 2026",
  x6: "OECD AI Principles Guidance · published May 2024 · as at Oct 2026",
  x7: "EU AI Act: reaches AI output used in the EU Law · in force · as at Oct 2026",
  x8: "GDPR Art 22: people, not just software, decide Law · in force · as at Oct 2026",
};
/** r4 §5.5 watch list (spec §5.3): EU AI Act and GDPR dates, and the NIST AI RMF revision. */
const SHARED_REVIEW_BY = { x4: "2027-01-12", x7: "2027-01-12", x8: "2027-01-12" };

/**
 * Per industry, in nav order: spec Appendix A as written to the data. The shared row; the featured
 * sector anchors (data order) and their chips' text; the data-only anchors; the r4 §5.5 review
 * dates; and the §5.2 rewrites and §5.3 corrections, as [anchor id, field, exact text or a pattern].
 */
const INDUSTRIES = {
  government: {
    shared: BASE_ROW,
    featured: ["unesco-ethics-of-ai", "eu-ai-act-art-27-annex-iii-5a"],
    chips: [
      "UNESCO Recommendation on the Ethics of AI Guidance · published Nov 2021 · as at Oct 2026",
      "EU AI Act Art 27 and Annex III 5(a) Law · applies from 2 Dec 2027 · as at Oct 2026",
    ],
    dataOnly: ["oecd-governing-with-ai", "g7-toolkit-ai-public-sector", "unesco-ethical-impact-assessment"],
    reviewBy: { "eu-ai-act-art-27-annex-iii-5a": "2027-01-12" },
    pins: [
      // Rule 6 and Appendix A: r4 records only the Recommendation's adoption, never the EIA's content.
      ["unesco-ethics-of-ai", "asks", "Shared principles for the ethics of AI, adopted by UNESCO's 193 member states."],
      // Correction 9: the public-body assessment excludes Annex III point 2 and relies on, never "cross-refers to", a DPIA.
      ["eu-ai-act-art-27-annex-iii-5a", "asks", /\bexcept point 2 \(critical infrastructure\)/],
      ["eu-ai-act-art-27-annex-iii-5a", "asks", /\bThe assessment can rely on an existing DPIA\./],
    ],
  },
  "financial-services": {
    shared: BASE_ROW,
    featured: ["bcbs-operational-resilience", "bcbs-third-party-risk", "dora"],
    chips: [
      "BCBS principles for operational resilience Guidance · published Mar 2021 · as at Oct 2026",
      "BCBS principles for third-party risk Guidance · published Dec 2025 · as at Oct 2026",
      "DORA: duties of EU financial entities Law · in force · as at Oct 2026",
    ],
    dataOnly: ["fsb-ai-monitoring-report", "iosco-ai-supervisory-toolkit", "eu-ai-act-annex-iii-5b-5c"],
    reviewBy: { "eu-ai-act-annex-iii-5b-5c": "2027-01-12" },
    pins: [
      // §5.2: DORA is the financial entity's duty.
      ["dora", "asks", /^In the EU, DORA requires banks, insurers and other financial entities to keep a register of their ICT arrangements and to put set terms into those contracts\. /],
    ],
  },
  accounting: {
    shared: GDPR_ROW,
    featured: ["iesba-code-technology", "iesba-emerging-technologies", "fatf-r22-r23"],
    chips: [
      "IESBA Code technology revisions Standard · in force · as at Oct 2026",
      "IESBA staff paper on emerging technologies Guidance · published Jul 2026 · as at Oct 2026",
      "FATF Recommendations 22 and 23 Standard · in force · as at Oct 2026",
    ],
    dataOnly: ["iaasb-technology", "pcaob-genai-spotlight"],
    reviewBy: { "iesba-emerging-technologies": "2027-01-12", "iaasb-technology": "2027-01-12" },
    pins: [
      // Correction 4: "as amended", with no month.
      ["fatf-r22-r23", "binding", "International standards for countries (FATF Recommendations, as amended)."],
    ],
  },
  education: {
    shared: BASE_ROW,
    featured: ["unesco-genai-guidance", "ec-oecd-ailit-framework", "eu-ai-act-annex-iii-3"],
    chips: [
      "UNESCO guidance for generative AI in education Guidance · published Sep 2023 · as at Oct 2026",
      "EC–OECD AI Literacy Framework Guidance · published Jun 2026 · as at Oct 2026",
      "EU AI Act Annex III point 3: education Law · applies from 2 Dec 2027 · as at Oct 2026",
    ],
    dataOnly: ["unesco-ai-competency-teachers"],
    reviewBy: { "eu-ai-act-annex-iii-3": "2027-01-12" },
    pins: [
      // §5.2: UNESCO paraphrased, never quoted as "human-agent".
      ["unesco-genai-guidance", "asks", /\ba human-centred, age-appropriate approach to validating tools\b/],
      // Correction 6: the source's own words ("a common reference"), and "dimensions", not "domains".
      ["ec-oecd-ailit-framework", "binding", "A common reference framework for AI literacy in primary and secondary education."],
      ["ec-oecd-ailit-framework", "asks", /\bfour dimensions\b/],
    ],
  },
  manufacturing: {
    shared: GDPR_ROW,
    featured: ["iso-9001-2026", "iec-62443", "joint-ot-ai-principles"],
    chips: [
      "ISO 9001:2026 Standard · published Sep 2026 · as at Oct 2026",
      "IEC 62443: operational technology security Standard · in force · as at Oct 2026",
      "Joint principles for AI in operational technology Guidance · published Dec 2025 · as at Oct 2026",
    ],
    dataOnly: ["iso-45001", "eu-gmp-annex-22"],
    reviewBy: { "iso-45001": "2027-04-12", "eu-gmp-annex-22": "2027-01-12" },
    pins: [["iec-62443", "name", "IEC 62443: operational technology security"]],
  },
  "real-estate": {
    shared: GDPR_ROW,
    featured: ["eu-ai-act-annex-iii-5b", "fatf-r22-property"],
    chips: [
      "EU AI Act Annex III 5(b): credit scoring Law · applies from 2 Dec 2027 · as at Oct 2026",
      "FATF Recommendation 22: buying and selling property Standard · in force · as at Oct 2026",
    ],
    dataOnly: ["oecd-privacy-guidelines"],
    reviewBy: { "eu-ai-act-annex-iii-5b": "2027-01-12" },
    pins: [
      // §5.2: FATF covers sales, not leasing; "rental applications", never "tenancy".
      ["fatf-r22-property", "asks", "Businesses that act for clients in buying or selling property must identify those clients and keep records. Leasing and property management are outside it."],
      ["eu-ai-act-annex-iii-5b", "asks", /\bscreening rental applications\b/],
    ],
  },
  healthcare: {
    shared: BASE_ROW,
    featured: ["who-lmm-guidance", "eu-ai-act-annex-i-medical-devices", "eu-ai-act-annex-iii-5a-5d"],
    chips: [
      "WHO guidance on large multi-modal models Guidance · published Jan 2024 · as at Oct 2026",
      "EU AI Act Annex I: medical devices Law · applies from 2 Aug 2028 · as at Oct 2026",
      "EU AI Act Annex III 5(a) and 5(d) Law · applies from 2 Dec 2027 · as at Oct 2026",
    ],
    dataOnly: [],
    reviewBy: { "eu-ai-act-annex-i-medical-devices": "2027-01-12", "eu-ai-act-annex-iii-5a-5d": "2027-01-12" },
    pins: [
      ["who-lmm-guidance", "asks", /\bautomation bias\b/],
      // Final review F5: the chip links the Annex I text read on the AI Act Service Desk (row A4), which
      // lists the EU medical device rules, not the Commission's overview, which never names them (row E15).
      ["eu-ai-act-annex-i-medical-devices", "source", "https://ai-act-service-desk.ec.europa.eu/en/ai-act/annex-1"],
    ],
  },
  "resources-and-energy": {
    shared: BASE_ROW,
    featured: ["iso-14001-2026", "iec-62443", "joint-ot-ai-principles"],
    chips: [
      "ISO 14001:2026 Standard · published Apr 2026 · as at Oct 2026",
      "IEC 62443: operational technology security Standard · in force · as at Oct 2026",
      "Joint principles for AI in operational technology Guidance · published Dec 2025 · as at Oct 2026",
    ],
    dataOnly: ["gistm"],
    reviewBy: {},
    // §5.2: never "control systems".
    pins: [["iec-62443", "name", "IEC 62443: operational technology security"]],
  },
  "legal-and-professional": {
    shared: BASE_ROW,
    featured: ["ccbe-genai-guide", "ccbe-technical-guide", "eu-ai-act-annex-iii-8a"],
    chips: [
      "CCBE guide on generative AI for lawyers Guidance · published Oct 2025 · as at Oct 2026",
      "CCBE technical guide on AI tools Guidance · published Mar 2026 · as at Oct 2026",
      "EU AI Act Annex III 8(a): AI for courts Law · applies from 2 Dec 2027 · as at Oct 2026",
    ],
    dataOnly: [],
    reviewBy: { "eu-ai-act-annex-iii-8a": "2027-01-12" },
    pins: [
      // Rule 6: the guide is P* for its URL and date only (r4 §3.5); its content was read only through a secondary summary.
      ["ccbe-genai-guide", "asks", "Guidance for lawyers on the use of generative AI, published on 2 October 2025 and cited in the CCBE's 2026 technical guide."],
      ["eu-ai-act-annex-iii-8a", "asks", /\bUse by law firms is not in this category\.$/],
    ],
  },
};

/** Spec §1 S1: these never render outside an allowed context, and a chip renders outside the band. */
const S1 = /australian organisations|for australian|in australia \||australia's leading|australian ai|australian teams|australian-owned|most australian/i;
/** D10: no national body outside Australia and the EU in a chip; Australian regulators belong in the band (NIST's framework is §5.2's X4). */
const NATIONAL_BODIES = /\b(?:FDA|Health Canada|MHRA|NHS|CISA|ASD|ACSC|NSA|FBI|ABA|PCAOB|ICO|FedRAMP|TGA|APRA|ASIC|AUSTRAC|OAIC)\b/;
/**
 * Kept off the site in every field (spec §5.3 rules 4–5): 00-brief "Facts still UNVERIFIED", the
 * r4 §8 UNVERIFIED list, the r4 Verification table's notes, spec §5.3's corrections, and the §5.2
 * vocabulary rules.
 */
const BLOCKED = [
  ["IMDRF N88, held until its date is read (correction 11)", /\bIMDRF\b|\bN88\b/],
  ["MHRA and NHS England, research only (correction 3; D10)", /\bMHRA\b|\bNHS\b/],
  ["the MHRA 'v1.0' (V5)", /\bv1\.0\b/],
  ["the CoE convention, whose status and ratifications are unverifiable (V13)", /\bCouncil of Europe\b|\bCETS\b|\bratif\w*|\bsignator\w*/i],
  ["the GDPR Digital Omnibus, secondary sources only (rule 6; correction 5)", /\bOmnibus\b|\btrilogue\b|\bat the earliest\b/i],
  ["the Joint Forum supersession line (correction 8)", /\bJoint Forum\b|\bsupersed\w*/i],
  ["'now cross-refer' to a DPIA (correction 9)", /\bcross-refer\w*/i],
  ["the IESBA AI-specific NAM timing (correction 7)", /\bNAMs?\b|\bQ[1-4] 20\d\d\b/],
  ["the IAASB guide date (r4 §8)", /\bNov(?:ember)? 2026\b/],
  ["AILit 'domains' (correction 6)", /\bdomains?\b/i],
  ["UNESCO's 'human-agent' quote, or a printed age (§5.2; V6)", /\bhuman-agent\b|\bage limit\b|\baged? \d/i],
  ["NERC CIP (r4 §3.8)", /\bNERC\b|\bCIP-\d/],
  ["IEC 62443-2-1:2024 detail (Appendix A)", /\b62443-2-1\b/],
  ["an ISO 9001:2026 clause number (Appendix A)", /\bclause \d|\b7\.5\b/i],
  ["a certificate transition date (V10)", /\b2029\b/],
  ["UK vetting residency (V12)", /\bvetting\b|\bresiden(?:ce|cy)\b/i],
  ["FedRAMP counts (V11)", /\bFedRAMP\b/],
  ["Cyber Essentials, STAR, MCC-AI, CCPA or SCC clause wording (00-brief)", /\bCyber Essentials\b|\bSTAR\b|\bMCC-AI\b|\bCCPA\b|\bClauses? 1[78]\b/],
  ["the ISO 45001 revision timing (r4 §8)", /\b45001:2027\b/],
  ["DORA as a duty on ICT providers (§5.2)", /\bICT (?:third-party )?(?:service )?providers?\b/i],
  ["'control systems' (§5.2: write operational technology)", /\bcontrol systems?\b/i],
  ["'tenant' or 'tenancy' (§5.2: write rental applications)", /\btenan(?:t|ts|cy|cies)\b/i],
  ["AI 'agents' (spec §3.4)", /\bagent(?:s|ic)?\b/i],
];
/** Correction 4: a FATF anchor prints "as amended" with no month. */
const MONTH = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/;
/** The EU AI Act dates Regulation (EU) 2026/1744 set or moved (r4 V1): each prints as "from <date> (as amended in July 2026)" (spec §5.2). */
const AMENDED_DATES = /\b(?:2 December 2026|2 December 2027|2 August 2028|2 August 2030)\b/g;

/** Every file these tests cover, parsed: shared.json, then each industry's. */
const covered = () => [["shared", SHARED], ...Object.keys(INDUSTRIES).map((id) => [id, parsed(id)])];
const everyAnchor = () => covered().flatMap(([file, f]) => f.anchors.map((a) => ({ file, a })));

test("src/data/anchors/ holds shared.json and one file per industry, and every industry page is covered here (contract §1.1)", () => {
  const files = listFiles(DIR, (rel) => !rel.includes("/") && rel.endsWith(".json")).map((f) => relPath(DIR, f));
  assert.deepEqual(files, ["shared.json", ...INDUSTRY_IDS.map((id) => `${id}.json`)].sort());
  assert.deepEqual(Object.keys(INDUSTRIES), INDUSTRY_IDS);
});

test("shared.json: x1–x8 in order, no row of its own, x1, x4, x6, x7 and x8 the only ones a row may list, and their chips' text (spec §5.2; contract §1.1)", () => {
  assert.equal(raw("shared").shared, undefined);
  assert.deepEqual(SHARED.anchors.map((a) => a.id), SHARED_IDS);
  assert.deepEqual(SHARED.anchors.filter((a) => a.featured).map((a) => a.id), Object.keys(SHARED_CHIPS));
  assert.deepEqual(Object.fromEntries(Object.keys(SHARED_CHIPS).map((id) => [id, chipText(sharedById.get(id))])), SHARED_CHIPS);
  assert.deepEqual(reviewDates(SHARED.anchors), SHARED_REVIEW_BY);
  // Correction 1: X7 carries the Art 5 prohibitions the amendment added.
  assert.match(sharedById.get("x7").asks, /\bfurther prohibitions from 2 December 2026 \(as amended in July 2026\)/);
  // Appendix A: Art 3(2) folds into X8's asks.
  assert.match(sharedById.get("x8").asks, /^Art 3\(2\) applies the GDPR\b/);
  // Correction 10: principle 1.5 is paraphrased until its P9 page is re-read.
  assert.doesNotMatch(sharedById.get("x6").asks, /["“”]/);
  // Final review F11: X1 says only what the IEC listing's abstract supports, until a person's read of
  // ISO/IEC 42001 on iso.org (row F3 of the verification note) restores the fuller outline.
  assert.equal(sharedById.get("x1").asks, "Requirements for establishing, implementing, maintaining and continually improving an AI management system in an organisation.");
});

test("no UNVERIFIED anchor is written, and only P or P* anchors are featured (spec §5.3 rules 1–3)", () => {
  for (const { file, a } of everyAnchor()) {
    assert.notEqual(a.checkLevel, "UNVERIFIED", `${file}/${a.id}`);
    if (a.featured) assert.ok(FEATURABLE_LEVELS.includes(a.checkLevel), `${file}/${a.id} is featured at ${a.checkLevel}`);
  }
});

test("dates: asAt, lastReviewed and reviewBy are days; statusDate is a day, or the month a source gives (a year only on data-only anchors); reviewBy follows the r4 §5.5 watch list", () => {
  for (const [file] of covered()) {
    for (const a of raw(file).anchors) {
      for (const k of ["asAt", "lastReviewed", "reviewBy"]) if (a[k] !== undefined) assert.match(a[k], /^\d{4}-\d{2}-\d{2}$/, `${file}/${a.id}.${k}`);
      if (a.statusDate !== undefined) assert.match(a.statusDate, a.featured ? /^\d{4}-\d{2}(?:-\d{2})?$/ : /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/, `${file}/${a.id}.statusDate`);
    }
  }
  for (const { file, a } of everyAnchor()) {
    assert.ok(a.asAt <= a.lastReviewed, `${file}/${a.id}: asAt is after lastReviewed`);
    if (a.reviewBy) assert.ok(a.reviewBy > a.lastReviewed, `${file}/${a.id}: reviewBy isn't after lastReviewed`);
  }
  for (const [id, want] of Object.entries(INDUSTRIES)) assert.deepEqual(reviewDates(parsed(id).anchors), want.reviewBy, `${id}: review dates`);
});

test("every anchor names at least one solution, and each exists", () => {
  for (const { file, a } of everyAnchor()) {
    assert.ok(a.solutions.length > 0, `${file}/${a.id}: no solution`);
    for (const s of a.solutions) assert.ok(SOLUTION_IDS.has(s), `${file}/${a.id}: no solution "${s}"`);
  }
});

test("copy gates: no check 04 phrase (FAIL or WARN), S1 string or blocked fact in any field a person reads (spec §1, §4.6, §5.2, §5.3)", () => {
  const out = [];
  for (const { file, a } of everyAnchor()) {
    for (const k of TEXT_FIELDS) {
      const t = normalizeQuotes(a[k]);
      const r = result();
      scan(t, `src/data/anchors/${file}.json`, [], r, { phrases: [...FAIL_PHRASES, ...WARN_PHRASES] });
      out.push(...r.errors.map((e) => `${file}/${a.id}.${k}: ${e}`));
      if (S1.test(t)) out.push(`${file}/${a.id}.${k}: an S1 string`);
      for (const [label, re] of BLOCKED) if (re.test(t)) out.push(`${file}/${a.id}.${k}: ${label}`);
      if (/\bFATF\b/.test(a.name) && MONTH.test(t)) out.push(`${file}/${a.id}.${k}: a FATF amendment month (correction 4)`);
    }
  }
  assert.deepEqual(out, []);
});

test("EU AI Act dates print as 'from <date> (as amended in July 2026)', never abbreviated in prose (spec §5.2)", () => {
  for (const { file, a } of everyAnchor()) {
    for (const k of TEXT_FIELDS) {
      for (const m of a[k].matchAll(AMENDED_DATES)) {
        assert.equal(a[k].slice(m.index - 5, m.index), "from ", `${file}/${a.id}.${k}: "${m[0]}" without "from"`);
        assert.ok(a[k].startsWith(" (as amended in July 2026)", m.index + m[0].length), `${file}/${a.id}.${k}: "${m[0]}" without "(as amended in July 2026)"`);
      }
      assert.doesNotMatch(a[k], /\b\d{1,2} (?:Dec|Aug) 20(?:26|27|28|30)\b/, `${file}/${a.id}.${k}: a short EU AI Act date in prose`);
    }
  }
});

test("evidence names an artefact we produce, never a conformity claim (spec §5.3)", () => {
  for (const { file, a } of everyAnchor()) {
    assert.doesNotMatch(a.evidence, /\b(?:compl(?:y|ies|iant|iance)|meets?|satisf\w*|ensures?|conform\w*|certif\w*|aligned|guarantee\w*)\b/i, `${file}/${a.id}`);
  }
});

test("each industry: its shared row, Appendix A's featured and data-only sets, 2–3 sector chips, 6–8 chips in all, and no id twice (spec §5.2, Appendix A; contract §1.1)", () => {
  for (const [id, want] of Object.entries(INDUSTRIES)) {
    const f = parsed(id);
    assert.deepEqual(f.shared, want.shared, `${id}: shared row`);
    assert.ok([BASE_ROW, GDPR_ROW].some((row) => row.join() === f.shared.join()), `${id}: the shared row is neither of §5.2's two rows`);
    for (const s of f.shared) assert.ok(sharedById.get(s)?.featured, `${id}: ${s} isn't a featured shared anchor`);
    assert.deepEqual(f.anchors.filter((a) => a.featured).map((a) => a.id), want.featured, `${id}: featured`);
    assert.deepEqual(f.anchors.filter((a) => !a.featured).map((a) => a.id), want.dataOnly, `${id}: data only`);
    assert.ok(want.featured.length >= 2 && want.featured.length <= 3, `${id}: ${want.featured.length} sector chips`);
    const chips = f.shared.length + want.featured.length;
    assert.ok(chips >= 6 && chips <= 8, `${id}: ${chips} chips`);
    const ids = [...f.shared, ...f.anchors.map((a) => a.id)];
    assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), [], `${id}: an id twice on the page`);
    for (const a of f.anchors) assert.doesNotMatch(a.id, /^x\d+$/, `${id}: ${a.id} looks like a shared id`);
  }
});

test("each industry's chips: the kind label first, the approved text, no national body (D10), and room for a 140-word paragraph in the 280-word block (spec §5.2)", () => {
  const fixed = words(RULES_HEADING) + words(RULES_SHARED_LABEL) + words(RULES_CLOSING);
  for (const [id, want] of Object.entries(INDUSTRIES)) {
    const f = parsed(id);
    const anchors = [...f.shared.map((s) => sharedById.get(s)), ...f.anchors.filter((a) => a.featured)];
    for (const a of anchors) {
      assert.ok(anchorChipLabel(a).startsWith(`${ANCHOR_KIND_LABEL[a.kind]} · `), `${id}/${a.id}: kind label`);
      assert.doesNotMatch(a.name, NATIONAL_BODIES, `${id}/${a.id}: names a national body (D10)`);
    }
    assert.deepEqual(anchors.map(chipText), [...f.shared.map((s) => SHARED_CHIPS[s]), ...want.chips], `${id}: chips`);
    const chipWords = anchors.reduce((n, a) => n + words(chipText(a)), 0);
    assert.ok(fixed + chipWords + 140 <= 280, `${id}: the heading, row label, chips (${chipWords} words) and closing leave ${280 - fixed - chipWords} words for the paragraph`);
  }
});

test("the §5.2 rewrites and §5.3 corrections hold in each industry's data", () => {
  for (const [id, want] of Object.entries(INDUSTRIES)) {
    const byId = new Map(parsed(id).anchors.map((a) => [a.id, a]));
    for (const [anchorId, field, expected] of want.pins) {
      const value = byId.get(anchorId)?.[field];
      assert.equal(typeof value, "string", `${id}/${anchorId}.${field}`);
      if (expected instanceof RegExp) assert.match(value, expected, `${id}/${anchorId}.${field}`);
      else assert.equal(value, expected, `${id}/${anchorId}.${field}`);
    }
  }
});

test("an id on more than one page names the same instrument with the same data (contract §1.1)", () => {
  const seen = new Map();
  for (const id of Object.keys(INDUSTRIES)) {
    for (const a of raw(id).anchors) {
      const json = JSON.stringify(a);
      if (!seen.has(a.id)) seen.set(a.id, { file: id, json });
      else assert.equal(json, seen.get(a.id).json, `${a.id}: ${id}.json differs from ${seen.get(a.id).file}.json`);
    }
  }
});

test("the industry route fails the build on a missing anchors file instead of an empty fallback (contract §3)", () => {
  const route = readText(join(ROOT, "src/pages/industries/[id].astro"));
  assert.doesNotMatch(route, /\?\?\s*\{\s*anchors:\s*\[\]\s*\}/, "a transitional fallback is left");
  assert.ok(route.includes("throw new Error(`${path}: src/data/anchors/shared.json does not exist`)"), "no throw for shared.json");
  assert.ok(route.includes("throw new Error(`${path}: src/data/anchors/${entry.id}.json does not exist`)"), "no throw for the industry's file");
  assert.doesNotMatch(route, /its rows are empty|makes a missing file a build error/, "the header comment still describes the transitional fallback");
});

test("each industry page renders its chips from the data: the shared row, then the sector row, each chip linking to its primary source (contract §3)", () => {
  for (const id of INDUSTRY_IDS) {
    const [block] = elements(readDist(`industries/${id}/index.html`), (t) => t.attrs.id === "rules-that-travel");
    assert.ok(block, `${id}: no #rules-that-travel`);
    const rows = elementsWith(block.inner, "data-anchor-row");
    assert.deepEqual(rows.map((r) => r.attrs["data-anchor-row"]), ["shared", "sector"], `${id}: rows`);
    const f = parsed(id);
    const want = {
      shared: f.shared.map((s) => sharedById.get(s)),
      sector: f.anchors.filter((a) => a.featured),
    };
    for (const row of rows) {
      const scope = row.attrs["data-anchor-row"];
      const got = elementsWith(row.inner, "data-anchor-scope").map((chip) => {
        const [name] = elementsWith(chip.inner, "data-anchor-name");
        const [label] = elementsWith(chip.inner, "data-anchor-label");
        return [chip.name, chip.attrs["data-anchor-scope"], chip.attrs["data-anchor-id"], chip.attrs.href, visibleText(name.inner).trim(), visibleText(label.inner).trim()];
      });
      assert.deepEqual(got, want[scope].map((a) => ["a", scope, a.id, a.source, a.name, anchorChipLabel(a)]), `${id}: ${scope} row`);
    }
  }
});
