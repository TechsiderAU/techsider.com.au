---
title: "Check where property AI sends tenant data."
description: "What PropertyMe's AiMe features and Rex AI do, what each vendor publishes about where its AI runs, and the renter-data rules to check before you switch them on."
publishDate: 2026-09-29
type: platform-guide
industries: [real-estate]
solutions: [ai-switch-on, document-registers]
draft: false
# ⚑ owner: every commitment in this post must be in the standard engagement terms (spec §12 item 2)
---

Your property management software may already include AI. This guide covers PropertyMe and Rex, plus Microsoft 365 and Google Workspace, as at 29 September 2026. Each line links the vendor's own page. Check it again before you rely on it, because these pages change.

For each feature, three things matter: what it does, where the vendor says the AI runs, and what your state's renter-data rules say about the information it handles.

## PropertyMe

PropertyMe [lists](https://www.propertyme.com.au/pricing) Reply with AiMe, AiMe Comply and Bills AI in its Advanced plan, and its Premier plan includes everything in Advanced.

- [Reply with AiMe](https://www.propertyme.com.au/features/reply-with-aime) drafts replies to messages in the PropertyMe inbox, such as arrears, inspections and supplier messages, in the agency's tone. PropertyMe says "AiMe suggests a reply for you to review and approve first".
- [AiMe Comply](https://www.propertyme.com.au/features/aime-comply) gives general guidance on state rental law questions inside PropertyMe, and PropertyMe says it doesn't replace professional legal advice.
- [Bills AI](https://www.propertyme.com.au/features/bills-ai) reads an uploaded supplier bill and fills in the bill fields, and the property manager checks the result before it's saved.

Where it runs: PropertyMe says AiMe operates within PropertyMe's secure infrastructure, but it doesn't name a region or a model provider. Its [privacy policy](https://www.propertyme.com.au/privacy), dated 26 March 2025, lists third parties in Australia and the United States and doesn't mention AI.

## Rex

Rex [lists Rex AI](https://www.rexsoftware.com/plans) in its Professional plan: email and SMS drafting, plain-English search filters over CRM data, and listing ad copy.

Where it runs: Rex's [privacy policy](https://www.rexsoftware.com/legal/privacy-policy) says the CRM is hosted on Google Cloud, with Australian customer data in Australian data centres. Its [sub-processor register](https://www.rexsoftware.com/legal/authorised-sub-processor-register) lists AI inference by Anthropic, OpenAI and Google Vertex AI with the processing location "United States / Global", under zero-retention and no-training terms. Rex says it keeps AI interaction logs in Australia for 12 months.

That's the pattern to look for with any vendor. Where a platform is hosted and where its AI model runs can be two different places.

## Microsoft 365 and Google Workspace

If your shared inboxes run on Microsoft 365, Microsoft says customers outside the EU [may have their Copilot queries processed](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy) in the US, EU or other regions. Google's [data regions](https://knowledge.workspace.google.com/admin/compliance/data-covered-by-data-regions) for Gemini prompts and responses offer the United States or Europe only.

## Renter-data rules to check first

Victoria and Queensland set how renter information is protected and when it must be destroyed. Before an AI feature copies that information somewhere new, check how these rules treat the copy.

- **Victoria.** Under the [Residential Tenancies Act 1997](https://www.legislation.vic.gov.au/in-force/acts/residential-tenancies-act-1997), rental providers and the agencies acting for them must take reasonable steps to protect renter information from misuse or loss and from unauthorised access, modification or disclosure (s 505BB). They must destroy or permanently de-identify the information within 3 years after the rental agreement ends, or, for an unsuccessful applicant, within 30 days after the property is let, or 6 months with written consent (s 505BC). Information counts as held wherever the document sits, in or outside Victoria (s 505BA). These duties don't apply where the holder complies with corresponding Privacy Act obligations (s 505BE). How these rules apply when renter information goes to an AI provider is a question for your lawyer.
- **Queensland.** Under the [Residential Tenancies and Rooming Accommodation Act 2008](https://www.legislation.qld.gov.au/view/whole/html/inforce/2026-08-17/act-2008-073), applicant and tenant information may be collected and accessed only for set purposes and must be stored securely. It must be destroyed within 3 months after the agreement an unsuccessful applicant applied for starts, unless they agree to longer, or within 7 years after the agreement ends (ss 457D–457E). In our reading, a copy or extracted field that still identifies a person is still that person's information. The [Residential Tenancies Authority says](https://www.rta.qld.gov.au/before-renting/applying-for-a-rental-property/personal-information) these rules apply to agreements that started on or after 1 May 2025, whatever the size of the business.
- **New South Wales.** The NSW Government [says](https://www.nsw.gov.au/ministerial-releases/renters-get-landmark-protections-against-privacy-breaches-and-misleading-rental-ads) the Residential Tenancies (Protection of Personal Information) Amendment Bill 2025 passed the NSW Parliament on 24 September 2026, and it expects the new laws to take effect in early 2027. The Government says the reforms include clear rules on how personal data must be stored and destroyed, and a requirement to disclose when property images in rental advertisements have been digitally altered or AI-generated to hide faults. Watch for the start date.

## Five questions before you switch a feature on

1. What does it read: messages, bills, CRM records, documents?
2. Where does the vendor say the AI runs, or does it say nothing? Record the page and the date you checked.
3. Does the vendor keep what you send, or train on it?
4. How long are outputs and logs kept, and do those periods fit the destruction dates above?
5. Who approves before anything is sent, saved or changed?

An Admin Hours Audit maps where your team's hours go first. Switch-On then configures the features you already own, and its onshore note records what each vendor publishes about where its AI runs, with the source and the date.

## What these features don't do

None of the features above turns your signed management agreements, condition reports and trust exports into a register you can check field by field. That's a separate job: a register where every field links to the page it came from, with the error rate measured on agreements your senior property managers already know before anyone relies on it. It stays read-only on your trust ledger, and a property manager completes any action in your own system.
