// Preview-only fixtures: the rules are in src/fixtures/index.ts.
// Page data for the singleton templates (src/content/page-schemas.ts): positioning, Services and
// Evaluation Partner, Contact (with and without a form endpoint), Trust, About and Home, plus the
// documents collection (a legal document and the evaluation method, bodies as rendered HTML).
// - trustFixture has one Part B item that is not confirmed: it must never render (spec §8.11), and
//   neither must the Part B answer that rests on it. trustNoTermsFixture confirms no term at all,
//   so the Trust page drops Part B and every Part B answer.
// - homeFixture's FAQ asks HOME_TRUST_QUESTION verbatim, as homeData requires; it is the one
//   string here that is fixed spec copy rather than fixture text.
// - Services team copy names functions only: no names and no numbers (spec §8.6).
// - servicesFixture's "evaluation-partner" service carries the one id ServicesTemplate links to a
//   page of its own, so the gallery shows a linked service card beside the plain ones.
import type {
  AboutData, ContactData, DocumentData, HomeData, PositioningData, ServicesData, TrustData,
} from "../content/page-schemas.ts";
import { HOME_TRUST_QUESTION } from "../lib/fixed-copy.ts";

const faq = (topic: string) => [
  { q: `Fixture question about ${topic}, one?`, a: `Fixture answer about ${topic}, long enough to pass the schema.` },
  { q: `Fixture question about ${topic}, two?`, a: `Fixture answer about ${topic}, long enough to pass the schema.` },
  { q: `Fixture question about ${topic}, three?`, a: `Fixture answer about ${topic}, long enough to pass the schema.` },
];

export const positioningFixture: PositioningData = {
  subPromise: "Fixture sub-promise: we design, build and run fixture systems for fictional organisations, with fixture data kept in the fixture region.",
  originLine: "Fixture origin line: fixture pilots are easy to start and hard to ship.",
  pillars: [
    { id: "cited", title: "Fixture pillar: cited, or it refuses.", mechanism: "Fixture mechanism: every fixture answer cites its source.", midMarket: "Fixture plain version: shows the page, or says it doesn't know." },
    { id: "measured", title: "Fixture pillar: measured before it ships.", mechanism: "Fixture mechanism: fixture thresholds agreed up front.", midMarket: "Fixture plain version: tested the way you'd check a new starter's work." },
    { id: "onshore", title: "Fixture pillar: your data stays in the fixture region.", mechanism: "Fixture mechanism: fixture systems run in the fixture region.", midMarket: "Fixture plain version: your fixture data stays put." },
    { id: "ownership", title: "Fixture pillar: you own what we build.", mechanism: "Fixture mechanism: fixture code and tests in your fixture repository.", midMarket: "Fixture plain version: yours to keep." },
  ],
};

