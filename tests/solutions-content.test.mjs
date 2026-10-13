// The five solution content files (Phase C Task 3; spec §4.1, §4.4–4.6, §8.3), read straight from
// src/content/solutions/ and parsed with the collection's own schema (plain refs, as in Node). The
// package ids, names, statuses, buyers and onshore flags are the blueprint's canonical set; the
// copy rules are spec §3.3–3.5 and the controller rulings this task records. No build needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { makeSolutionSchema, plainRef } from "../src/content/schemas.ts";
import { PAGES } from "../src/data/nav.ts";
import { SERVICES } from "../src/data/services.ts";

const DIR = fileURLToPath(new URL("../src/content/solutions/", import.meta.url));
const IDS = ["document-registers", "knowledge-assistant", "draft-for-approval", "ai-evaluation", "ai-switch-on"];
const schema = makeSolutionSchema(plainRef);
const RAW = Object.fromEntries(IDS.map((id) => [id, readFileSync(`${DIR}${id}.yaml`, "utf8")]));
const DATA = Object.fromEntries(IDS.map((id) => [id, schema.parse(parseYaml(RAW[id]))]));
const OWNER_MARKER = "# ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2)";
const MID = ["mid-market"];
const ENT = ["enterprise-government"];
/** Spec §3.4: the solutions whose every package is for mid-market buyers. */
const MID_MARKET_SOLUTIONS = ["document-registers", "draft-for-approval", "ai-switch-on"];

// The blueprint's canonical package set: [id, name, buyers] for launch packages, [id, name] otherwise.
const CANON = {
  "document-registers": {
    generic: ["one-document-family", "One document family, one register", MID],
    launch: [
      ["trust-deed-register", "Trust Deed & Client Structure Register", MID],
      ["management-agreement-register", "Management Agreement & Rent Roll Register", MID],
    ],
    onRequest: [
      ["permit-conditions-register", "Approval & Permit Conditions Register"],
      ["trust-audit-prep-pack", "Trust Audit Prep Pack"],
      ["bond-claim-evidence-pack", "Bond Claim Evidence Pack"],
      ["compliance-certificate-register", "Compliance Certificate Register"],
      ["lease-abstract-critical-dates", "Lease Abstract & Critical Dates"],
      ["compliance-dossier-builder", "Compliance Dossier Builder"],
      ["credentialing-referral-registers", "Credentialing & Referral Intake Registers"],
    ],
    internal: [["assessor-pre-screening-pack", "Pre-screening Pack for Assessors"]],
  },
  "knowledge-assistant": {
    generic: ["one-manual-one-team", "One manual, one team", ["mid-market", "enterprise-government"]],
    launch: [
      ["sop-work-instruction-assistant", "SOP & Work-Instruction Assistant", MID],
      ["policy-procedure-assistant", "Policy & Procedure Assistant", ["mid-market", "enterprise-government"]],
    ],
    onRequest: [
      ["ask-the-firm-manual", "Ask the Firm Manual"],
      ["pm-procedures-assistant", "PM Procedures & Onboarding Assistant"],
    ],
    internal: [],
  },
  "draft-for-approval": {
    generic: ["one-job-drafts-for-approval", "One job, drafts for approval", MID],
    launch: [],
    onRequest: [
      ["shared-inbox-triage", "Shared Inbox & After-Hours Triage"],
      ["ato-letter-sorter", "ATO Letter Sorter"],
      ["shift-handover-field-report", "Shift-Handover & Field-Report"],
      ["fault-to-work-order", "Fault-to-Work-Order"],
      ["rfq-quote-prep", "RFQ & Quote Prep"],
    ],
    internal: [],
  },
  "ai-evaluation": {
    generic: ["one-system-one-use-case", "One system, one use case", ["enterprise-government", "mid-market"]],
    launch: [
      ["independent-evaluation-report", "Independent Evaluation Report", ENT],
      ["scribe-clinical-ai-evaluation", "Scribe & Clinical AI Evaluation", ENT],
      ["vendor-ai-evaluation", "Vendor AI Evaluation", ENT],
      ["model-change-regression", "Model-Change Regression", ENT],
      ["tender-ai-claims-verification", "Tender AI-Claims Verification", ENT],
      ["agentic-ai-control-evaluation", "Agentic AI Control Evaluation", ENT],
    ],
    onRequest: [["soci-ai-risk-evidence", "SOCI AI Risk Evidence"]],
    internal: [["failure-scenario-fallback-test", "AI Failure-Scenario & Fallback Test"]],
  },
  "ai-switch-on": {
    generic: ["switch-on-in-3-weeks", "Switch-on in 3 weeks", MID],
    launch: [["admin-hours-audit-switch-on", "Admin Hours Audit + Switch-On", MID]],
    onRequest: [
      ["private-workspace", "Private Workspace"],
      ["citation-verification-log", "Citation Verification & AI-Use Disclosure Log"],
    ],
    internal: [],
  },
};

