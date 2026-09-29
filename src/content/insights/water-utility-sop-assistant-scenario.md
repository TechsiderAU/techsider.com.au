---
title: "A fictional utility tests its SOP assistant."
description: "An illustrative scenario: a made-up water utility tests a procedures assistant on its crews' questions and maps where schematics would go under the CIRMP Rules."
publishDate: 2026-09-29
type: reference-scenario
illustrative: true
industries: [resources-and-energy]
solutions: [knowledge-assistant, ai-evaluation]
draft: false
# ⚑ owner: every commitment in this post must be in the standard engagement terms (spec §12 item 2)
---

This is an illustrative scenario. The utility, its people and its documents are fictional, and nothing here describes a client engagement. The rules it works through are real, and each one links to its source.

## The utility and its question

A fictional regional water utility runs treatment plants, pump stations and a network of mains. Its crews ask supervisors the same procedure questions every week: isolation steps, confined-space entry, changes to chemical dosing. The answers sit in standard operating procedures, work instructions and equipment manuals, spread across SharePoint and a document control system, and some exist in more than one version.

The utility has trialled Microsoft Copilot. It wants to know two things before any crew relies on an assistant: whether the answers are right often enough, and what the assistant would mean for its critical infrastructure risk management program (CIRMP) under the Security of Critical Infrastructure Act.

## First question: where would the documents go?

The utility is the responsible entity for a critical water asset, one of the asset classes the [CIRMP Rules](https://www.legislation.gov.au/F2023L00112/latest/text) cover. Under s 6(d), material risk includes storing, transmitting or processing sensitive operational information outside Australia. That includes layout diagrams, schematics, configuration information and other data a reasonable person would consider confidential or sensitive about the asset. Section 7 requires the CIRMP to identify that risk and, as far as reasonably practicable, minimise or eliminate it. This is a baseline rule, already in force, not one of the enhanced rules with later dates.

So the first artefact is a data-flow map, drawn before any document is indexed:

- **For Copilot.** Microsoft says customers outside the EU [may have their queries processed](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy) in the US, EU or other regions. The utility's risk team weighs that against s 6(d) for any document that holds schematics or configuration information.
- **For a build.** The index and the model inference are designed to run in an Australian region, in the utility's own Microsoft or AWS account. If the model the utility wants isn't available in an Australian region, it hears that before the build, not after.
- **For every step.** The model provider's stated retention and human-review settings are recorded beside the step.

## Second question: who could reach it?

Enhanced rules that commenced on 10 June 2026 add offshore or remote access to business critical data as a material risk the CIRMP must minimise or eliminate, as far as reasonably practicable (s 6A(2)(d)). Under the [SOCI Act](https://www.legislation.gov.au/C2018A00029/latest/text), business critical data includes information needed to operate a critical infrastructure asset. An assistant adds access paths to whatever it indexes: user groups, service accounts and the model provider's abuse monitoring.

The second artefact is an access list. It names each user group, service account and vendor path, where it sits and which log records it. Paths the utility doesn't approve are closed where the provider allows it, and where it doesn't, the utility hears that before the build. For assets that were critical infrastructure assets before 10 June 2026, the Department of Home Affairs' [implementation factsheet](https://www.cisc.gov.au/resources-subsite/Documents/enhanced-cirmp-implementation-factsheet.pdf) gives 10 June 2027 as the date to comply by.

## Third question: is this emerging technology?

Section 8A(2)(c) adds, as a material risk to minimise or eliminate so far as reasonably practicable, the deployment or hosting of advanced, novel or emerging technology in a way that could prejudice the asset's availability, integrity, reliability or confidentiality. The Rules don't define the term, but the [Explanatory Statement](https://www.legislation.gov.au/F2026L00701/asmade/text/explanatory-statement) says it's intended to capture technology "such as AI". It suggests an entity deploying AI could consider limiting the application within its organisation or networks. Home Affairs gives 10 June 2027 for this rule too.

The assistant's design follows from that. It reads procedures without changing them, answers only from versions marked current in the document control system, and shows the version it used. It's tested on the utility's own questions before go-live, and re-tested when the model changes.

## Fourth question: is the model provider a major supplier?

The Rules define a major supplier as any vendor that, by the nature of its product or service, has a significant influence over the security of the asset. Section 10A(4)–(5) requires a process to assess each existing or proposed major supplier: the legal requirements it's subject to, restrictions affecting its jurisdiction, and its access, influence and control over the asset. Home Affairs gives 10 June 2028 for this rule.

Whether a model provider is a major supplier is the utility's judgement. The build supplies a fact sheet for each AI provider, citing its published terms, data locations and sub-processors, so the risk team has something concrete to judge.

## The test itself

With the data questions answered, the assistant is tested like any other source of procedures:

- 50 to 100 questions written by crews and supervisors, including some the procedures don't answer;
- thresholds agreed before testing;
- false answers and false refusals counted separately;
- a check that each answer's procedure version is the current one;
- permission checks from test accounts that shouldn't see restricted documents;
- the same questions re-run whenever the model changes.

Copilot gets the same test. If its answers pass and the risk team accepts where it processes them, there's nothing to build, and the scenario ends there.

## What ships first, and what it isn't

What ships first is paper, not software: a test plan with agreed thresholds, the data-flow map and the access list, all before any document is indexed. Then the utility decides whether to go on.

None of this meets the utility's CIRMP obligations for it. The CIRMP, its reviews and its annual report stay the utility's, and what its risk team concludes from the artefacts is its own call. It isn't legal advice. For a utility that wants the same mapping across the AI it already runs, SOCI AI Risk Evidence, available on request, maps each AI use to the relevant CIRMP rule items.
