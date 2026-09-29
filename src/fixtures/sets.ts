// Preview-only fixture sets: the rules are in src/fixtures/index.ts.
// The whole fictional site the B2 template gallery renders: five solutions and nine
// industries (the counts of spec §4.1 and §5), a regulatory file per industry, the traces,
// and five insights (one a draft). The hubs, Home and the industry pages join these by id,
// exactly as Phase C's views join the real collections.
// - solutionFixtures: fixture-solution (①-like, solution.ts) and four more, each shaped like
//   its spec §4.1 counterpart: ② two audience-variant launch packages, one not onshore;
//   ③ only on-request packages beside the generic one; ④ "Engagements", the independence
//   policy, three enterprise/government launch packages, one on-request and one internal;
//   ⑤ no program and nothing onshore.
// - industryFixtures: fixture-industry and fixture-government (industry.ts), then
//   fixture-industry-3 … fixture-industry-9. fixture-industry-3 carries the long-text edge
//   case: a 60-character unbroken token in a chip label and a long constraint hook.
// - insightFixtures are listed out of date order (the views sort them); the draft is the
//   newest, so a view that forgets to drop drafts shows it.
import type { IndustryData, InsightData, RegulatoryData, SolutionData, TraceData } from "../content/schemas.ts";
import { governmentIndustryFixture, industryFixture } from "./industry.ts";
import { governmentRegulatoryFixture, regulatoryFixture } from "./regulatory.ts";
import { solutionFixture } from "./solution.ts";
import { heroTraceFixture, traceFixture } from "./trace.ts";

/** "Today" for the gallery: the newest insight (2026-09-20) is 9 days old, so Home shows cards. */
export const FIXTURE_NOW = new Date("2026-09-29T00:00:00Z");
/** Past the 45-day rule (spec §8.1.9): Home shows only the "All insights" link. */
export const FIXTURE_STALE_NOW = new Date("2027-01-15T00:00:00Z");

type LaunchPackage = SolutionData["genericPackage"];

const FAQ: SolutionData["faq"] = [
  { q: "Fixture question one?", a: "Fixture answer one, long enough to pass the schema." },
  { q: "Fixture question two?", a: "Fixture answer two, long enough to pass the schema." },
  { q: "Fixture question three?", a: "Fixture answer three, long enough to pass the schema." },
];

function launchPackage(id: string, name: string, onshore: boolean, buyers: LaunchPackage["buyers"], precondition?: string): LaunchPackage {
  return {
    id,
    name,
    status: "launch",
    onshore,
    buyers,
    forWhom: `Fixture audience: the fixture team that ${name} is for.`,
    scope: `Fixture scope: one fixture workflow, delivered as ${name}.`,
    inclusions: ["Fixture inclusion: a test set and its report", "Fixture inclusion: handover notes for the fixture team"],
    clientTime: "Fixture client time: about two hours a week from one fixture reviewer",
    timeline: "Fixture timeline: four to six weeks",
    outOfScope: ["Fixture exclusion: changes to the fixture source systems"],
    gate: "Fixture gate: you decide whether to continue once the fixture test set passes",
    onshoreNote: onshore
      ? "Fixture onshore note: every step runs in an Australian region of the fixture cloud account"
      : "Fixture onshore note: the fixture vendor sets where processing happens, as its published page states",
    ...(precondition ? { precondition } : {}),
  };
}

const testing = (what: string): SolutionData["howWeTest"] => ({
  summary: `Fixture summary: every ${what} is checked against a hand-marked fixture set before anyone relies on it.`,
  bullets: [
    "Fixture test: thresholds agreed before the fixture test set runs",
    "Fixture test: every fixture failure listed, not only the pass rate",
  ],
});