// The onshore scope rule (go-global §4.2), per package id: true only where every processing step,
// model inference included, runs in the region the client chooses: in their own account under
// delivery choice (a), in any cloud region, or managed by Techsider under (b), in an Australian
// region. The package's region note says which. The flags themselves are unchanged (R5).
const ONSHORE = {
  "one-document-family": true, "trust-deed-register": true, "management-agreement-register": true,
  "one-manual-one-team": false, "sop-work-instruction-assistant": true, "policy-procedure-assistant": false,
  "one-job-drafts-for-approval": true,
  "one-system-one-use-case": false, "independent-evaluation-report": false, "scribe-clinical-ai-evaluation": false,
  "vendor-ai-evaluation": false, "model-change-regression": false, "tender-ai-claims-verification": false,
  "agentic-ai-control-evaluation": false,
  "switch-on-in-3-weeks": false, "admin-hours-audit-switch-on": false,
};

const launchOf = (d) => [d.genericPackage, ...d.packages.filter((p) => p.status === "launch")];
const pairs = (list) => list.map((p) => [p.id, p.name]);
/** Every string in a value, however deep: the page copy a file can render. */
const strings = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
/** Sentences in a line of copy: a full stop, question or exclamation mark followed by a space or the end. */
const sentences = (s) => s.split(/(?<=[.?!])\s+/).filter(Boolean).length;
const copyOf = (id) => strings(DATA[id]).join("\n");

test("one content file per nav solution, and nothing else in src/content/solutions/", () => {
  const nav = PAGES.filter((p) => p.base === "/solutions/").map((p) => p.path.slice("/solutions/".length, -1));
  assert.deepEqual(nav, IDS);
  const files = readdirSync(DIR).filter((f) => f !== "README.md").sort();
  assert.deepEqual(files, IDS.map((id) => `${id}.yaml`).sort());
});

test("each file opens with the owner marker for the commitments it holds (ruling 15)", () => {
  for (const id of IDS) {
    const comments = RAW[id].split("\n").filter((l) => l.startsWith("#"));
    assert.ok(comments.includes(OWNER_MARKER), `${id}.yaml has no owner marker`);
    assert.equal(RAW[id].split("⚑").length - 1, 1, `${id}.yaml carries more than the one owner marker`);
  }
});

test("packages are the canonical set: ids, names, statuses and buyers, in order", () => {
  for (const id of IDS) {
    const d = DATA[id];
    const c = CANON[id];
    assert.deepEqual([d.genericPackage.id, d.genericPackage.name, d.genericPackage.buyers], c.generic, `${id} generic`);
    assert.deepEqual(d.packages.filter((p) => p.status === "launch").map((p) => [p.id, p.name, p.buyers]), c.launch, `${id} launch`);
    assert.deepEqual(pairs(d.packages.filter((p) => p.status === "on-request")), c.onRequest, `${id} on request`);
    assert.deepEqual(pairs(d.packages.filter((p) => p.status === "internal")), c.internal, `${id} internal`);
    const order = d.packages.map((p) => p.status);
    assert.deepEqual(order, [...order].sort((a, b) => ["launch", "on-request", "internal"].indexOf(a) - ["launch", "on-request", "internal"].indexOf(b)), `${id}: launch, then on request, then internal`);
  }
  // Prior-year variance flags stay off ③: their platform overlap is unverified (blueprint).
  assert.ok(!DATA["draft-for-approval"].packages.some((p) => /variance/i.test(p.name)));
});

