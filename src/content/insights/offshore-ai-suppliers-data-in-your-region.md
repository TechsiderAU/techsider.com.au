---
title: "Offshore AI suppliers and data in your region."
seoTitle: "Remote access by offshore AI suppliers and GDPR"
description: "Remote access from outside the EU or UK can be a data transfer, even if data is only shown on screen. What the EDPB and the ICO say, and what to ask suppliers."
publishDate: 2026-10-14
type: article
industries: []
solutions: [ai-evaluation, knowledge-assistant]
reviewBy: 2027-01-12
draft: false
---

Choosing a supplier whose systems run in your region settles where your data is stored and processed. It doesn't settle who can reach it. Under the GDPR and the UK GDPR, a supplier outside the EU or the UK that can see personal data held there, even on a screen during support, can be receiving a transfer of that data. A transfer then needs one of the tools in Chapter V of the GDPR, or its UK equivalent, such as an adequacy decision or standard contractual clauses.

This explainer covers what European and UK regulators say about remote access, where adequacy decisions help, how the standard contractual clauses and the UK's own tools work, and what to ask a supplier outside your region. Other countries set their own rules. It isn't legal advice: your privacy lawyer decides what your contracts need.

## Is a region in the contract enough?

A region answers two questions: where the data is stored, and where it is processed, including where the model runs. Both belong in the contract, by name. Neither says who can see the data. Support engineers, administrators and a supplier's own subcontractors can reach systems from wherever they work, and European and UK regulators treat that access as a question of its own.

## When is remote access a transfer?

The European Data Protection Board's [Guidelines 05/2021 on the interplay between Article 3 and Chapter V](https://www.edpb.europa.eu/system/files/documents/2023-02/edpb_guidelines_05-2021_interplay_between_the_application_of_art3-chapter_v_of_the_gdpr_v2_en_0.pdf), version 2.0, adopted on 14 February 2023, answer it directly:

> Remote access from a third country (even if it takes place only by means of displaying personal data on a screen, for example in support situations, troubleshooting or for administration purposes) … is also considered to be a transfer

The guidelines add a condition: the three criteria set out in their paragraph 9 must be met. Two of their examples show where the line falls. In Example 11, a processor outside the EU remotely accesses data stored in the EU, for instance for support, and the guidelines treat that as transfers from the EU controllers to their processor under Chapter V. In Example 8, an EU controller's own employee looks at data while travelling outside the EU, and that isn't a transfer. The examples turn on who has the access: a separate organisation, or the controller's own staff.

The UK's data protection regulator takes the same approach. The ICO's [guide to international transfers](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/international-transfers-a-guide/), last updated on 15 January 2026, says a transfer includes "making it accessible to a separate organisation outside the UK".

So a supplier's support desk outside the EU or the UK can turn a system that runs in your region into one that transfers personal data.

## Which countries need no extra safeguard?

A transfer is simplest where the destination has an adequacy decision. The European Commission's [list of adequacy decisions](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en) covers 16 countries and territories, plus the European Patent Organisation. The UK keeps its own list under the UK GDPR.

Australia, for example, is on neither. The Commission's list doesn't include it, and the ICO's [adequacy page](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/international-transfers/adequacy-regulations/is-the-restricted-transfer-covered-by-adequacy-regulations/) says "there are no UK adequacy regulations in place for Australia". When a supplier works from a country without adequacy, the transfer has to rest on another Chapter V tool.

## How do standard contractual clauses work?

The Commission's [standard contractual clauses](https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/new-standard-contractual-clauses-questions-and-answers-overview_en), adopted in 2021, come in four modules: controller to controller, controller to processor, processor to processor and processor to controller. Its questions and answers say the requirements of Article 28 of the GDPR "have been incorporated into Module 2". So where you're the controller and the supplier is your processor, Module 2 is the one that fits.

The text of the clauses can't be altered, beyond choosing modules and options, completing the text where necessary, filling in the annexes and adding safeguards that increase the level of protection for the data. Clause 14 requires the parties to assess, before signing, whether the laws and practices of the supplier's country could stop it meeting the clauses. That is the transfer impact assessment, and you'll need facts from the supplier to complete it.

The Commission names one gap itself. The 2021 clauses "do not work for importers whose processing operations are subject to the GDPR pursuant to Article 3". That can include a supplier outside the EU that offers goods or services to people in the EU, or monitors their behaviour there, as the EDPB's [Guidelines 3/2018 on territorial scope](https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf) explain. As at October 2026, the Commission said it was developing a separate set of clauses for that case, with no date given. If your supplier is in that position, ask which clauses it proposes, and let your lawyer decide.

## What about data from the UK?

For personal data leaving the UK, the contract tools are the UK's International data transfer agreement (IDTA), or its International data transfer addendum (the Addendum). The ICO's guide is plain about the assessment: "If you rely on a safeguard, you must also ensure that you have completed a transfer risk assessment (TRA)."

The Data (Use and Access) Act 2025 changed the UK's test for these transfers to a "data protection test": after the transfer, the protection people get must not be materially lower than under UK law. The new test has applied since 5 February 2026. IDTAs and Addenda signed before the change can still be relied on, where the transfer would have met the earlier rules.

## What to ask a supplier outside your region

Before you sign, or at renewal, ask for answers in writing:

1. **Where is our data stored and processed, and where does the model run?** Ask for regions by name, in the contract.
2. **Who can access it, from which countries, and why?** Include support, administration and troubleshooting, and the supplier's own subcontractors.
3. **Which transfer tool covers that access?** An adequacy decision, a named module of the EU clauses, or the IDTA or UK Addendum.
4. **Is the supplier itself subject to the GDPR?** If it is, the 2021 clauses may not fit, so ask what it proposes instead.
5. **What will it give us for the transfer assessment?** The laws that apply to it where it works, how access is controlled and logged, how data is encrypted, and which subcontractors it uses and where.
6. **How will it tell us about a new subcontractor, and can we object?**
7. **Will it use our data, or what our staff type into its product, to train models?** Ask for the answer in the contract.

A good answer is specific, dated and in the contract. A region you can name is a good start. The access terms, the transfer tool and the assessment behind them are what a privacy team will look for next.