const solutionFixture2: SolutionData = {
  job: "Fixture job: answer staff questions from the fixture manuals and show the page each answer used.",
  artefact: "Fixture artefact: an assistant that cites its fixture source, or says the answer isn't in the documents.",
  forLine: "Fixture teams with a shelf of fixture manuals and policies",
  needProfiles: [
    { title: "Fixture need: the floor", body: "Fixture body: staff on a fixture line who look up the same work instruction every shift." },
    { title: "Fixture need: the office", body: "Fixture body: staff who check a fixture policy before each decision." },
  ],
  byIndustry: ["fixture-government", "fixture-industry-4", "fixture-industry-6", "fixture-industry-7", "fixture-industry-8"],
  genericPackage: launchPackage("fixture-assistant-generic", "Fixture One Manual, One Team", true, ["mid-market", "enterprise-government"]),
  // The two audience variants of one launch package (spec §8.3: ② renders them as tabs).
  packages: [
    launchPackage("fixture-assistant-floor", "Fixture Work-Instruction Assistant", true, ["mid-market"]),
    launchPackage("fixture-assistant-office", "Fixture Policy Assistant", false, ["mid-market", "enterprise-government"], "Fixture precondition: the fixture office suite is already licensed"),
    { id: "fixture-assistant-on-request", name: "Fixture Ask the Manual", status: "on-request", oneLiner: "Fixture one-liner: one fixture assistant across every fixture team's manuals." },
  ],
  packagesHeading: "Packages",
  program: {
    title: "Fixture knowledge program",
    summary: "Fixture summary: a measured fixture knowledge layer across several fixture teams.",
    duration: "Fixture duration: twelve weeks",
    bullets: ["Fixture bullet: one fixture collection per team", "Fixture bullet: one shared fixture test set"],
  },
  howWeTest: testing("fixture answer"),
  whereItRuns: { choices: ["your-account", "managed", "platform-you-license"], note: "Fixture note: inside the fixture office suite where it's licensed, otherwise on the web." },
  independencePolicy: false,
  platformFirst: "Fixture platform-first note: if the fixture office suite already answers this well enough, we say so.",
  dontDo: ["Fixture limit: the assistant never answers from outside the fixture documents."],
  matrix: {
    "fixture-government": "Fixture cell: policy assistant",
    "fixture-industry-4": "Fixture cell: work-instruction assistant",
    "fixture-industry-6": "Fixture cell: procedures assistant",
    "fixture-industry-7": "Fixture cell: staff policy assistant",
    "fixture-industry-8": "Fixture cell: manual assistant",
  },
  faq: FAQ,
};

const solutionFixture3: SolutionData = {
  job: "Fixture job: sort, summarise and draft one repetitive fixture task, then wait for a person to approve.",
  artefact: "Fixture artefact: a queue of fixture drafts, each with its trace, waiting for a named approver.",
  forLine: "Fixture back offices with one repetitive fixture inbox job",
  needProfiles: [
    { title: "Fixture need: the inbox", body: "Fixture body: a fixture team that sorts the same shared inbox every morning." },
    { title: "Fixture need: the letters", body: "Fixture body: a fixture team that files each incoming fixture letter by hand." },
  ],
  byIndustry: ["fixture-industry-3", "fixture-industry-4", "fixture-industry-5"],
  genericPackage: launchPackage("fixture-drafts-generic", "Fixture One Job, Drafts for Approval", true, ["mid-market"]),
  // Only on-request packages beside the generic one (spec §4.1 ③).
  packages: [
    { id: "fixture-drafts-inbox", name: "Fixture Shared Inbox Triage", status: "on-request", oneLiner: "Fixture one-liner: sorts and drafts replies for one fixture inbox." },
    { id: "fixture-drafts-letters", name: "Fixture Letter Sorter", status: "on-request", oneLiner: "Fixture one-liner: files each fixture letter and drafts the next step.", precondition: "Fixture precondition: the fixture letters arrive by email" },
  ],
  packagesHeading: "Packages",
  program: {
    title: "Fixture supervised automation program",
    summary: "Fixture summary: several fixture steps in a row, each with an approval gate.",
    duration: "Fixture duration: twelve weeks",
    bullets: ["Fixture bullet: autonomy agreed in writing", "Fixture bullet: a fixture kill switch"],
  },
  howWeTest: testing("fixture draft"),
  whereItRuns: { choices: ["your-account", "managed"], note: "Fixture note: the fixture drafts stay in the fixture account the team picks." },
  independencePolicy: false,
  platformFirst: "Fixture platform-first note: when the job lives in one fixture system, use its own builder first.",
  dontDo: ["Fixture limit: nothing is sent, changed or decided without a person's approval."],
  matrix: {
    "fixture-industry-3": "Fixture cell: letter sorter",
    "fixture-industry-4": "Fixture cell: quote preparation",
    "fixture-industry-5": "Fixture cell: shared inbox triage",
  },
  faq: FAQ,
};