test("onshore flags follow the §3.2 scope rule: ②'s Microsoft 365 variant and every ④ and ⑤ package are false", () => {
  const flags = Object.fromEntries(IDS.flatMap((id) => launchOf(DATA[id]).map((p) => [p.id, p.onshore])));
  assert.deepEqual(flags, ONSHORE);
});

// go-global §4.2, D4: a region note that names a region says where it runs, then ends with the
// remote-access sentence. Remote access from Sydney is a transfer (EDPB Guidelines 05/2021, ICO),
// so no note may read as "nothing leaves your region".
const REMOTE_ACCESS_END = /Our team reaches (?:it|them|the register|the assistant|the automation) remotely from Sydney, under the data-transfer terms in your contract\.$/;
const MODEL_AVAILABILITY = "If the model you want isn't offered in your chosen region, you hear that before you decide.";
const NAMING_A_REGION = [
  "one-document-family", "trust-deed-register", "management-agreement-register",
  "one-manual-one-team", "sop-work-instruction-assistant", "policy-procedure-assistant",
  "one-job-drafts-for-approval",
];

test("region notes: every note that names a region ends with the remote-access sentence (go-global §4.2, D4)", () => {
  const naming = [];
  for (const id of IDS) {
    for (const p of launchOf(DATA[id])) {
      if (!/\bregion\b/i.test(p.onshoreNote)) continue;
      naming.push(p.id);
      assert.ok(p.onshoreNote.includes("remotely from Sydney"), `${id} ${p.id}: names a region without "remotely from Sydney"`);
      assert.match(p.onshoreNote, REMOTE_ACCESS_END, `${id} ${p.id}: the remote-access sentence isn't the note's last`);
    }
  }
  // ④'s notes and ⑤'s name no region: the vendor or the client's environment sets the location,
  // and the page's delivery choice carries the remote-access sentence (go-global §4.1).
  assert.deepEqual(naming, NAMING_A_REGION);
});

// Where Techsider runs the model in the client's chosen region, the model on offer depends on that
// region. Inside a licensed platform (policy-procedure-assistant, ④, ⑤) the vendor runs it.
const WE_RUN_THE_MODEL = [
  "one-document-family", "trust-deed-register", "management-agreement-register",
  "one-manual-one-team", "sop-work-instruction-assistant", "one-job-drafts-for-approval",
];

