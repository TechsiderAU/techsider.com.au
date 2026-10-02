// The About page's data (spec §8.10), validated by aboutData in src/content/page-schemas.ts and
// rendered by src/pages/about/[...page].astro through AboutTemplate. The principles are the four
// positioning pillars with their mechanisms (src/data/positioning.ts), then vendor neutrality.
// The build log holds real events only: tests/company-pages.test.mjs checks each entry against the
// commits that made it, dated in Australia/Sydney time. No names and no headcount (spec D14, D15).
// ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2)
import type { AboutData } from "../content/page-schemas.ts";
import { POSITIONING } from "./positioning.ts";

export const ABOUT: AboutData = {
  mission: "We help Australian businesses turn repetitive work into workflows their teams can check and operate.",
  // ⚑ owner: confirm the "40-person practices to federal agencies" range reads as who the offer is for, not as clients (spec §1 criterion 6, §12 item 12)
  whoWeServe:
    "For Australian businesses with repeated document, inbox and knowledge tasks. We start with one process and check your existing tools before recommending a build.",
  whyControl:
    "AI that reads your documents or drafts your letters handles client data and records that people rely on. So you keep control: answers cite their source or say they don't know, a person approves anything sent or changed, and the tests stay yours to re-run.",
  principles: [
    ...POSITIONING.pillars.map(({ title, mechanism }) => ({ title, body: mechanism })),
    {
      title: "Vendor-neutral.",
      body: "Recommends the tool that fits, including AI you already license. Techsider resells no licences and discloses any vendor relationship.",
    },
  ],
  howWeWork: [
    {
      title: "Check what you already pay for.",
      body: "Find out whether the AI inside your current software already does the job. If it does, you hear that on the first call, before anything is built.",
    },
    {
      title: "Prove it on known answers.",
      body: "Test the system on 30–50 documents or questions your people already know the answers to, or on public or synthetic data where yours can't be used yet. You see the measured error rate, then decide whether to continue.",
    },
    {
      // ⚑ owner: re-confirm team claims (spec §12 item 10)
      title: "Build to an acceptance test.",
      body: "The people who scope your work also build and test it, against thresholds agreed before work starts. The report lists every failure alongside the score.",
    },
    {
      title: "Keep it, or have it run for you.",
      body: "Custom deliverables are handed over with the agreed documentation and tests. Third-party software stays under the vendor’s terms. Support coverage and any managed-service exit arrangements are agreed in the proposal.",
    },
  ],
  // Newest first. Each entry is evidenced by the commits BUILD_LOG_EVIDENCE names in
  // tests/company-pages.test.mjs: add the evidence there before adding an entry here.
  buildLog: [
    { date: new Date("2026-09-29"), event: "This site gains browser tests with accessibility checks, run in Chromium and WebKit, and a CI workflow set to add Firefox." },
    { date: new Date("2026-09-29"), event: "Every build of this site now checks its copy for implied clients, hype and pricing language, and fails on a figure labelled measured that has no recorded run." },
    { date: new Date("2026-09-28"), event: "Site rebuild begins, with a new brand system and the [techsider] wordmark." },
    { date: new Date("2026-09-28"), event: "Home page demo gains pause and skip controls, and status updates a screen reader can follow." },
    { date: new Date("2026-09-28"), event: "Home page demo corrected: its CPS 230 citation now points to ¶34, it covers the ¶41 and ¶60 notices, and its scores are labelled illustrative." },
    { date: new Date("2026-06-14"), event: "Canned retrieval demo over APRA's CPS 230 added to the home page, with a static transcript for readers without JavaScript." },
    { date: new Date("2026-06-14"), event: "Insights section and its RSS feed added to the site." },
    { date: new Date("2026-05-12"), event: "First techsider.com.au landing page built with Astro, with a workflow that deploys it to GitHub Pages." },
  ],
};
