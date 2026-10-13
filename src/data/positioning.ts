// The positioning copy several pages share (spec §3.1–§3.2), typed by positioningData in
// src/content/page-schemas.ts and parsed by tests/content-data.test.mjs. Home (Phase D) renders
// the sub-promise and the four pillars; About renders the origin line.
// - The pillars run cited, measured, onshore, ownership, as the schema requires. Each mechanism is
//   a contract commitment (spec §4.2, §12 item 2), so it stays only if the standard terms hold it.
// - The onshore pillar (go-global §4.1) promises only where systems run and where data is stored and
//   processed: the client's own account, in the cloud region they choose, or an Australian region
//   when Techsider manages the system (D3). Remote access from a third country is a transfer (EDPB
//   Guidelines 05/2021, the ICO), so the mechanism says the team reaches systems remotely from
//   Sydney under the contract's transfer terms (D4). The title and midMarket state only the region,
//   so every page that shows one also carries that sentence.
// ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2)
import type { PositioningData } from "../content/page-schemas.ts";

export const POSITIONING: PositioningData = {
  // ⚑ owner: confirm the sub-promise wording (spec §12 item 12)
  subPromise:
    "We design, build and run AI solutions, from 40-person practices to government agencies. In your environment, with your data kept in the region you choose.",
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
      title: "Your data stays in your region.",
      mechanism: "Systems we build for you run in your own Microsoft or AWS account, in the cloud region you choose. Systems we manage for you run in an Australian region. Our team reaches them remotely from Sydney, under the data-transfer terms in your contract. Every launch package carries a region note on where processing runs, including inside software you already license.",
      midMarket: "What we build keeps your data in the region you choose.",
    },
    {
      id: "ownership",
      title: "You own what we build.",
      mechanism: "Your code, prompts, evaluation tests and retrieval index live in your own repository.",
      midMarket: "Yours to keep, or ours to run, with the exit built in.",
    },
  ],
};
