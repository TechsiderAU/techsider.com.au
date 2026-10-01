---
title: "Test a Copilot agent before it leaves pilot."
description: "What the DTA policy, NSW's AI circular and Queensland's FAIRA ask of a Copilot agent leaving pilot, and what an independent test adds to Copilot Studio's own."
publishDate: 2026-09-29
updatedDate: 2026-10-02
type: article
industries: [government]
solutions: [ai-evaluation]
draft: false
# ⚑ owner: every commitment in this post must be in the standard engagement terms (spec §12 item 2)
---

Picture a Copilot Studio agent that answers staff questions on leave, travel or allowances, ready to move from a pilot group to a whole department. The instruments that govern AI in Australian government ask for evidence before that move, and for fresh evidence when the model, the vendor or the use changes. This article sets out what they ask, what Copilot Studio already gives you, and what an independent test adds.

## What the Commonwealth policy asks

Version 2.0 of the DTA's [Policy for the responsible use of AI in government](https://www.digital.gov.au/ai/ai-in-government-policy) took effect on 15 December 2025. It applies to all non-corporate Commonwealth entities, with some exceptions. Its [AI use case impact assessment](https://www.digital.gov.au/ai/ai-in-government-policy/ai-use-case-impact-assessment) requirements ask four things of an in-scope use case:

- finalise the impact assessment, and apply any agreed risk treatments, before the solution is deployed;
- add the use case to the agency's internal register, with its risk rating and accountable owner;
- once it's deployed, monitor and evaluate it, and re-validate the assessment when the use case's scope, usage or operation materially changes;
- for a high-risk use case, review it at least every 12 months.

