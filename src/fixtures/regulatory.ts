// Preview-only fixture: the rules are in src/fixtures/index.ts.
// `evidence` names an artefact and never claims it satisfies an obligation (spec §11.6).
import type { z } from "astro/zod";
import type { regulatoryFile } from "../content/schemas.ts";

type RegulatoryData = z.infer<typeof regulatoryFile>;

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
  ],
};

/** The Government file, src/data/regulatory/government.json: every row names its jurisdictions (CI check 08). */
export const GOVERNMENT_REGULATORY_FIXTURE_ID = "fixture-government";

type Jurisdiction = NonNullable<RegulatoryData["rows"][number]["jurisdictions"]>[number];

// One row per Government sub-section; governmentIndustryFixture's chips link to these rows.
const GOVERNMENT_ROW_JURISDICTION: Record<string, Jurisdiction> = {
  "fixture-row-1": "cth",
  "fixture-row-2": "nsw",
  "fixture-row-3": "local",
};

export const governmentRegulatoryFixture: RegulatoryData = {
  rows: regulatoryFixture.rows.map((row) => ({ ...row, jurisdictions: [GOVERNMENT_ROW_JURISDICTION[row.id]] })),
};