export const servicesFixture: ServicesData = {
  phases: [
    {
      id: "prove", name: "Fixture Prove", duration: "Fixture duration: one to two weeks",
      summary: "Fixture summary: a fixture test on your own fixture files, ending in a decision.",
      deliverables: ["Fixture deliverable: a measured fixture error rate", "Fixture deliverable: a go/no-go fixture note"],
      exitCriteria: ["Fixture exit: the fixture threshold is met or the work stops"],
    },
    {
      id: "build", name: "Fixture Build", duration: "Fixture duration: four to six weeks",
      summary: "Fixture summary: the fixture system built, tested and handed over.",
      deliverables: ["Fixture deliverable: the fixture system", "Fixture deliverable: a fixture acceptance test report"],
      exitCriteria: ["Fixture exit: the fixture acceptance test passes"],
    },
    {
      id: "run", name: "Fixture Run", duration: "Fixture duration: ongoing, with a fixture exit pack",
      summary: "Fixture summary: the fixture system runs and is re-tested when the model changes.",
      deliverables: ["Fixture deliverable: a fixture runbook", "Fixture deliverable: fixture re-test reports"],
      exitCriteria: ["Fixture exit: the fixture exit pack is handed over on request"],
    },
  ],
  services: [
    { id: "fixture-fit-call", name: "Fixture Fit Call", what: "Fixture what: a short fixture call about one problem.", forWhom: "Fixture for: every fixture buyer", entry: "entry" },
    { id: "fixture-build", name: "Fixture Fixed-Scope Build", what: "Fixture what: one fixture package, built and handed over.", forWhom: "Fixture for: fixture mid-market teams", entry: "after-audit-or-trial" },
    { id: "fixture-program", name: "Fixture Enterprise Program", what: "Fixture what: three fixture phases, from proof to handover.", forWhom: "Fixture for: fixture agencies", entry: "secondary" },
    { id: "evaluation-partner", name: "Fixture Evaluation Partner", what: "Fixture what: a fixture evaluation workstream under your fixture prime.", forWhom: "Fixture for: fixture primes", entry: "entry" },
    { id: "fixture-run", name: "Fixture Run", what: "Fixture what: the fixture system run and re-tested.", forWhom: "Fixture for: fixture build clients", entry: "not-entry" },
  ],
  entryOffers: [
    { buyer: "Fixture state agency", entry: "Fixture evaluation report", then: "Fixture repeat evaluations" },
    { buyer: "Fixture accounting practice", entry: "Fixture safe-use kit, then a fixture trial", then: "Fixture full register" },
    { buyer: "Fixture manufacturer", entry: "Fixture trial on one fixture line", then: "Fixture full assistant" },
  ],
  team: {
    summary: "Fixture summary: the fixture engineers and fixture evaluators who scope the work also build and test it.",
    functions: [
      { title: "Fixture engineering", body: "Fixture body: builds the fixture system and its fixture tests." },
      { title: "Fixture evaluation", body: "Fixture body: writes the fixture test sets and the fixture reports." },
    ],
  },
  deliveryChoices: [
    { id: "your-account", title: "Fixture choice: your own fixture account", body: "Fixture body: runs in your fixture cloud account, in the fixture region." },
    { id: "managed", title: "Fixture choice: managed for you", body: "Fixture body: we run it in the fixture region, with a fixture exit pack." },
    { id: "platform-you-license", title: "Fixture choice: a platform you already license", body: "Fixture body: runs inside fixture software you already pay for." },
  ],
  onshoreNote: [
    "Fixture onshore note: where fixture inference actually runs",
    "Fixture onshore note: the fixture provider's retention and review settings",
    "Fixture onshore note: what happens when the newest fixture model isn't in the fixture region",
  ],
  independence: [
    "Fixture independence: we never evaluate a fixture system we built for the same client.",
    "Fixture independence: no resale margin or referral fees from fixture vendors we evaluate.",
    "Fixture independence: our own fixture acceptance tests are labelled as not independent.",
  ],
  deRisk: [
    { title: "Fixture acceptance tests", body: "Fixture body: fixture thresholds agreed before work starts." },
    { title: "Fixture go/no-go gates", body: "Fixture body: you decide whether to continue at each fixture gate." },
    { title: "Fixture exit pack", body: "Fixture body: fixture code, data, configuration and runbook." },
  ],
  standardInclusions: [
    "Fixture inclusion: an acceptance test on your own fixture examples",
    "Fixture inclusion: a re-test when the fixture model changes",
    "Fixture inclusion: a one-page fixture data note",
    "Fixture inclusion: a fixture runbook and handover",
    "Fixture inclusion: your fixture delivery choice",
  ],
  routes: {
    midMarket: {
      title: "Fixture route: mid-market",
      steps: [
        { name: "Fixture Audit", body: "Fixture body: where fixture hours go." },
        { name: "Fixture Trial", body: "Fixture body: a fixture test on your own files." },
        { name: "Fixture Build", body: "Fixture body: the fixture package, built." },
        { name: "Fixture Run", body: "Fixture body: the fixture system, run and re-tested." },
      ],
    },
    enterprise: {
      title: "Fixture route: enterprise and government",
      steps: [
        { name: "Fixture Evaluation", body: "Fixture body: an independent fixture evaluation." },
        { name: "Fixture Program", body: "Fixture body: three fixture phases to handover." },
      ],
      partnerLine: "Fixture partner line: or a fixture evaluation workstream under your existing fixture prime.",
    },
  },
  faq: faq("fixture services"),
  evaluationPartner: {
    promise: "Fixture promise: an independent fixture evaluation workstream under your fixture contract.",
    audiences: ["Fixture audience: fixture primes", "Fixture audience: fixture internal-audit firms", "Fixture audience: fixture law firms"],
    delivers: ["Fixture delivers: a fixture evaluation report", "Fixture delivers: a fixture evidence bundle", "Fixture delivers: a fixture harness handover"],
    fit: ["Fixture fit: we work under your fixture contract", "Fixture fit: your fixture client relationship stays yours"],
    methodSummary: "Fixture method summary: fixture thresholds agreed first, fixture failures listed, fixture evidence you can re-run.",
    faq: faq("the fixture workstream"),
  },
};

