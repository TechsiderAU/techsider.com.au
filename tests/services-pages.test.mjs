// The live Services and Evaluation Partner pages (spec §8.6, §4.2–§4.6) and the data behind them:
// src/data/services.ts, which the solution, Trust and Home pages also read, and
// src/data/positioning.ts (spec §3.1–§3.2), which Home and About read. tests/content-data.test.mjs
// parses both with their schemas; this file pins what the schemas can't: the controller rulings
// on owner-held wording (sub-promise, team claims, contract commitments), the copy rules, and the
// two routes as both builds render them. tests/services-templates.test.mjs covers the templates
// themselves on the gallery fixtures. Run `npm run build && npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDist, readPreviewDist, visibleText } from "./helpers.mjs";
import { decodeEntities, elements, elementsWith, hrefsIn } from "../scripts/ci/lib.mjs";
import { NAV_GROUPS, PAGES } from "../src/data/nav.ts";
import { POSITIONING } from "../src/data/positioning.ts";
import { SERVICES } from "../src/data/services.ts";
import { ONSHORE_PILLAR, PROCESSING_NOTE, SERVICES_H1 } from "../src/lib/fixed-copy.ts";
import { pageDescription, pageTitle } from "../src/lib/meta.ts";
import { pageAt } from "../src/lib/pages.ts";
import { siteContext } from "../src/lib/site.ts";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const source = (rel) => readFileSync(join(SRC, rel), "utf8");
const SERVICES_PATH = "/services/";
const PARTNER_PATH = "/services/evaluation-partner/";
const BUILDS = [
  { name: "dist", read: readDist, site: siteContext(false) },
  { name: "dist-preview", read: readPreviewDist, site: siteContext(true) },
];
const fileOf = (path) => `${path.slice(1)}index.html`;
const text = (html) => visibleText(html).trim();
const mainOf = (html) => elements(html, (t) => t.name === "main")[0]?.inner ?? "";
const byId = (html, id) => elements(html, (t) => t.attrs.id === id)[0];
const links = (html) => elements(html, (t) => t.name === "a").map((a) => [text(a.inner), a.attrs.href]);
const items = (html) => elements(html, (t) => t.name === "li").map((li) => text(li.inner));
function faqQuestions(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const faqs = blocks.filter((b) => b["@type"] === "FAQPage");
  assert.equal(faqs.length, 1, "expected exactly one FAQPage");
  return faqs[0].mainEntity.map((q) => q.name);
}
/** Every string in a data value, depth-first. */
const strings = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);

// Ruling 15: one marker per data module that holds a commitment, verbatim.
const COMMITMENT_MARKER = "// ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2)";
// A headcount or a team size (tests/services-templates.test.mjs pins the same pattern).
const HEADCOUNT = /\b(?:\d+\+?|one|two|three|four|five|six|seven|eight|nine|ten|dozens?|hundreds?)[\s-]+(?:\w+[\s-]+)?(?:people|persons?|engineers?|evaluators?|staff|consultants?|specialists?|experts?|employees|FTEs?|strong)\b|\bteam of\b|\bheadcount\b/i;

// ---------- the data and its owner-held wording ----------

test("positioning: the sub-promise is ruling 12's safer wording; the origin line and pillar titles are spec §3.1–§3.2's", () => {
  assert.equal(
    POSITIONING.subPromise,
    "We design, build and run AI solutions for Australian organisations, from 40-person practices to federal agencies. In your environment, with your data onshore by default.",
  );
  assert.equal(POSITIONING.originLine, "AI pilots are easy to start and hard to ship. We build the kind that survive scrutiny.");
  assert.deepEqual(POSITIONING.pillars.map((p) => p.title), [
    "Cited, or it refuses.", "Measured before it ships.", "Your data stays onshore.", "You own what we build.",
  ]);
  assert.deepEqual(POSITIONING.pillars.map((p) => p.midMarket), [
    "Shows the page, or says it doesn't know.",
    "Tested the way you'd check a graduate's work.",
    // Spec §3.2: "Your data stays in Australia." waits for §12 item 1 (the enquiry mailbox's region).
    "What we build keeps your data in Australia.",
    "Yours to keep, or ours to run, with the exit built in.",
  ]);
});

