---
title: "ISO 42001, NIST AI RMF and OECD: what each asks."
seoTitle: "ISO 42001 vs NIST AI RMF vs OECD AI Principles"
description: "ISO/IEC 42001 is a certifiable standard, the NIST AI RMF a voluntary framework and the OECD AI Principles a recommendation. What each asks, and the evidence."
publishDate: 2026-10-14
type: article
industries: []
solutions: [ai-evaluation, knowledge-assistant]
reviewBy: 2027-01-12
draft: true
# ⚑ owner: publish only after a person reads ISO/IEC 42001 on iso.org (the OBP preview's table of contents: 6.1.2 AI risk assessment, 6.1.4 AI system impact assessment, Annex A controls including the AI system life cycle, 9.1 monitoring) and records F3 as CONFIRMED in v6-post-verification.md section 3; then set draft: false (go-global §6.4)
---

ISO/IEC 42001 is a certifiable management-system standard for AI. The NIST AI Risk Management Framework is a voluntary framework from the US National Institute of Standards and Technology. The OECD AI Principles are an intergovernmental recommendation. They come from different kinds of body, but they ask for overlapping things: someone accountable, risks assessed before use, measurement that carries on after launch, and records that let you trace what happened.

A single AI project can produce evidence that maps to all three without claiming conformity with any of them. This post sets out what each one is, what it asks, and what that evidence looks like. Each instrument's own text is the authority; this is a summary as at October 2026.

## What is each one?

| Instrument | What it is | Status as at October 2026 |
|---|---|---|
| ISO/IEC 42001:2023 | A certifiable international standard for an AI management system, from ISO and IEC | Edition 1, published 18 December 2023, with no amendment listed |
| NIST AI RMF 1.0 | A voluntary framework from the US National Institute of Standards and Technology | Released 26 January 2023; NIST says it is being revised |
| OECD AI Principles | An intergovernmental recommendation from the OECD | Adopted May 2019, updated May 2024; 47 adherents |

## What does ISO/IEC 42001 ask?

ISO/IEC 42001 specifies an AI management system ([IEC webstore listing](https://webstore.iec.ch/en/publication/90574)). In outline, an organisation sets roles, assesses AI risks and the impact of each AI system, applies controls across the AI life cycle, monitors the results and keeps improving.

Certification comes from a certification body. Because this is a management-system standard, a certificate speaks to how an organisation governs its AI, not to how well any one system performs. The text is paywalled, so this is a paraphrase: read the clauses themselves before you rely on one.

## What does the NIST AI RMF ask?

NIST released the [AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) 1.0 on 26 January 2023. NIST says the framework is intended for voluntary use, and that it is being revised, with no date given. Its page mentions no certification scheme.

The framework is organised around four functions: Govern, Map, Measure and Manage. Measurement isn't a gate passed once before launch; the framework treats it as an activity across the AI life cycle.

Its [Generative AI Profile, NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf), released on 26 July 2024, names 12 risks of generative AI. Among them:

- confabulation, which it describes as "confidently stated but erroneous or false content";
- human-AI configuration, including automation bias and over-reliance;
- data privacy, and information security;
- value chain and component integration.

The profile applies the framework to generative AI and, like the framework, is voluntary.

## What do the OECD AI Principles ask?

The OECD adopted its [AI Principles](https://oecd.ai/en/ai-principles) in May 2019 and updated them in May 2024. They are a recommendation with 47 adherents. [Principle 1.5](https://oecd.ai/en/dashboards/ai-principles/P9), on accountability, asks for traceability and for ongoing risk management across the AI system life cycle.

## How does one project produce evidence for all three?

Most of the evidence is the same work, recorded properly:

- **A test set and measured results**, run before launch and again after each change to the model, prompts or source documents. That is the ongoing measurement the NIST framework describes, the monitoring an ISO/IEC 42001 management system expects, and the ongoing risk management in OECD principle 1.5.
- **A list of failures, each rated**, which can feed the AI risk and impact assessments an ISO/IEC 42001 management system keeps, with generative AI risks such as confabulation named the way the NIST profile names them.
- **Records that trace each output to its sources and to the model version that produced it**, which is the traceability principle 1.5 asks for.
- **A named person who approves or rejects outputs, with each decision logged**, which is evidence about human-AI configuration and automation bias in the NIST profile, and about who is accountable.
- **A change log** of what changed, when, and the re-test that followed.

## What does that look like in one project?

Take an assistant that answers staff questions from company documents and cites the page it used. Before launch, the team writes a test set of real questions with expected answers, agreed before any result exists, and records how often the assistant is right, wrong or declines to answer. Each wrong answer goes on the failure list with a rating. Every answer the assistant gives in use links to its source page and logs the model version. When the vendor updates the model, or a policy document changes, the test set runs again and the change log records the result.

Nothing in that list was produced for a framework, and every item is on the evidence list above. The [evaluation method](/resources/evaluation-method/) shows how a test set like that is designed and re-run.

## What can't the evidence do?

Evidence from a project is input to the buyer's own management system and risk decisions. It doesn't make a product, a supplier or a buyer conform to anything, and honest wording says so: "evidence you can map to ISO/IEC 42001", or "built around the questions in the NIST AI RMF".

Of the three, ISO/IEC 42001 is the certifiable one. NIST's page names no certification scheme for its framework, and the OECD Principles are an intergovernmental recommendation. When a supplier claims more than evidence, ask for the certification body's name and the certificate's scope.

Where a law applies, such as the EU AI Act for AI whose output is used in the EU, its duties come first, and the same evidence helps you meet them. See [the EU AI Act's new dates for non-EU suppliers](/insights/eu-ai-act-new-dates-for-non-eu-suppliers/).
