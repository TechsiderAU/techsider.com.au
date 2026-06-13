---
title: "Evals before vibes: the gates we run on every LLM release"
description: "How we stop 'looked good in the demo' from reaching production — the offline eval suite, the regression gate, and the tracing we wire in from day one."
publishDate: 2026-06-09
pillar: "LLMOps & reliability"
draft: false
---

Most LLM features ship on vibes. Someone tries a handful of prompts, the output looks good, and it goes live. Then a "small" prompt tweak three weeks later quietly breaks a case nobody re-checked — and in a regulated business, "it seemed fine" is not an answer you can give an auditor.

We treat an LLM system like any other production system: it doesn't ship until it passes a gate, and the gate is built on measurement, not impressions.

## Vibes don't survive change

The core problem is that LLM behaviour is coupled in ways you can't see. A change that improves one example often regresses ten others. Without a measurement you re-run on every change, you have no way to know whether you moved forward or sideways. Manual spot-checking doesn't scale past the first week, and it never covers the cases that actually matter — the rare, high-consequence ones.

## The offline eval suite is the unit test of an LLM system

Before a feature is "done," we build an evaluation set: representative inputs paired with the properties a correct answer must have. Not always exact strings — usually a mix of checks:

- **Programmatic checks** where behaviour is binary: did it cite a source? did it refuse when the answer wasn't in the provided documents? did it stay within scope?
- **Reference checks** where there's a known-good answer or required facts.
- **Rubric / LLM-as-judge** grading where quality is fuzzier, with the judge itself validated against human labels so we trust its scores.

A single case looks like this:

```yaml
- input: "What are our incident-notification timeframes under CPS 230?"
  must_cite: true
  must_contain: ["business day"]
  must_not: ["I think", "probably", "as an AI"]
```

The suite runs in CI on every change to a prompt, a model, a retrieval setting, or a tool definition.

## Gates, not dashboards

A dashboard you have to remember to look at is not a control. We turn the eval suite into a **promotion gate**: a change is allowed into production only if the aggregate score clears a threshold **and** there is zero regression on the "must never break" subset — the cases tied to compliance, safety, or money. Below the line, the release simply doesn't ship. The gate is the same whether the change is a one-word prompt edit or a model upgrade.

## Tracing so failures are explainable

Every request in production emits a trace: the retrieved context, the assembled prompt, the model and parameters, token counts, latency, cost, and — where applicable — the grader outcomes. When something goes wrong, you replay the exact request instead of guessing. For regulated buyers this is not just debugging; it is the audit trail that shows how a given answer was produced.

## What "day one" actually means

The eval harness, the CI gate, and tracing go in during the first week of a build — not bolted on after the first incident. It feels slower for a fortnight and then it is permanently faster, because every subsequent change is safe to make. That is the whole point: discipline up front is what lets you move quickly later without breaking the things you can't afford to break.

*This is how we build. If you want it on your own workload, our paid two-week discovery is where we scope it.*
