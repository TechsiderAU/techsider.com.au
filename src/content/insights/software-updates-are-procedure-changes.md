---
title: "Re-test SOP answers before each model update."
description: "Safe Work Australia's AI guidance says vendor-pushed updates may change WHS risks. How to test an SOP assistant in each language, before and after each update."
publishDate: 2026-09-29
type: article
industries: [manufacturing]
solutions: [knowledge-assistant]
draft: false
# ⚑ owner: every commitment in this post must be in the standard engagement terms (spec §12 item 2)
---

Safe Work Australia [published new guidance](https://www.safeworkaustralia.gov.au/media-centre/news/new-ai-and-digital-technologies-guidance-now-available) on AI and digital technologies at work on 23 July 2026. One line in it matters to any plant putting procedures behind an AI assistant. Implementing new digital technologies, or changing existing ones, "including routine changes to IT systems, or updates 'pushed' or initiated by software providers", may introduce or change WHS risks, [the guidance says](https://www.safeworkaustralia.gov.au/safety-topic/hazards/digital-technologies-ai).

An SOP assistant is that kind of system. Its answers depend on a model its vendor can update. Manufacturers use AI less than businesses overall: in the [ABS's 2024–25 figures](https://www.abs.gov.au/statistics/industry/technology-and-innovation/characteristics-australian-business/2024-25), 9% of manufacturing businesses reported using AI, against 12% of all businesses. This article sets out the WHS duties that shape an SOP assistant, and a test design built around them, run before and after each update.

## Instruction a worker can understand

The model WHS laws have been [implemented in every jurisdiction except Victoria](https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws). Under regulation 39 of the [model WHS Regulations](https://www.safeworkaustralia.gov.au/sites/default/files/2025-12/model-whs-regulations-5_december_2025.pdf), a person conducting a business or undertaking must ensure that information, training and instruction given to a worker is suitable and adequate for the nature of the work, its risks and the control measures in place. So far as reasonably practicable, it must be provided in a way that is readily understandable by the person it's provided to. Victoria's [Occupational Health and Safety Act 2004](https://www.legislation.vic.gov.au/in-force/acts/occupational-health-and-safety-act-2004/045) sets duties of the same shape, including providing health and safety information "in such other languages as appropriate" (s 22(1)(c)).

If staff get work instructions through an assistant, treat its answers as instruction you provide. That sets the design:

- Answers come in the worker's language, with the English SOP step and page shown beside them.
- The assistant says "not in our documents" rather than guess.
- Each language gets its own test questions and its own error rate, because answer quality varies by language. A language that misses the agreed threshold doesn't go live.

## Consult before it goes live

Safe Work Australia's [guidance on WHS duties](https://www.safeworkaustralia.gov.au/safety-topic/hazards/digital-technologies-ai/whs-duties) says a PCBU must consult workers and their health and safety representatives about work health and safety matters, and that this includes before introducing digital technology that may affect health and safety. The [model WHS Act](https://www.safeworkaustralia.gov.au/sites/default/files/2025-12/model-whs-bill-5_december_2025.pdf) requires consultation, so far as reasonably practicable, when proposing changes that may affect workers' health or safety and when making decisions about procedures for providing information and training (s 49(d) and (e)(v)). Where workers are represented by a health and safety representative, the consultation must involve that representative (s 48(2)).

The test can be the consultation's working material. Floor staff and HSRs write the test questions in the languages the crews use, see the list of questions the assistant refuses, and review sample answers before go-live. Their feedback is logged, and each item gets a response.

## Review before the model changes

Regulation 38 of the model WHS Regulations requires a control measure to be reviewed, and revised as necessary, before a change at the workplace that is likely to give rise to a new or different risk the measure may not effectively control. A change includes a change to a system of work, a process or a procedure. The regulation applies to control measures for risks the regulations cover, such as those from plant, hazardous chemicals and manual tasks. Safe Work Australia's [guidance on managing the risks](https://www.safeworkaustralia.gov.au/safety-topic/hazards/digital-technologies-ai/managing-risks) of AI gives a software update as an example of such a change.

Where SOPs delivered through an assistant are control measures, treat a model update as that kind of change. The mechanism is simple:

1. Every model, prompt or index change re-runs the agreed question set before release.
2. Answers that changed are listed for the document owner.
3. The previous version stays live until the document owner signs off.

## Food and medicines plants

- **Food.** Clause 12 of Standard 3.2.2 of the [Food Standards Code](https://www.legislation.gov.au/F2008B00576/latest/text) requires a food business engaged in wholesale supply, manufacture or importation to have a system to recall unsafe food, set it out in a written document, and comply with it when recalling. The Standard says nothing about AI. But an answer drawn from an old copy of the recall procedure, or from the model's general knowledge, could lead staff away from the written system you must follow. So the assistant reads only the current controlled version, shows its version and page with every answer, and refuses when the written system doesn't cover the question. The written document stays the authority.
- **Medicines, APIs and sunscreens.** Unless exempt, these manufacturers must follow the PIC/S Guide to GMP, PE009-17, adopted through the [Manufacturing Principles Determination](https://www.legislation.gov.au/F2020L00864/latest/text), including Annex 11 on computerised systems. Annex 11, whose text is unchanged in the [current PIC/S edition](https://picscheme.org/docview/11333), applies to all forms of computerised systems used as part of GMP-regulated activities and says the application should be validated. Whether an SOP assistant is part of a GMP-regulated activity is your quality team's call. If it is, they set the validation approach, and the test supplies the intended-use statement, test scripts, results and failure list.

## Try the platform first

If your procedures already live in SafetyCulture, now Mitti, its [AI Assistant](https://mitti.com/ai) answers questions about your operations, and Mitti's own examples include "What's the latest SOP for handling food products?". Test it on your own questions first. If your staff have Copilot licences, [SharePoint's built-in AI](https://learn.microsoft.com/en-us/sharepoint/get-started-sharepoint-agents) can answer from an SOP library within each user's permissions. Try that too.

A separate build is worth it only for what those don't cover: OEM manuals and work instructions held outside the safety platform, answers in several languages with each one tested on its own, and a measured refusal rate. Predictive maintenance, vision QA and questions about ERP data are outside this approach altogether; specialist products and your ERP's own AI cover those.
