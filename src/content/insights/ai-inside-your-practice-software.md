---
title: "Your practice software already runs AI."
description: "What JAX, MYOB AI BAS, Dext and Karbon AI do, whether each vendor says where its AI runs, and what the TPB asks before client information goes into any AI tool."
publishDate: 2026-09-29
type: platform-guide
industries: [accounting]
solutions: [ai-switch-on]
draft: false
# ⚑ owner: every commitment in this post must be in the standard engagement terms (spec §12 item 2)
---

Before a practice builds anything, it's worth knowing what the software it already licenses does with AI. This guide covers Xero, MYOB, Dext, Karbon and Microsoft 365 as at 29 September 2026. Each line links the vendor's own page. Vendor pages change, so check them again before you rely on any of it.

For each tool, four questions matter: what it does, who can see what, where the vendor says the AI runs, and whether it's on by default.

## Xero

[JAX](https://www.xero.com/au/ai-in-accounting/jax/) is a conversational assistant inside Xero. It answers questions about the business's own financials with charts and tables, helps with general business research, and helps with admin tasks such as creating invoices or quotes. Users see only the data their Xero permissions allow.

Where it runs: Xero says JAX uses third-party model providers (AWS, Microsoft Azure, Google Cloud and OpenAI) that don't retain the data or train on it. Its [subprocessor list](https://www.xero.com/au/legal/xero-subprocessors/) gives each provider's entity country, the United States, rather than where inference runs, and its [privacy notice](https://www.xero.com/au/legal/privacy/) says data may be processed in Australia, New Zealand and the United States. Xero doesn't publish where JAX inference runs for Australian customers.

XeroForce, Xero's natural-language automation builder, is [in early access](https://www.xero.com/au/media-releases/new-ai-innovations-xerocon-denver/) as at September 2026.

## MYOB

[MYOB AI BAS](https://www.myob.com/au/products/ai-bas-software), in beta, prepares the BAS through the quarter. It flags missing documents, possible GST issues and uncategorised transactions, and updates the books when a person approves a suggestion. It doesn't lodge with the ATO. MYOB says it's for non-employing, GST-registered Australian businesses with active bank feeds, and that its first releases cover simple BAS labels on cash-based accounts.

Where it runs: MYOB [says](https://www.myob.com/au/ai-accounting) its AI features follow the same security and privacy controls as its other products. Its [privacy policy](https://www.myob.com/au/legal/privacy-policy), dated August 2026, lists overseas recipients in New Zealand, the Philippines and the United States, and doesn't mention AI. MYOB doesn't publish where its AI processing runs.

## Dext

For practices, [Dext AI Assist](https://dext.com/au/partner/pricing) suggests bookkeeping decisions, such as categories and transaction review, with an explanation for each. The team reviews, refines, rejects or auto-applies each suggestion, practice-wide or per client.

Where it runs: Dext [hosts on AWS](https://dext.com/au/information-security) without stating the region. Its [privacy notice](https://dext.com/au/privacy-policy) names Microsoft Azure (OpenAI) among the third-party generative AI tools it uses, and says those providers may not train on customer data. Dext doesn't publish an Australian processing location for its AI features.

## Karbon

[Karbon AI](https://karbonhq.com/feature/ai/) composes and refines emails, suggests editable quick replies, drafts emails from tasks, summarises long threads and work items, builds a client brief from emails, notes, work and billing data, and flags missed time entries. Karbon says it's built on the Azure OpenAI Service and is enabled for all users in a firm by default, though account administrators can turn it off in firm settings. Kai, Karbon's AI coworker, is in Early Access.

Where it runs: Karbon says data stays in-region and gives the UK as its example. It doesn't name the region used for Australian firms.

Because it's on by default, the first question for a Karbon practice isn't whether to turn it on. It's whether your client terms already cover it.

## Microsoft 365

[Microsoft Copilot Chat](https://learn.microsoft.com/en-us/copilot/manage), the web-grounded chat for work accounts, comes with Microsoft 365 Business Basic, Standard and Premium. It uses your organisation's content only when a user pastes or uploads it. Microsoft's [privacy documentation](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy) says customers outside the EU may have their queries processed in the US, EU or other regions. Don't assume Copilot processes Australian prompts in Australia.

## What to settle before client information goes in

The Tax Practitioners Board's [TPB(GS) 55/2026](https://www.tpb.gov.au/tpbgs-552026-use-artificial-intelligence-and-code-professional-conduct), issued on 22 July 2026, says tax practitioners must obtain permission from each client before divulging client information to a third party, and that this can include entering client information into AI models and tools, depending on how those tools are configured and used. The TPB recommends telling clients to whom and where the disclosure will be made, where data will be stored, and whether AI tools may be used. It says permission may be given by a signed letter of engagement, signed consent, or a fact find and consent, and that a general authority may also be acceptable. It also says practitioners are ultimately responsible for due diligence, so that information is kept secure and Privacy Act requirements are met.

Three more sources shape the checks:

- **APESB.** Its [Technical Alert](https://apesb.org.au/wp-content/uploads/2025/10/TA_Use_of_AI_Oct_31_Oct_25.pdf) of 31 October 2025 says members must continue to meet their obligations under APES 110 when using AI, and must critically assess and verify information used or produced for a professional activity, including AI-generated information. It says members should disclose when AI tools are used, and supervise and review their use.
- **OAIC.** Its [guidance on commercially available AI products](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products) says entering personal information into an AI product can be a use or a disclosure, depending on whether the information stays within your control. As best practice, it recommends not entering personal information, particularly sensitive information, into publicly available generative AI tools. It applies to practices the Privacy Act covers.
- **The TFN Rule.** Tax documents often carry tax file numbers. Under the [Privacy (Tax File Number) Rule 2015](https://www.legislation.gov.au/F2015L00249/latest/text), anyone holding TFN information, whatever their size, may use or disclose it only for purposes authorised by tax, superannuation or personal assistance law (or to give people their own TFN information), and must take reasonable steps to protect it and restrict access to those who need it.

## A switch-on checklist

For each feature you plan to use:

1. Name the job it does, and who in the practice will use it.
2. Record where the vendor says processing runs, or that it doesn't say, with the page and the date you checked.
3. Record whether the vendor retains what you enter, or trains on it.
4. Note whether it's on by default, and who can turn it off.
5. Ask your adviser whether your engagement terms and client permissions cover it.
6. Decide what a person checks before anyone relies on an output, and how that check is recorded.

Then measure. An Admin Hours Audit maps where staff hours go before anything is switched on, so hours saved at day 30 are measured against that baseline rather than estimated.