test("owner markers: one commitment marker in each data module, and the sub-promise, team, independence and kit markers on their lines", () => {
  for (const file of ["data/positioning.ts", "data/services.ts"]) {
    const lines = source(file).split("\n");
    assert.equal(lines.filter((l) => l.trim() === COMMITMENT_MARKER).length, 1, `${file}: the commitment marker`);
  }
  const markerBefore = (file, marker, key) => {
    const lines = source(file).split("\n").map((l) => l.trim());
    const at = lines.indexOf(marker);
    assert.ok(at >= 0, `${file}: no "${marker}"`);
    assert.ok(lines[at + 1].startsWith(`${key}:`), `${file}: "${marker}" doesn't sit on the line above ${key}`);
  };
  markerBefore("data/positioning.ts", "// ⚑ owner: confirm the sub-promise wording (spec §12 item 12)", "subPromise");
  markerBefore("data/services.ts", "// ⚑ owner: re-confirm team claims (spec §12 item 10)", "summary");
  markerBefore("data/services.ts", "// ⚑ owner: sign off the independence policy wording (spec §12 item 3)", "independence");
  // Spec §12 item 6: the accounting entry offer names a kit that isn't published yet (research index A1).
  const lines = source("data/services.ts").split("\n").map((l) => l.trim());
  const kit = lines.indexOf("// ⚑ owner: the Accounting Safe-Use Kit must be lawyer-reviewed and published before this entry offer names it (spec §12 item 6; research index A1)");
  assert.ok(kit >= 0 && lines[kit + 2].startsWith('buyer: "Accounting practice'), "services.ts: the kit marker doesn't sit above the accounting entry offer");
});

