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
