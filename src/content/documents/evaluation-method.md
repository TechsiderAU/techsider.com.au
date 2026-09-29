---
title: How we test AI before you rely on it.
summary: The method behind every Independent AI Evaluation, published so your team can check it. Thresholds come first, every failure is listed, and the evidence is yours to re-run.
lastUpdated: 2026-09-29
draft: false
---

<!-- ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2) -->

This is the method behind every Independent AI Evaluation. It tests one AI system on one use case: a tool you bought, licensed or had built elsewhere, run on your own questions and cases, in your own environment. The same method sits behind the acceptance test on a system Techsider builds for you, which is always labelled "acceptance test (not independent)".

## Thresholds come first

Before any test runs, you and we agree in writing:

- what counts as a correct answer, a false answer and a false refusal for your use case;
- the highest false-answer rate you will accept, and the highest false-refusal rate;
- how each failure is rated, on your own risk matrix.

The thresholds don't move once results are in. If one has to change before then, the report says what changed and why.

## Sample size and confidence intervals

A test set is a sample, so every rate is reported with a confidence interval, never as a bare score. The sample size is set before testing, aiming for an interval narrow enough to decide against your threshold. Rates are reported for each category too, each with its own interval, and a small category shows a wide interval rather than hiding it.

> **Worked example (an example, not a result).** Suppose 100 test questions produce 5 false answers. The observed false-answer rate is 5%, and its 95% Wilson interval runs from about 2.2% to 11.2%. Against a 10% threshold that sample can't settle the question, because the interval crosses the line. The same 5% rate on 400 questions gives an interval of about 3.3% to 7.6%, which sits below it. And if none of 100 questions fails, the upper end of the interval is still about 3.7%, not zero.

## Ground truth

Ground truth is built from your own material by people who know it. Each test item carries an expected answer, or an expected refusal where your documents don't hold the answer, and the source passage that supports it. The report records who labelled each item, by role, and when.

## Inter-rater agreement

A share of the items is labelled independently by two people. Their agreement is reported as Cohen's kappa, or Krippendorff's alpha where more than two people label. A third person settles each disagreement, and the rule that settled it goes into the labelling guide. If agreement is low, the guide is fixed and the items are labelled again before any system is scored against them.

## Grading, and LLM-judge calibration

Where people can grade every output, they do. Where a language model grades at scale (an LLM judge), it is calibrated first: it grades items people have already graded, and its agreement with those human grades is reported for each category. People grade any category where the judge's agreement falls below the level agreed at the start. The judge's model, version and prompt are recorded, and it runs in your subscription with everything else.

## False answers and false refusals, reported separately

A false answer is a confident answer that is wrong, incomplete or unsupported by its source. A false refusal is the system saying it doesn't know when your documents hold the answer. Each is counted and reported on its own, against its own threshold. A system can look accurate by refusing too often, or look helpful by answering when it shouldn't, and one combined score would hide both.

## Every failure, listed

The report lists every failure, not only a score: the input, the output, the expected answer and its source, the category and the rating. Findings are rated to your risk matrix and mapped to the framework you already use, such as the DTA's AI use case impact assessment, the NSW AI Assessment Framework, a Queensland FAIRA or your own model-risk template.

## Evidence you can re-run

You keep a reproducible evidence bundle:

- the versioned test set and its labels;
- the model and deployment identifiers, prompts and parameters, where the platform exposes them;
- timestamps, raw outputs and grader outputs, with hashes;
- a replay script that runs in your own cloud subscription. The graders run there too, so test data and results stay with you; the system under test handles each question where its vendor runs it, and the report records that location.

The harness and the question set are handed over, with a training session for your data, risk or second-line team, so you can re-run the test without us.

## When the model changes

When the model changes, or may have changed, the same test set runs again and the two runs are compared item by item. You see which answers changed, and whether each rate still meets its threshold.

## What the report is, and what it isn't

The report sets out findings, not an assurance opinion. It is not an ASAE 3000 or ASRE engagement. Techsider never issues an Independent Evaluation Report on a system it built, configured or advised on for the same client.

## Adversarial testing

Techsider never does adversarial testing in-house. Where it's needed, it's done by a CREST-accredited tester you engage. An Agentic AI Control Evaluation is a review of configuration: identity, permissions, approval gates and logging. It is not an attack.
