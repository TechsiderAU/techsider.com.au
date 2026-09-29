---
title: "Re-test vendor AI whenever the model may change."
description: "APRA found few of the large entities it reviewed validating AI continuously. How a test set from your own cases shows your second line what a model change did."
publishDate: 2026-09-29
type: article
industries: [financial-services]
solutions: [ai-evaluation]
draft: false
# ⚑ owner: every commitment in this post must be in the standard engagement terms (spec §12 item 2)
---

On 30 April 2026, APRA wrote to all APRA-regulated entities about artificial intelligence. Its [letter to industry](https://www.apra.gov.au/news-and-publications/apra-letter-industry-artificial-intelligence-ai) draws on a targeted engagement with selected large banks, insurers and superannuation trustees in late 2025. APRA says the lessons from those larger entities will help entities earlier in their AI adoption. The letter sets out observations and expectations; it isn't a prudential standard. This article covers what it found, where the existing standards already reach, and what a regression test you hold yourself can and can't show.

## What APRA observed

APRA observed reliance on point-in-time and sample-based methods, which it says are ill suited to probabilistic models "that learn, adapt and degrade over time". Few of the entities it engaged with had continuous validation or monitoring in place to detect issues such as model drift, bias, failure modes or control breakdowns in a timely manner. APRA noted an overreliance on vendor presentations and summaries at board level. And it found that contracts often lagged practice, with limited evidence of provisions on audit rights, model updates and deviations, incident notification or changes to data handling.

Its expectations follow from those findings. Monitoring should be continuous and proportionate to the criticality of the use case. Second-line risk management and internal audit should have the technical capability and tooling to assess AI systems independently, including probabilistic models and agentic workflows.

## Where the prudential standards already reach

[CPS 230](https://www.apra.gov.au/standards/cps-230) has been in force since 1 July 2025, and its updated version commenced on 1 July 2026, as APRA's [operational risk page](https://www.apra.gov.au/consultations/operational-risk-management) records. Three parts of it reach AI that a vendor supplies:

- **Control testing (¶29).** An APRA-regulated entity must regularly monitor, review and test controls for design and operating effectiveness, at a frequency commensurate with the materiality of the risks being controlled. Results go to senior management, and gaps must be fixed in a timely manner. In our reading, where an AI tool performs or supports a control, such as flagging possible complaints, that control is tested like any other.
- **Due diligence and monitoring (¶52, ¶59).** Before entering into or materially modifying a material arrangement, the entity must do appropriate due diligence and assess the risks of relying on the provider, including risks from its geographic location. After that, it must regularly assess how well its controls manage the risks of using the provider.
- **Notice before offshoring (¶60).** The entity must notify APRA before entering into any material offshoring arrangement, which CPS 230 describes as a material arrangement where the service is undertaken outside Australia. In our reading, that can include model inference run overseas, so a test should record where the vendor's model runs.

ASIC's [REP 798](https://www.asic.gov.au/regulatory-resources/find-a-document/reports/rep-798-beware-the-gap-governance-arrangements-in-the-face-of-ai-innovation/), released on 29 October 2024, covers AFS and credit licensees, including those APRA doesn't regulate. ASIC reviewed how 23 licensees were using AI, and found that 30% of the use cases in its review had models developed by third parties. It says licensees remain responsible for outsourced functions, and it asks them directly: "How will you validate, monitor and review third-party AI models?" In one poorer-practice example, a licensee said vendors "are hesitant to provide details beyond standard marketing literature".

## Why a model change is hard to see

A test that runs once can't show a change, and the platforms don't always record one. Microsoft's [Purview audit records](https://learn.microsoft.com/en-us/purview/audit-copilot) for Copilot list the model version as not available in Microsoft 365 Copilot scenarios, and the model name may be missing when a user leaves the model choice on Auto. Copilot Studio [conversation transcripts](https://learn.microsoft.com/en-us/microsoft-copilot-studio/analytics-transcripts-powerapps) mark answers drawn from SharePoint as redacted, aren't written for Microsoft 365 Copilot agents, and by default are deleted after 30 days. A scheduled re-run of a fixed test set is one practical way to notice that behaviour has changed.

If your AI runs as a Copilot Studio agent, start with its built-in [agent evaluation](https://learn.microsoft.com/en-us/microsoft-copilot-studio/analytics-agent-evaluation-intro): you can re-run the same test set after each change, including from an automated pipeline. An independent test earns its place when you need results on your own labelled cases, or when the AI sits in a platform that gives you no test harness of your own, such as a contact-centre vendor's model.

## What a regression test you hold looks like

Take one use case: a contact-centre platform's AI that summarises calls and flags possible complaints. [RG 271](https://www.asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-271-internal-dispute-resolution/) adopts a definition of a complaint as an expression of dissatisfaction "where a response or resolution is explicitly or implicitly expected or legally required", and ASIC says a customer isn't required to use the word "complaint", or to put it in writing. If the summary model misses those cues, a complaint may never reach your complaints team.

A regression test for that use case has five parts:

1. **A labelled test set.** Past calls, de-identified inside your own environment, each labelled by two people from your complaints team, with their agreement measured.
2. **Thresholds set first.** The control owner agrees pass thresholds before any test runs, and the test is written as a repeatable control test, not a one-off review.
3. **A baseline.** The current model runs first, so the next version has something to be compared against.
4. **Results by category.** Recall is reported separately for complaints and for credit complaints involving hardship notices, which RG 271.93 gives a 21-day response limit. False flags that would send non-complaints to the complaints team are counted separately, and every miss is listed with its call reference.
5. **A replay script you run.** The test runs in your own subscription, so your second line can re-run it whenever the model may have changed and see old and new results side by side.

## What testing can't do

Testing doesn't replace contract terms. If a vendor won't give audit rights or notice of model changes, your legal team still owns that clause. What a test gives you is your own evidence, drawn from your own cases.

The report gives findings rated to your risk matrix. It isn't a formal opinion or an ASAE 3000 engagement, so what you table, and how you describe it under prudential review, stays your decision. It's only independent if the evaluator didn't build, configure or advise on the system for you, and takes no resale margin or referral fees from the vendor. If onboarding a new supplier is the obstacle, the same work can run as a workstream under a firm you've already onboarded, such as your internal-audit co-source.