test("region notes: where we run the model, the note says what happens when the model isn't offered in the chosen region (go-global §4.2)", () => {
  const notes = Object.fromEntries(IDS.flatMap((id) => launchOf(DATA[id]).map((p) => [p.id, p.onshoreNote])));
  for (const id of WE_RUN_THE_MODEL) {
    assert.ok(notes[id].includes(MODEL_AVAILABILITY), `${id}: no model-availability sentence`);
  }
  for (const [id, note] of Object.entries(notes)) assert.doesNotMatch(note, /isn't (?:offered|available) in an Australian region/, id);
});

// go-global §4.2–§4.3, D3: managed systems run in an Australian region; everything else runs in the
// region the client chooses. These are the only phrasings a solution page may use to name an
// Australian region.
const MANAGED_AU_REGION = /\bor in an Australian region (?:if we manage|we manage)\b|\bor in ours in an Australian region\b/g;

test("a solution page names an Australian region only for what Techsider manages, and assumes no Australian customer (go-global §4.2, D3)", () => {
  for (const id of IDS) {
    for (const s of strings(DATA[id])) {
      assert.doesNotMatch(s.replace(MANAGED_AU_REGION, ""), /\bAustralian region\b/, `${id}: an Australian region outside the managed option: "${s}"`);
      assert.doesNotMatch(s, /\boutside Australia\b|\bfor Australian customers\b/, `${id}: "${s}"`);
    }
  }
});

test("each 'Where is our data processed?' answer says who sets the location; ②'s also carries the remote access (go-global §4.4)", () => {
  const answer = (id) => DATA[id].faq.find((f) => f.q === "Where is our data processed?").a;
  assert.match(answer("knowledge-assistant"), REMOTE_ACCESS_END);
  assert.match(answer("knowledge-assistant"), /\bMicrosoft sets where model calls are processed\b/);
  assert.match(answer("ai-switch-on"), /\bwhere each vendor sets the processing location\b/);
});

test("per-solution switches: ④ is 'Engagements' with the independence policy; ⑤ has no program", () => {
  for (const id of IDS) {
    const d = DATA[id];
    assert.equal(d.packagesHeading, id === "ai-evaluation" ? "Engagements" : "Packages", id);
    assert.equal(d.independencePolicy, id === "ai-evaluation", id);
    assert.equal(d.program === undefined, id === "ai-switch-on", `${id}: program`);
  }
});

test("each solution names its own demo (Phase D Task 7); byIndustry and matrix name only industry ids", () => {
  const industries = new Set(PAGES.filter((p) => p.base === "/industries/").map((p) => p.path.slice("/industries/".length, -1)));
  for (const id of IDS) {
    const d = DATA[id];
    assert.equal(d.demo, id, `${id}: demo`);
    for (const ref of [...d.byIndustry, ...Object.keys(d.matrix)]) assert.ok(industries.has(ref), `${id}: "${ref}" is not an industry id`);
  }
});

test("spec §4.1 scope: timelines, test sizes and program lengths", () => {
  const g = (id) => DATA[id].genericPackage;
  for (const step of ["Week 0", "Weeks 1–2", "Weeks 3–5", "Week 6"]) assert.ok(g("document-registers").timeline.includes(step), step);
  assert.match(g("document-registers").scope, /30–50 documents/);
  assert.match(g("knowledge-assistant").timeline, /^4–6 weeks/);
  assert.ok(g("knowledge-assistant").inclusions.some((i) => i.includes("50–100 questions")));
  assert.match(g("draft-for-approval").timeline, /^5–6 weeks/);
  assert.ok(g("draft-for-approval").inclusions.some((i) => i.includes("50–100 of your past cases")));
  assert.match(g("ai-evaluation").timeline, /^3–5 weeks/);
  assert.match(g("ai-switch-on").timeline, /^3 weeks/);
  assert.match(g("ai-switch-on").scope, /^Week 1: an Admin Hours Audit\. Weeks 2–3: .*Day 30: an hours-saved report\.$/);
  assert.equal(DATA["document-registers"].program.duration, "8–12 weeks");
  assert.equal(DATA["knowledge-assistant"].program.duration, "12 weeks, in three 4-week phases");
  assert.equal(DATA["draft-for-approval"].program.duration, "12 weeks");
});

test("every go/no-go gate is a decision point with no payment consequence (spec §4.1 import rule 3)", () => {
  for (const id of IDS) {
    for (const p of launchOf(DATA[id])) {
      assert.match(p.gate, /\byou decide\b/, `${id} ${p.id}`);
      assert.doesNotMatch(p.gate, /\b(fee|pay|paid|payable|invoice|refund|credit)\w*\b/i, `${id} ${p.id}`);
    }
  }
});

test("the honesty lines and fixed wording the spec and rulings require are present", () => {
  const has = (id, field, text) => assert.ok(strings(DATA[id][field]).some((s) => s.includes(text)), `${id} ${field}: "${text}"`);
  has("document-registers", "platformFirst", "an error rate measured on your own answer key, with a go/no-go before you rely on it.");
  has("document-registers", "platformFirst", "First AML's AI document reader");
  has("knowledge-assistant", "platformFirst", "If Copilot already does this well enough, we'll say so.");
  has("draft-for-approval", "platformFirst", "XeroForce (when generally available)");
  has("ai-evaluation", "platformFirst", "If Copilot Studio's built-in evaluation answers your question, we'll say so.");
  has("ai-evaluation", "dontDo", "We never do adversarial testing in-house. Where it's needed, it's done by a CREST-accredited tester you engage.");
  has("ai-evaluation", "dontDo", "not an assurance opinion");
  has("ai-switch-on", "dontDo", "your own adviser approves any consent, engagement-letter or policy text");
  const tender = DATA["ai-evaluation"].packages.find((p) => p.id === "tender-ai-claims-verification");
  assert.match(`${tender.scope} ${tender.precondition}`, /probity note/);
  // NB-1 (Phase C ledger, ruling R5): the verified test set stays with the buyer, to re-run after contract.
  assert.ok(tender.inclusions.includes("The test set, ready to re-run after contract"), "④'s Tender AI-Claims Verification lacks its re-runnable test set");
  const agentic = DATA["ai-evaluation"].packages.find((p) => p.id === "agentic-ai-control-evaluation");
  assert.match(agentic.scope, /It is not an attack\./);
  // Spec §9.5: every page says plainly that there are no clients yet.
  for (const id of IDS) assert.ok(DATA[id].faq.some((f) => /\bno clients yet\b/.test(f.a)), `${id}: no "no clients yet" answer`);
});

test("go-global §3.3 vocabulary: shared solution copy speaks to any organisation, and names an Australian instrument only as Australia's (go-global §3.3, §3.5)", () => {
  const pkg = (id, packageId) => DATA[id].packages.find((p) => p.id === packageId);
  const ae = DATA["ai-evaluation"];
  assert.equal(ae.forLine, "Government agencies, regulated financial institutions, law firms and health services");
  assert.equal(ae.needProfiles[0].body, "Your Copilot agent or vendor tool is leaving pilot, and the official accountable for AI use wants evidence before a wider rollout. The report measures its failures on your own cases.");
  assert.equal(ae.genericPackage.forWhom, "An agency, regulated financial institution, law firm or health service with one AI system it bought, licensed or had built elsewhere, and one use case to test before relying on it.");
  assert.ok(ae.genericPackage.outOfScope.includes("Audit opinions: the report is findings, not an assurance opinion, and not an ISAE 3000 or ISRE engagement (ASAE 3000 or ASRE in Australia)"));
  assert.ok(ae.genericPackage.outOfScope.includes("The decision to deploy: the official accountable for AI use makes it"));
  const report = pkg("ai-evaluation", "independent-evaluation-report");
  assert.equal(report.forWhom, "Agencies, regulated financial institutions and law firms with one AI system to test before it scales, such as a Copilot Studio agent leaving pilot or a contact-centre summary tool.");
  assert.ok(report.outOfScope.includes("The decision to deploy: the official accountable for AI use makes it"));
  assert.equal(pkg("ai-evaluation", "scribe-clinical-ai-evaluation").scope, "The health form of the Independent Evaluation Report: selection against the regulator and safety guidance that applies to you (in Australia: TGA, Ahpra and ACSQHC), local validation on your own specialties, omission audits and a monitoring plan for after go-live. We evaluate these products; we never build them.");
  assert.equal(pkg("ai-evaluation", "model-change-regression").forWhom, "Organisations that rely on vendor AI with no audit rights or notice of model changes in the contract, such as contact-centre AI at a regulated financial institution.");
  assert.equal(
    ae.faq.find((f) => f.q === "Will your report tell us the system is safe to deploy?").a,
    "No. You get findings, not an assurance opinion, and it isn't an ISAE 3000 engagement (ASAE 3000 in Australia). Each finding is rated to your risk matrix and mapped to the instrument you use. The official accountable for AI use decides whether to deploy, on measured evidence rather than a demo.",
  );
  assert.equal(DATA["knowledge-assistant"].forLine, "Manufacturers, independent schools, non-clinical health teams and local government");
  assert.equal(pkg("knowledge-assistant", "policy-procedure-assistant").forWhom, "Local government, independent schools, non-clinical health services and financial-services procedure teams whose staff ask questions of a policy and procedure library.");
  // The hub matrices print this cell (orchestrator decision 2); Government's use case keeps its product name.
  assert.equal(DATA["knowledge-assistant"].matrix.government, "Local government policy assistant");
  assert.doesNotMatch(copyOf("knowledge-assistant"), /\bcouncils?\b/i);
  assert.equal(pkg("document-registers", "trust-deed-register").timeline, "5–6 weeks after Week 0. The Two-Week Trial runs in a quieter window outside your peak tax season (in Australia, November to early December or April to May).");
  assert.equal(pkg("document-registers", "compliance-certificate-register").oneLiner, "Reads compliance certificates, such as smoke-alarm and pool certificates, into one register of expiry dates. The rules for each state or jurisdiction are checked when the package is scoped.");
  assert.equal(pkg("document-registers", "credentialing-referral-registers").oneLiner, "Reads credentialing documents from outside the national practitioner register (Ahpra in Australia), such as college fellowships and scope-of-practice letters, or referrals that arrive as PDFs or faxes, into a register a person checks. Administrative only: a person makes every credentialing or referral decision.");
  // No Australian label stands alone in ④: APRA's and the DTA's terms are gone, and ASAE is only ever Australia's form of ISAE.
  const copy = copyOf("ai-evaluation");
  assert.doesNotMatch(copy, /\bAPRA-regulated\b|\baccountable official\b/i);
  assert.doesNotMatch(copy, /\bASAE 3000\b(?![^.]*\bin Australia\))/);
});

