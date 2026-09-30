// What the built site says, checked against the research's limits (spec §3.3–§3.5, §9.5; Phase C
// Review Focus 3 and 5). The text read is every built page outside the /preview/ gallery, in both
// builds, with its title and meta description, plus each build's RSS feed.
// - KEEP_OFF: statements the research couldn't verify, or found wrong. In neither build.
// - HELD: facts that wait on a dated re-check or a review, and the regulatory rows that carry them.
//   Not in production. A planned page, such as a kit waiting for its review, may carry them in the
//   preview build. The commit that re-verifies one removes its ⚑ and its entry here.
// - Works alongside: no industry page lists a system whose access path the research couldn't verify.
// - Spec §3.4 vocabulary: no "agent(s)" or "agentic" on the mid-market pages, beyond the professions
//   and statutes named after agents and ④'s package name (never on Manufacturing, ruling 8); no
//   "sprint" beyond the Feasibility Sprint, which never appears on a mid-market page; no "APRA
//   audit"; "tenancy" only in the property phrases TENANCY allows, never for a cloud account.
// - The proper names and seeded phrases src/data/banned-phrase-exceptions.json lets through, each
//   once for src/ and once for the built pages, and every occurrence excepted. "accredited" is
//   excepted only where it names the tester a client engages.
// Run `npm run build && npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  covers, decodeEntities, elements, elementsWith, excepted, findAll, htmlFiles, idsIn, listFiles, loadExceptions,
  normalizeQuotes, phraseRegExp, readJson, readText, relPath, result, visibleText,
} from "../scripts/ci/lib.mjs";
import { EXCEPTIONS_FILE, FAIL_PHRASES, WARN_PHRASES, scan, sourceFiles, xmlText } from "../scripts/ci/checks/04-banned-phrases.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SECTION_PHRASES = [...FAIL_PHRASES, ...WARN_PHRASES];

