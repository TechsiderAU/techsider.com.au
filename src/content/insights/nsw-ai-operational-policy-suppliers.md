---
title: "NSW agencies need AI evidence from suppliers."
seoTitle: "NSW AI Operational Policy: what suppliers need"
description: "What circular DCS-2026-02 and the NSW AI Operational Policy require of agencies, and the testing, change and record evidence they'll need from AI suppliers."
publishDate: 2026-10-11
type: article
industries: [government]
solutions: [ai-evaluation]
region: au
draft: false
---

Circular DCS-2026-02, issued on 30 July 2026, makes the NSW AI Operational Policy mandatory for NSW agencies. They must register AI use cases in the AI Assessment Framework (AIAF) Platform, assess the ones registration flags, refer high-risk and critical-risk use cases to the AI Review Committee, and attest every year, first by 31 October 2027. Suppliers aren't bound, but agency contracts must give them ways to disclose AI use and notify material changes, so much of the evidence will come from the vendor.

## What does the NSW AI Operational Policy require?

[Circular DCS-2026-02](https://arp.nsw.gov.au/dcs-2026-02-use-of-artificial-intelligence-by-nsw-government-agencies) was issued by the Secretary of the Department of Customer Service and updated on 1 September 2026. It is mandatory and replaces circular DCS-2024-04. The [NSW AI Operational Policy](https://www.digital.nsw.gov.au/policy/artificial-intelligence/ai-strategy-and-operational-policy/nsw-ai-operational-policy) it mandates ([version 1.1, PDF](https://www.digital.nsw.gov.au/sites/default/files/2026-09/nsw-ai-operational-policy-01092026.pdf)) replaces the NSW AI Ethics Policy. Section 4 lists seven mandatory requirements. These shape the work on each AI system:

- **Register before use.** Requirement 5 is to register all AI use cases in the AIAF Platform and keep accurate and complete records across the lifecycle. Attachment A (section 10.3) says to register before use. Digital NSW's [AIAF page](https://www.digital.nsw.gov.au/policy/artificial-intelligence/nsw-artificial-intelligence-assessment-framework) says the platform is mandatory from 30 September 2026.
- **Assess when registration says so.** Requirement 6 is to apply the AIAF where registration says an assessment is needed. It rates intrinsic risk, before any mitigation (section 10.4). The policy defines four bands (section 2): low, where errors "can be easily reversed or corrected without causing any harm or damage", then medium, high and critical, where impacts "may be severe, widespread, or irreversible".
- **Refer high and critical risk.** These go to the AI Review Committee within five business days of completing the AIAF (5.3.2(b)). The committee advises; the agency decides.
- **Re-assess on change.** The circular (section 2) requires re-assessment "whenever changes to risk, context or system functionality could affect outcomes or oversight".
- **Attest every year.** A signed attestation for the previous financial year goes to NSW GovAI by 31 October each year, starting in 2027 (section 7.2). Agencies can request an extension for the first period (7.2.1).

High-risk and critical-risk systems also need annual audits (5.3.2(e)), incident response plans, human override and clear appeal pathways (5.4.2(g)). Medium-risk systems and above must be monitored to confirm they operate as intended (5.4.2(e)).

## Does the policy apply to suppliers?

Not directly. Section 1.3 says the policy "is not mandatory for local government, universities or third-party suppliers", and Attachment A says a supplier's own use of AI in its services isn't registered; procurement and contracting manage it instead. A supplier's AI product that the agency itself uses is another matter: the policy's definition of an AI system includes "the products, platforms, tools and underlying infrastructure used to deliver the system outcome" (section 2), so the product sits inside the agency's use case.

That draws suppliers in twice. Each use case's Accountable Owner is accountable for the accuracy and completeness of its AIAF assessment (section 2), and for a vendor's product many answers are facts only the vendor holds. And section 5.4.2(f), on third-party supplier risks, says:

> Contractual arrangements must support transparency, including mechanisms for suppliers to disclose AI use and notify the agency of material changes over time.

This is a plain-language summary, not legal advice. The circular, the policy and your contract govern, and NSW GovAI says it can help interpret AI policy and AIAF requirements.

## What NSW ICT contracts already say

The ICT Purchasing Framework's Core& and MICTA/ICTA templates carry AI clauses for procurements from 23 August 2025, according to buy.nsw's [update history](https://www.info.buy.nsw.gov.au/schemes/ict-services-scheme/update-history). Clause 6.11 of the August 2025 [ICT Agreement](https://www.info.buy.nsw.gov.au/__data/assets/word_doc/0009/993906/ICT-Purchasing-Framework-ICT-Agreement_August_2025.docx) sets defaults the Order Form can vary:

- **Notice and approval (6.11(a)).** Unless the Order Form lists it, the supplier can't add an AI system to its work, including through an update, without written notice, a three-month wait and the customer's written approval.
- **Records (6.11(c)).** The supplier keeps detailed records of each AI system's design, performance, governance and intended and actual use, and provides them promptly on request.
- **Testing warranty (6.11(d)).** The supplier warrants that each AI system has been and will continue to be designed, developed, trained and tested to manage risks and harms, "including ensuring accuracy and reliability".
- **Incidents (6.11(f)).** The supplier must run a program to detect and remediate AI incidents, notify the customer promptly, including of incidents from other customers' use, and report quarterly by default. The customer can suspend the AI services, and terminate if an incident isn't remediated within 30 days.

Clause 37.2 lets the customer copy log files from its use of an AI system during an audit. The [Cloud Module](https://www.info.buy.nsw.gov.au/__data/assets/word_doc/0004/993901/ICTA-Cloud-Module_August2025.docx) (clause 1.4(c)) and [Software Module](https://www.info.buy.nsw.gov.au/__data/assets/word_doc/0003/993900/ICTA-Software-Module_August2025.docx) (clause 4.2) default to six months' notice before a change to an AI system's underlying model, three months for other AI changes, and acceptance testing where the Order Form asks for it.

## What evidence will an agency ask a supplier for?

| Question | Why it's asked | Evidence that answers it |
|---|---|---|
| What does it do, with what data, how autonomously? | Registration and the AIAF | Inputs, outputs, data sources, decisions informed, human checkpoints |
| How was it tested, and on what? | Clause 6.11(d), the risk band | The test set described, error rates by category, model version, test date |
| Does it work on our cases? | Monitoring (5.4.2(e)), post-implementation review (5.4.2(h)) | Results on the agency's cases, from a test it can re-run |
| What is changing, and when? | Re-assessment, 5.4.2(f) | Change notices naming the model, with a before-and-after run |
| What records can you hand over? | Recordkeeping (5.4.2(i)) | Inputs, outputs, model identifiers and timestamps, exportable |
| What happens when it fails? | Clause 6.11(f), continuity (5.4.2(j)) | The incident process, and how to switch it off or fall back |

Digital NSW said in [February 2026](https://digital.nsw.gov.au/article/ai-for-public-servants-understanding-new-ai-assessment-framework) that the initial AIAF assessment then had 16 questions, covering topics such as autonomy, the data used and the decisions influenced. buy.nsw's [AI procurement essentials](https://www.info.buy.nsw.gov.au/resources/artificial-intelligence-ai-procurement-essentials) suggest service levels on accuracy, precision, sensitivity and specificity, and asking suppliers how they identify and minimise bias. That page was updated on 6 May 2026, before the new policy.

On records, section 5.4.2(i) says AI outputs and metadata that inform decisions, or may be reviewed or challenged, must be managed as State records. State Records NSW's [guidance](https://www.nsw.gov.au/nsw-government/recordkeeping/create-and-capture/ai-and-recordkeeping) (updated 9 February 2024) says that metadata includes confirmation that AI generated the record, the software used, and the prompts or inputs behind it.

## How to produce measured evidence

A warranty says a system was tested. It doesn't say on what, or whether the result holds on the agency's cases. Measured evidence does, when it has:

- a fixed test set from the agency's own material, with expected answers labelled by people who know it;
- pass thresholds agreed before the first run;
- false answers and false refusals counted separately, each with a confidence interval;
- every failure listed and rated to the AIAF risk band;
- a replay script the agency holds, so the same test runs again when a model-change notice arrives, and the two runs compare item by item.

The [evaluation method](/resources/evaluation-method/) sets this out, and the [government page](/industries/government/) maps it to the AIAF alongside other Australian instruments. A supplier can build the same pack for its product before a tender, but only a test by someone who didn't build, configure or advise on the system is independent.

## What to do now

For agencies:

1. List every AI use case that runs on a supplier's product, and check it's registered.
2. Check each supplier's contract template. MICTA/ICTA templates for procurements from 23 August 2025 include clause 6.11; check older contracts for AI terms.
3. Fill in the Order Form's AI items: which systems need approval, notice periods, acceptance testing for model changes, incident reporting.
4. Ask suppliers for the evidence in the table before the AIAF assessment.
5. Keep a baseline test to re-run when a change notice arrives.
6. Diary 31 October 2027 for the first attestation.

For suppliers:

1. Expect clause 6.11 in new MICTA/ICTA contracts, and keep the records it describes from day one.
2. Prepare a use-case fact sheet, dated test results with the method and data described, a change log by model version, and your incident process.
