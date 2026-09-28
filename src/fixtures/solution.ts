// Preview-only fixture: the rules are in src/fixtures/index.ts.
// Covers every package state: a launch generic package (onshore), two launch packages
// (the first isn't onshore), an on-request package and an internal one (never rendered).
// Two launch packages, as in spec §4.1's Document Registers, give the Tabs specimen two tabs.
import type { z } from "astro/zod";
import type { makeSolutionSchema } from "../content/schemas.ts";

type SolutionData = z.infer<ReturnType<typeof makeSolutionSchema>>;

export const SOLUTION_FIXTURE_ID = "fixture-solution";

export const solutionFixture: SolutionData = {
  job: "Fixture job: turn a pile of fixture agreements into a register a person can check.",
  artefact: "Fixture artefact: a register where every value links to its fixture source page.",
  needProfiles: [
    { title: "Fixture need A", body: "Fixture body: a team that reads the same fixture clauses by hand every month." },
    { title: "Fixture need B", body: "Fixture body: a team that must show where each fixture value came from." },
  ],
  byIndustry: ["fixture-industry"],
  genericPackage: {
    id: "fixture-generic-package",
    name: "Fixture Generic Package",
    status: "launch",
    onshore: true,
    forWhom: "Fixture audience: a small fixture team with one repeated reading job.",
    scope: "Fixture scope: one fixture document type, one register and one review screen.",
    inclusions: [
      "Fixture inclusion: a test set and its report",
      "Fixture inclusion: handover notes for the fixture team",
    ],
    clientTime: "Fixture client time: about two hours a week from one fixture reviewer",
    timeline: "Fixture timeline: four weeks",
    outOfScope: ["Fixture exclusion: changes to the fixture records system"],
    gate: "Fixture gate: the fixture test set passes before anything goes live",
    onshoreNote: "Fixture onshore note: runs in an Australian region of the fixture cloud account",
  },
  packages: [
    {
      id: "fixture-launch-package",
      name: "Fixture Launch Package",
      status: "launch",
      onshore: false,
      forWhom: "Fixture audience: a fixture team already using a hosted fixture platform.",
      scope: "Fixture scope: one fixture register built on the platform you already license.",
      inclusions: ["Fixture inclusion: a test set and its report"],
      clientTime: "Fixture client time: about one hour a week from one fixture reviewer",
      timeline: "Fixture timeline: three weeks",
      outOfScope: ["Fixture exclusion: new fixture platform licences"],
      gate: "Fixture gate: the fixture reviewer signs off the test report",
      onshoreNote: "Fixture onshore note: data residency follows the fixture platform settings",
      precondition: "Fixture precondition: an export from the fixture records system exists",
    },
    {
      id: "fixture-second-launch-package",
      name: "Fixture Second Launch Package",
      status: "launch",
      onshore: true,
      forWhom: "Fixture audience: a second fixture team with its own fixture document family.",
      scope: "Fixture scope: a second fixture document type, register and review screen.",
      inclusions: [
        "Fixture inclusion: a test set and its report",
        "Fixture inclusion: an exception queue for the fixture reviewer",
      ],
      clientTime: "Fixture client time: about two hours a week from one fixture reviewer",
      timeline: "Fixture timeline: five weeks",
      outOfScope: ["Fixture exclusion: changes to the fixture records system"],
      gate: "Fixture gate: the fixture test set passes before anything goes live",
      onshoreNote: "Fixture onshore note: runs in an Australian region of the fixture cloud account",
    },
    {
      id: "fixture-on-request-package",
      name: "Fixture On-Request Package",
      status: "on-request",
      oneLiner: "Fixture one-liner: available on request for larger fixture document sets.",
    },
    {
      id: "fixture-internal-package",
      name: "Fixture Internal Package",
      status: "internal",
      oneLiner: "Fixture one-liner: internal only and never rendered.",
      precondition: "Fixture precondition: an internal fixture review",
    },
  ],
  program: {
    title: "Fixture program",
    summary: "Fixture summary: the same fixture register rolled out across several fixture teams.",
    duration: "Fixture duration: twelve weeks",
    bullets: ["Fixture bullet: one team at a time", "Fixture bullet: a shared fixture test set"],
  },
  howWeTest: {
    summary: "Fixture summary: every fixture register is checked against a hand-marked fixture set.",
    bullets: [
      "Fixture test: each extracted value is compared with the fixture answer key",
      "Fixture test: every exception is traced back to its fixture source page",
    ],
  },
  whereItRuns: {
    choices: ["your-account", "managed", "platform-you-license"],
    note: "Fixture note: the fixture team picks where the register runs.",
  },
  platformFirst: "Fixture platform-first note: check what the fixture software already includes first.",
  dontDo: ["Fixture limit: the system never makes the final call on a fixture record."],
  matrix: { "fixture-industry": "Fixture cell: agreements register" },
  demo: "fixture-demo",
  faq: [
    { q: "Fixture question one?", a: "Fixture answer one, long enough to pass the schema." },
    { q: "Fixture question two?", a: "Fixture answer two, long enough to pass the schema." },
    { q: "Fixture question three?", a: "Fixture answer three, long enough to pass the schema." },
  ],
};
