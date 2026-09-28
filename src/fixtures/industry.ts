// Preview-only fixtures: the rules are in src/fixtures/index.ts.
// industryFixture is a generic industry lens page; governmentIndustryFixture adds the
// jurisdiction fields only the Government page uses.
import type { z } from "astro/zod";
import type { makeIndustrySchema } from "../content/schemas.ts";
import { mockPanelFixture } from "./mock-panel.ts";

type IndustryData = z.infer<ReturnType<typeof makeIndustrySchema>>;

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
  ],
  worksAlongside: [
    { system: "Fixture records system", method: "read-only", verified: new Date("2026-09-01") },
    { system: "Fixture accounts system", method: "import", verified: new Date("2026-09-01") },
    { system: "Fixture shared inbox", method: "draft-for-approval", verified: new Date("2026-09-01") },
  ],
  leadSolutions: ["fixture-solution"],
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

export const governmentIndustryFixture: IndustryData = {
  ...industryFixture,
  promise: "Fixture promise: fewer hours spent reading fixture paperwork across fixture agencies.",
  constraintHook: "Fixture hook: built around a fixture agency approval step",
  obligationChips: [
    { label: "Fixture Commonwealth obligation", row: "fixture-row-1", jurisdiction: "cth" },
    { label: "Fixture state obligation", row: "fixture-row-2", jurisdiction: "nsw" },
    { label: "Fixture local council obligation", row: "fixture-row-3", jurisdiction: "local" },
  ],
  jurisdictions: ["cth", "nsw", "local"],
};