export const contactFixture: ContactData = {
  replyTime: "one fixture business day",
  formEndpoint: "https://example.com/fixture/form",
  formProvider: { name: "Fixture Forms", country: "Fixture country A" },
  emailProvider: { name: "Fixture Mail", country: "Fixture country B" },
  subProcessors: [
    { entity: "Fixture Forms", purpose: "Fixture purpose: receives the fixture contact form", country: "Fixture country A", data: "Fixture data: name, email and message" },
    { entity: "Fixture Mail", purpose: "Fixture purpose: stores fixture email", country: "Fixture country B", data: "Fixture data: email content" },
    { entity: "Fixture Hosting", purpose: "Fixture purpose: serves the fixture site", country: "Fixture country C", data: "Fixture data: none stored" },
  ],
  whatNext: [
    "Fixture step: a short fixture Fit Call",
    "Fixture step: a fixture NDA on request",
    "Fixture step: a fixture proposal",
  ],
  deflection: [
    { title: "Fixture security disclosure", body: "Fixture body: report a fixture security issue.", email: "fixture-security@example.com" },
    { title: "Fixture privacy request", body: "Fixture body: ask about your fixture data.", email: "fixture-privacy@example.com" },
    { title: "Fixture press", body: "Fixture body: fixture media questions.", email: "fixture-press@example.com" },
  ],
};

/** No form endpoint yet (Phase E): the contact page leads with the email address. */
export const contactNoEndpointFixture: ContactData = { ...contactFixture, formEndpoint: null };

const asAt = new Date("2026-09-15");

export const trustFixture: TrustData = {
  asAt,
  partA: {
    cookies: "Fixture cookies: the fixture site sets none.",
    analytics: "Fixture analytics: the fixture site runs none.",
    enquiries: "Fixture enquiries: stored in the fixture mailbox for a fixture retention period.",
    securityContact: "fixture-security@example.com",
  },
  partB: [
    { id: "fixture-residency", title: "Fixture residency", body: "Fixture body: fixture data stays in the fixture region.", confirmed: true },
    { id: "fixture-no-training", title: "Fixture no training", body: "Fixture body: fixture data never trains a fixture model.", confirmed: true },
    { id: "fixture-unconfirmed", title: "Fixture unconfirmed term", body: "Fixture body: this fixture term is not confirmed, so it must never render.", confirmed: false },
  ],
  faq: [
    {
      q: "Fixture question: where is fixture enquiry data stored?",
      a: "Fixture answer: in the fixture mailbox, in fixture country B. The fixture form provider passes each fixture enquiry on and keeps a copy for a short fixture period, then deletes it. Nothing else about your fixture enquiry is kept.",
      part: "A", asAt,
    },
    {
      q: "Fixture question: does the fixture site use cookies?",
      a: "Fixture answer: no. The fixture site sets no cookies and runs no fixture analytics, so nothing about your visit is tracked or stored. The fixture contact form sends only what you type into it, and nothing else.",
      part: "A", asAt,
    },
    {
      q: "Fixture question: is fixture client data used to train models?",
      a: "Fixture answer: no. Fixture client data never trains a fixture model, ours or a fixture provider's. The fixture contract term says so, and the fixture provider settings are chosen to match it before any fixture work starts.",
      part: "B", term: "fixture-no-training", asAt,
    },
    {
      q: "Fixture question: who owns what the fixture team builds?",
      a: "Fixture answer: you do. The fixture code, fixture prompts, fixture tests and the fixture index sit in your own fixture repository from the first day, so you can keep running the fixture system without us at any time.",
      part: "B", term: "fixture-unconfirmed", asAt,
    },
    {
      q: "Fixture question: where does fixture client data stay during an engagement?",
      a: "Fixture answer: in the fixture region. The fixture systems we build or run for you process fixture client data there, and the one-page fixture data note names every fixture location before any fixture work starts.",
      part: "B", term: "fixture-residency", asAt,
    },
  ],
  transparency: {
    statement: "Fixture statement: how the fixture team uses AI in its own fixture work.",
    systems: [
      { name: "Fixture register demo", purpose: "Fixture purpose: shows a fixture register", data: "Fixture data: synthetic fixture agreements", human: "Fixture human: a person reviews every fixture exception", demo: "fixture-demo" },
      { name: "Fixture drafting aid", purpose: "Fixture purpose: drafts fixture notes", data: "Fixture data: fixture notes only", human: "Fixture human: a person edits every fixture draft" },
    ],
  },
  changes: [
    { date: new Date("2026-09-15"), change: "Fixture change: fixture Part A re-checked." },
    { date: new Date("2026-08-01"), change: "Fixture change: fixture page published." },
  ],
};

