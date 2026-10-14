---
title: "Copilot is only as safe as your settings."
seoTitle: "Is Copilot safe for confidential information?"
description: "Where Microsoft 365 Copilot stores and processes Australian prompts, what goes to Bing, and what lawyers, tax practitioners and clinicians should check first."
publishDate: 2026-10-11
type: platform-guide
industries: [legal-and-professional, accounting]
solutions: [ai-switch-on]
region: au
draft: false
---

Microsoft 365 Copilot can handle confidential client information under Microsoft's enterprise terms, but whether it's safe for your firm depends on your licence, your settings and your file permissions. For a tenant provisioned in Australia, Microsoft commits to storing Copilot prompts and responses at rest in Australia. As at 11 October 2026, it doesn't commit to processing them here.

This guide isn't legal advice: for your obligations, go to your regulator or adviser.

A naming note: Microsoft now [calls it Microsoft Copilot](https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-privacy), though licences may still say Microsoft 365 Copilot.

## Copilot Chat or the paid licence: which do your staff have?

[Copilot Chat](https://learn.microsoft.com/en-us/copilot/manage) comes with Microsoft 365 Business Basic, Standard and Premium, E3 and E5, among other plans. Microsoft [says](https://learn.microsoft.com/en-us/copilot/privacy-and-protections) it's grounded in web data only. It uses firm content when a user pastes or uploads it, or in Outlook, where it can reach the user's email, calendar, meetings, chats and limited file content.

The paid Microsoft Copilot add-on [grounds answers in Microsoft Graph](https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-privacy): the emails, chats and documents each user has permission to open.

Both come with [enterprise data protection](https://learn.microsoft.com/en-us/microsoft-365/copilot/enterprise-data-protection) (updated 29 May 2026). Prompts and responses fall under the Data Protection Addendum (DPA) and Product Terms, with Microsoft as data processor, and aren't used to train foundation models. That covers work accounts. [Personal Microsoft accounts](https://learn.microsoft.com/en-us/copilot/manage) are kept separate, and Tenant Restrictions v2 controls whether staff can use them.

## Is Copilot data stored in Australia?

Yes, at rest. Under the Product Terms section [Location of Customer Data at Rest for Core Online Services](https://www.microsoft.com/licensing/terms/product/PrivacyandSecurityTerms/all), for a tenant provisioned in Australia, Microsoft will store "any stored content of interactions with Microsoft 365 Copilot or Microsoft 365 Copilot Chat" at rest only within that geography. Microsoft's [Product Terms data residency page](https://learn.microsoft.com/en-us/microsoft-365/enterprise/m365-dr-product-terms?view=o365-worldwide) (updated 8 October 2026) dates Copilot's inclusion to 1 March 2024 and Copilot Chat's to 1 September 2025. Its Australian [datacentres](https://learn.microsoft.com/en-us/microsoft-365/enterprise/m365-dr-datacenter-locations?view=o365-worldwide) are in Melbourne and Sydney. The [Advanced Data Residency](https://learn.microsoft.com/en-us/microsoft-365/enterprise/m365-dr-adr-overview?view=o365-worldwide) add-on extends commitments to more services.

Check your own tenant. The [Data Location Card](https://learn.microsoft.com/en-us/microsoft-365/enterprise/m365-dr-data-location-card?view=o365-worldwide) shows the current and committed geography for each service it lists. Copilot Chat is covered but isn't displayed.

## Is it processed in Australia?

Not under any commitment yet, and Microsoft's own pages give different dates:

| Microsoft page | Date | What it says about Australia |
|---|---|---|
| [In-country processing announcement](https://www.microsoft.com/en-us/copilot/blog/?p=279984) | 4 Nov 2025 | In-country processing option by the end of 2025 |
| Editor's note on the same page | 3 Apr 2026 | Local inferencing expected by the end of 2026 |
| [Roadmap item 571886](https://www.microsoft.com/en-us/microsoft-365/roadmap?id=571886) | Modified 23 Sep 2026 | Local inferencing in development, target December 2026 |
| [Copilot privacy page](https://learn.microsoft.com/en-us/microsoft-365/copilot/microsoft-365-copilot-privacy) | Updated 9 Jul 2026 | Customers outside the EU may have queries processed in the US, EU or other regions |

Microsoft's two later pages both give the end of 2026, and neither says the end-2025 option arrived. The privacy page adds that model calls go to the closest datacentres but can go to other regions in high-use periods. Microsoft's [data residency overview](https://learn.microsoft.com/en-us/microsoft-365/enterprise/m365-dr-what-is-data-residency?view=o365-worldwide) (8 October 2026) says that "with the appropriate configuration" Copilot processing stays within the same geographic boundary as stored data, without naming the configuration, and that detailed documentation is "coming soon". Before relying on any date, check the current Learn page and your tenant's settings.

The announcement's footnote also limits it to prompts and responses from models hosted on Azure OpenAI. Microsoft's [Anthropic models page](https://learn.microsoft.com/en-us/microsoft-365/copilot/connect-to-ai-subprocessor) (18 September 2026) says Anthropic models are on by default for most commercial customers outside the EU, EFTA and UK, and are "currently excluded from the EU Data Boundary, and when applicable, in-country processing commitments". Models labelled "Anthropic models with Data Retention" are off by default; if enabled, Anthropic stores the data, and Microsoft's Product Terms and DPA don't apply.

## What leaves Microsoft 365 when Copilot searches the web?

With [web search](https://learn.microsoft.com/en-us/microsoft-365/copilot/manage-public-web-access) on, Copilot sends Bing a generated query of a few words, without user or tenant identifiers. It doesn't send whole files, or the whole prompt unless it's very short. But a query can carry names: in Microsoft's example, a question about the user's manager sends the manager's name.

Microsoft acts as data controller for these queries and the DPA doesn't apply, though the Product Terms treat them as customer confidential information. If an admin doesn't set the Allow web search in Copilot policy, web search is on by default.

The OAIC's [guidance on commercially available AI products](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products) (updated 17 January 2025) flags this: some products' search-engine interfaces would disclose personal information in prompts to a third party. It lists turning such features off as one measure.

## Copilot shows staff what they can already open

Microsoft's privacy page says Copilot "only surfaces organizational data to which individual users have at least view permissions". A spreadsheet shared firm-wide years ago is one question away. A matter walled off by convention rather than permissions isn't walled off.

Microsoft's [SharePoint Advanced Management guidance](https://learn.microsoft.com/en-us/microsoft-365/copilot/get-ready-copilot-sharepoint-advanced-management) (16 July 2026) says SharePoint's default sharing setting is the most permissive option. It recommends data access governance reports and, while reviews run, [Restricted Content Discovery](https://learn.microsoft.com/en-us/sharepoint/restricted-content-discovery), which hides a site from Copilot and organisation-wide search without changing permissions. Where [sensitivity labels](https://learn.microsoft.com/en-us/purview/sensitivity-labels) apply encryption, Copilot returns content only if the user has the EXTRACT (copy) right.

## What do the regulators ask?

**Lawyers.** The [statement on AI in Australian legal practice](https://lsbc.vic.gov.au/news-updates/news/statement-use-artificial-intelligence-australian-legal-practice), issued on 6 December 2024 by the Law Society of NSW, the Legal Practice Board of Western Australia and the Victorian Legal Services Board + Commissioner, says (citing ASCR r 9.1 and BR r 114):

> Lawyers cannot safely enter confidential, sensitive or privileged client information into public AI chatbots/copilots (like ChatGPT), or any other public tools. If lawyers use commercial AI tools with any client information, they need to carefully review contractual terms to ensure the information will be kept secure.

With a work account, the Microsoft terms above are the contract terms to review. A personal account [doesn't get enterprise protections](https://learn.microsoft.com/en-us/copilot/manage).

**Tax practitioners.** [TPB(GS) 55/2026](https://www.tpb.gov.au/tpbgs-552026-use-artificial-intelligence-and-code-professional-conduct), issued on 22 July 2026, says practitioners must obtain each client's permission before divulging client information to a third party, which can include entering it into AI tools, depending on how they're configured and used (¶23). It recommends telling clients where data will be stored. Permission can come through a signed engagement letter or consent (¶24), practitioners remain responsible for due diligence (¶25), and the TFN Rule adds obligations (¶26).

**Health practitioners.** Ahpra's [guidance on AI in healthcare](https://www.ahpra.gov.au/Resources/Artificial-Intelligence-in-healthcare.aspx) (reviewed 22 August 2024) says to involve patients in the decision to use AI tools that need their personal data, obtain informed consent, and understand where data is located and stored.

**Privacy Act.** Where the Act applies, the OAIC says entering personal information into an AI product is a use if it stays within your control, and a disclosure if it leaves your effective control. For cloud products, it asks where servers are and whether information could go outside Australia.

## Before client files go in: a checklist

1. **Licences.** List who has Copilot Chat only and who has the paid add-on.
2. **Accounts.** Require work accounts, and decide whether to block personal sign-in.
3. **Location.** Record the Data Location Card's geographies for Copilot, with the date.
4. **Processing.** Record that Australian processing isn't committed. Re-check roadmap item 571886 and the privacy page each quarter.
5. **Model providers.** In the admin centre's AI subprocessor setting, decide on Anthropic models, and keep data-retention models off.
6. **Web search.** Set the web search policy deliberately.
7. **Permissions.** Using Microsoft's [deployment guidance](https://learn.microsoft.com/en-us/microsoft-365/copilot/secure-govern-copilot-foundational-deployment-guidance): run the governance reports, fix firm-wide sharing, and restrict discovery of high-risk sites until reviewed.
8. **Labels.** Apply encrypting labels to the matters that need them.
9. **Records.** Set [Purview retention](https://learn.microsoft.com/en-us/purview/retention-policies-copilot) for Copilot interactions, and file this list with your AI policy.
10. **Clients.** Update engagement terms, consents and your privacy policy to match.

Then test before relying on it. Sign in as a junior user and ask about a matter they shouldn't see. Ask a question naming a client and check the web query it generated. Repeat on closed matters with known answers. See [AI switch-on](/solutions/ai-switch-on/) for setting up licensed AI features with agreed access rules, and [what you already pay for](/resources/what-you-already-pay-for/) for the features your licences include.
