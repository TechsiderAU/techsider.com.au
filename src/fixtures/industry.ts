// Preview-only fixtures: the rules are in src/fixtures/index.ts.
// industryFixture is a generic industry lens page. governmentIndustryFixture covers the
// jurisdiction fields only the Government page uses: three sub-sections (Commonwealth, State,
// Local), each with 4 chips, 3 works-alongside systems and 3 packages, all tagged (spec §8.5).
// One package recurs in two sub-sections, as a real Government page may repeat an offer.
// src/fixtures/sets.ts holds the seven other fixture industries.
import type { IndustryData } from "../content/schemas.ts";
import { mockPanelFixture } from "./mock-panel.ts";

export const INDUSTRY_FIXTURE_ID = "fixture-industry";
export const GOVERNMENT_INDUSTRY_FIXTURE_ID = "fixture-government";

export const industryFixture: IndustryData = {
  promise: "Fixture promise: fewer hours spent reading fixture paperwork by hand.",
  constraintSet: "Fixture constraints: records stay in the fixture region and a person approves every change.",
  constraintHook: "Fixture hook: built around a fixture approval step",
  flagshipUseCases: [
    { name: "Fixture use case A", solution: "fixture-solution", status: "launch" },
    { name: "Fixture use case B", solution: "fixture-solution", status: "launch", note: "Fixture note: needs a fixture export first" },
    { name: "Fixture use case C", solution: "fixture-solution", status: "on-request" },
  ],
  obligationChips: [
    { label: "Fixture obligation one", row: "fixture-row-1" },
    { label: "Fixture obligation two", row: "fixture-row-2" },
    { label: "Fixture obligation three", row: "fixture-row-3" },
    // 60 unbroken characters: the long-text edge reaches the Industry template's 320px checks.
    { label: "Fixture obligation four: FixturereferencecodeFixturereferencecodeFixturereferencecode", row: "fixture-row-4" },
  ],
  worksAlongside: [
    { system: "Fixture records system", method: "read-only", verified: new Date("2026-09-01") },
    { system: "Fixture accounts system", method: "import", verified: new Date("2026-09-01") },
    { system: "Fixture shared inbox", method: "draft-for-approval", verified: new Date("2026-09-01") },
  ],
  leadSolutions: ["fixture-solution"],
  // The generic package, a launch package and an on-request package of fixture-solution.
  packages: [
    { solution: "fixture-solution", package: "fixture-generic-package" },
    { solution: "fixture-solution", package: "fixture-launch-package" },
    { solution: "fixture-solution", package: "fixture-on-request-package" },
  ],
  platformFirst: "Fixture platform-first note: the fixture records system already drafts summaries, so try that first.",
  dontDo: [
    "Fixture limit: we don't make the final call on a fixture record.",
    "Fixture limit: we don't rebuild what the fixture records system already does.",
  ],
  problem: {
    from: "Fixture before: a fixture officer reads each agreement by hand.",
    to: "Fixture after: the fixture officer checks a register with linked sources.",
    source: { label: "Fixture survey", url: "https://example.com/fixture/survey", asAt: new Date("2026-08-01") },
  },
  workflow: [
    { id: "fixture-intake", stage: "Fixture intake", useCases: [{ name: "Fixture use case A", solution: "fixture-solution", status: "launch" }] },
    { id: "fixture-review", stage: "Fixture review", useCases: [{ name: "Fixture use case B", solution: "fixture-solution", status: "launch" }] },
    { id: "fixture-approval", stage: "Fixture approval", useCases: [{ name: "Fixture use case C", solution: "fixture-solution", status: "on-request" }] },
    { id: "fixture-reporting", stage: "Fixture reporting", useCases: [{ name: "Fixture use case D", solution: "fixture-solution", status: "launch" }] },
  ],
  mockPanel: mockPanelFixture,
  scenario: {
    title: "Fixture scenario: a fictional team clears its agreement backlog",
    problem: "Fixture problem: the fixture team reads every agreement by hand and misses expiry dates.",
    approach: "Fixture approach: a fixture register with linked sources and a review queue.",
    measure: ["Fixture measure: hours spent per fixture agreement", "Fixture measure: exceptions found per fixture batch"],
    shipsFirst: "Fixture first release: the register with linked sources",
    trace: "fixture-trace",
  },
  firstEngagement: {
    needFromYou: ["Fixture need: a sample of fixture agreements", "Fixture need: one fixture reviewer"],
    youGet: ["Fixture deliverable: a working fixture register", "Fixture deliverable: a fixture test report"],
    exitRamp: "Fixture exit: keep the fixture register and stop there.",
  },
  faq: [
    { q: "Fixture question one?", a: "Fixture answer one, long enough to pass the schema." },
    { q: "Fixture question two?", a: "Fixture answer two, long enough to pass the schema." },
    { q: "Fixture question three?", a: "Fixture answer three, long enough to pass the schema." },
    { q: "Fixture question four?", a: "Fixture answer four, long enough to pass the schema." },
    { q: "Fixture question five?", a: "Fixture answer five, long enough to pass the schema." },
  ],
};

