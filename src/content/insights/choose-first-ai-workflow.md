---
title: "Choose your first AI workflow."
description: "Choose a useful first AI automation project: one recurring task, accessible inputs, a reviewer and a measurable baseline, with a synthetic control walkthrough."
publishDate: 2026-10-02
type: article
industries: [accounting, legal-and-professional]
solutions: [draft-for-approval, document-registers, ai-switch-on]
draft: false
---

Start with one recurring administrative task that has clear inputs, a person who can check the result and a known next step. Map the current process before choosing an AI tool. A small, reviewable workflow gives you a useful test of whether automation fits your business.

## Choose a task you can describe

For an accounting practice, the task might be collecting fields from an agreed document family. For a professional-services firm, it might be preparing an internal response draft from an incoming request. These are possible starting points, not delivered engagements.

| Question | A suitable starting point | A reason to pause |
|---|---|---|
| Does the work repeat? | Similar inputs arrive regularly | Every request needs a different process |
| Can you access the inputs? | Approved access to the necessary documents | Missing access or uncertain client permissions |
| Can someone check the result? | A named reviewer knows a good answer | Nobody owns the decision |
| Can you measure the change? | Record volume, handling time and errors first | No baseline or agreed outcome |
| Are mistakes contained? | A draft or review queue before action | An unchecked financial or customer decision |

Check the features already in your subscriptions first. If an existing tool covers the task, configuration and training may be the right next step. Where it falls short, record the specific gap rather than assuming a custom build is needed.

## Follow a synthetic workflow

An invented supplier request is received, drafted, reviewed and revised. A reviewer approves the revised version; only then would a connector be allowed to perform the agreed action. The example includes missing information and an old approval that must not be reused.

Download the [synthetic workflow walkthrough](/downloads/synthetic-workflow-walkthrough.json). It contains no customer records and sends no message. Compare it with the [illustrative inbox demo](/demos/draft-for-approval/).

<video controls preload="none" width="1280" height="720" style="max-width:100%;height:auto" poster="/downloads/workflow-control-poster.png" aria-label="Recorded synthetic workflow control walkthrough" aria-describedby="workflow-recording-description">
  <source src="/downloads/workflow-controls.mp4" type="video/mp4" />
  <a href="/downloads/workflow-controls.mp4">Download the synthetic workflow recording</a>.
</video>

<p id="workflow-recording-description">This silent recording shows seven local states: receive, prepare, review, revise, approve, simulated completion and record. Sending is blocked until version 2 is approved, and blocked again once execution is recorded. The permission checks run locally; no AI model or external action is used.</p>

## Check the controls before connecting systems

The accompanying [control check report](/downloads/workflow-control-report.json) runs ten expected permission decisions, including unapproved sending, stale approvals, a pause, duplicate execution and read-only access. A deliberately unsafe comparison demonstrates which cases catch missing controls.

Download the [synthetic test inputs](/downloads/workflow-control-cases.json). To reproduce the report from the website repository, run `node scripts/workflow-control-check.mjs --check`.

The [control-check source](/downloads/workflow-control-source.txt) and [recording script](/downloads/workflow-recording-source.txt) are also available as plain-text downloads.

This is a local check of deterministic permission rules. It uses no AI model and makes no external request. It does not measure extraction accuracy, drafting quality, security of a production connector or hours saved. Those require separate tests on the intended system and representative work.

## Agree the first engagement

Record the task, inputs, systems, reviewer, expected output, acceptance criteria and handover responsibilities. Test exceptions as well as straightforward cases. Decide who can pause the workflow and what happens when a connection fails.

Explore [AI workflow automation](/solutions/draft-for-approval/) or [AI document processing](/solutions/document-registers/).
