// The positioning copy several pages share (spec §3.1–§3.2), typed by positioningData in
// src/content/page-schemas.ts and parsed by tests/content-data.test.mjs. Home (Phase D) renders
// the sub-promise and the four pillars; About renders the origin line.
// - The pillars run cited, measured, onshore, ownership, as the schema requires. Each mechanism is
//   a contract commitment (spec §4.2, §12 item 2), so it stays only if the standard terms hold it.
// - The onshore pillar's plain version is the scoped one. Spec §3.2 allows "Your data stays in
//   Australia." only once the owner confirms the enquiry mailbox is stored in Australia (§12 item 1).
// ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2)
import type { PositioningData } from "../content/page-schemas.ts";

export const POSITIONING: PositioningData = {
  // ⚑ owner: confirm the sub-promise wording (spec §12 item 12)
  subPromise:
    "We design, build and run AI solutions for Australian organisations, from 40-person practices to federal agencies. In your environment, with your data onshore by default.",
  originLine: "AI pilots are easy to start and hard to ship. We build the kind that survive scrutiny.",
  pillars: [
    {
      id: "cited",
      title: "Cited, or it refuses.",
      mechanism: "Every answer cites its source. When the grounding is weak, the system says so instead of answering.",
      midMarket: "Shows the page, or says it doesn't know.",
    },
    {
      id: "measured",
      title: "Measured before it ships.",
      mechanism: "Acceptance tests run against thresholds agreed up front. The evaluation report is a deliverable, and the system is re-tested when the AI model changes.",
      midMarket: "Tested the way you'd check a graduate's work.",
    },
    {
      id: "onshore",
      title: "Your data stays onshore.",
      mechanism: "The systems we build or run for you are deployed in an Australian region, in your own account or managed by us. Every launch package carries an onshore note on where processing runs, including inside a platform you already license.",
      midMarket: "What we build keeps your data in Australia.",
    },
    {
      id: "ownership",
      title: "You own what we build.",
      mechanism: "Your code, prompts, evaluation tests and retrieval index live in your own repository.",
      midMarket: "Yours to keep, or ours to run, with the exit built in.",
    },
  ],
};