test("voice: need-profile titles are short declaratives ending in a period, and card copy runs one or two sentences", () => {
  for (const id of IDS) {
    for (const n of DATA[id].needProfiles) {
      assert.match(n.title, /^[A-Z][^.?!]*\.$/, `${id}: "${n.title}"`);
      assert.ok(n.title.split(/\s+/).length <= 10, `${id}: "${n.title}" is long for a headline`);
      assert.ok(sentences(n.body) <= 2, `${id}: "${n.body}"`);
    }
    for (const p of DATA[id].packages.filter((x) => x.status !== "launch")) assert.ok(sentences(p.oneLiner) <= 2, `${id} ${p.id}`);
  }
});

test("the shared inclusions and delivery choice (c) hold on every solution page that repeats them (WB-1; spec §4.5, §4.6)", () => {
  // Every launch package prints SERVICES.standardInclusions under "Every package includes", and every
  // page offering choice (c) prints its body, so each line has to be true of all five solutions.
  const lines = SERVICES.standardInclusions;
  // ④ and ⑤ offer no managed choice, so no inclusion promises "your own account or ours".
  const unmanaged = IDS.filter((id) => !DATA[id].whereItRuns.choices.includes("managed"));
  assert.deepEqual(unmanaged, ["ai-evaluation", "ai-switch-on"]);
  for (const id of unmanaged) for (const l of lines) assert.doesNotMatch(l, /\bor ours\b|\bmanaged\b/i, `${id} prints "${l}"`);
  // ④'s Model-Change Regression leaves the re-runs to the client's team, and ④'s control review and ⑤
  // have no test set, so the one re-test line applies only where there is a test set and says who runs it.
  const regression = DATA["ai-evaluation"].packages.find((p) => p.id === "model-change-regression");
  assert.ok(regression.outOfScope.some((o) => /your team owns and runs them/.test(o)));
  const retest = lines.filter((l) => /\bre-(?:test|run)\b/i.test(l));
  assert.equal(retest.length, 1, "one re-test line");
  assert.match(retest[0], /^Where the work has a test set\b/);
  assert.match(retest[0], /\bby us on a system we build or run\b/);
  assert.match(retest[0], /\bby your team\b[^.]*\bafter an evaluation\b/);
  // ⑤ is measured in hours against the Audit's baseline, not against thresholds agreed up front.
  assert.match(DATA["ai-switch-on"].howWeTest.summary, /measured in hours/);
  const testLine = lines.filter((l) => /\bthresholds\b/.test(l));
  assert.equal(testLine.length, 1, "one test line");
  assert.match(testLine[0], /\bfor AI Switch-On, the hours saved\b/);
  assert.doesNotMatch(testLine[0], /^An acceptance test\b/, "④'s evaluations are not acceptance tests (spec §4.4)");
  // Choice (c): only a part we build runs in our account or yours, and only where we build one.
  const c = SERVICES.deliveryChoices.find((d) => d.id === "platform-you-license");
  assert.doesNotMatch(c.body, /\bAnything we build\b/);
  assert.match(c.body, /\bWhere we build part of it\b/);
});

