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
import { HOME_TRUST_QUESTION } from "../lib/fixed-copy.ts";
import { SERVICES } from "./services.ts";

export const HOME: HomeData = {
  heroTrace: "home-hero",
  faq: [
    // ⚑ owner: "our evaluation method is published" holds only while /resources/evaluation-method/ is live at launch (research index B10)
    {
      q: HOME_TRUST_QUESTION,
      a: `Don't take it on trust: check the method and the demos. Our evaluation method is published, so you can see how we test before you talk to us. ${SERVICES.independence[0]} If we run a system for you, the exit pack of code, data, configuration and runbook lets you move it or run it yourself.`,
    },
    {
      q: "Where does our data go?",
      a: "What we build or run for you is deployed in an Australian region, in your own Microsoft or AWS account or managed by us, and each launch package's onshore note records where model inference actually runs. Inside a platform you already license, the vendor sets where processing happens: we show you its published processing location, with the source, or tell you it isn't published.",
    },
    {
      q: "How do we start?",
      a: "With a 30-minute Fit Call on one problem you want to fix. Mid-market teams then start with an Admin Hours Audit or a Two-Week Trial on Your Own Files; government and enterprise teams with an Independent Evaluation or a Feasibility Sprint on public or synthetic data.",
    },
    {
      q: "What if our software's AI already does the job?",
      a: "Then we'll say so, and you won't need us for it. AI Switch-On configures the AI features you already own, and we don't resell licences.",
    },
    {
      q: "Who owns what you build?",
      a: "You do. Your code, prompts, evaluation tests and index live in your own repository, whether your team runs the system or we do.",
    },
    {
      q: "Is the demo on this page a live AI model?",
      a: "No. It's a canned replay over public documents: it runs in your browser and never calls a model. Its scores and timings are illustrative, not a measured run, and each document is named with its licence.",
    },
  ],
  trustPageLine: "Our Trust page sets out how we handle your data, with plain answers to common security questions.",
};
