// Preview-only fixture: the rules are in src/fixtures/index.ts.
// Threshold targets and results are typed metrics ({ value, unit }), never free text (spec §9.3).
import type { SampleReportData } from "../content/schemas.ts";

export const SAMPLE_REPORT_FIXTURE_ID = "fixture-report";

export const sampleReportFixture: SampleReportData = {
  system: "Fixture assistant over the Northwind Fixture Pty Ltd sample manuals",
  n: 40,
  method: "Fixture method: each fixture question asked once and marked by a fixture reviewer against a fixture answer key",
  thresholds: [
    { metric: "Fixture citation accuracy", target: { value: 90, unit: "%" }, result: { value: 92, unit: "%" }, pass: true },
    { metric: "Fixture refusal when unsure", target: { value: 100, unit: "%" }, result: { value: 95, unit: "%" }, pass: false },
  ],
  failures: [
    { id: "fixture-failure-1", rating: "high", description: "Fixture failure: answered an out-of-scope fixture question instead of refusing" },
    { id: "fixture-failure-2", rating: "medium", description: "Fixture failure: cited the right fixture manual but the wrong clause" },
    { id: "fixture-failure-3", rating: "low", description: "Fixture failure: correct answer with a citation to a superseded fixture page" },
  ],
};
