// The Home page's own data (spec §8.1), typed by homeData in src/content/page-schemas.ts and parsed
// by tests/content-data.test.mjs. The rest of the Home page comes from positioning.ts (the
// sub-promise and the four pillars), services.ts (the two routes in, the delivery choices and the
// onshore note), the solutions and industries collections, and the insights.
// - heroTrace names src/data/traces/home-hero.json, the hero's decorative, illustrative trace.
// - The FAQ asks HOME_TRUST_QUESTION (spec §8.1.10) and answers it with the published method, the
//   independence policy's first line (quoted from services.ts, so the owner's one sign-off covers
//   both) and the exit pack. It sends the reader to the method and the demos, never to "the work":
//   there is no client work to check yet. trustPageLine ends that answer only while /trust/ is
//   shown: homeView() appends it then, so the answer never points at a page the build doesn't have.
// - Nothing about money (D4), no implied clients (spec §3.5), and the entry offers by their §3.4
//   names ("sprint" only inside "Feasibility Sprint").
// ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2)
import type { HomeData } from "../content/page-schemas.ts";

export const HOME: HomeData = {
  heroTrace: "home-hero",
  faq: [
    { q: "What if our existing software already meets the need?", a: "We check that first. If a suitable feature already exists, we can help configure it and show your team how to use it." },
    { q: "How do we know the workflow works?", a: "We agree acceptance criteria and test on examples your team knows. You see the results before deciding whether to continue." },
    { q: "What happens after launch?", a: "Support and improvement can be included in the proposal. We agree the coverage, responsibilities and review process for your workflow." },
  ],
  trustPageLine: "Our Trust page sets out how we handle your data, with plain answers to common security questions.",
};
