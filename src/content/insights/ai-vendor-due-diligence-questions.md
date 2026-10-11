---
title: "Ask an AI vendor for evidence you can check."
seoTitle: "AI vendor due diligence questionnaire"
description: "Questions to ask before you buy or renew an AI product, drawn from APRA, the DTA, NSW buying guidance and the OAIC, and what a good vendor answer looks like."
publishDate: 2026-10-11
type: article
industries: [financial-services, government, legal-and-professional]
solutions: [ai-evaluation, ai-switch-on]
draft: false
---

Before you buy or renew an AI product, ask the vendor five groups of questions: where your data goes, which model sits underneath and who controls changes to it, how it was tested, how you'll hear about changes and incidents, and what records and exit you get. A good answer is specific, dated, in the contract and checkable. Each question below traces to an Australian regulator or government buying guide. This isn't legal advice: contract terms are a matter for your lawyer.

## Why do vendor answers need checking?

APRA's [letter to industry on artificial intelligence](https://www.apra.gov.au/news-and-publications/apra-letter-industry-artificial-intelligence-ai), published on 30 April 2026 after an engagement with selected large banks, insurers and superannuation trustees, noted "an overreliance on vendor presentations and summaries" at board level. It also found:

> Contractual arrangements often lagged practice, with limited evidence of specific provisions addressing audit rights, model updates and deviations, incident notification or changes to data handling.

APRA expects entities to map "the full AI supply chain, including material, third-party and fourth-party dependencies". The OAIC's [guidance on commercially available AI products](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products), updated on 17 January 2025, says due diligence "should not amount to a 'set and forget' approach". And the [statement on AI in Australian legal practice](https://lsb.vic.gov.au/sites/default/files/2024-12/Statement%20on%20the%20use%20of%20AI%20in%20Australian%20legal%20practice_2.pdf), issued jointly by three legal profession regulators on 6 December 2024, says lawyers using commercial AI tools with client information "need to carefully review contractual terms to ensure the information will be kept secure".

## Where will our data be stored and processed?

Ask:

- Where is our data stored, and where does the model process it?
- Can the vendor, its model provider or anyone else access, keep or train on what we input or generate? Can we switch that off?

