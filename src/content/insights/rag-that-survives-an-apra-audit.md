---
title: "Shipping a RAG system that survives an APRA audit"
description: "Grounding, inline citations, retrieval evals, and a refusal path — the engineering that makes a retrieval system answer to an auditor, not just a demo."
publishDate: 2026-06-12
pillar: "RAG & retrieval"
sectors: ["Financial services"]
draft: false
---

A retrieval system that "answers questions about your documents" demos beautifully and ages badly. In financial services the answer it gives can shape a decision a regulator later reviews, and APRA's expectations around operational risk (CPS 230) and information security (CPS 234) push hard toward traceability and control. A system that cannot show *where* an answer came from is not an asset — it is a liability waiting for an audit.

Here is the engineering that separates a RAG system you can stand behind from a chatbot bolted onto your document store.

## Citations down to the clause

Every factual sentence in an answer must resolve to the exact source it came from — the document, the section, and the specific text that grounds the claim — not just a filename in a footnote. That means the generation step is constrained to cite as it writes, and the UI lets a reviewer click any claim and land on the sentence that supports it. If a statement can't be traced to a retrieved source, it doesn't belong in the answer.

## Retrieval is the part that actually fails

Most "hallucinations" in a well-built RAG system are really retrieval misses: the model was never given the right context, so it filled the gap. We evaluate retrieval as its own layer, separately from generation:

| Layer | What we measure | The gate |
|---|---|---|
| Retrieval | recall@k on a labelled query set | the right chunk is in the top-k |
| Generation | faithfulness / groundedness | every claim is supported by retrieved text |
| Behaviour | abstention correctness | refuses when the answer isn't present |

We use hybrid retrieval — lexical and dense together — because pure embedding search reliably misses exact-term queries, and "what does clause 34 of CPS 230 require" is exactly the kind of query a compliance user types.

## The most important answer is "no"

The single most valuable behaviour in a regulated RAG system is a clean refusal: *"That isn't stated in the provided documents."* We build an explicit abstention path with a confidence threshold, and when it trips, the system escalates to a human rather than guessing. A system that always produces a confident-sounding answer is the dangerous one — it has simply moved its failures somewhere you can't see them.

## A trace per query, for the auditor

Every query emits a trace: the question, the retrieved chunks and their scores, the assembled prompt, the generated answer, the citations, and the eval outcomes. This is the same observability we use to debug — and it is exactly what an auditor needs to understand how a specific answer was produced on a specific day.

## Sovereignty is part of the design, not a deployment note

For an APRA-regulated workload, where the data lives and who can touch it is a design input, not an afterthought. The pipeline runs inside your boundary, your documents aren't sent offshore, and they aren't used to train anyone's model. The sovereignty story and the audit story are the same story: control you can demonstrate.

*This is how we approach regulated retrieval. Bringing it to your corpus starts with a paid two-week discovery.*
