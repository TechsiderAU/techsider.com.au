---
title: "Measure what an AI scribe leaves out."
description: "The TGA, ACSQHC and Ahpra ask for AI scribes to be checked before use and reviewed after updates. How to test one on scripted consultations in your specialties."
publishDate: 2026-09-29
type: article
industries: [healthcare]
solutions: [ai-evaluation]
draft: false
# ⚑ owner: every commitment in this post must be in the standard engagement terms (spec §12 item 2)
---

The Australian Commission on Safety and Quality in Health Care's [ambient scribe safety scenario](https://www.safetyandquality.gov.au/sites/default/files/resources/additional//ai-safety-scenario-ambient-scribe.pdf) says that, generally and depending on their functionality, ambient AI scribes aren't regulated as medical devices by the TGA, "nor does ambient AI scribe software have rigorous supporting evidence on safety and performance". That leaves the checking with the health service and the clinician. This article sets out what each regulator asks, and a test design that gives them evidence.

## Where the TGA draws the line

The TGA's [digital scribes guidance](https://www.tga.gov.au/products/medical-devices/software-and-artificial-intelligence-ai/overview/types-software-based-medical-devices/digital-scribes), updated on 30 January 2026, says a scribe intended only to transcribe or translate clinical conversations into written records, without analysis or interpretation, isn't a medical device. A scribe that analyses or interprets them, for example by generating a diagnosis, differential diagnosis or treatment recommendation the practitioner didn't state, is a medical device, and must be included in the ARTG before it can be supplied in Australia.

The line can move. The TGA asks health professionals to assess regularly whether software updates have introduced new functionality that may change a product's intended purpose. If an update introduces functionality with a therapeutic use, the product becomes a medical device.

## What clinicians and health services are asked to do

- **ACSQHC.** Its [AI Clinical Use Guide](https://www.safetyandquality.gov.au/resources/ai-clinical-use-guide), version 1.0 of August 2025, and the scribe scenario ask clinicians to review scribe summaries for bias, hallucinations, over-summarisation and missing information, to label records AI helped create, and to take part in regular reviews of how the scribe performs. The guide warns that an AI tool's functional scope can "creep" through software updates, and that you may not be notified when it does.
- **Ahpra.** Its [guidance on AI in healthcare](https://www.ahpra.gov.au/Resources/Artificial-Intelligence-in-healthcare.aspx) says practitioners must apply human judgement to any AI output, and that tools should be tested by the user or organisation to make sure they're fit for purpose before clinical use. A practitioner using an AI scribe is responsible for checking the accuracy and relevance of the records it creates. Scribing with generative AI will generally need the patient's informed consent.
- **Victoria.** The [Standards for the use of AI in Victorian Public Health Services](https://www.health.vic.gov.au/digital-health/artificial-intelligence-in-victorian-public-health-services) ask for a formal assessment specific to the intended use, clear mechanisms for ongoing monitoring and a privacy impact assessment (Standard 3.1), and the Standards apply that to ambient scribes in one of their worked cases. The Department's [Ambient AI Scribes Advisory](https://www.health.vic.gov.au/sites/default/files/2026-06/ambient-ai-scribes-advisory.docx) says the procurement and evaluation process "must assess the solution across the breadth of clinical settings and specialties in which it is intended to be applied", and that health services must only use AI scribes that store and process data in Australia.

## A test built from scripted consultations

A scribe can be tested without any patient records. The test set comes from the clinicians who will use the scribe:

1. **Scripts.** Clinicians from each specialty in scope write and role-play scripted consultations, and write the reference note for each one.
2. **Your environment.** The scribe runs on those consultations in a test account inside your own environment.
3. **Two raters.** Two clinicians label every omission, addition and error against the reference note, and their agreement is measured.
4. **A scope test.** Each note is checked for any diagnosis, test or treatment the clinician never said: the line the TGA and the ACSQHC guide draw.
5. **Thresholds first.** Your clinical lead agrees the thresholds in week 0, before any result exists.
6. **Re-runs.** The same set runs again after each vendor update, with the product version recorded, so the result shows whether the update changed anything.

Omissions, additions and errors are counted separately, so the report shows each problem the ACSQHC scenario names, such as missing information and hallucinations, on its own. Results are reported per specialty, the breadth the Victorian advisory asks procurement and evaluation to cover.

## Privacy depends on the kind of provider you are

The Privacy Act covers a private health service provider that holds health information, whatever its turnover ([s 6D(4)(b)](https://www.legislation.gov.au/C2004A03712/latest/text)). The OAIC's [coverage page](https://www.oaic.gov.au/privacy/privacy-legislation/the-privacy-act/rights-and-responsibilities) gives private hospitals, day surgeries, medical practitioners, pharmacists and allied health professionals as examples, and says state and territory public hospitals and health facilities are covered by state and territory law instead.

For providers the Act covers, the OAIC's [guidance on commercially available AI products](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/guidance-on-privacy-and-the-use-of-commercially-available-ai-products) says due diligence should consider whether a product has been tested for your intended uses, and that it "should not amount to a 'set and forget' approach". A test built on scripted consultations keeps health information out of the test set altogether. If you want real consultations included, that goes through your consent and privacy impact assessment process first.

## What the evaluation doesn't decide

- **Device status.** Whether a product is a medical device is the TGA's call. The scope-test log gives you evidence to take to the vendor or the TGA: every output that added clinical content the clinician never said, with the product version tested.
- **Sign-off.** The report gives findings rated to your risk matrix. It isn't a sign-off, and it doesn't replace the clinician's review of each note.
- **Independence.** We don't build scribes, and an evaluation is only independent if the evaluator didn't build, configure or advise on the system for you, and takes no resale margin or referral fees from its vendor.
- **Public health services.** For a public health service, the same evaluation can run as an Evaluation Partner workstream under a prime, internal-audit firm or law firm it already engages.