test("the Run term's 30 days' notice sits only in a data module that carries the commitment marker (ruling 15)", () => {
  const files = (dir, ext) => readdirSync(join(SRC, dir), { recursive: true }).filter((f) => ext.test(f)).map((f) => `${dir}/${f}`);
  // The offer copy: the typed data modules, and the solution and industry collections.
  const offer = [...files("data", /\.ts$/), ...files("content/solutions", /\.ya?ml$/), ...files("content/industries", /\.ya?ml$/)];
  const holders = offer.filter((f) => /30 days['’] notice/.test(source(f)));
  assert.ok(holders.includes("data/services.ts"), "services.ts no longer states the Run term");
  for (const f of holders) {
    assert.ok(f.endsWith(".ts") && source(f).includes(COMMITMENT_MARKER), `${f} states the 30-day term without the commitment marker`);
  }
});

test("team claims: no 'senior', no location claim and no headcount (ruling 13, D14, D15)", () => {
  for (const [name, data] of [["positioning", POSITIONING], ["services", SERVICES]]) {
    for (const s of strings(data)) {
      assert.doesNotMatch(s, /\bsenior\b/i, `${name}: "${s}"`);
      assert.doesNotMatch(s, /\b(?:AU|Australian)[- ]based\b|\bbased in Australia\b/i, `${name}: "${s}"`);
    }
  }
  for (const s of strings(SERVICES.team)) assert.doesNotMatch(s, HEADCOUNT, s);
  assert.equal(SERVICES.team.summary, "The engineers and evaluators who scope your work also build and test it.");
});

test("services data: nothing about money, billing cadence or procurement size (D4), and no 'sprint' outside the Feasibility Sprint, 'tenancy' or 'APRA audit' (spec §3.4)", () => {
  // Check 11 fails the §3.5 pricing list and currency figures in this file; these are the words it
  // doesn't list. "Referral fees" is the independence policy's own wording (spec §4.4).
  const MONEY = /\b(?:fees?|payments?|payable|pay(?! for\b)|paid|invoices?|refunds?|charged?|charges|costs?|budget|retainer|monthly|per month|discount|quote|quoted)\b/i;
  for (const s of strings(SERVICES)) {
    assert.doesNotMatch(s.replace(/\breferral fees\b/g, ""), MONEY, s);
    // Spec §3.4 and §4.2 name the government and enterprise entry the "Feasibility Sprint on public or
    // synthetic data" (card id feasibility-sprint); "sprint" appears nowhere else.
    assert.doesNotMatch(s.replace(/\bFeasibility Sprint\b|^feasibility-sprint$/g, ""), /\bsprints?\b|\btenanc(?:y|ies)\b|\bAPRA audit\b/i, s);
    // Spec §12 item 6: no kit is called free before a lawyer reviews it, so the Fit Call card drops "+ free kits".
    assert.doesNotMatch(s, /\bfree\b/i, s);
  }
});

test("services data: the go/no-go gate is a decision you make, and every §4.5 inclusion is listed once", () => {
  for (const s of strings(SERVICES).filter((x) => /go\/no-go|go or no-go/i.test(x))) {
    assert.doesNotMatch(s, /\b(?:balance|release|refund|credit)\b/i, `the gate carries a consequence: "${s}"`);
  }
  assert.ok(SERVICES.deRisk.some((d) => d.title === "Go/no-go gates" && /you decide whether to continue/.test(d.body)));
  // WB-1: each line holds for all five solutions, so the test line names ⑤'s hours measure and the
  // re-test line applies where there is a test set (tests/solutions-content.test.mjs holds the detail).
  const INCLUSIONS = [
    /^A test on your own examples, with thresholds agreed before testing and every failure shown, or, for AI Switch-On, the hours saved/,
    /^Where the work has a test set, a re-run of it when the AI model changes or may have changed: /,
    /^A one-page data note/,
    /^A runbook and a handover\.$/,
    /^The delivery choice/,
    /hours and weeks/,
  ];
  assert.equal(SERVICES.standardInclusions.length, INCLUSIONS.length);
  for (const re of INCLUSIONS) assert.equal(SERVICES.standardInclusions.filter((s) => re.test(s)).length, 1, String(re));
});

test("services data: the independence policy states spec §4.4's five points, adversarial testing is never in-house, and only a judge in use is calibrated", () => {
  const POINTS = [
    /never issue an independent evaluation of a system we built, configured or advised on for the same client/,
    /no resale margin or referral fees from vendors we evaluate, and we disclose any vendor relationship/,
    /labelled "acceptance test \(not independent\)"/,
    /sample report on our own demo system is always captioned as not independent/,
    /vendor-neutral/,
  ];
  assert.equal(SERVICES.independence.length, POINTS.length);
  POINTS.forEach((re, i) => assert.match(SERVICES.independence[i], re));
  const redTeam = SERVICES.evaluationPartner.faq.find((f) => /adversarial testing/.test(f.q));
  assert.ok(redTeam, "the Evaluation Partner FAQ doesn't answer the adversarial-testing question");
  assert.match(redTeam.a, /^No, never in-house\. Where a system needs adversarial testing, it's done by a CREST-accredited tester the client engages\./);
  assert.doesNotMatch(strings(SERVICES).join(" "), /\bour partners?\b/i, "import rule 5: no partner until one is signed (spec §12 item 11)");
  // Not every evaluation grades with an LLM judge: clinician raters stay primary for scribe notes
  // (research index §E, Healthcare), so the method calibrates a judge only where one is used.
  assert.match(SERVICES.evaluationPartner.methodSummary, /calibration of any LLM judge against human labels/);
});

test("services data: Run is managed or supported, with the exit pack and no escrow, and the FAQ denies nothing on request (spec §4.1, §4.2, O4)", () => {
  const run = SERVICES.services.find((s) => s.id === "run");
  assert.match(run.what, /Managed in an Australian region, cancellable on 30 days' notice with an exit pack, or supported in your own account/);
  assert.deepEqual(SERVICES.phases.map((p) => p.id), ["prove", "build", "run"]);
  const exit = SERVICES.phases[2].deliverables.join(" ");
  assert.match(exit, /exit pack: code, data, configuration and runbook/);
  assert.ok(SERVICES.faq.some((f) => /We don't offer escrow/.test(f.a)), "the FAQ doesn't say escrow isn't offered");
  // Spec §4.1 "Not offered": a standalone platform or gateway is on request only (⑤'s Private
  // Workspace, or critical infrastructure), so the FAQ never denies it outright.
  const notOffered = SERVICES.faq.find((f) => f.q === "What don't you offer?");
  assert.match(notOffered.a, /standalone AI platform or model gateway is on request only, as a Private Workspace/);
});

// ---------- the two routes ----------

test("both pages are live, and both builds render them with their own title and description", () => {
  for (const path of [SERVICES_PATH, PARTNER_PATH]) {
    assert.equal(PAGES.find((p) => p.path === path).status, "live", path);
    for (const { name, read } of BUILDS) {
      const html = read(fileOf(path));
      const head = html.slice(0, html.indexOf("</head>"));
      assert.equal(decodeEntities(head.match(/<title>([^<]*)<\/title>/)[1]), pageTitle(pageAt(path)), `${name} ${path}: title`);
      assert.equal(decodeEntities(head.match(/<meta name="description" content="([^"]*)"/)[1]), pageDescription(pageAt(path)), `${name} ${path}: description`);
      assert.doesNotMatch(head, /name="robots"/, `${name} ${path}: the page is noindex`);
    }
  }
  assert.equal(pageTitle(pageAt(SERVICES_PATH)), "Services | Techsider");
  assert.equal(pageTitle(pageAt(PARTNER_PATH)), "Evaluation Partner | Techsider");
});

for (const { name, read, site } of BUILDS) {
  test(`${name}: /services/ renders ServicesTemplate once, with every section, and #prove, #build and #run for the nav's anchors`, () => {
    const main = mainOf(read(fileOf(SERVICES_PATH)));
    assert.equal(elementsWith(main, "data-template", "services").length, 1);
    const h1 = elements(main, (t) => t.name === "h1");
    assert.deepEqual(h1.map((h) => text(h.inner)), [SERVICES_H1]);
    for (const id of ["method", "services-list", "entry", "team", "where-it-runs", "independence", "de-risk", "faq", "contact", "prove", "build", "run"]) {
      assert.ok(byId(main, id), `${name}: /services/ has no #${id}`);
    }
    const anchors = NAV_GROUPS.find((g) => g.id === "services").anchors.map((a) => new URL(a.href, "https://techsider.com.au"));
    for (const u of anchors) {
      assert.equal(u.pathname, SERVICES_PATH);
      assert.equal(byId(main, u.hash.slice(1))?.attrs["data-phase"], u.hash.slice(1), `${name}: ${u.hash} is not a phase section`);
    }
  });

  test(`${name}: /services/ shows the Services data: phases, service cards, entry offers, team, where it runs, independence, de-risk and FAQ`, () => {
    const html = read(fileOf(SERVICES_PATH));
    const main = mainOf(html);
    const body = text(main);
    for (const phase of SERVICES.phases) {
      for (const part of [phase.name, phase.duration, phase.summary, ...phase.deliverables, ...phase.exitCriteria]) assert.ok(body.includes(part), `#${phase.id} lacks "${part}"`);
    }
    const cards = elementsWith(byId(main, "services-list").outer, "data-service");
    assert.deepEqual(cards.map((c) => c.attrs["data-service"]), SERVICES.services.map((s) => s.id));
    SERVICES.services.forEach((s, i) => {
      assert.equal(text(elements(cards[i].inner, (t) => t.name === "h3")[0].inner), s.name);
      for (const part of [s.what, `For: ${s.forWhom}`]) assert.ok(text(cards[i].inner).includes(part), `${s.id} lacks "${part}"`);
    });
    const rows = elements(elements(byId(main, "entry").outer, (t) => t.name === "tbody")[0].inner, (t) => t.name === "tr");
    assert.equal(rows.length, SERVICES.entryOffers.length);
    for (const o of SERVICES.entryOffers) for (const part of [o.buyer, o.entry, o.then]) assert.ok(body.includes(part), `#entry lacks "${part}"`);
    assert.ok(text(byId(main, "team").inner).includes(SERVICES.team.summary));
    assert.deepEqual(elements(byId(main, "team").inner, (t) => t.name === "h3").map((h) => text(h.inner)), SERVICES.team.functions.map((f) => f.title));
    assert.deepEqual(elementsWith(byId(main, "where-it-runs").outer, "data-delivery-choice").map((c) => c.attrs["data-delivery-choice"]), ["your-account", "managed", "platform-you-license"]);
    assert.deepEqual(items(elementsWith(main, "data-onshore-note")[0].inner), SERVICES.onshoreNote);
    assert.deepEqual(items(byId(main, "independence").inner), SERVICES.independence);
    assert.deepEqual(elements(byId(main, "de-risk").inner, (t) => t.name === "h3").map((h) => text(h.inner)), SERVICES.deRisk.map((d) => d.title));
    assert.deepEqual(faqQuestions(html), SERVICES.faq.map((f) => f.q));
  });

  test(`${name}: the /services/ hub links to Evaluation Partner from its card, and no other service card links anywhere`, () => {
    const main = mainOf(read(fileOf(SERVICES_PATH)));
    const cards = elementsWith(byId(main, "services-list").outer, "data-service");
    const linked = cards.filter((c) => links(c.inner).length > 0);
    assert.deepEqual(linked.map((c) => [c.attrs["data-service"], links(c.inner)]), [["evaluation-partner", [["Evaluation Partner", PARTNER_PATH]]]]);
    assert.ok(hrefsIn(main).includes(PARTNER_PATH), "check 02: the /services/ hub's <main> doesn't link to its child page");
  });

  test(`${name}: the Services CTAs follow the site context: a Fit Call, and the method only once its page is shown`, () => {
    const main = mainOf(read(fileOf(SERVICES_PATH)));
    const [hero] = elementsWith(main, "data-page-hero");
    const method = site.page("evaluationMethod").href;
    assert.deepEqual(links(hero.inner), [
      ["Talk to us about a Fit Call", site.contact({ interest: "not-sure" })],
      ...(method === null ? [] : [["Read the evaluation method", method]]),
    ]);
    assert.deepEqual(links(elementsWith(byId(main, "contact").outer, "data-prompt-block")[0].inner), [["Talk to us about a Fit Call", site.contact({ interest: "not-sure" })]]);
  });

  test(`${name}: /services/evaluation-partner/ renders its template once, from the Services data, with the Services breadcrumb`, () => {
    const html = read(fileOf(PARTNER_PATH));
    const main = mainOf(html);
    assert.equal(elementsWith(main, "data-template", "evaluation-partner").length, 1);
    const partner = SERVICES.evaluationPartner;
    assert.deepEqual(elements(main, (t) => t.name === "h1").map((h) => text(h.inner)), [partner.promise]);
    for (const id of ["who", "delivers", "fit", "independence", "method", "faq", "contact"]) assert.ok(byId(main, id), `${name}: no #${id}`);
    assert.deepEqual(items(byId(main, "who").inner), partner.audiences);
    assert.deepEqual(items(byId(main, "delivers").inner), partner.delivers);
    assert.deepEqual(items(byId(main, "fit").inner), partner.fit);
    assert.deepEqual(items(byId(main, "independence").inner), SERVICES.independence);
    assert.ok(text(byId(main, "method").inner).includes(partner.methodSummary));
    assert.deepEqual(faqQuestions(html), partner.faq.map((f) => f.q));
    const [crumbs] = elements(main, (t) => t.name === "nav" && t.attrs["aria-label"] === "Breadcrumb");
    assert.deepEqual(links(crumbs.inner), [["Home", "/"], ["Services", SERVICES_PATH]]);
    const [hero] = elementsWith(main, "data-page-hero");
    assert.deepEqual(links(elementsWith(hero.inner, "data-cta-links")[0].inner), [["Discuss an evaluation workstream", site.contact({ interest: "evaluation-partner" })]]);
  });

  test(`${name}: neither page states the onshore pillar, a headcount, a reply time or a planned page's link`, () => {
    const planned = PAGES.filter((p) => p.status === "planned").map((p) => p.path);
    for (const path of [SERVICES_PATH, PARTNER_PATH]) {
      const main = mainOf(read(fileOf(path)));
      const body = text(main);
      assert.equal(elementsWith(main, "data-onshore-pillar").length, 0, `${path}: the onshore pillar renders`);
      assert.ok(!body.includes(ONSHORE_PILLAR) && !body.includes(PROCESSING_NOTE), `${path}: a package pillar line renders`);
      // #entry names buyers by their own size ("50–300 staff"): that's the client's headcount, not ours.
      const entry = byId(main, "entry");
      assert.doesNotMatch(text(entry ? main.replace(entry.outer, " ") : main), HEADCOUNT, `${path}: a headcount`);
      // Spec §8.11: the reply time is written once, in the contact data, and only /contact/ pages state it.
      assert.doesNotMatch(body, /business days?|\breply within\b|\bwithin \w+ (?:hours|days)\b/i, `${path}: a reply time`);
      if (name === "dist") {
        for (const href of hrefsIn(main).filter((h) => h.startsWith("/"))) {
          const p = new URL(href, "https://techsider.com.au").pathname;
          assert.ok(!planned.includes(p), `${path} links to the planned page ${p}`);
        }
      }
    }
  });
}
