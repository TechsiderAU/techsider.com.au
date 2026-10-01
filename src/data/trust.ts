// The Trust page's data (spec §8.11), validated by trustData in src/content/page-schemas.ts and
// rendered by src/pages/trust/[...page].astro through TrustTemplate, with the contact data's
// sub-processors and the Services data's independence policy. /trust/ stays planned (blueprint
// ruling 16): Part A waits for the owner's provider facts (spec §12 item 1), and
// /.well-known/security.txt ships in Phase E. No Part B term is confirmed yet (spec §12 item 2), so
// Part B and every answer resting on it stay off the page, which shows only what is true of the
// website and email today. Insurance isn't mentioned: none is confirmed (spec §12 item 8).
// ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2)
import type { TrustData } from "../content/page-schemas.ts";
import { SITE } from "./nav.ts";

const asAt = new Date("2026-10-01");

export const TRUST: TrustData = {
  asAt,
  partA: {
    // ⚑ owner: re-check once Cloudflare's Email Address Obfuscation, Rocket Loader and NEL reporting are off, or list them here and in the cookies answer below (spec §12 item 1)
    cookies: "None. The site's code sets no cookies.",
    analytics: "None. The site's code loads no analytics or tracking scripts.",
    // ⚑ owner: state how long enquiries are kept (spec §8.11, §12 item 1)
    enquiries: "Enquiries arrive by email or through FormSubmit and are kept in our Lark Suite mailbox. FormSubmit's documentation states that submissions are retained for 30 days. The website's static pages do not store your enquiry.",
    securityContact: SITE.securityContact ?? SITE.email,
  },
  // Spec §8.11 Part B: each renders, tagged "Contract term", only once the owner confirms it is in
  // the standard engagement terms.
  partB: [
    {
      id: "residency",
      title: "Data residency",
      body: "The systems Techsider builds or runs for you process and store your data in an Australian region, in your own Microsoft or AWS account or in one Techsider manages.",
      confirmed: false,
    },
    {
      id: "no-training",
      title: "No training on your data",
      body: "Your data is never used to train a model: not by Techsider, and not by any provider in the systems Techsider builds or runs for you. For AI inside software you already license, the data note states the vendor's training setting.",
      confirmed: false,
    },
    {
      id: "ownership",
      title: "You own what is built",
      body: "The code, prompts, evaluation sets and index built for you are yours, in your repository.",
      confirmed: false,
    },
    {
      id: "access-logging",
      title: "Access control and logging",
      body: "Access to your systems and data is per person, limited to the work, and logged.",
      confirmed: false,
    },
    {
      id: "exit-deletion",
      title: "Deletion or return at exit",
      body: "When the engagement ends, your data is returned to you or deleted, as you choose.",
      confirmed: false,
    },
    {
      id: "incident-notification",
      title: "Incident notification",
      body: "You are told about a security incident that affects your data within the period your contract sets.",
      confirmed: false,
    },
  ],
  // Direct answer first, 30–110 words each (spec §8.11). A Part A answer describes the website and
  // email today; a Part B answer names the Part B term it rests on and shows only once that term is
  // confirmed (trustView in src/lib/views/company.ts).
  // ⚑ owner: add the §8.11 FAQ answers on retention, encryption, the DPA and "Can we trust the output?" (spec §8.11)
  faq: [
    {
      // The mailbox's storage country joins this answer once the owner confirms it with the
      // provider (the owner marker on emailProvider in src/data/contact.ts).
      q: "Where is the information I send you stored?",
      a: "In our email mailbox, which Lark Suite hosts. Contact-form enquiries also pass through FormSubmit, whose documentation states that submissions are retained for 30 days. The storage countries for these providers are not yet confirmed. The website itself is a set of static files with no database, served by GitHub Pages through Cloudflare.",
      part: "A", asAt,
    },
    {
      q: "Does this website use cookies or analytics?",
      a: "No. The site's code sets no cookies and loads no analytics or tracking scripts. GitHub Pages serves the files and Cloudflare sits in front of them, and each handles the requests it receives under its own terms; the sub-processor table above lists what each one touches.",
      part: "A", asAt,
    },
    {
      q: "Which services handle my data?",
      a: "Four, today. FormSubmit processes contact-form enquiries and emails them to our mailbox. Lark Suite hosts that mailbox, including messages you send directly. GitHub Pages hosts the website's public files, and Cloudflare runs the domain's DNS and passes requests to the site. The table above lists each service, its purpose and the data it touches.",
      part: "A", asAt,
    },
    {
      q: "Do you hold SOC 2 or ISO 27001?",
      a: "No. Techsider holds neither certification and claims no alignment with either. What you can check instead is on this page: the services that handle website and email data and what each one touches, the independence policy that governs evaluation work, and how Techsider uses AI in its own work.",
      part: "A", asAt,
    },
    {
      q: "How do I report a security issue or an AI concern?",
      a: "Email admin@techsider.com.au with what you found, where and when. That covers a weakness in this website or our email, and any concern about how Techsider uses AI, including in the demos. Please leave out any personal information we don't need in order to look into it.",
      part: "A", asAt,
    },
    {
      q: "Is our data used to train AI models?",
      a: "No, for the systems Techsider builds or runs for you: your data isn't used to train a model, ours or a provider's. For AI inside software you already license, the vendor sets this, so the one-page data note records each provider's training setting and you can check it yourself.",
      part: "B", term: "no-training", asAt,
    },
    {
      q: "Who owns what you build for us?",
      a: "You do. The code, prompts, evaluation sets and search index sit in your own repository from the start, so you can keep running the system without us. If Techsider runs it for you, the exit pack hands over the code, data, configuration and runbook.",
      part: "B", term: "ownership", asAt,
    },
    {
      q: "Where is our data processed during an engagement?",
      a: "In an Australian region, for the systems Techsider builds or runs for you: in your own Microsoft or AWS account, or in one Techsider manages. Where the work runs inside software you already license, the vendor sets the processing location, and the data note states it with its source and date.",
      part: "B", term: "residency", asAt,
    },
    {
      q: "Who can access our systems during an engagement?",
      a: "Only the people doing the work, each with their own named access, limited to what the job needs. Access is logged while the work runs, and it is removed when the engagement ends.",
      part: "B", term: "access-logging", asAt,
    },
    {
      q: "What happens to our data when the engagement ends?",
      a: "It is returned to you or deleted, as you choose. The instruction covers every copy made for the work, including extracted fields, search indexes and logs, not only the files you sent us at the start.",
      part: "B", term: "exit-deletion", asAt,
    },
    {
      q: "Will you tell us about a security incident?",
      a: "Yes. If a security incident affects your data, you are told within the notification period your contract sets. The contract names that period, and who on your side is told first.",
      part: "B", term: "incident-notification", asAt,
    },
  ],
  transparency: {
    // ⚑ owner: confirm this statement covers all of Techsider's own AI use (spec §8.11)
    statement: "Techsider uses AI in its own work, and this section says where. Each card names the system, what it does, the data it sees and how a person oversees it.",
    systems: [
      {
        name: "Anthropic's Claude, for this website",
        purpose: "Drafts the website's code, tests and page copy, including the Insights posts. The repository's commit history names it as co-author.",
        data: "The website's source files and the public sources its pages cite. No client data.",
        human: "A person reviews each page before it goes live, and CI runs the type-check, the content checks and the browser tests on every push.",
      },
      {
        name: "Home page retrieval demo",
        purpose: "Replays a scripted question-and-answer exchange over APRA's CPS 230, with citations and one refusal, to show how a cited answer works.",
        data: "Public text quoted from APRA's CPS 230. It runs in your browser, with no live model and no back end.",
        human: "No model runs, so there is no live output to oversee. Its source text is quoted verbatim from APRA's published standard, with paragraph numbers checked on 28 September 2026, and its scores are labelled illustrative.",
      },
    ],
  },
  changes: [
    { date: asAt, change: "First version: Part A, the independence policy, the security and data questions, and how Techsider uses AI." },
  ],
};