const verified = new Date("2026-09-10");

export const governmentIndustryFixture: IndustryData = {
  ...industryFixture,
  promise: "Fixture promise: fewer hours spent reading fixture paperwork across fixture agencies.",
  constraintHook: "Fixture hook: built around a fixture agency approval step",
  flagshipUseCases: [
    { name: "Fixture evaluation of an agency assistant", solution: "fixture-solution-4", status: "launch" },
    { name: "Fixture vendor upgrade evaluation", solution: "fixture-solution-4", status: "launch" },
    { name: "Fixture council policy assistant", solution: "fixture-solution-2", status: "launch" },
  ],
  leadSolutions: ["fixture-solution-4", "fixture-solution-2"],
  // Rows fixture-gov-row-1..4 are Commonwealth, 5..8 state and 9..12 local
  // (see governmentRegulatoryFixture). Row 5 also covers cth, so it renders in two sections.
  obligationChips: [
    { label: "Fixture Commonwealth obligation one", row: "fixture-gov-row-1", jurisdiction: "cth" },
    { label: "Fixture Commonwealth obligation two", row: "fixture-gov-row-2", jurisdiction: "cth" },
    { label: "Fixture Commonwealth obligation three", row: "fixture-gov-row-3", jurisdiction: "cth" },
    { label: "Fixture Commonwealth obligation four", row: "fixture-gov-row-4", jurisdiction: "cth" },
    { label: "Fixture NSW obligation one", row: "fixture-gov-row-5", jurisdiction: "nsw" },
    { label: "Fixture NSW obligation two", row: "fixture-gov-row-6", jurisdiction: "nsw" },
    { label: "Fixture Victorian obligation one", row: "fixture-gov-row-7", jurisdiction: "vic" },
    { label: "Fixture Victorian obligation two", row: "fixture-gov-row-8", jurisdiction: "vic" },
    { label: "Fixture local obligation one", row: "fixture-gov-row-9", jurisdiction: "local" },
    { label: "Fixture local obligation two", row: "fixture-gov-row-10", jurisdiction: "local" },
    { label: "Fixture local obligation three", row: "fixture-gov-row-11", jurisdiction: "local" },
    { label: "Fixture local obligation four", row: "fixture-gov-row-12", jurisdiction: "local" },
  ],
  worksAlongside: [
    { system: "Fixture Commonwealth records system", method: "read-only", verified, jurisdiction: "cth" },
    { system: "Fixture Commonwealth case system", method: "import", verified, jurisdiction: "cth" },
    { system: "Fixture Commonwealth shared inbox", method: "draft-for-approval", verified, jurisdiction: "cth" },
    { system: "Fixture NSW records system", method: "read-only", verified, jurisdiction: "nsw" },
    { system: "Fixture Victorian case system", method: "import", verified, jurisdiction: "vic" },
    { system: "Fixture state shared inbox", method: "draft-for-approval", verified, jurisdiction: "nsw" },
    { system: "Fixture council records system", method: "read-only", verified, jurisdiction: "local" },
    { system: "Fixture council permit system", method: "import", verified, jurisdiction: "local" },
    { system: "Fixture council shared inbox", method: "draft-for-approval", verified, jurisdiction: "local" },
  ],
  packages: [
    { solution: "fixture-solution-4", package: "fixture-evaluation-report", jurisdiction: "cth" },
    { solution: "fixture-solution-4", package: "fixture-evaluation-vendor", jurisdiction: "cth" },
    { solution: "fixture-solution-4", package: "fixture-evaluation-on-request", jurisdiction: "cth" },
    { solution: "fixture-solution-4", package: "fixture-evaluation-report", jurisdiction: "nsw" },
    { solution: "fixture-solution-4", package: "fixture-evaluation-control", jurisdiction: "vic" },
    { solution: "fixture-solution", package: "fixture-second-launch-package", jurisdiction: "nsw" },
    { solution: "fixture-solution", package: "fixture-generic-package", jurisdiction: "local" },
    { solution: "fixture-solution", package: "fixture-on-request-package", jurisdiction: "local" },
    { solution: "fixture-solution-4", package: "fixture-evaluation-generic", jurisdiction: "local" },
  ],
  platformFirst: "Fixture platform-first note: the fixture agency suite already summarises cases, so try that first.",
  dontDo: ["Fixture limit: we never evaluate a fixture system we built for the same agency."],
  jurisdictions: ["cth", "nsw", "vic", "local"],
};
