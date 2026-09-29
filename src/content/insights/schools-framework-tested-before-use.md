---
title: "Test school AI before staff use it."
description: "The Australian Framework for Generative AI in Schools expects AI tools to be tested before use and monitored after. What that asks of a staff policy assistant."
publishDate: 2026-09-29
type: article
industries: [education]
solutions: [knowledge-assistant, ai-evaluation]
draft: false
# ⚑ owner: every commitment in this post must be in the standard engagement terms (spec §12 item 2)
---

The [Australian Framework for Generative AI in Schools](https://www.education.gov.au/schooling/resources/australian-framework-generative-artificial-intelligence-ai-schools) is national guidance, not law. It describes itself as "aspirational in nature". States, territories and non-government sectors began building it into their own systems from Term 1, 2024, and Education Ministers endorsed its 2024 review in June 2025. At their July 2026 meeting, Ministers agreed to discuss the use and impact of AI in schools when they next meet in October, according to their [communiqué](https://www.education.gov.au/education-ministers-meeting/resources/communiqus-education-ministers-meetings-2026).

Two of the Framework's principles cover testing and monitoring:

> 5.2 Reliability: generative AI tools are tested before they are used, and reliably operate in accordance with their intended purpose.
>
> 5.3 Monitoring: the impact of generative AI tools on school communities is actively and regularly monitored, and emerging risks and opportunities are identified and managed.

Others shape how a tool is set up. Under 3.2, school communities are appropriately informed when generative AI tools are used in ways that affect them. Under 6.1, tools are used in ways that comply with Australian law, avoid unnecessary collection, limit retention, prevent further distribution and prohibit the sale of student data. Under 6.2, school communities are told how and what data will be collected, used and shared, and consent is sought where needed.

## What "tested before use" looks like for a staff assistant

Take a common first use: an assistant that answers staff questions from the school's own policies and procedures, such as excursion approvals, incident reporting or leave. Administrative work already takes teachers' time. [AITSL's June 2025 workforce data](https://www.aitsl.edu.au/resources/national-trends-teacher-workforce-june-2025) reports that "Primary and secondary classroom teachers spent a notable amount of time on lesson planning and administrative tasks (6-9 hours per week per task)". A tool meant to lighten that load has to be checked first, or checking its answers becomes part of the load.

A test built around 5.2 has these parts:

- **Questions staff actually ask.** Between 50 and 100, written by staff with known answers, including some the documents don't answer.
- **A threshold set first.** The acceptable error rate is agreed before testing starts.
- **Two failure counts.** False answers (confident but wrong or unsupported) are counted separately from false refusals ("not in our documents" when the answer is there).
- **Citation checks.** Each answer shows the document, section and version it used, and the test checks that the version is current.
- **Permission checks.** Some questions are asked from test accounts that shouldn't see restricted documents, to confirm the assistant doesn't quote them.
- **A re-test when the model changes.** The same questions run again, so the monitoring 5.3 describes has results to compare.

For registered higher-education providers, universities included, Standard 7.3.3(b) of the [Higher Education Standards Framework](https://www.legislation.gov.au/F2021L00488/latest/text) requires information systems and records to be kept securely and confidentially enough to prevent unauthorised or fraudulent access to private or sensitive information. An assistant that searches a provider's documents shouldn't show that information to someone who couldn't open the source document. The permission checks test exactly that.

## Check what you already have

If your policies live in SharePoint and staff have Copilot licences, [SharePoint's built-in AI](https://learn.microsoft.com/en-us/sharepoint/get-started-sharepoint-agents) can already answer from site pages and document libraries, within each user's access permissions. Google says [Gemini for Education](https://edu.google.com/intl/ALL_au/ai/gemini-for-education/) is included in all Google Workspace for Education editions. If either answers your staff's questions well enough on your own test, use it, and don't build anything.

Where the answers are processed differs by vendor. Microsoft says customers outside the EU [may have their queries processed](https://learn.microsoft.com/en-us/copilot/microsoft-365/microsoft-365-copilot-privacy) in the US, EU or other regions. Google's [data regions](https://knowledge.workspace.google.com/admin/compliance/data-covered-by-data-regions) for Gemini prompts and responses offer the United States or Europe, not Australia. Your test tells you whether the answers are good enough; the vendor's own pages tell you where they're produced.

## Privacy depends on what kind of school you are

The OAIC's [coverage page](https://www.oaic.gov.au/privacy/privacy-legislation/the-privacy-act/rights-and-responsibilities) lists private schools and private tertiary institutions among the organisations the Privacy Act covers, even below its small-business turnover threshold; edge cases are for your adviser. The Act doesn't cover public schools, or universities other than private universities and the Australian National University, which fall under state and territory privacy law instead.

For schools and providers the Act covers, the OAIC's [guidance on commercially available AI products](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products) makes four points that bear on a staff assistant:

- putting personal information into an AI system is a use or disclosure that APP 6 limits;
- APP 10 requires reasonable steps to keep personal information accurate, with care that matches the higher risk in an AI context;
- due diligence "should not amount to a 'set and forget' approach";
- as best practice, personal information, and particularly sensitive information, shouldn't be entered into publicly available generative AI tools.

A staff policy assistant can keep its scope narrow by design. It reads staff policies and procedures only; student records, reports and wellbeing notes stay out of scope. A one-page data note says what it reads, what it logs, how long logs are kept and where processing happens.

## Evaluating a tool you've already deployed

If you already run ChatGPT Edu, Microsoft Copilot or Gemini for Education, the same test design applies to the tool you have. In higher education, TEQSA [asked every registered provider](https://www.teqsa.gov.au/guides-resources/higher-education-good-practice-hub/artificial-intelligence/request-information-addressing-risk-artificial-intelligence) on 3 June 2024 for an action plan to address the risk generative AI poses to award integrity. That request concerns award integrity, which a staff policy tool doesn't touch. For a staff tool, an independent evaluation tests it on your own questions, in your own environment, and gives your governing body and academic board a failure list rated to your risk matrix. It can't promise any regulator will accept it, and it isn't independent if the same firm configured the tool.

Two things stay outside this approach: student-facing tutors, and system-wide platforms built by education departments, such as NSWEduChat. The work here is for staff.
