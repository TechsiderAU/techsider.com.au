---
title: "Courts want a person to verify AI output."
description: "NSW SC Gen 23, Victoria's SC Gen 25 and the County Court's note put verification on a person. What to test in a legal AI tool before it touches court work."
publishDate: 2026-09-29
type: article
industries: [legal-and-professional]
solutions: [ai-evaluation, ai-switch-on]
draft: false
# ⚑ owner: every commitment in this post must be in the standard engagement terms (spec §12 item 2)
---

Many lawyers already use general-purpose AI. In the Victorian Legal Services Board + Commissioner's [report on its 2025 lawyer census](https://lsbc.vic.gov.au/research-centre/what-we-do/publications/generative-ai-use-legal-profession-findings-2025-victorian), 65% of the 638 respondents who used AI named general-purpose tools such as ChatGPT, Claude, Gemini, Perplexity or personal Copilot plans. The census covers Victorian lawyers only, and its 6.4% response rate was weighted after collection.

Courts have set out what they expect when AI touches court documents. Three practice notes put the check on a person. This article covers what they say, and what that means for testing a legal AI tool before you rely on it.

## NSW Supreme Court: SC Gen 23

[Practice Note SC Gen 23](https://supremecourt.nsw.gov.au/content/dam/dcj/ctsd/supreme-court/documents/Practice-and-Procedure/Practice-Notes/general/current/PN_SC_Gen_23.pdf) was issued on 28 January 2025 and applies to all proceedings from 3 February 2025.

- Where Gen AI was used to prepare written submissions, the author must verify in the body of the submissions that all citations, legal and academic authority, case law and legislative references exist, are accurate and are relevant to the proceedings (¶16). That verification must not be carried out solely with a Gen AI tool (¶17).
- Gen AI must not be used to generate the content of affidavits, witness statements, character references or other material meant to reflect a deponent's or witness's evidence (¶10).
- Material under a suppression or non-publication order, the Harman undertaking, a subpoena or a statutory publication ban can't go into any Gen AI program unless the responsible practitioner is satisfied it stays within a controlled environment under supplier confidentiality restrictions, is used only for that proceeding, and isn't used to train any model (¶9A).
- The note names Lexis Advance AI, Westlaw Precision and CoCounsel Core as examples of Gen AI (¶3), and it doesn't apply to dedicated legal research software that uses AI to search legislation, judgments or legal texts (¶6(b)).

## Supreme Court of Victoria: SC Gen 25

[Practice Note SC Gen 25](https://www.supremecourt.vic.gov.au/areas/legal-resources/practice-notes/sc-gen-25-the-use-of-artificial-intelligence-by-court-users) was issued and commenced on 14 May 2026, replacing the Court's 2024 guidelines for litigants.

- Content produced using AI must be verified with meaningful human control (¶7.1), and court users are responsible for making sure it's current, complete, accurate and applicable to the jurisdiction (¶7.2).
- Asking an AI tool to confirm that materials exist, or contain what it says they do, isn't sufficient verification, and one AI tool can't be used to confirm the content another generated. Court users may verify by referring to original source material held within a GenAI tool (¶7.4(e)).
- Court users must be prepared to identify the specific portions of court documents that were produced using AI, and to explain how the output was verified (¶7.6).

The County Court's [Practice Note PNCCV 1-2026](https://www.countycourt.vic.gov.au/sites/default/files/documents/2026-06/use-artificial-intelligence-court-users-practice-note.docx), version 1.0 dated 5 June 2026, sets out the same verification requirement in the same words.

## The regulators' joint statement

The [statement on the use of AI in Australian legal practice](https://lsbc.vic.gov.au/news-updates/news/statement-use-artificial-intelligence-australian-legal-practice), issued on 6 December 2024 by the Law Society of NSW, the Legal Practice Board of Western Australia and the Victorian Legal Services Board + Commissioner, applies in those Uniform Law jurisdictions. It says lawyers can't safely enter confidential, sensitive or privileged client information into public AI chatbots or copilots, and that before using commercial AI tools with any client information, they need to review the contract terms carefully. It says no tool based on current LLMs can be free of hallucinations, so lawyers must be able to verify what a tool produces, and must actually check it. It also suggests lawyers consider risk-based policies naming approved tools, users, purposes and permitted information, and keep AI to lower-risk tasks that are easier to verify.

## What to test before a tool touches court work

Every one of these instruments puts verification on a person. That changes what a test of a legal AI tool should measure. Knowing a tool is usually right isn't enough. You need to know which tasks it gets wrong, and how easy those errors are to catch.

A test on your own closed matters answers that:

- **Known answers.** Questions and tasks come from closed matters whose answers your senior lawyers already know: research questions, a chronology from a de-identified file, clause extraction from a lease.
- **Thresholds first.** A partner agrees the pass thresholds before testing.
- **Two graders.** Two lawyers grade each answer separately, and their agreement is measured.
- **Results by task type.** Wrong answers are counted by task type, so you can see which tasks are easy to verify and which need a full review.
- **Every bad citation listed.** Each citation that doesn't exist, or doesn't support its proposition, is listed with the question it came from.
- **Refusals counted.** The test records how often a tool said it didn't know when the answer was in the file.
- **A data note per tool.** It records where the tool stores and processes inputs, and its retention and training settings.

Run the tools you're comparing on the same questions, side by side, in accounts your firm controls. If a vendor won't allow a structured trial on your own matters, you learn that before you sign. And the evaluation is only independent if the evaluator didn't set up or advise on the tool for your firm, and takes no resale margin or referral fees from the vendors being tested.

## Where the tools say they run

Hosting differs, and it matters for confidentiality:

- Thomson Reuters says of [CoCounsel Core](https://www.thomsonreuters.com.au/en-au/products/cocounsel.html) that "all customer prompts, content, and output are currently stored and processed in Australia".
- Harvey documents an [AU-hosted deployment](https://developers.harvey.ai/api-reference/authentication) with its own API endpoint.
- LEAP [says](https://www.leaplegalsoftware.com/au/security-2/) Australian and New Zealand firms are hosted on AWS in Sydney, and that some AI features, including Matter AI, may transfer limited client data to the US for processing by AI service providers.
- LexisNexis says [Lexis+ AI is now Lexis+ with Protégé](https://www.lexisnexis.com/en-au/products/lexis-plus-ai), and lists a CaseBase citation service for confirming the status and authority of legal references. The same page names Microsoft Azure and Amazon Web Services Bedrock, but no processing location.

If your firm runs LEAP, try Matter AI and LawY first. LEAP [says both](https://www.leaplegalsoftware.com/au/features/legal-ai/) come with every LEAP subscription. Matter AI answers with references to the documents it relied on. LawY gives legal research answers with cited case law and legislation, and has an option to send an answer to a qualified Australian lawyer for verification.

## A record, not a checker

Vendors now bundle citation checking, so the gap isn't the check itself. It's showing the check afterwards: SC Gen 25 ¶7.6 says court users must be prepared to identify the parts of a court document produced with AI and explain how the output was verified. A record holds that: which sections of each document came from AI, who checked each authority, against which source, and when. With it, the responsible lawyer can answer from the file rather than from memory. It's a log, not a safeguard. The verification is still the lawyer's.
