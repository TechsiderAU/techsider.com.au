// Preview-only fixture: the rules are in src/fixtures/index.ts.
// Threshold targets, results, intervals and the inter-rater figure are typed metrics
// ({ value, unit }), never free text (spec §9.3). Every number here is made up, so the report
// is illustrative and SampleReport labels it so. It carries every spec §9.1 field: n, the
// ground-truth method, inter-rater agreement, confidence intervals, rated failures mapped to a
// framework's levels, and a model-change regression view.
import type { SampleReportData } from "../content/schemas.ts";

export const SAMPLE_REPORT_FIXTURE_ID = "fixture-report";

export const sampleReportFixture: SampleReportData = {
  system: "Fixture assistant over the Northwind Fixture Pty Ltd sample manuals",
  n: 40,
  method: "Fixture method: each fixture question asked once and marked by a fixture reviewer against a fixture answer key",
  groundTruth: "Fixture ground truth: two fixture reviewers wrote each expected answer from the fixture manuals",
  interRater: { statistic: "Fixture agreement statistic", value: { value: 0.82 } },
  framework: "Fixture risk framework",
  provenance: "illustrative",
  thresholds: [
    {
      metric: "Fixture citation accuracy",
      target: { value: 90, unit: "%" },
      result: { value: 92, unit: "%" },
      ci: { low: 86, high: 96, level: 95 },
      pass: true,
    },
    {
      metric: "Fixture refusal when unsure",
      target: { value: 100, unit: "%" },
      result: { value: 95, unit: "%" },
      ci: { low: 88, high: 99, level: 95 },
      pass: false,
    },
  ],
  failures: [
    { id: "fixture-failure-1", rating: "high", description: "Fixture failure: answered an out-of-scope fixture question instead of refusing", frameworkLevel: "Fixture level 3" },
    { id: "fixture-failure-2", rating: "medium", description: "Fixture failure: cited the right fixture manual but the wrong clause", frameworkLevel: "Fixture level 2" },
    { id: "fixture-failure-3", rating: "low", description: "Fixture failure: correct answer with a citation to a superseded fixture page", frameworkLevel: "Fixture level 1" },
  ],
  regression: {
    baseline: "Fixture model A",
    candidate: "Fixture model B",
    rows: [
      { metric: "Fixture citation accuracy", baseline: { value: 92, unit: "%" }, candidate: { value: 89, unit: "%" } },
      { metric: "Fixture refusal when unsure", baseline: { value: 95, unit: "%" }, candidate: { value: 97, unit: "%" } },
    ],
  },
};
