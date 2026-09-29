// Preview-only fixture: the rules are in src/fixtures/index.ts.
// Metrics are typed values (spec §9.3), so the detail strings carry no numbers.
import type { TraceData } from "../content/schemas.ts";

export const TRACE_FIXTURE_ID = "fixture-trace";

export const traceFixture: TraceData = {
  title: "Fixture trace: register extraction",
  provenance: "illustrative",
  lines: [
    { t: "09:00:00", op: "fixture.load", detail: "Fixture document set opened" },
    { t: "09:00:01", op: "fixture.extract", detail: "Fixture fields read from agreement A" },
    { t: "09:00:02", op: "fixture.cite", detail: "Fixture clause linked to its source page" },
    { t: "09:00:03", op: "fixture.check", detail: "Fixture exception flagged for a person to review" },
    { t: "09:00:04", op: "fixture.done", detail: "Fixture register row written", metric: { value: 420, unit: "ms" } },
  ],
};

/** The Home hero's decorative trace (spec §6.5), named by homeFixture.heroTrace. */
export const HERO_TRACE_FIXTURE_ID = "fixture-hero-trace";

export const heroTraceFixture: TraceData = {
  title: "Fixture trace: a fixture question answered with its source",
  provenance: "illustrative",
  lines: [
    { t: "10:00:00", op: "fixture.ask", detail: "Fixture question received" },
    { t: "10:00:01", op: "fixture.retrieve", detail: "Fixture manual pages searched" },
    { t: "10:00:02", op: "fixture.cite", detail: "Fixture answer linked to its source page" },
    { t: "10:00:03", op: "fixture.check", detail: "Fixture answer checked against the fixture test set", metric: { value: 92, unit: "%" } },
    { t: "10:00:04", op: "fixture.done", detail: "Fixture answer shown with its citation", metric: { value: 380, unit: "ms" } },
  ],
};
