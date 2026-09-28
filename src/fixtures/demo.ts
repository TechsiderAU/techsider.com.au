// Preview-only fixture: the rules are in src/fixtures/index.ts.
import type { z } from "astro/zod";
import type { makeDemoSchema } from "../content/schemas.ts";

type DemoData = z.infer<ReturnType<typeof makeDemoSchema>>;

export const DEMO_FIXTURE_ID = "fixture-demo";

export const demoFixture: DemoData = {
  solution: "fixture-solution",
  title: "Fixture register demo",
  kind: "register",
  provenance: "illustrative",
  data: {
    caption: "Fixture register over three fixture agreements",
    rows: [
      { document: "Fixture agreement A", field: "Fixture repair limit", value: "Fixture value present", status: "ok" },
      { document: "Fixture agreement B", field: "Fixture landlord insurance", value: "Fixture value expired", status: "review" },
      { document: "Fixture agreement C", field: "Fixture signed authority", value: "Fixture value missing", status: "blocked" },
    ],
  },
};