test("a package card shown on several industry pages frames no one audience in its scope (C4-T4-F5)", () => {
  // An industry page's package card shows the package's scope as its summary (industryView), so a
  // package several industries recommend keeps its audience framing out of the scope.
  const IND = fileURLToPath(new URL("../src/content/industries/", import.meta.url));
  const shownOn = new Map();
  for (const f of readdirSync(IND).filter((x) => x.endsWith(".yaml"))) {
    for (const p of parseYaml(readFileSync(`${IND}${f}`, "utf8")).packages) {
      const key = `${p.solution}/${p.package}`;
      shownOn.set(key, new Set([...(shownOn.get(key) ?? []), f.replace(/\.yaml$/, "")]));
    }
  }
  const report = DATA["ai-evaluation"].packages.find((p) => p.id === "independent-evaluation-report");
  assert.ok(shownOn.get("ai-evaluation/independent-evaluation-report").size >= 2, "the report is recommended on several industry pages");
  let checked = 0;
  for (const id of IDS) {
    for (const p of launchOf(DATA[id])) {
      if ((shownOn.get(`${id}/${p.id}`)?.size ?? 0) < 2) continue;
      checked += 1;
      assert.doesNotMatch(p.scope, /\bfor (?:financial services|law firms|councils|agencies|schools|health services)\b/i, `${id} ${p.id}: "${p.scope}"`);
    }
  }
  assert.ok(checked >= 3, `only ${checked} shared cards checked`);
  assert.equal(report.scope, "One system and one use case, the full method and the evidence bundle, with the harness handed over.");
});