/** The URL path a built file is served at: "industries/x/index.html" → "/industries/x/". */
const urlOf = (rel) => `/${rel.replace(/(^|\/)index\.html$/, "$1")}`;
const metaDescription = (html) => decodeEntities(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");

/**
 * Every page of a build outside the gallery, plus its RSS feed: { build, rel, url, html, visible, text }.
 * `visible` is what check 04 reads (a page's visible text); `text` adds the meta description.
 */
function readBuild(build) {
  const dir = join(ROOT, build);
  const pages = htmlFiles(dir)
    .map((file) => ({ build, rel: relPath(dir, file), html: readText(file) }))
    .filter((p) => !p.rel.startsWith("preview/"))
    .map((p) => {
      const visible = normalizeQuotes(visibleText(p.html));
      return { ...p, url: urlOf(p.rel), visible, text: `${visible} ${normalizeQuotes(metaDescription(p.html))}` };
    });
  const rss = join(dir, "rss.xml");
  if (existsSync(rss)) {
    const feed = normalizeQuotes(xmlText(readText(rss)));
    pages.push({ build, rel: "rss.xml", url: "/rss.xml", html: "", visible: feed, text: feed });
  }
  return pages;
}
const PRODUCTION = readBuild("dist");
const EVERYWHERE = [...PRODUCTION, ...readBuild("dist-preview")];
const page = (url) => PRODUCTION.find((p) => p.url === url);

/**
 * A statement kept off the site. `re` (global) finds it; `allow` lists the phrases, on one page or
 * on any, where the same words say something else.
 * @param {string} label @param {RegExp} re @param {string} why
 * @param {{ phrase: string, url?: string }[]} [allow]
 */
const rule = (label, re, why, allow = []) => ({ label, re, why, allow });

/** One message per hit of `rules` in `texts` that no allowance covers. */
function findings(rules, texts) {
  const out = [];
  for (const t of texts) {
    for (const r of rules) {
      for (const hit of findAll(t.text, r.re)) {
        const allowed = r.allow.some((a) => (a.url === undefined || a.url === t.url) && covers(t.text, hit.start, hit.end, a.phrase));
        if (!allowed) out.push(`${t.build}/${t.rel}: ${r.label} ("${hit.match}"): ${r.why}`);
      }
    }
  }
  return out;
}
/** The rules' findings in one sentence, as the unit checks of the matchers need it. */
const sample = (rules, text, url = "/sample/") => findings(rules, [{ build: "sample", rel: "sample", url, text: normalizeQuotes(text) }]);

// Never published (research index "Still unverified: keep off the site", verify-register "Keep out").
const KEEP_OFF = [
  rule("AI6", /\bAI6\b/g, "the National AI Centre's guidance is called Guidance for AI Adoption (verify-register §1)"),
  rule("replaces the VAISS", /\breplac(?:es|ed|ing)\s+(?:the\s+)?(?:VAISS|Voluntary AI Safety Standard)\b/gi,
    "the guidance evolves the VAISS; it doesn't replace it (verify-register §1)"),
  rule("IRAP", /\bIRAP\b/g, "no IRAP claim, and the Government FAQ that answered it is omitted (spec §3.4; ruling 2)",
    [{ url: "/insights/sovereign-llm-hosting-decision-matrix/", phrase: "IRAP-heavy" }]),
  rule("APES 320 as a requirement", /\bAPES\s?320\b[^.]{0,80}?\b(?:requires?|required|needs?|mandates?|must)\b/gi,
    "APES 320 sets no AI-policy requirement (verify-register §3)"),
  rule("an APES 110 breach", /\bAPES\s?110\b[^.]{0,80}?\bbreach\w*|\bbreach\w*\s+(?:of\s+)?APES\s?110\b/gi,
    "no source says public AI use breaches APES 110 (verify-register §3)"),
  rule("XeroForce as generally available",
    /\bXeroForce\b[^.]{0,120}?\b(?:generally available|general availability|general release|GA|later this year)\b|\b(?:generally available|general availability|general release)\b[^.]{0,120}?\bXeroForce\b/gi,
    "XeroForce is in early access: never called generally available, never dated (ruling 11; verify-register §16)",
    [{ phrase: "XeroForce (when generally available)" }]),
  rule("GPN-AI as a notice to the profession", /\bnotice to (?:the )?profession\b/gi, "GPN-AI is a practice note (verify-register §2)"),
  rule("the OAIC's 'adopted in 2025'", /\badopted in 2025\b/gi, "unverified (research index)"),
  rule("the Victorian AI Assurance Framework mapped or renamed",
    /\bmapped to\b[^.]{0,80}?\bVictorian (?:Government(?:'s)? )?AI Assurance Framework\b|\bformerly (?:the )?(?:NSW )?AI Assurance Framework\b/gi,
    "its text isn't public, and the NSW former name is on no current page (verify-register §8; demo-corpora)"),
  rule("the superseded IS18 name", /\bIS18:2018\b|\bInformation security policy \(IS18/gi,
    "the current name is Information and cyber security policy (IS18) (verify-register §10c)"),
  rule("a vendor's 'no additional cost'", /\bno additional cost\b/gi, "no vendor pricing wording (D4)"),
  rule("the AI Adopt Centres as free", /\bAI Adopt Centres?\b[^.]{0,80}?\bfree\b|\bfree\b[^.]{0,40}?\bAI Adopt Centres?\b/gi,
    "government-funded, never free (ruling 8)"),
  rule("a First AML gap or speed claim", /\bFirst AML\b[^.]{0,80}?\b(?:can't|cannot|doesn't|does not|won't|lacks?|misses)\b|\b(?:sixty|60) seconds\b/gi,
    "First AML's document reader does read trust deeds (verify-register §17)"),
  rule("unverified council figures", /\b90 councils\b|\b10\s?(?:%|per ?cent\b)[^.]{0,40}?\binventor/gi,
    "the Audit Office's figures are 11% and fewer than half (verify-register §5)"),
  rule("AUSTRAC's '80–90k'", /\b80\s?[–-]\s?90\s?(?:k|,?000)\b/gi, "the range is around 19,000 to close to 100,000 (research index)"),
  rule("an unverified budget or funding item",
    /\$\s?38\.7\s?m|\bHeidi\b[^.]{0,60}?\b(?:raised?|raising|funding round|Series [A-Z])\b|\$\s?10\s?m\b[^.]{0,40}?\bAI uplift\b|\bIndustry Growth Program\b[^.]{0,40}?\bclos\w*/gi,
    "unverified, and funding news is never a hook (spec §3.3; research index)"),
  rule("unverified vendor and adoption claims", /\bFactory AI\b|\bMind the Bridge\b|\bRio Tinto\b|\btrusted,? cited answers\b|\bmost capable and reliable\b/g,
    "unverified, or a vendor superlative (research index; verify-register §15)"),
  rule("a law firm's phrase", /\bregulatory[\s-]led approach\b/gi, "not a source (research index)"),
  rule("a property-manager shortage", /\bshortage of property managers\b|\bproperty[\s-]manager shortages?\b/gi,
    "Jobs and Skills Australia finds no national shortage (research index)"),
  rule("OVIC's PIA per use for councils", /\b(?:PIA|privacy impact assessment)s? (?:for each|per|for every) (?:AI )?use\b/gi,
    "unverified for councils (government dossier; research index D22)"),
  rule("the NSW end-of-tenancy survey", /\bend[\s-]of[\s-]tenancy survey\b/gi, "its start date is disputed (real-estate dossier)"),
  rule("the NSW Digital Assurance Framework threshold", /\bDigital Assurance Framework\b/gi,
    "its $5m threshold reads as offer-sizing (D4), and no page needs the framework (demo-corpora §2.1 item 7)"),
  rule("the Children's Online Privacy Code's start or contents",
    /\bChildren's Online Privacy Code\b[^.]{0,80}?\b(?:commences?|starts?|takes effect|in force|requires?)\b/gi,
    "only its registration deadline is known (verify-register)"),
  rule("the NSW rental-privacy law as in force",
    /\bResidential Tenancies \(Protection of Personal Information\) Amendment\b[^.]{0,80}?(?<!\bexpect(?:s|ed)? (?:it |them |the (?:new )?laws? )?to |\bnot (?:yet )?|n't (?:yet )?)\b(?:in force|commence[sd]?|take[sn]? effect|took effect|applies from|penalt\w*)\b/gi,
    "passed, not commenced: a watch note only, with the Government's expected start attributed to it (verify-register §4)"),
  rule("the NSW rental law's penalty figures", /\$\s?(?:11,000|22,000|49,500)\b/g, "penalty figures are never a hook (spec §3.3; verify-register §4)"),
  rule("the NSW Digital Work Systems Act as in force",
    /\bDigital Work Systems\b[^.]{0,80}?(?<!\bnot (?:yet )?|n't (?:yet )?)\b(?:in force|commenced)\b/gi,
    "assented, not commenced (manufacturing dossier; ruling 8)"),
  rule("the National Credit Code 'hardship' claim", /\buse the word ['"“‘]?hardship\b/gi, "s 72 wasn't read (financial-services dossier)"),
  rule("AU-hosted LEAP AI", /\b(?:AU|Australian)[\s-]hosted LEAP\b|\bLEAP(?:'s)? AI\b[^.]{0,40}?\bhosted in Australia\b/gi,
    "LEAP says some AI features may send limited client data to the US (platform-ai)"),
  rule("Copilot processing in Australia",
    /(?<!\bassume (?:that )?(?:Microsoft )?)\bCopilot\b[^.]{0,80}?(?<!\bnot |n't |\bnever )\b(?:processe[sd]|runs|hosted|inferenc\w*)\b[^.]{0,40}?\bin (?:Australia|an Australian region)\b/gi,
    "Microsoft says only that in-country inferencing for Microsoft 365 Copilot is expected in Australia by the end of 2026 (platform-ai)"),
  rule("the removed Smokeball quote", /\bdirect access to (?:the )?production\b/gi, "not on Smokeball's pages (legal dossier)"),
  rule("Gemini Gems", /\bGemini Gems?\b/g, "grounding in school documents is unverified (education dossier)"),
  rule("agents in SharePoint on school licences", /\bagents in SharePoint\b[^.]{0,80}?\b(?:A1|A3|A5|A-licen[cs]es?|education licen[cs]es?)\b/gi,
    "unverified on education licences (education dossier)"),
  rule("Sales Order Agent", /\bSales Order Agent\b/gi, "its Australian availability is unverified (ruling 8)"),
  // The claim, not the role: the verified nsw-agency-agreements row sends gaps to "the licensee in charge".
  rule("the NSW licensee-in-charge claim",
    /\bonly (?:a |the )?licensee[\s-]in[\s-]charge\b[^.]{0,60}?\bauthori[sz]e|\blicensee[\s-]in[\s-]charge\b[^.]{0,40}?\b(?:alone|only)\b[^.]{0,40}?\bauthori[sz]e|\bLIC[\s-]only\b/gi,
    "no section number was read, so FAQ 2's sentence stays out (real-estate dossier)"),
  rule("the TGA adopting PE 009-18", /\bTGA\b[^.]{0,60}?\badopt\w*\b[^.]{0,40}?\bPE\s?009[\s-]18\b/gi, "unverified (manufacturing dossier)"),
  rule("RTO or ASQA obligations", /\bASQA\b|\bRTOs\b|\bregistered training organisations?\b/gi, "no ASQA row is verified, so RTOs are out of the buyer framing (ruling 5)"),
];

// Not in production until re-checked (research index "Hold until re-checked"; rulings 1, 6, 7, 9).
const HELD = [
  rule("APP 1.7–1.9", /\bAPPs?\s?1\.[789]\b|\bAustralian Privacy Principles?\s1\.[789]\b/g, "held until the OAIC's ADM guidance is re-read (ruling 1)"),
  rule("GPN-AI", /\bGPN[\s-]?AI\b/gi, "held until the Federal Court's page is re-checked (rulings 1 and 7)"),
  rule("the NSW Health AI Framework", /\bNSW Health(?:'s)?\b[^.]{0,40}?\bAI Framework\b/gi, "held until its page is re-checked (rulings 1 and 6)"),
  rule("the TPB record-keeping row", /\bcorrectly record the tax agent services\b/gi, "held until ss 30 and 40 are re-read (ruling 1)"),
  rule("the PropertyMe Connector", /\bPropertyMe(?:'s)?\s+(?:MCP\s+)?Connector\b/gi, "held (ruling 9)"),
  rule("Vic RTA s 505BD", /\b505BD\b/g, "held (ruling 9)"),
];
const HELD_ROWS = [
  "cth-app-1-adm-transparency", "privacy-adm-transparency", "app-1-7-automated-decisions", "app-automated-decisions",
  "fca-gpn-ai", "nsw-health-ai-framework", "tpb-verify-and-document", "epbc-approval-conditions", "nsw-digital-work-systems",
];

// Works alongside: by industry page, the systems whose access path the research couldn't verify
// (research index "Vendor and platform claims"), and those a dossier dropped because it found no
// public API or export documentation. Cliniko and Halaxy aren't here: the healthcare fact-check
// confirmed their read endpoints, and only a restricted role or read-only scope is unverified, which
// the page doesn't claim. PIE is: whether a contractor may use it is open (index D21).
const UNVERIFIED_SYSTEMS = {
  accounting: /\bGoogle Drive\b|\bClass\b|\bNowInfinity\b|\bBGL\b/,
  education: /\bChatGPT Edu\b|\bSchoolbox\b|\bCompliSpace\b|\bSynergetic\b/,
  "financial-services": /\bProtecht\b|\bCamms\b|\bServiceNow\b/,
  government: /\bGovAI Chat\b|\bQChat\b|\bTechnologyOne\b|\bOneCouncil\b|\bObjective\b/,
  healthcare: /\bPIE\b|\bPractitioner Information Exchange\b|\bBest Practice\b|\bBp Premier\b|\bMedicalDirector\b/,
  "legal-and-professional": /\bLEAP\b/,
  manufacturing: /\bNintex\b|\bPromapp\b|\bMEX\b|\bPronto\b/,
  "real-estate": /\bRex\b|\bReapit\b|\bConsole Cloud\b|\bMRI\b|\bProperty Tree\b/,
  "resources-and-energy": /\bSAP\b|\bAVEVA\b/,
};

// Spec §3.4. The mid-market pages: the accounting, education, manufacturing and real-estate
// industry pages, the solutions whose every package is for mid-market buyers (①, ③ and ⑤), the
// ① and ③ demo pages, and the checker's own page (final review D6-M5). The checker quotes vendors'
// own feature names, such as "Agents in Copilot Chat", which spec §3.4 lets a page name as systems a
// client runs: CHECKER_FEATURES allows those four phrases there, and nowhere else, so the checker's
// own copy still can't say "agent".
const CHECKER = "/resources/what-you-already-pay-for/";
const MID_MARKET = [
  "/industries/accounting/", "/industries/education/", "/industries/manufacturing/", "/industries/real-estate/",
  "/solutions/document-registers/", "/solutions/draft-for-approval/", "/solutions/ai-switch-on/",
  "/demos/document-registers/", "/demos/draft-for-approval/", CHECKER,
];
/** The vendors' own feature wording the checker quotes from src/data/platform-ai.json (Microsoft, MYOB, Zoom). */
const CHECKER_FEATURES = ["Agents in Copilot Chat", "advanced agent experiences", "AI agents and features", "custom agent builder"];
// No vendor "agent" product is allowed on these pages. None needs one: Tasks 3 and 5 write
// "SharePoint's built-in AI", ruling 8 allows no "agent" naming on Manufacturing, and agents in
// SharePoint on school licences are unverified (research index, education). A page that later names
// a system a client runs (spec §3.4) adds that phrase here with its url, never Manufacturing's.
const MANUFACTURING = "/industries/manufacturing/";
const AGENT = rule("agent", /\bagent(?:s|ic)?\b/gi, "name the job, not an agent, on a mid-market page (spec §3.4; ruling 8)", [
  // ④'s package name (spec §4.1 import rule 4), wherever ④ is offered, except Manufacturing (ruling 8).
  ...MID_MARKET.filter((url) => url !== MANUFACTURING).map((url) => ({ phrase: "Agentic AI Control Evaluation", url })),
  // The vendor feature names the checker quotes, on the checker's page only.
  ...CHECKER_FEATURES.map((phrase) => ({ phrase, url: CHECKER })),
  // Professions, and the statutes named after them.
  ...[
    "tax agent", "tax agents", "Tax Agent Services", "BAS agent", "BAS agents", "estate agent", "estate agents", "real estate agent",
    "real estate agents", "property agent", "property agents", "managing agent", "managing agents", "Property and Stock Agents",
    "Estate Agents", "Agents Financial Administration",
  ].map((phrase) => ({ phrase })),
]);
const SPRINT = rule("sprint", /\bsprints?\b/gi, "say Two-Week Trial on Your Own Files; the Feasibility Sprint is the government and enterprise offer (spec §3.4)",
  ["Feasibility Sprint", "Feasibility Sprints"].map((phrase) => ({ phrase })));
const FEASIBILITY_SPRINT = rule("Feasibility Sprint", /\bFeasibility Sprints?\b/gi, "mid-market pages offer the Two-Week Trial on Your Own Files (spec §3.4, §4.2)");
const APRA_AUDIT = rule("APRA audit", /\bAPRA[\s-]+audit(?:s|ed|ing|ors?)?\b/gi, "APRA supervises; say APRA scrutiny or prudential review (spec §3.4)");
// Every "tenancy" fails except in the property phrases allowed here (Review Focus 5; spec §3.4:
// "tenancy" for a cloud account clashes with its property sense). So do a cloud tenant, and single-
// or multi-tenant. A property phrase a page needs goes in the allowance, with a sample in the first test.
const TENANCY = rule("tenancy outside its property sense",
  /\btenanc(?:y|ies)\b|\b(?:Microsoft(?: 365)?|M365|Office 365|Azure|Entra|AWS|Google(?: Workspace)?|cloud|SaaS)\s+tenants?\b|\b(?:single|multi)[\s-]tenants?\b/gi,
  "keep 'tenancy' for property; for a cloud account say your own Microsoft or AWS account (spec §3.4)",
  ["Residential Tenancies", "residential tenancy", "tenancy agreement", "end of a tenancy", "end of the tenancy", "tenancy law"].map((phrase) => ({ phrase })));

/** A mid-market page's <main> text, without its dated regulatory rows, which use their instruments' own words. */
function mainWithoutRegulatoryRows(html) {
  let main = elements(html, (t) => t.name === "main")[0]?.inner ?? "";
  for (const row of elementsWith(main, "data-regulatory-row")) main = main.replace(row.outer, " ");
  return normalizeQuotes(visibleText(main));
}

// The proper names and seeded phrases (spec §3.5) that hold a banned or watched phrase, and that
// banned-phrase-exceptions.json lets through. "CREST-accredited" goes through only inside import
// rule 5's wording (spec §4.1), in the two forms the pages use, so "we are CREST-accredited" still fails.
const PROPER_NAMES = [
  "Victorian Government AI Assurance Framework", "not an assurance opinion",
  "CREST-accredited tester you engage", "CREST-accredited tester the client engages",
];

test("the matchers catch what they're for, and pass the wording the research allows", () => {
  for (const [text, label] of [
    ["The AI6 practices apply.", "AI6"],
    ["It replaces the Voluntary AI Safety Standard.", "replaces the VAISS"],
    ["We are IRAP assessed.", "IRAP"],
    ["APES 320 now requires a written AI policy.", "APES 320 as a requirement"],
    ["XeroForce is now generally available.", "XeroForce as generally available"],
    ["XeroForce reaches general release later this year.", "XeroForce as generally available"],
    ["GPN-AI is a notice to the profession.", "GPN-AI as a notice to the profession"],
    ["The AI Adopt Centres offer free help.", "the AI Adopt Centres as free"],
    ["First AML can't read trust deeds.", "a First AML gap or speed claim"],
    ["The NSW Digital Work Systems amendment is now in force.", "the NSW Digital Work Systems Act as in force"],
    ["Business Central's Sales Order Agent drafts quotes.", "Sales Order Agent"],
    ["We support RTOs.", "RTO or ASQA obligations"],
    ["Only 10% of councils keep an AI inventory.", "unverified council figures"],
    ["Some 80–90k businesses are covered.", "AUSTRAC's '80–90k'"],
    ["The Residential Tenancies (Protection of Personal Information) Amendment Act commences on 1 March 2027.", "the NSW rental-privacy law as in force"],
    ["Agents face fines of up to $22,000.", "the NSW rental law's penalty figures"],
    ["Only a licensee in charge may authorise trust account withdrawals.", "the NSW licensee-in-charge claim"],
    ["Microsoft Copilot processes your prompts in Australia.", "Copilot processing in Australia"],
    ["OVIC expects councils to run a PIA for each AI use.", "OVIC's PIA per use for councils"],
  ]) {
    assert.ok(sample(KEEP_OFF, text).some((f) => f.includes(`: ${label} (`)), `"${text}" isn't caught as ${label}`);
  }
  for (const text of [
    "Guidance for AI Adoption (National AI Centre, 21 Oct 2025) evolves the VAISS.",
    "APES 320 ¶4.31 lists matters a firm may consider.",
    "XeroForce (when generally available), Karbon AI or Copilot Studio.",
    "XeroForce, Xero's natural-language automation builder, is in early access.",
    "The Information and cyber security policy (IS18) v10.0.0 applies.",
    "The government-funded AI Adopt Centres can help.",
    "First AML's document reader already reads trust deeds; use it first.",
    "The NSW Digital Work Systems amendment has not yet commenced.",
    "The OAIC must register the Children's Online Privacy Code by 10 December 2026.",
    "Free resources from Techsider for Australian teams.",
    "Most factory AI pilots stall before the floor.",
    // verify-register §4's watch-note wording, and the real-estate post's.
    "The Residential Tenancies (Protection of Personal Information) Amendment Bill 2025 passed on 24 Sep 2026; the Government expects it to commence in early 2027.",
    // The verified nsw-agency-agreements row's design.
    "Signature, date and service fields link to their page, and gaps go to the licensee in charge.",
    // platform-ai's Microsoft facts, as the platform guide puts them.
    "Customers outside the EU may have their Copilot queries processed in the US, EU or other regions. Don't assume Copilot processes Australian prompts in Australia.",
    // The verified local-vic-ovic-genai row.
    "Its enterprise gen-AI guidance expects a privacy impact assessment for each function or business unit.",
  ]) {
    assert.deepEqual(sample(KEEP_OFF, text), [], `"${text}" is flagged`);
  }
  assert.deepEqual(sample(KEEP_OFF, "Strict isolation / IRAP-heavy", "/insights/sovereign-llm-hosting-decision-matrix/"), []);
  assert.equal(sample(KEEP_OFF, "Strict isolation / IRAP-heavy", "/insights/another-post/").length, 1, "IRAP-heavy is allowed off its post");
  for (const text of ["APP 1.7 applies from 10 December 2026.", "APPs 1.8 and 1.9", "Australian Privacy Principle 1.7", "Federal Court GPN-AI", "the PropertyMe Connector", "s 505BD"]) {
    assert.equal(sample(HELD, text).length, 1, `"${text}" isn't held`);
  }
  for (const text of [
    "in your own Microsoft 365 tenancy", "your Azure tenancy", "in your tenancy", "an Australian-region tenancy", "the client's own tenancy",
    "your M365 tenant", "tenancy-level settings", "a multi-tenancy platform", "a single-tenant deployment", "Run the tenancy.", "your tenancies",
  ]) {
    assert.equal(sample([TENANCY], text).length, 1, `"${text}" isn't caught`);
  }
  for (const text of [
    "at the end of a tenancy", "Residential Tenancies Act 1997 (Vic)", "the Residential Tenancies and Rooming Accommodation Act 2008",
    "tenancy agreements that commenced on or after 1 May 2025", "your tenancy agreements", "state tenancy-law questions",
    "a residential tenancy database", "Tenant data deleted on your schedule.", "the tenant's refund application",
  ]) {
    assert.deepEqual(sample([TENANCY], text), [], `"${text}" is flagged`);
  }
  assert.deepEqual(sample([AGENT], "Tax Agent Services Act 2009; registered tax and BAS agents; the Property and Stock Agents Act 2002; an estate agent's trust records", "/industries/accounting/"), []);
  assert.equal(sample([AGENT], "Our AI agents draft your replies. Agentic automation.", "/industries/accounting/").length, 2);
  assert.equal(sample([AGENT], "Try agents in SharePoint first.", "/industries/education/").length, 1, "a vendor agent product is allowed on a mid-market page");
  assert.deepEqual(sample([AGENT], "Agentic AI Control Evaluation", "/industries/education/"), []);
  // The checker's page quotes four vendor feature names (D6-M5); its own copy still can't say "agent".
  const quoted = "Agents in Copilot Chat that answer; advanced agent experiences; the 'AI agents and features' heading; a custom agent builder.";
  assert.deepEqual(sample([AGENT], quoted, CHECKER), []);
  assert.equal(sample([AGENT], quoted, "/industries/accounting/").length, 4, "a vendor feature name is allowed off the checker's page");
  assert.equal(sample([AGENT], "If a job is still left over, our AI agents may cover it.", CHECKER).length, 1);
  assert.equal(sample([AGENT], "Agentic AI Control Evaluation", MANUFACTURING).length, 1, "ruling 8: no agent naming on Manufacturing");
  assert.deepEqual(sample([SPRINT], "Start with a Feasibility Sprint on public or synthetic data."), []);
  assert.equal(sample([SPRINT], "A two-week sprint on your files.").length, 1);
  assert.equal(sample([APRA_AUDIT], "RAG that survives an APRA audit; APRA-audited.").length, 2);
});

test("the sweep reads both builds and their feeds", () => {
  for (const build of ["dist", "dist-preview"]) {
    const pages = EVERYWHERE.filter((p) => p.build === build);
    assert.ok(pages.some((p) => p.url === "/") && pages.some((p) => p.url === "/rss.xml"), `${build}: run both builds first`);
  }
  for (const url of MID_MARKET) assert.ok(page(url), `production has no ${url}`);
});

test("no keep-off statement is in either build (Review Focus 3)", () => {
  assert.deepEqual(findings(KEEP_OFF, EVERYWHERE), []);
});

test("no held statement is in production (Review Focus 3; ruling 1)", () => {
  assert.deepEqual(findings(HELD, PRODUCTION), []);
});

test("no held regulatory row is in the data, or anchored on a production page (ruling 1)", () => {
  const files = listFiles(join(ROOT, "src/data/regulatory"), (rel) => rel.endsWith(".json"));
  assert.equal(files.length, 9, "src/data/regulatory/ doesn't hold the nine industries' rows");
  const inData = files.flatMap((file) => readJson(file).rows.filter((r) => HELD_ROWS.includes(r.id)).map((r) => `${relPath(ROOT, file)}: ${r.id}`));
  assert.deepEqual(inData, []);
  const anchor = new RegExp(`^reg-(?:(?:commonwealth|state|local)-)?(?:${HELD_ROWS.join("|")})$`);
  const onPages = PRODUCTION.flatMap((p) => [...idsIn(p.html)].filter((id) => anchor.test(id)).map((id) => `${p.url}#${id}`));
  assert.deepEqual(onPages, []);
});

test("no industry page lists a system with an unverified access path under Works alongside (ruling 1)", () => {
  for (const [id, re] of Object.entries(UNVERIFIED_SYSTEMS)) {
    const p = page(`/industries/${id}/`);
    assert.ok(p, `production has no /industries/${id}/`);
    const rows = elements(p.html, (t) => "data-chip-row" in t.attrs && /(?:^|-)systems$/.test(t.attrs.id ?? ""));
    assert.ok(rows.length > 0, `/industries/${id}/ has no Works alongside row`);
    const listed = rows.map((r) => visibleText(r.inner)).join(" ");
    assert.equal(listed.match(re)?.[0], undefined, `/industries/${id}/ lists an unverified system under Works alongside`);
  }
});

test("the mid-market pages name jobs, not agents, and offer the Two-Week Trial, not a Feasibility Sprint (spec §3.4; Review Focus 5)", () => {
  const texts = MID_MARKET.map((url) => {
    const p = page(url);
    assert.ok(p, `production has no ${url}`);
    return { build: "dist", rel: url, url, text: mainWithoutRegulatoryRows(p.html) };
  });
  assert.deepEqual(findings([AGENT, FEASIBILITY_SPRINT], texts), []);
});

test("no 'sprint' beyond the Feasibility Sprint, no 'APRA audit' and no 'tenancy' outside its property sense, on any page of either build (spec §3.4; Review Focus 5)", () => {
  assert.deepEqual(findings([SPRINT, APRA_AUDIT, TENANCY], EVERYWHERE), []);
});

test("each proper name holds a phrase that checks 04 or 11 would report", () => {
  for (const name of PROPER_NAMES) {
    const r = result();
    scan(name, "dist/sample.html", [], r, { phrases: SECTION_PHRASES });
    assert.ok(r.errors.length > 0, `"${name}" holds no §3.5 phrase, so it needs no exception`);
  }
});

test("banned-phrase-exceptions.json lets each proper name through with one src/** entry, and one dist entry while production shows it", () => {
  const list = readJson(join(ROOT, EXCEPTIONS_FILE));
  for (const name of PROPER_NAMES) {
    const same = list.filter((e) => e.phrase.toLowerCase() === name.toLowerCase());
    // As the stale-exception test in tests/ci-checks-b.test.mjs reads it: the visible text of a production page.
    const shown = PRODUCTION.some((p) => p.html !== "" && phraseRegExp(name, { bounded: false }).test(p.visible));
    assert.deepEqual(same.map((e) => e.file).sort(), shown ? ["dist", "src/**"] : ["src/**"], `"${name}"`);
    const longer = list.filter((e) => e.phrase.toLowerCase() !== name.toLowerCase() && e.phrase.toLowerCase().includes(name.toLowerCase()));
    assert.deepEqual(longer, [], `"${name}": an entry repeats it inside a longer phrase, which the src/** and dist entries already cover`);
  }
  // Spec §4.1 import rule 5, §12 item 11: "accredited" names only the tester a client engages.
  const accredited = list.filter((e) => /accredited/i.test(e.phrase) && !PROPER_NAMES.some((n) => n.toLowerCase() === e.phrase.toLowerCase()));
  assert.deepEqual(accredited.map((e) => `${e.file}: ${e.phrase}`), [], "an exception lets 'accredited' through outside the tester wording");
  const reasons = list.filter((e) => /\bremoved in Phase C\b/.test(e.reason)).map((e) => `${e.file}: ${e.phrase}`);
  assert.deepEqual(reasons, [], "an exception's reason still says Phase C removes its section");
});

test("every occurrence of a proper name, in src/ and in both builds, is excepted", () => {
  const r = result();
  const exceptions = loadExceptions(ROOT, EXCEPTIONS_FILE, "phrase", r);
  assert.deepEqual(r.errors, []);
  const texts = [
    ...sourceFiles(ROOT).map((file) => ({ file: relPath(ROOT, file), text: normalizeQuotes(readText(file)) })),
    ...EVERYWHERE.map((p) => ({ file: `dist/${p.rel}`, text: p.visible, where: `${p.build}/${p.rel}` })),
  ];
  const open = [];
  for (const { file, text, where = file } of texts) {
    for (const name of PROPER_NAMES) {
      for (const occurrence of findAll(text, phraseRegExp(name, { bounded: false }))) {
        for (const p of SECTION_PHRASES) {
          for (const hit of findAll(text, p.re)) {
            if (hit.start < occurrence.start || hit.end > occurrence.end) continue;
            if (!excepted(exceptions, "phrase", file, text, hit.start, hit.end)) open.push(`${where}: "${hit.match}" in "${occurrence.match}"`);
          }
        }
      }
    }
  }
  assert.deepEqual(open, []);
  // The consolidated entries still stop a Techsider accreditation claim, in src/ and on a page.
  for (const file of ["src/data/sample.ts", "dist/sample/index.html"]) {
    const claim = result();
    scan("Techsider is CREST-accredited.", file, exceptions, claim);
    assert.ok(claim.errors.length > 0, `${file}: a bare "CREST-accredited" claim passes check 04`);
  }
});
