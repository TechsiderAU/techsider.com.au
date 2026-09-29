// Preview-only fixture: the rules are in src/fixtures/index.ts.
// `evidence` names an artefact and never claims it satisfies an obligation (spec §11.6).
import type { Jurisdiction, RegulatoryData, RegulatoryRow } from "../content/schemas.ts";

/** A regulatory file is named after its industry: src/data/regulatory/<industry>.json. */
export const REGULATORY_FIXTURE_ID = "fixture-industry";

export const regulatoryFixture: RegulatoryData = {
  rows: [
    {
      id: "fixture-row-1",
      obligation: "Fixture obligation one: keep a record of each automated step",
      meaning: "Fixture meaning: a person can see what the fixture system did and when.",
      design: "Fixture design: every fixture step writes a trace line.",
      evidence: "Fixture evidence: a sample trace export",
      source: "https://example.com/fixture/obligation-one",
      asAt: new Date("2026-09-01"),
      lastReviewed: new Date("2026-09-20"),
    },
    {
      id: "fixture-row-2",
      obligation: "Fixture obligation two: a person approves each outgoing message",
      meaning: "Fixture meaning: nothing leaves the fixture inbox without a named approver.",
      design: "Fixture design: drafts wait in a fixture approval queue.",
      evidence: "Fixture evidence: a sample approval log",
      source: "https://example.com/fixture/obligation-two",
      asAt: new Date("2026-09-01"),
      lastReviewed: new Date("2026-09-20"),
    },
    {
      id: "fixture-row-3",
      obligation: "Fixture obligation three: personal details stay out of prompts",
      meaning: "Fixture meaning: fixture names and addresses are masked before any model call.",
      design: "Fixture design: a masking step runs before every fixture prompt.",
      evidence: "Fixture evidence: a sample masking test report",
      source: "https://example.com/fixture/obligation-three",
      asAt: new Date("2026-09-01"),
      lastReviewed: new Date("2026-09-20"),
      jurisdictions: ["cth", "nsw", "local"],
    },
    {
      id: "fixture-row-4",
      obligation: "Fixture obligation four: keep fixture records for the retention period",
      meaning: "Fixture meaning: the fixture system never deletes a record a person still needs.",
      design: "Fixture design: the fixture register only reads records and never deletes them.",
      evidence: "Fixture evidence: a sample access-log extract",
      source: "https://example.com/fixture/obligation-four",
      asAt: new Date("2026-09-01"),
      lastReviewed: new Date("2026-09-24"),
    },
  ],
};

/** The Government file, src/data/regulatory/government.json: every row names its jurisdictions (CI check 08). */
export const GOVERNMENT_REGULATORY_FIXTURE_ID = "fixture-government";

const WORD = ["one", "two", "three", "four"];
// Four rows per sub-section: fixture-gov-row-1..4 Commonwealth, 5..8 state, 9..12 local.
// Row 5 covers cth as well as nsw, so it appears in the Commonwealth and State sections; row 8
// covers two states, so the State section's "Applies to" column reads "NSW, Vic".
const GOVERNMENT_ROWS: { level: string; lastReviewed: string; jurisdictions: Jurisdiction[] }[] = [
  ...[0, 1, 2, 3].map(() => ({ level: "Commonwealth", lastReviewed: "2026-09-18", jurisdictions: ["cth"] as Jurisdiction[] })),
  { level: "state", lastReviewed: "2026-09-22", jurisdictions: ["cth", "nsw"] },
  { level: "state", lastReviewed: "2026-09-22", jurisdictions: ["nsw"] },
  { level: "state", lastReviewed: "2026-09-16", jurisdictions: ["vic"] },
  { level: "state", lastReviewed: "2026-09-16", jurisdictions: ["nsw", "vic"] },
  ...[0, 1, 2, 3].map(() => ({ level: "local", lastReviewed: "2026-09-12", jurisdictions: ["local"] as Jurisdiction[] })),
];

const governmentRow = ({ level, lastReviewed, jurisdictions }: (typeof GOVERNMENT_ROWS)[number], i: number): RegulatoryRow => ({
  id: `fixture-gov-row-${i + 1}`,
  obligation: `Fixture ${level} obligation ${WORD[i % 4]}: an agency explains each automated fixture step`,
  meaning: `Fixture meaning: a fixture officer can show what the system did for ${level} fixture row ${i + 1}.`,
  design: "Fixture design: every fixture step writes a trace line a person can export.",
  evidence: "Fixture evidence: a sample fixture trace export",
  source: `https://example.com/fixture/gov-obligation-${i + 1}`,
  asAt: new Date("2026-09-01"),
  lastReviewed: new Date(lastReviewed),
  jurisdictions,
});

export const governmentRegulatoryFixture: RegulatoryData = { rows: GOVERNMENT_ROWS.map(governmentRow) };