const solutionFixture4: SolutionData = {
  job: "Fixture job: test a fixture AI system someone else built, on your own fixture questions.",
  artefact: "Fixture artefact: a fixture evaluation report, its evidence bundle and a test kit you can re-run.",
  forLine: "Fixture agencies and fixture firms buying or upgrading AI",
  needProfiles: [
    { title: "Fixture need: before the contract", body: "Fixture body: a fixture buyer comparing vendor claims before signing." },
    { title: "Fixture need: after the upgrade", body: "Fixture body: a fixture team whose vendor just changed the model underneath." },
  ],
  byIndustry: ["fixture-government", "fixture-industry-6", "fixture-industry-7", "fixture-industry-8", "fixture-industry-9"],
  genericPackage: launchPackage("fixture-evaluation-generic", "Fixture Single-System Evaluation", true, ["enterprise-government"]),
  packages: [
    launchPackage("fixture-evaluation-report", "Fixture Evaluation Report", true, ["enterprise-government"]),
    launchPackage("fixture-evaluation-vendor", "Fixture Vendor Evaluation", true, ["enterprise-government"]),
    launchPackage("fixture-evaluation-control", "Fixture Control Evaluation", true, ["enterprise-government"], "Fixture precondition: read access to the fixture system's settings"),
    { id: "fixture-evaluation-on-request", name: "Fixture Risk Evidence", status: "on-request", oneLiner: "Fixture one-liner: fixture risk evidence for a critical fixture asset." },
    { id: "fixture-evaluation-internal", name: "Fixture Fallback Test", status: "internal", oneLiner: "Fixture one-liner: internal only and never rendered." },
  ],
  packagesHeading: "Engagements",
  program: {
    title: "Fixture evaluation program",
    summary: "Fixture summary: repeat fixture evaluations as each fixture system changes.",
    duration: "Fixture duration: three to five weeks per fixture system",
    bullets: ["Fixture bullet: the same fixture harness each time", "Fixture bullet: fixture findings rated to your risk matrix"],
  },
  howWeTest: testing("fixture finding"),
  whereItRuns: { choices: ["your-account", "managed"], note: "Fixture note: the fixture evaluation runs in your own fixture account." },
  independencePolicy: true,
  dontDo: ["Fixture limit: we never evaluate a fixture system we built for the same client."],
  matrix: {
    "fixture-government": "Fixture cell: agency assistant evaluation",
    "fixture-industry-6": "Fixture cell: model-change regression",
    "fixture-industry-7": "Fixture cell: deployed tool evaluation",
    "fixture-industry-8": "Fixture cell: vendor evaluation",
    "fixture-industry-9": "Fixture cell: control evaluation",
  },
  faq: FAQ,
};

const solutionFixture5: SolutionData = {
  job: "Fixture job: switch on the fixture AI features you already pay for, safely, and measure the hours saved.",
  artefact: "Fixture artefact: configured fixture features, a fixture staff briefing and a day-30 hours measure.",
  forLine: "Fixture practices already paying for fixture software with AI inside",
  needProfiles: [
    { title: "Fixture need: owned features", body: "Fixture body: a fixture practice paying for AI features nobody has switched on." },
    { title: "Fixture need: safe use", body: "Fixture body: a fixture practice that wants a policy before staff start." },
  ],
  byIndustry: ["fixture-industry-3", "fixture-industry-5", "fixture-industry-7", "fixture-industry-9"],
  // Nothing here is onshore: the fixture vendor sets where processing happens (spec §3.2).
  genericPackage: launchPackage("fixture-switch-on-generic", "Fixture Switch-On in Three Weeks", false, ["mid-market"]),
  packages: [
    launchPackage("fixture-switch-on-audit", "Fixture Hours Audit and Switch-On", false, ["mid-market"]),
    { id: "fixture-switch-on-workspace", name: "Fixture Private Workspace", status: "on-request", oneLiner: "Fixture one-liner: a private fixture workspace for sensitive fixture files." },
  ],
  packagesHeading: "Packages",
  howWeTest: testing("fixture feature"),
  whereItRuns: { choices: ["platform-you-license"], note: "Fixture note: everything runs inside the fixture software you already license." },
  independencePolicy: false,
  platformFirst: "Fixture platform-first note: this whole fixture offer is using your platform's AI first.",
  dontDo: ["Fixture limit: we don't resell fixture licences."],
  matrix: {
    "fixture-industry-3": "Fixture cell: kit and switch-on",
    "fixture-industry-5": "Fixture cell: hours audit",
    "fixture-industry-7": "Fixture cell: switch-on without a kit",
    "fixture-industry-9": "Fixture cell: workspace switch-on",
  },
  faq: FAQ,
};

