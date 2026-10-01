---
title: "AI hosting in Australia: check the data path."
description: "Compare self-hosted models, Amazon Bedrock and Azure OpenAI. Check routing, storage, access and model availability before choosing an Australian deployment."
publishDate: 2026-06-14
updatedDate: 2026-10-02
type: article
industries: [government, financial-services]
solutions: [knowledge-assistant, ai-evaluation]
draft: false
---

Choosing an Australian cloud region does not by itself establish where every AI request is processed. Check the model, deployment type, inference routing, stored data and access arrangements separately. Record the settings and evidence for the actual workload before agreeing a deployment.

## Compare the delivery options

| Option | Processing location to verify | Responsibility to plan for |
|---|---|---|
| Self-hosted model | The infrastructure, backups and supporting services you select | Model serving, patching, capacity, access and monitoring |
| Amazon Bedrock | The selected model's regional endpoint or inference profile and its permitted destination regions | Application controls, routing, logging and the provider's terms |
| Azure OpenAI | The model's deployment type and applicable geography or data zone | Application controls, deployment configuration and the provider's terms |

A workload that needs strict isolation has different requirements from an internal assistant that can use a managed service. Compare the permitted processing locations before comparing capability or throughput.

## Amazon Bedrock

AWS's [geographic cross-Region inference documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/geographic-cross-region-inference.html) explains that prompts and results can leave the source region while remaining inside the selected geography. Its storage notes also distinguish ordinary storage from abuse-detection storage. Confirm the actual destination regions and settings; a regional entry point is not an Australia-only processing guarantee.

Check [regional model availability](https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html) for the exact model and inference mode. Availability can change; do not carry a deployment assumption from one model to another.

## Azure OpenAI

Microsoft's [deployment-types documentation](https://learn.microsoft.com/azure/ai-services/openai/how-to/deployment-types) distinguishes stored data from processing. Global deployments can process requests across Azure regions; Data Zone deployments use the specified zone; Standard and Regional Provisioned deployments use the specified Azure geography, subject to availability. A zone spanning several countries is not equivalent to Australia-only processing.

Check the deployment type rather than inferring it from the resource's region. Record the model version and supported configuration alongside the data-flow diagram.

## Questions to settle before using real documents

1. Where are prompts, outputs, indexes, logs and backups processed and stored?
2. Which people and services can access each part?
3. What do the current retention and review settings permit?
4. Which inference destinations are possible with the selected configuration?
5. What changes when a model, connector or hosting setting changes?
6. What evidence will the organisation retain to approve and later review the choice?

The provider sources above were checked on 2 October 2026. This guide describes deployment considerations, not a procurement approval or a claim that a proposed system meets a particular organisation's obligations.

## Keep the choice reviewable

Keep test inputs, expected answers and deployment settings together. A provider change should trigger a review of the data path and a rerun of the relevant tests. Replacing a model may also require changing prompts, retrieval or connectors; do not assume it is always a configuration-only change.

Explore the [internal knowledge-assistant offer](/solutions/knowledge-assistant/), read the [evaluation method](/resources/evaluation-method/).