The same page says agencies should also watch for changes they didn't start, and gives vendor changes as the example. Existing use cases not yet assessed have until 30 April 2027. The DTA's [January 2026 update](https://www.dta.gov.au/articles/ai-policy-update-strengthening-responsible-use-across-government) says the first new mandatory requirement began on 15 June 2026, with the remaining requirements taking effect in December 2026.

The National AI Centre's voluntary Guidance for AI Adoption, [published on 21 October 2025](https://www.industry.gov.au/publications/voluntary-ai-safety-standard), points the same way. Its [implementation guidance](https://www.ai.gov.au/staying-safe-and-responsible/essential-ai-practices/guidance-ai-adoption-implementation-guidance) for the fifth practice, "Test and monitor", asks for acceptance criteria and test methods that reflect the intended use and its risks, testing before deployment, and documented tests and outcomes. Where enhanced practices apply, it asks for an independent review, internal or external, of the testing methods and results.

## The states have their own instruments

- **New South Wales.** [Circular DCS-2026-02](https://arp.nsw.gov.au/dcs-2026-02-use-of-artificial-intelligence-by-nsw-government-agencies), issued on 30 July 2026, is mandatory for NSW agencies. They must register AI use cases in the AI Assessment Framework (AIAF) Platform, apply the AIAF where registration says an assessment is needed, re-assess whenever changes to risk, context or system functionality could affect outcomes or oversight, and refer high-risk and critical-risk use cases to the AI Review Committee. The [NSW AI Operational Policy](https://www.digital.nsw.gov.au/sites/default/files/2026-09/nsw-ai-operational-policy-01092026.pdf) adds that routine productivity use of approved tools, with meaningful human oversight, doesn't generally need registering.
- **Queensland.** Version 2.0.0 of the [Artificial intelligence governance policy](https://www.forgov.qld.gov.au/information-technology/queensland-government-enterprise-architecture-qgea/qgea-directions-and-guidance/qgea-policies-standards-and-guidelines/artificial-intelligence-governance-policy), mandated for Queensland Government departments from August 2026, says that when evaluating AI solutions, agencies must prepare a Foundational AI risk assessment (FAIRA) or an agreed equivalent. A FAIRA LITE can be prepared for low-risk use cases, including proofs of concept and trials. The policy also says a FAIRA doesn't replace privacy impact assessments, security threat and risk assessments, penetration testing or human rights impact assessments.
- **Victoria.** [Navigating AI in procurement](https://www.buyingfor.vic.gov.au/navigating-ai-procurement), updated on 3 August 2026, lists actions buyers should consider: requesting enough technical information to judge an AI's risk and suitability, having suppliers disclose if and how they propose to use AI, listing permitted AI uses in the contract, and managing risks such as model drift, bias and hallucination throughout delivery. It's guidance, not a mandate.

The Queensland Audit Office's report [Managing the ethical risks of artificial intelligence](https://www.qao.qld.gov.au/reports-resources/reports-parliament/managing-ethical-risks-artificial-intelligence), tabled on 24 September 2025, recommends that all public sector entities implement ethical risk assessment processes for AI systems in use or under development.

Each of these instruments can draw on the same artefact: dated, measured results for the use case itself, re-run when something changes.

## What Copilot Studio already gives you

Copilot Studio includes [agent evaluation](https://learn.microsoft.com/en-us/microsoft-copilot-studio/analytics-agent-evaluation-intro). You can generate tests, build test sets and measure the accuracy, relevancy and quality of answers, with four safety evaluators. You can repeat a test with the same test set after a change, and start runs through REST APIs or connectors from a pipeline. Use it first. If Copilot Studio's built-in evaluation answers your question, we'll say so.

Two limits matter for the evidence an assessment needs. [Conversation transcripts](https://learn.microsoft.com/en-us/microsoft-copilot-studio/analytics-transcripts-powerapps) aren't written for Microsoft 365 Copilot agents. In the [Purview audit records](https://learn.microsoft.com/en-us/purview/audit-copilot) for Copilot interactions, the documented message field lists message IDs and flags, not the prompt or response text. So evidence about what an agent actually answered comes from replaying a test set and capturing the answers at run time.

## What an independent test adds

Copilot Studio's evaluation runs inside the platform that hosts the agent. An independent test adds five things an impact assessment, an AIAF re-assessment or a FAIRA can cite:

- **Ground truth from your people.** Questions come from the published policy set, written with policy officers who label the expected answers independently. Their agreement is measured, so you know how firm the answer key is.
- **Thresholds set before results.** Pass marks are agreed before testing starts, and the sample is sized to give a stated confidence interval.
- **Two kinds of failure, counted apart.** A false answer is a confident reply the policy doesn't support. A false refusal is a decline when the answer is in the policy. Counting them together hides the one that matters more for your use.
- **Citation checks.** Each cited clause is checked against what the answer says it says.
- **A failure list and a replay script.** Every failure is listed, rated to your risk matrix and cross-referenced to the instrument you report to: the DTA tool's sections, such as reliability and safety, privacy, transparency and contestability; the NSW AIAF risk levels; or your FAIRA. The test set and replay script run in your own subscription, so the same test re-runs after the next model or vendor change and the results line up against the first run.

The report gives findings, not a sign-off. Your accountable official decides whether to deploy. And the test is only independent if the evaluator didn't build, configure or advise on the system for your agency.

## Agents that can act need a configuration review

When an agent can take actions, not just answer, the questions change. The DTA's [agentic AI addendum](https://www.digital.gov.au/policy/ai/agentic-ai-addendum), last updated on 4 June 2026, is best-practice guidance that agencies exploring, developing or using agentic AI are expected to apply. Its [design statements](https://www.digital.gov.au/policy/ai/agentic-ai-addendum-statements-design) ask for a unique identity for each agent, with access only to the information and tools it needs (AGT.3.3), and minimum technical requirements for kill switches (AGT.3.4). Its [monitoring statements](https://www.digital.gov.au/policy/ai/agentic-ai-addendum-statements-monitor) ask for continuous monitoring of individual agents, including for goal drift, unauthorised use, misuse, injection attacks and poisoning (AGT.8.1).

ASD's [Careful adoption of agentic AI services](https://www.cyber.gov.au/business-government/secure-design/artificial-intelligence/careful-adoption-of-agentic-ai-services), published on 1 May 2026 with cyber security agencies from the US, Canada, New Zealand and the UK, recommends agentic AI only for low-risk and non-sensitive tasks, never with broad or unrestricted access. It says system designers or operators, not the agentic system, should decide when human approval is required, and that requests to delete logs or audit records should wait until a person has reviewed and approved them. It's guidance, not a mandate.

An Agentic AI Control Evaluation checks each agent's identity, permissions, approval gates, kill switch and logging against those criteria. It's a configuration review, not an attack. We never do adversarial testing in-house: where prompt-injection or tool-misuse testing is needed, a specialist tester you engage does it, under your authorisation.

## Start before the data is approved

Approval to use staff data takes time, and the test plan doesn't have to wait for it. Questions written from the published policy set, with thresholds agreed, can produce a first failure list before any staff data is touched. Your accountable official then decides whether to continue on that evidence, and the test set and replay script stay with your agency either way.


## A practical acceptance checklist

Write representative questions and expected evidence. Include unsupported requests and restricted access. Keep input versions and deployment settings with the results.

| Check | Evidence to retain |
|---|---|
| Supported answer | The answer and the exact document passage supporting it |
| Missing evidence | A refusal or escalation instead of a guessed answer |
| Access restriction | What each authorised test identity can retrieve |
| Proposed action | The required approval and the action log |
| Changed system | A rerun of the same cases and the differences |

Microsoft's [agent evaluation checklist](https://learn.microsoft.com/en-us/microsoft-copilot-studio/guidance/evaluation-checklist) describes building test sets, establishing a baseline and expanding evaluation over the lifecycle. Check evidence behind consequential answers.

Checklist added 2 October 2026; the dated regulatory discussion is unchanged. Explore [independent AI evaluation](/solutions/ai-evaluation/).