export const solutionFixtures: Record<string, SolutionData> = {
  "fixture-solution": solutionFixture,
  "fixture-solution-2": solutionFixture2,
  "fixture-solution-3": solutionFixture3,
  "fixture-solution-4": solutionFixture4,
  "fixture-solution-5": solutionFixture5,
};

type UseCase = IndustryData["flagshipUseCases"][number];
const useCase = (name: string, solution: string, status: UseCase["status"] = "launch"): UseCase => ({ name, solution, status });
const WORD = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/** Industries 3–9: industryFixture's shape with their own use cases, lead solutions and packages. */
function industryVariant(n: number, parts: Pick<IndustryData, "flagshipUseCases" | "leadSolutions" | "packages"> & Partial<IndustryData>): IndustryData {
  return {
    ...industryFixture,
    promise: `Fixture promise: fewer hours on fixture paperwork in fixture industry ${WORD[n]}.`,
    constraintSet: `Fixture constraints for fixture industry ${WORD[n]}: a person signs off every fixture change.`,
    constraintHook: `Fixture hook: built around the review step in fixture industry ${WORD[n]}`,
    ...parts,
  };
}

/** 60 characters with no break opportunity, for the 320px reflow checks. */
const LONG_TOKEN = "FixturereferencecodeFixturereferencecodeFixturereferencecode";

export const industryFixtures: Record<string, IndustryData> = {
  "fixture-industry": industryFixture,
  "fixture-government": governmentIndustryFixture,
  "fixture-industry-3": industryVariant(3, {
    constraintHook:
      "Fixture hook: built around a fixture review step that a fixture partner signs off at the end of every fixture quarter, with a fixture register of each fixture exception and the fixture source page it came from",
    obligationChips: [{ label: `Fixture obligation ${LONG_TOKEN}`, row: "fixture-row-1" }, ...industryFixture.obligationChips.slice(1)],
    flagshipUseCases: [useCase("Fixture deed register", "fixture-solution"), useCase("Fixture switch-on", "fixture-solution-5"), useCase("Fixture letter sorter", "fixture-solution-3", "on-request")],
    leadSolutions: ["fixture-solution", "fixture-solution-5", "fixture-solution-3"],
    packages: [
      { solution: "fixture-solution", package: "fixture-generic-package" },
      { solution: "fixture-solution", package: "fixture-launch-package" },
      { solution: "fixture-solution-5", package: "fixture-switch-on-generic" },
    ],
  }),
  "fixture-industry-4": industryVariant(4, {
    flagshipUseCases: [useCase("Fixture work-instruction assistant", "fixture-solution-2"), useCase("Fixture quote preparation", "fixture-solution-3", "on-request"), useCase("Fixture dossier builder", "fixture-solution", "on-request")],
    leadSolutions: ["fixture-solution-2", "fixture-solution-3"],
    packages: [
      { solution: "fixture-solution-2", package: "fixture-assistant-generic" },
      { solution: "fixture-solution-2", package: "fixture-assistant-floor" },
      { solution: "fixture-solution-3", package: "fixture-drafts-inbox" },
    ],
  }),
  "fixture-industry-5": industryVariant(5, {
    flagshipUseCases: [useCase("Fixture agreement register", "fixture-solution"), useCase("Fixture hours audit", "fixture-solution-5"), useCase("Fixture inbox triage", "fixture-solution-3", "on-request")],
    leadSolutions: ["fixture-solution", "fixture-solution-5"],
    packages: [
      { solution: "fixture-solution", package: "fixture-second-launch-package" },
      { solution: "fixture-solution-5", package: "fixture-switch-on-audit" },
      { solution: "fixture-solution-3", package: "fixture-drafts-generic" },
    ],
  }),
  "fixture-industry-6": industryVariant(6, {
    flagshipUseCases: [useCase("Fixture model-change regression", "fixture-solution-4"), useCase("Fixture vendor evaluation", "fixture-solution-4"), useCase("Fixture procedures assistant", "fixture-solution-2")],
    leadSolutions: ["fixture-solution-4", "fixture-solution-2"],
    packages: [
      { solution: "fixture-solution-4", package: "fixture-evaluation-report" },
      { solution: "fixture-solution-4", package: "fixture-evaluation-vendor" },
      { solution: "fixture-solution-2", package: "fixture-assistant-office" },
    ],
  }),
  "fixture-industry-7": industryVariant(7, {
    flagshipUseCases: [useCase("Fixture staff policy assistant", "fixture-solution-2"), useCase("Fixture deployed tool evaluation", "fixture-solution-4"), useCase("Fixture switch-on", "fixture-solution-5")],
    leadSolutions: ["fixture-solution-2", "fixture-solution-4", "fixture-solution-5"],
    packages: [
      { solution: "fixture-solution-2", package: "fixture-assistant-generic" },
      { solution: "fixture-solution-4", package: "fixture-evaluation-generic" },
      { solution: "fixture-solution-5", package: "fixture-switch-on-generic" },
    ],
  }),
  "fixture-industry-8": industryVariant(8, {
    flagshipUseCases: [useCase("Fixture intake register", "fixture-solution"), useCase("Fixture manual assistant", "fixture-solution-2"), useCase("Fixture vendor evaluation", "fixture-solution-4")],
    leadSolutions: ["fixture-solution-4", "fixture-solution-2", "fixture-solution"],
    packages: [
      { solution: "fixture-solution", package: "fixture-generic-package" },
      { solution: "fixture-solution-2", package: "fixture-assistant-floor" },
      { solution: "fixture-solution-4", package: "fixture-evaluation-on-request" },
    ],
  }),
  "fixture-industry-9": industryVariant(9, {
    flagshipUseCases: [useCase("Fixture control evaluation", "fixture-solution-4"), useCase("Fixture permit conditions register", "fixture-solution", "on-request"), useCase("Fixture private workspace", "fixture-solution-5", "on-request")],
    leadSolutions: ["fixture-solution-4", "fixture-solution"],
    packages: [
      { solution: "fixture-solution-4", package: "fixture-evaluation-vendor" },
      { solution: "fixture-solution", package: "fixture-on-request-package" },
      { solution: "fixture-solution-5", package: "fixture-switch-on-workspace" },
    ],
  }),
};

