// Preview-only fixtures: the rules are in src/fixtures/index.ts.
// kitFixture is lawyer-reviewed; pendingKitFixture still awaits review (lawyerReviewedAt: null).
import type { z } from "astro/zod";
import type { makeKitSchema } from "../content/schemas.ts";

type KitData = z.infer<ReturnType<typeof makeKitSchema>>;

export const KIT_FIXTURE_ID = "fixture-kit";

export const kitFixture: KitData = {
  industry: "fixture-industry",
  title: "Fixture safe-use kit",
  summary: "Fixture summary: a starter kit for a fictional team trying AI on low-risk fixture work.",
  contents: [
    "Fixture acceptable-use policy template",
    "Fixture staff briefing notes",
    "Fixture register of approved tools",
  ],
  source: { label: "Fixture guidance note", url: "https://example.com/fixture/guidance-note", asAt: new Date("2026-09-01") },
  asAt: new Date("2026-09-01"),
  lawyerReviewedAt: new Date("2026-09-15"),
  download: "/downloads/fixture-kit.pdf",
};

export const PENDING_KIT_FIXTURE_ID = "fixture-pending-kit";

export const pendingKitFixture: KitData = {
  ...kitFixture,
  title: "Fixture safe-use kit awaiting review",
  summary: "Fixture summary: a starter kit whose fixture lawyer review is not done yet.",
  lawyerReviewedAt: null,
  download: "/downloads/fixture-pending-kit.pdf",
};