Section 6.3 of the DTA's [AI impact assessment tool guidance](https://www.digital.gov.au/ai/impact-assessment-tool/guidance/reliability-safety) asks agencies to determine "if data will be hosted overseas and if it could be subject to foreign laws". The OAIC's due diligence questions ask whether the developer or other third parties will have access to what you input or generate, and whether you can turn that off. Under [CPS 230](https://www.apra.gov.au/standards/cps-230), in the version in force from 1 July 2026, an APRA-regulated entity must notify APRA before entering into a material offshoring arrangement, or a significant change to one, including where data will be located offshore (¶60(b)).

**A good answer** names the regions that hold and process your data, including where the model runs, and cites the clause in the terms you'd sign, not a marketing page. Training on your data is off by default, in writing.

## Which model is underneath, and who decides when it changes?

Ask:

- Which underlying model and version handles our requests, and from which provider?
- Which other providers do you rely on to deliver the service?

Section 6.3 asks agencies to determine "how versioning for the AI model is handled". CPS 230 requires the formal agreement for a material arrangement to make the provider notify you of other material service providers it materially relies on (¶53(d)).

**A good answer** names the provider and version, lists subcontractors, and commits to a change process. The DTA's [AI contract template](https://www.buyict.gov.au/api/dofa2/dta_attachment/content/d70ff8a193a84b10438b39cdfaba101e) (Version 1, offered as guidance only) sets the bar. The seller may only use an underlying AI model stated in the requirements or approved in writing, conforming on country of origin, ownership and the location of data at rest and during processing, and must request written approval before a change that would break those requirements. The buyer may refuse and terminate (clause 38.2).

## How was it tested, and on what?

Ask:

- How was the model evaluated: on what test data, with which metrics, and on which version?
- How do you reduce and measure hallucinations, bias and drift?
- Can we run our own acceptance test?

Section 6.3 asks agencies to determine "how the model was evaluated, including the test data and benchmarks used", and to review "measures taken to prevent or reduce hallucinations, unwanted bias and model drift". The OAIC asks: "What data has the product been trained and tested on?"

**A good answer** is a dated test report, tied to a model version, that lists failures as well as a headline score. Section 6.4 of the DTA guidance says a test report could include the methods and metrics, results for each test case, root causes of failures and recommended fixes, and that acceptance criteria "should be specific, objective and verifiable". The DTA contract template gives the buyer the right to conduct its own testing, monitoring and validation (clause 40.2).

## How will we hear about changes and incidents?

Ask:

- How much notice do we get before a model, feature or data-handling change?
- How fast will you tell us about an incident, and can we stop the system?

NSW's [AI procurement essentials](https://www.info.buy.nsw.gov.au/resources/artificial-intelligence-ai-procurement-essentials), updated on 6 May 2026, note that many third-party AI systems update models and components automatically after the initial risk assessment. Their suggested sourcing control reads: "Assess and agree timeframes, triggers, and processes for assessing changes to algorithms and new features prior to implementation." The DTA contract template requires immediate notice of a known or suspected AI incident (clause 38.3), and a circuit breaker the buyer can use to stop the system (clause 38.4).

**A good answer** gives a notice period in days, release notes naming the old and new versions, and a named incident contact, all in the contract, where APRA found such terms lacking.

## What records do we get, and can we leave?

Ask:

- What records and logs do we get, and for how long?
- On exit, how do we get our data back, and how will you show it has been deleted?
- How can the product be used to make decisions about people?

Section 6.3 asks agencies to specify "the kinds of records the supplier will provide to the agency", and to plan for "handover or destruction of agency data upon termination or expiry of the procurement contract". The DTA contract template requires logs of the system's outputs and of events that may lead to a substantial change, available throughout the contract (clause 40.8), and, on request, evidence that the buyer's AI datasets were destroyed (clause 41). APRA found few entities had tested exit and substitution strategies for critical AI providers, and CPS 230 requires an entity to ensure it can conduct an orderly exit from each material arrangement if needed (¶55(d)).

The last question matters because, from 10 December 2026, an APP entity's privacy policy must describe the kinds of decisions that computer programs make, or substantially and directly help make, where those decisions could significantly affect a person and use their personal information. The OAIC's [APP 1.7–1.9 fact sheet](https://www.oaic.gov.au/__data/assets/pdf_file/0021/269013/APP-1.7-1.9-Transparency-Obligation-Fact-Sheet.PDF), dated September 2026, says software providers "should provide clear, high-level information about how their software can be used to make decisions".

**A good answer** states the log fields and retention period, offers an export format you've tried, commits to written evidence of deletion, and describes decision uses in words your privacy team can work from.

## The checklist on one page

| Question | Source | A good answer |
|---|---|---|
| Where is data stored and processed? | DTA 6.3; CPS 230 ¶60(b) | Named regions, in the contract |
| Will anyone train on our data? | OAIC AI products guidance | Off by default, in writing |
| Which model, and who approves changes? | DTA 6.3; template 38.2 | Named model and version; your written approval |
| What testing evidence exists? | DTA 6.3 and 6.4 | A dated report listing failures |
| How will we hear of incidents? | DTA template 38.3 | Immediately, via a named contact |
| What records and exit? | DTA 6.3; CPS 230 ¶55(d) | Logs, a tried export, deletion evidence |
| How is it used in decisions? | OAIC APP 1.7–1.9 fact sheet | A written, high-level description |

## How to check the answers yourself

A vendor's answer is a claim until you test it. Before you sign or renew, run the product on your own questions, with expected answers written by your people and pass marks agreed before any result exists. Record the model version the vendor names, keep the test set, and re-run it when a change notice arrives. At renewal, ask the same questions about any AI feature added since you signed.

The [evaluation method](/resources/evaluation-method/) shows how a test like that is designed, and [re-testing after a model change](/insights/when-the-vendor-changes-the-model/) covers the re-run.
