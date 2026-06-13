---
title: "Self-hosted vs Bedrock vs Azure OpenAI for sovereign workloads in Australia"
description: "A practical decision framework for where your model actually runs when data residency and sovereignty are hard constraints — and how to keep the choice reversible."
publishDate: 2026-06-14
pillar: "Vendor-neutral platform"
sectors: ["Government & public sector", "Financial services"]
draft: false
---

"Which model should we use?" is almost never the real question. Underneath it is a harder one: *where does our data go, and who is able to touch it?* For Australian regulated workloads, residency and control frequently decide the architecture before raw model capability gets a vote. This is a framework for making that decision deliberately — and for making sure you can change your mind later.

## The three shapes of the answer

- **Self-hosted** — open-weight models running on infrastructure you control (your VPC, or on-prem). Maximum control over data and isolation; you own the operational burden of serving, scaling, and patching.
- **AWS Bedrock (Sydney region)** — managed, regional access to multiple model families including Anthropic's, with data kept in-region under AWS's contractual terms.
- **Azure OpenAI (Australia East)** — managed, regional access to the OpenAI model family, often the path of least resistance for organisations already standardised on Microsoft and aligned to government frameworks.

## A decision matrix, not a favourite

| Dimension | Self-hosted | Bedrock (Sydney) | Azure OpenAI (AU East) |
|---|---|---|---|
| Data residency | Wherever you run it | In-region | In-region |
| Control over data use | Full | Contractual | Contractual |
| Model choice | Open weights | Multi-vendor (incl. Anthropic) | OpenAI family |
| Operational burden | High | Low | Low |
| Typical best fit | Strict isolation / IRAP-heavy | Multi-model needs / AWS estate | Microsoft estate / gov alignment |

There is no globally correct row. A government agency with strict isolation requirements lands in a different place than a bank already deep in one cloud. The job is to weight the dimensions against *your* constraints — and the residency and control columns usually carry the most weight in regulated settings.

> Cloud regions, model availability, and certifications change frequently. Treat the specifics above as a starting framework and confirm current regional and compliance details for your own procurement.

## Build so the choice is reversible

Whatever you pick first, you will eventually want to change it — a new model lands, pricing shifts, a residency rule tightens. We put a **model gateway** between the application and the provider, so the model is a configuration choice rather than an architectural commitment. Prompts, evals, and tracing sit above the gateway and don't care who serves the tokens. Done well, switching providers is a config change and a re-run of the eval suite — not a rebuild.

## How we actually choose

Not by a partner badge. We run a bake-off on your real workload — capability on your tasks, latency, cost, and residency — and let the evidence decide. Being vendor-neutral isn't a slogan; it's the only honest way to recommend an option when we don't earn a referral fee on any of them.

*Choosing a sovereign AI stack is exactly what our paid two-week discovery is for.*