test("a solution with packages for government and enterprise offers their entry offer beside the mid-market Trial (C3-T3-F2; spec §3.4, §4.2)", () => {
  const serving = IDS.filter((id) => launchOf(DATA[id]).some((p) => p.buyers.includes("enterprise-government")));
  assert.deepEqual(serving, ["knowledge-assistant", "ai-evaluation"]);
  for (const id of MID_MARKET_SOLUTIONS) assert.ok(!serving.includes(id), id);
  let offered = 0;
  for (const id of serving) {
    for (const f of DATA[id].faq.filter((x) => /\bTwo-Week Trial\b/.test(x.a))) {
      offered += 1;
      assert.match(f.a, /\bthe Two-Week Trial on Your Own Files\b/, `${id}: "${f.q}"`);
      assert.match(f.a, /\bfor government and enterprise, the Feasibility Sprint on public or synthetic data\b/, `${id}: "${f.q}"`);
    }
  }
  assert.ok(offered >= 1, "② offers an entry in its FAQ");
});

test("language rules: nothing held, keep-off, priced or overclaimed, and no 'agents' on the mid-market solutions", () => {
  const everywhere = [
    [/\btenancy\b/i, "tenancy (§3.4)"],
    [/\bAPRA audit\b/i, "APRA audit (§3.4)"],
    [/\b(monthly|per month|retainer)\b/i, "billing cadence (§3.4, D4)"],
    [/\bfree\b/i, "free (D4)"],
    [/\b30 days\b/i, "the Run notice term, published only with its marker in services.ts (ruling 15)"],
    [/lawyer[- ]reviewed|reviewed by a lawyer/i, "a review claim the kits haven't earned yet (§12 item 6)"],
    [/\bAI6\b|\bIRAP\b|APES 320|VAISS|sixty seconds/i, "keep-off list (research index)"],
    [/\bhealth check\b|\bbake-off\b|\bboard-ready\b|\bintegrat(es|ion) (with|partner)\b/i, "§3.4 wording"],
    [/\b(senior|AU-based) (engineers?|team|consultants?)\b/i, "an unconfirmed team claim (ruling 13)"],
  ];
  for (const id of IDS) {
    const copy = copyOf(id);
    for (const [re, why] of everywhere) assert.doesNotMatch(copy, re, `${id}: ${why}`);
    // "sprint" appears only inside "Feasibility Sprint", the government and enterprise entry offer,
    // and that never on a mid-market solution (spec §3.4; tests/content-language.test.mjs's MID_MARKET).
    const sprintless = MID_MARKET_SOLUTIONS.includes(id) ? copy : copy.replace(/\bFeasibility Sprint\b/g, "");
    assert.doesNotMatch(sprintless, /\bsprint\b/i, `${id}: sprint (§3.4)`);
    for (const m of copy.matchAll(/generally available/g)) {
      assert.equal(copy.slice(m.index - "XeroForce (when ".length, m.index + "generally available)".length), "XeroForce (when generally available)", `${id}: "generally available" outside the ruling 11 wording`);
    }
  }
  for (const id of ["document-registers", "knowledge-assistant", "draft-for-approval", "ai-switch-on"]) {
    assert.doesNotMatch(copyOf(id), /\bagents?\b/i, `${id}: "agent" names what Techsider builds (§3.4)`);
  }
});