/** No Part B term confirmed yet: the Trust page leaves out Part B and every Part B answer. */
export const trustNoTermsFixture: TrustData = {
  ...trustFixture,
  partB: trustFixture.partB.map((term) => ({ ...term, confirmed: false })),
};

export const aboutFixture: AboutData = {
  mission: "Fixture mission: fixture systems that survive fixture scrutiny.",
  whoWeServe: "Fixture who we serve: fictional organisations, from a small fixture practice to a fixture agency.",
  whyControl: "Fixture why control matters: fixture teams keep the fixture data, the fixture code and the final call.",
  principles: [
    { title: "Fixture principle: cited", body: "Fixture body: every fixture answer cites its source." },
    { title: "Fixture principle: measured", body: "Fixture body: fixture thresholds before fixture launch." },
    { title: "Fixture principle: onshore", body: "Fixture body: fixture data stays in the fixture region." },
    { title: "Fixture principle: owned", body: "Fixture body: you own the fixture code." },
    { title: "Fixture principle: vendor-neutral", body: "Fixture body: no fixture resale margin." },
  ],
  howWeWork: [
    { title: "Fixture step: prove", body: "Fixture body: a fixture test on your own files." },
    { title: "Fixture step: build", body: "Fixture body: the fixture system, tested." },
    { title: "Fixture step: run", body: "Fixture body: the fixture system, re-tested on model change." },
  ],
  buildLog: [
    { date: new Date("2026-09-01"), event: "Fixture event: the fixture evaluation method published." },
    { date: new Date("2026-07-01"), event: "Fixture event: the fixture site rebuilt." },
  ],
};

export const homeFixture: HomeData = {
  heroTrace: "fixture-hero-trace",
  faq: [
    { q: HOME_TRUST_QUESTION, a: "Fixture answer: the fixture method is published, the fixture tests are yours, and the fixture exit pack is built in." },
    { q: "Fixture question: where does my fixture data go?", a: "Fixture answer: it stays in the fixture region, and the fixture note says where." },
    { q: "Fixture question: what does a first fixture step look like?", a: "Fixture answer: a short fixture call, then a fixture test on your own files." },
    { q: "Fixture question: what if the fixture software already does this?", a: "Fixture answer: then we say so, and you keep using the fixture software." },
  ],
};

export interface DocumentFixture {
  id: string;
  data: DocumentData;
  /** The rendered Markdown body, as the documents collection's render() would give it. */
  bodyHtml: string;
}

export const documentFixtures: DocumentFixture[] = [
  {
    id: "fixture-privacy",
    data: {
      title: "Fixture privacy policy",
      summary: "Fixture summary: how the fixture site handles fixture enquiry data.",
      lastUpdated: new Date("2026-09-01"),
      effective: new Date("2026-09-15"),
      draft: false,
    },
    bodyHtml:
      "<h2>Fixture heading: what the fixture site collects</h2><p>Fixture paragraph: the fixture form collects a name, an email address and a message.</p>" +
      "<h2>Fixture heading: where it goes</h2><ul><li>Fixture item: the fixture form provider, in fixture country A</li><li>Fixture item: the fixture mailbox, in fixture country B</li></ul>" +
      '<p>Fixture paragraph: see the <a href="https://example.com/fixture/regulator">fixture regulator\'s guidance</a>.</p>',
  },
  {
    id: "fixture-evaluation-method",
    data: {
      title: "Fixture evaluation method",
      summary: "Fixture summary: how a fixture system is tested before anyone relies on it.",
      lastUpdated: new Date("2026-09-10"),
      draft: false,
    },
    bodyHtml:
      "<h2>Fixture heading: sample size</h2><p>Fixture paragraph: the fixture sample size and its confidence interval, agreed first.</p>" +
      "<h2>Fixture heading: ground truth</h2><p>Fixture paragraph: two fixture reviewers write each expected answer.</p>" +
      "<h3>Fixture subheading: agreement</h3><p>Fixture paragraph: fixture reviewers who disagree settle it with a third.</p>" +
      "<pre><code>fixture-harness run --set fixture-set</code></pre>",
  },
];
