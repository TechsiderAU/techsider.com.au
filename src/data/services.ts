// The consulting layer (spec §4.2–§4.6, §8.6), typed by servicesData in
// src/content/page-schemas.ts and parsed by tests/content-data.test.mjs. Its readers:
// - /services/ (ServicesTemplate) and /services/evaluation-partner/ (EvaluationPartnerTemplate);
// - every solution page, for standardInclusions, deliveryChoices, onshoreNote and independence
//   (SharedOfferCopy in src/lib/views/offer.ts);
// - /trust/ (independence) and Home (routes, deliveryChoices, onshoreNote).
// Copy rules: nothing about money (D4; CI check 11 scans this file), the go/no-go gate is a
// decision point only (spec §4.1 import rule 3), and the team is described by function, with no
// names and no headcount (D14, D15).
// ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2)
import type { ServicesData } from "../content/page-schemas.ts";

export const SERVICES: ServicesData = {
  phases: [
    {
      id: "prove",
      name: "Assess and prove",
      duration: "1–3 weeks",
      summary: "Test one job on your own files, or on public or synthetic data, against an error rate agreed before work starts.",
      deliverables: [
        "An hours map and baseline, with each job marked build, queue or park (Admin Hours Audit)",
        "A measured error rate on 30–50 documents or questions your team already knows (Trial)",
        "Every failure the test found, listed",
      ],
      exitCriteria: [
        "You decide go or no-go against the error rate agreed at the start.",
        "A no-go ends the work, and you keep the answer key and the results.",
      ],
    },
    {
      id: "build",
      name: "Implement",
      duration: "4–6 weeks",
      summary: "Build one package where you chose to run it, then test it on your own examples before anyone relies on it.",
      deliverables: [
        "The working system, in your own account, managed by us, or inside a platform you already license",
        "An acceptance test report against the thresholds agreed up front, labelled \"acceptance test (not independent)\"",
        "A one-page data note, a runbook and a handover",
      ],
      exitCriteria: [
        "The acceptance test passes the thresholds agreed before work started. If it doesn't, you decide whether to continue.",
        "Your team has the runbook and has been through the handover.",
      ],
    },
    {
      id: "run",
      name: "Support and improve",
      duration: "Ongoing, with the exit built in",
      summary: "Keep the system running: managed by us in an Australian region, or supported in your own account.",
      deliverables: [
        "A re-test when the AI model or a vendor API changes",
        "Maintenance, whether we manage the system in an Australian region or support it in your own account",
        "The exit pack: code, data, configuration and runbook",
      ],
      exitCriteria: [
        "Managed: cancel with 30 days' notice and take the exit pack.",
        "Supported: the system already runs in your account, so your team keeps it running with the runbook.",
      ],
    },
  ],
  services: [
    {
      id: "fit-call",
      name: "Fit Call",
      what: "A 30-minute call on one problem you want to fix. If your platform's AI already does the job, we'll say so.",
      forWhom: "Everyone",
      entry: "entry",
    },
    {
      id: "admin-hours-audit",
      name: "Admin Hours Audit",
      what: "One week mapping where staff hours go, what your existing software could take over, and what to build, queue or park. It sets the baseline you measure against.",
      forWhom: "Mid-market teams",
      entry: "entry",
    },
    {
      id: "two-week-trial",
      name: "Two-Week Trial on Your Own Files",
      what: "Your team supplies 30–50 documents or questions it already knows the answers to. You get a measured error rate, then decide go or no-go.",
      forWhom: "Mid-market teams",
      entry: "entry",
    },
    {
      id: "feasibility-sprint",
      name: "Feasibility Sprint on public or synthetic data",
      what: "The same measured test, run on public or synthetic data while your approvals are in progress. It ends in a go/no-go decision.",
      forWhom: "Government and enterprise teams",
      entry: "entry",
    },
    {
      id: "independent-evaluation",
      name: "Independent Evaluation",
      what: "Tests of one AI system you bought or had built elsewhere, on your own questions, in your own environment. You keep the evidence and the kit to re-run it.",
      forWhom: "Government, financial services, legal and health",
      entry: "entry",
    },
    {
      id: "fixed-scope-build",
      name: "Fixed-Scope Build",
      what: "One Document Registers, Knowledge Assistant or Draft-for-Approval package, built in 4–6 weeks, acceptance-tested and handed over.",
      forWhom: "Mid-market teams",
      entry: "after-audit-or-trial",
    },
    {
      id: "enterprise-program",
      name: "Enterprise Program",
      what: "Three 4-week phases: prove, harden, hand over. Its Pilot to Production variant takes a stalled pilot, adds tests and a baseline, and hardens it for go-live.",
      forWhom: "Enterprise and government",
      entry: "secondary",
    },
    {
      id: "run",
      name: "Support and improve",
      what: "Managed in an Australian region, cancellable on 30 days' notice with an exit pack, or supported in your own account. Both re-test when the AI model or a vendor API changes.",
      forWhom: "Teams whose system we build",
      entry: "not-entry",
    },
    {
      id: "evaluation-partner",
      name: "Evaluation Partner",
      what: "Independent AI evaluation, delivered as a workstream under an existing contract held by a prime, internal-audit co-source firm, law firm or systems integrator.",
      forWhom: "Primes, internal-audit co-source firms, law firms and SIs",
      entry: "entry",
    },
    {
      id: "handover",
      name: "Handover & capability transfer",
      what: "Staff briefings, runbook training, and harness training for your risk and data teams.",
      forWhom: "Bundled with builds and evaluations",
      entry: "not-entry",
    },
  ],
  entryOffers: [
    {
      buyer: "State agency (NSW, Vic, Qld)",
      entry: "Independent Evaluation Report on Copilot Studio agents leaving pilot, a vendor AI upgrade or tender AI claims, ideally as an Evaluation Partner workstream",
      then: "Repeat evaluations",
    },
    {
      buyer: "Commonwealth agency",
      entry: "Independent Evaluation, or the Feasibility Sprint on public or synthetic data",
      then: "A Knowledge Assistant or Document Registers pilot",
    },
    {
      buyer: "Council",
      entry: "Feasibility Sprint on public or synthetic data, or a small evaluation",
      then: "Policy & Procedure Assistant",
    },
    {
      buyer: "Mid-tier APRA-regulated entity",
      entry: "Model-Change Regression or a pre-contract Vendor AI Evaluation on one use case, as a workstream under your internal-audit co-source or law firm",
      then: "Harness training for your second-line team",
    },
    // ⚑ owner: the Accounting Safe-Use Kit must be lawyer-reviewed and published before this entry offer names it (spec §12 item 6; research index A1)
    {
      buyer: "Accounting practice (50–300 staff, or a network)",
      entry: "Accounting Safe-Use Kit, then a Trial of the Trust Deed & Client Structure Register (Nov–early Dec or Apr–May)",
      then: "The full register; ATO Letter Sorter (on request); Run",
    },
    {
      buyer: "Residential property-management group (1,000+ managements)",
      entry: "Admin Hours Audit + Switch-On",
      then: "A Trial of the Management Agreement & Rent Roll Register; on-request property packages",
    },
    {
      buyer: "Mid-size law firm",
      entry: "Vendor AI Evaluation on your own matters",
      then: "Ask the Firm Manual (on request); Private Workspace (on request)",
    },
    {
      buyer: "Manufacturer (50–1,000 staff)",
      entry: "Trial of the SOP & Work-Instruction Assistant on one line",
      then: "The full assistant; on-request Document Registers and Draft-for-Approval packages",
    },
    {
      buyer: "Health service or GP group",
      entry: "Scribe & Clinical AI Evaluation",
      then: "Policy & Procedure Assistant for non-clinical staff",
    },
    {
      buyer: "Mid-tier miner, utility or renewables developer",
      entry: "Trial of the Approval & Permit Conditions Register on one approval (on request)",
      then: "SOCI AI Risk Evidence (on request)",
    },
    {
      buyer: "Independent school or group",
      entry: "Trial of the staff Policy & Procedure Assistant",
      then: "AI Switch-On for the software you already use; an evaluation of AI tools you've deployed",
    },
    {
      buyer: "Prime, internal-audit co-source firm, law firm or SI",
      entry: "Evaluation Partner workstream",
      then: "Repeat workstreams",
    },
  ],
  team: {
    // ⚑ owner: re-confirm team claims (spec §12 item 10)
    summary: "The engineers and evaluators who scope your work also build and test it.",
    functions: [
      { title: "Engineering", body: "Builds the system where you chose to run it, and puts the code, prompts and index in your repository." },
      { title: "Evaluation", body: "Writes the test set with your team, agrees the thresholds before testing, and reports every failure." },
      { title: "Handover", body: "Trains your staff on the runbook, and your risk and data teams on the test harness." },
    ],
  },
  deliveryChoices: [
    {
      id: "your-account",
      title: "In your own Microsoft or AWS account",
      body: "Runs in your own Microsoft or AWS account, in an Australian region such as Azure Australia East or AWS Sydney.",
    },
    {
      id: "managed",
      title: "Managed for you in an Australian region",
      body: "We run it for you in an Australian region, with an exit pack of code, data, configuration and runbook.",
    },
    {
      id: "platform-you-license",
      title: "Inside a platform you already license",
      body: "Runs inside software you already pay for, such as Microsoft Copilot, PropertyMe, Karbon, Xero or Dext, where the vendor sets the processing location. Where we build part of it, such as a retrieval index, that part runs in your own account or ours, in an Australian region.",
    },
  ],
  onshoreNote: [
    "Where inference actually runs, which can differ from where the platform is hosted.",
    "The provider's retention, abuse-monitoring and human-review settings.",
    "What happens when the newest model isn't available in an Australian region.",
    "For a platform you already license: the vendor's published processing location, or \"not published\", with its source and an as-at date, re-checked quarterly.",
  ],
  // ⚑ owner: sign off the independence policy wording (spec §12 item 3)
  independence: [
    "We never issue an independent evaluation of a system we built, configured or advised on for the same client.",
    "We take no resale margin or referral fees from vendors we evaluate, and we disclose any vendor relationship.",
    "Acceptance tests on systems we build are labelled \"acceptance test (not independent)\".",
    "Our sample report on our own demo system is always captioned as not independent.",
    "We stay vendor-neutral: any vendor technical certification is disclosed, and we don't resell under a vendor partner tier.",
  ],
  deRisk: [
    { title: "Acceptance tests", body: "Thresholds are agreed with you before work starts, and the report shows every failure." },
    { title: "Go/no-go gates", body: "Each step ends in a decision point, and you decide whether to continue." },
    { title: "Exit pack", body: "Code, data, configuration and runbook, so you can move a managed system or run it yourself." },
    { title: "You own it", body: "Your code, prompts, evaluation tests and index live in your own repository." },
  ],
  // Printed under "Every package includes" on every launch package of all five solutions, so each line
  // must hold for a build (① ② ③), an evaluation (④) and a switch-on (⑤) (WB-1; spec §4.5).
  standardInclusions: [
    "A test on your own examples, with thresholds agreed before testing and every failure shown, or, for AI Switch-On, the hours saved, measured against a baseline taken before anything changes.",
    "Where the work has a test set, a re-run of it when the AI model changes or may have changed: by us on a system we build or run, and by your team, with the kit we hand over, after an evaluation.",
    "A one-page data note: where your data sits, where the model runs, retention and deletion.",
    "A runbook and a handover.",
    "The delivery choice that fits the package, named in its onshore note.",
    "Your time commitment, stated in hours and weeks.",
  ],
  routes: {
    midMarket: {
      title: "Mid-market: measure first, then build.",
      steps: [
        { name: "Admin Hours Audit", body: "One week to map where staff hours go and what your existing software could take over." },
        { name: "Two-Week Trial", body: "Your own files, a measured error rate, then your go/no-go decision." },
        { name: "Implement", body: "One package, built in 4–6 weeks and acceptance-tested on your examples." },
        { name: "Support and improve", body: "Managed in an Australian region or supported in your account, with the exit built in." },
      ],
    },
    enterprise: {
      title: "Enterprise and government: evaluate first.",
      steps: [
        { name: "Independent Evaluation", body: "One system and one use case, tested in your environment against thresholds agreed before testing." },
        { name: "Enterprise Program", body: "Three 4-week phases: prove, harden, hand over." },
      ],
      partnerLine: "Or run the evaluation as a workstream under your existing prime, internal-audit co-source firm or law firm.",
    },
  },
  faq: [
    {
      q: "What happens on a Fit Call?",
      a: "A 30-minute conversation about one problem you want to fix. If your platform's AI already does the job, we'll tell you, and you won't need us for it.",
    },
    {
      q: "What if a Trial misses the agreed error rate?",
      a: "You decide whether to continue. The go/no-go is a decision point, and a no-go ends the work with the answer key and the results in your hands.",
    },
    {
      q: "Who owns what you build?",
      a: "You do. Your code, prompts, evaluation tests and index live in your own repository, whether your team runs the system or we do.",
    },
    {
      q: "Can you independently evaluate a system you built for us?",
      a: "No. We never issue an independent evaluation of a system we built, configured or advised on for the same client, and our own tests on it are labelled \"acceptance test (not independent)\".",
    },
    {
      q: "What happens if we stop a managed Run?",
      a: "Give 30 days' notice and you receive the exit pack: code, data, configuration and runbook. We don't offer escrow, because the exit pack covers continuity.",
    },
    {
      q: "Do you resell AI licences?",
      a: "No. Switch-On configures features you already own, and we take no resale margin or referral fees from vendors we evaluate.",
    },
    {
      q: "What don't you offer?",
      a: "In-house adversarial testing, a fractional AI lead, or AI policy-paperwork packages. A standalone AI platform or model gateway is on request only, as a Private Workspace or for a critical-infrastructure entity. We also don't rebuild what your software already does, such as bookkeeping capture, tenant reply drafting or KYC and ID verification.",
    },
  ],
  evaluationPartner: {
    promise: "Independent AI evaluation, delivered under your contract.",
    audiences: [
      "Primes delivering AI programs to government agencies",
      "Internal-audit co-source firms that need an AI system tested for a client",
      "Law firms advising a client on an AI system or an AI vendor",
      "Systems integrators whose client wants the testing done by someone other than the builder",
    ],
    delivers: [
      "Tests of one AI system for one use case, on the client's own questions, in the client's environment",
      "Thresholds agreed before testing, with false answers and false refusals reported separately",
      "Findings rated to the client's risk matrix, with an explicit list of failures",
      "A reproducible evidence bundle, with a replay script that runs in the client's own subscription",
      "Harness handover and training for the client's risk and data teams",
    ],
    fit: [
      "The evaluation runs as a workstream under your existing contract, scoped to one system and one use case.",
      "For a government client, week 0 runs approvals in parallel, and testing starts on public or synthetic data.",
    ],
    methodSummary:
      "Every evaluation follows one written method: a sample-size rationale with confidence intervals, a ground-truth method with inter-rater agreement, calibration of any LLM judge against human labels, thresholds agreed before testing, false answers and false refusals reported separately, and an explicit list of failures.",
    faq: [
      {
        q: "What kind of report does the client get?",
        a: "Findings rated to the client's risk matrix, with an explicit list of failures and the evidence behind each one. It is not an assurance opinion, and not an ASAE 3000 or ASRE engagement.",
      },
      {
        q: "Do you do adversarial testing or red-teaming?",
        a: "No, never in-house. Where a system needs adversarial testing, it's done by a CREST-accredited tester the client engages. Our Agentic AI Control Evaluation reviews identity, permissions, approval gates and logging; it doesn't attack the system.",
      },
      {
        q: "Where does the testing run?",
        a: "In the client's environment, on the client's own questions. The replay script runs in the client's own subscription, so the tests can be re-run there after we finish.",
      },
      {
        q: "How long does a workstream take?",
        a: "3–5 weeks for one system and one use case, from agreeing the thresholds to handing over the harness.",
      },
      {
        q: "Can the client's team re-run the tests without us?",
        a: "Yes. The harness and question set are handed over, with a training session for the client's data, risk or second-line team.",
      },
    ],
  },
};