test("research holds: no platform or delivery claim the research leaves open", () => {
  // Mitti's AI Assistant: its page doesn't say which data it answers from (research index,
  // resources ⚑), so no copy says it answers "from" procedures held in Mitti.
  assert.doesNotMatch(copyOf("knowledge-assistant"), /answers from (procedures|content|SOPs?|them)\b[^.]*\bMitti\b|Mitti[^.]*answers from/i);
  // PropertyMe Automation Studio isn't labelled AI (platform-ai.md), so ③ calls the one-system
  // options "tools", not "AI".
  assert.doesNotMatch(copyOf("draft-for-approval"), /single vendor's AI\b/);
  // The system under test sees every test question, so ④ never says test data doesn't leave.
  assert.doesNotMatch(copyOf("ai-evaluation"), /no test data leaves|test data doesn't leave/i);
  // Ruling 3: no re-test trigger the client can't see.
  assert.doesNotMatch(copyOf("ai-evaluation"), /after each (vendor )?update/i);
  // No kit is published until a lawyer reviews it (§12 item 6), so ⑤ never implies one exists now.
  assert.doesNotMatch(copyOf("ai-switch-on"), /where one exists|Safe-Use Kit exists/i);
  assert.ok(DATA["ai-switch-on"].faq.some((f) => f.a.includes("published only after review by an Australian legal practitioner")));
  // Nor does ⑤ offer a kit outright (plan Global Constraints, Kits; research index A1): every
  // sentence that names a Safe-Use Kit, other than the FAQ question, makes it conditional on the
  // kit being published, so the page stays true while every kit waits for review.
  const kitSentences = strings(DATA["ai-switch-on"]).flatMap((s) => s.split(/(?<=[.?!])\s+/)).filter((s) => /Safe-Use Kit/.test(s) && !s.endsWith("?"));
  assert.ok(kitSentences.length >= 4, "⑤ names the kits in its job, need profile, scope and inclusions");
  for (const s of kitSentences) assert.match(s, /\bwhere (one|a Safe-Use Kit\b[^.]*?) (is|has been) published\b/i, `⑤ offers a kit outright: "${s}"`);
});

test("go-global §3.3 and contract §5 rules 4–5: a matrix cell, a Safe-Use Kit line or an entry offer that names an Australia-only item says so inline", () => {
  assert.equal(DATA["ai-evaluation"].matrix["resources-and-energy"], "Pre-contract tests; on-request SOCI evidence (Australia)");
  assert.equal(DATA["draft-for-approval"].matrix.accounting, "ATO Letter Sorter (Australia), on request");
  assert.equal(DATA["document-registers"].matrix["real-estate"], "Management agreement register (Australia)");
  const switchOn = DATA["ai-switch-on"];
  const adminHours = switchOn.packages.find((p) => p.id === "admin-hours-audit-switch-on");
  assert.equal(switchOn.needProfiles[1].body, "In Australia, where a Safe-Use Kit for your industry is published, Switch-On applies it as is. Your own adviser approves any consent, engagement-letter or policy wording.");
  assert.equal(switchOn.genericPackage.scope, "Week 1: an Admin Hours Audit. Weeks 2–3: configure the AI features you already own, apply the Australian Safe-Use Kit for your industry where one is published, and train staff. Day 30: an hours-saved report.");
  assert.equal(switchOn.genericPackage.inclusions[3], "The Australian Safe-Use Kit for accounting, legal or property, applied as is, where one is published for your industry");
  assert.equal(adminHours.scope, "The Admin Hours Audit takes 1 week and maps where staff hours go. Switch-On takes 2–3 weeks: it configures features you already own, applies the relevant Australian Safe-Use Kit as published, where one has been published, trains staff and measures the hours saved at day 30.");
  assert.equal(adminHours.inclusions[3], "The Australian Safe-Use Kit for accounting, legal or property, applied as is, where one is published for your industry. Otherwise, your own AI policy applies.");
  const offers = SERVICES.entryOffers.flatMap((o) => [o.entry, o.then]);
  for (const s of [
    "Accounting Safe-Use Kit (Australia), then a Trial of the Trust Deed & Client Structure Register",
    "The full register; ATO Letter Sorter (Australia, on request); Run",
    "A Trial of the Management Agreement & Rent Roll Register (Australia); on-request property packages",
    "SOCI AI Risk Evidence (Australia, on request)",
  ]) assert.ok(offers.some((o) => o.startsWith(s)), `services entry offers: "${s}"`);
});