/** One regulatory file per industry: Government has its own, the others share regulatoryFixture's rows. */
export const regulatoryFixtures: Record<string, RegulatoryData> = Object.fromEntries(
  Object.keys(industryFixtures).map((id) => [id, id === "fixture-government" ? governmentRegulatoryFixture : regulatoryFixture]),
);

export const traceFixtures: Record<string, TraceData> = {
  "fixture-trace": traceFixture,
  "fixture-hero-trace": heroTraceFixture,
};

const insight = (id: string, data: Omit<InsightData, "illustrative" | "draft"> & Partial<Pick<InsightData, "illustrative" | "draft">>) => ({
  id,
  body: `Fixture body for ${id}. A fictional post about fixture registers, fixture tests and fixture teams, long enough to take a minute to read. `.repeat(3).trim(),
  data: { illustrative: false, draft: false, ...data },
});

export const insightFixtures: { id: string; body: string; data: InsightData }[] = [
  insight("fixture-insight-platform", {
    title: "Fixture platform guide: the fixture AI you already pay for",
    description: "Fixture description: what the fixture software switches on, and where it processes data.",
    publishDate: new Date("2026-07-15"),
    updatedDate: new Date("2026-08-01"),
    type: "platform-guide",
    industries: ["fixture-industry-5"],
    solutions: ["fixture-solution-5"],
  }),
  insight("fixture-insight-register", {
    title: "Fixture article: reading fixture agreements at scale",
    description: "Fixture description: why a fixture register beats reading every fixture agreement by hand.",
    publishDate: new Date("2026-09-20"),
    type: "article",
    industries: ["fixture-industry", "fixture-industry-3"],
    solutions: ["fixture-solution"],
  }),
  insight("fixture-insight-draft", {
    title: "Fixture draft: not published yet",
    description: "Fixture description: a draft that no view may list.",
    publishDate: new Date("2026-09-28"),
    type: "article",
    industries: ["fixture-industry"],
    solutions: [],
    draft: true,
  }),
  insight("fixture-insight-evaluation", {
    title: "Fixture article: what a fixture evaluation reports",
    description: "Fixture description: thresholds, failures and the fixture test kit you keep.",
    publishDate: new Date("2026-06-01"),
    type: "article",
    industries: ["fixture-industry", "fixture-government", "fixture-industry-9"],
    solutions: [],
  }),
  insight("fixture-insight-scenario", {
    title: "Fixture reference scenario: an agency tests its fixture assistant",
    description: "Fixture description: an illustrative walk through a fixture evaluation.",
    publishDate: new Date("2026-08-30"),
    type: "reference-scenario",
    illustrative: true,
    industries: ["fixture-industry", "fixture-government"],
    solutions: ["fixture-solution-4"],
  }),
];
