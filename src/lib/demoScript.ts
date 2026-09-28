// Scripted transcript for the canned RAG demo. Source text is transcribed verbatim
// from APRA's public Prudential Standard CPS 230 (https://www.apra.gov.au/standards/cps-230,
// the version commencing 1 July 2026; paragraph numbers and headings checked 28 Sep 2026).
// Scores, latencies and eval values are illustrative: a scripted demo, not a measured run.
// This is reference data, not a record of client work.


export interface Chunk {
  /** citation number this chunk maps to, or 0 for an uncited (distractor) candidate */
  cite: number;
  /** cosine/RRF similarity score 0..1 */
  score: number;
  snippet: string;
}

export interface AnswerSegment {
  text: string;
  /** citation number to attach as a chip after this segment */
  cite?: number;
}

export interface Source {
  cite: number;
  label: string;
  /** exact verbatim source text */
  text: string;
}

export interface TraceStep {
  label: string;
  detail: string;
  ms: number;
}

export interface Evals {
  groundedness: string;
  faithfulness: string;
  recall: string;
}

export interface Turn {
  question: string;
  retrieved: Chunk[];
  answer: AnswerSegment[];
  sources: Source[];
  trace: TraceStep[];
  evals: Evals;
  abstained?: boolean;
}

export interface DemoScript {
  doc: string;
  turns: Turn[];
}

export const demoScript: DemoScript = {
  doc: "Prudential Standard CPS 230 — Operational Risk Management (version commencing 1 July 2026) · APRA (public reference data)",
  turns: [
    {
      question: "What are our incident-notification timeframes under CPS 230?",
      retrieved: [
        {
          cite: 1,
          score: 0.91,
          snippet:
            "…must notify APRA as soon as possible, and not later than 72 hours, after becoming aware of an operational risk incident…",
        },
        {
          cite: 2,
          score: 0.86,
          snippet:
            "…must notify APRA as soon as possible, and not later than 24 hours after, if it has suffered a disruption to a critical operation outside tolerance…",
        },
        {
          cite: 3,
          score: 0.74,
          snippet:
            "Critical operations are processes…which, if disrupted beyond tolerance levels, would have a material adverse impact…",
        },
        {
          cite: 4,
          score: 0.58,
          snippet:
            "…not more than 20 business days after entering into or materially changing an agreement for the provision of a service…",
        },
        { cite: 0, score: 0.31, snippet: "(roles and responsibilities of the Board)" },
      ],
      answer: [
        {
          text:
            "CPS 230 sets two notification clocks, plus a separate rule for service providers. An operational risk incident must be notified to APRA ",
        },
        {
          text:
            "as soon as possible, and no later than 72 hours after you become aware of it, where you determine it is likely to have a material financial impact or a material impact on your ability to maintain critical operations",
          cite: 1,
        },
        { text: ". A disruption to a critical operation outside tolerance has a shorter clock: " },
        {
          text:
            "notify APRA as soon as possible, and within 24 hours, covering the nature of the disruption, the action taken, the likely impact and the timeframe for returning to normal operations",
          cite: 2,
        },
        { text: ". " },
        {
          text:
            "\u201cCritical operations\u201d means processes that, if disrupted beyond tolerance levels, would have a material adverse impact on your depositors, policyholders, beneficiaries or other customers, or on your role in the financial system",
          cite: 3,
        },
        { text: ". Separately, service-provider arrangements have their own notice: " },
        {
          text:
            "within 20 business days of entering into or materially changing an agreement for a service a critical operation relies on",
          cite: 4,
        },
        { text: "." },
      ],
      sources: [
        {
          cite: 1,
          label: "CPS 230 · Operational risk incidents · ¶32",
          text:
            "An APRA-regulated entity must notify APRA as soon as possible, and not later than 72 hours, after becoming aware of an operational risk incident that it determines to be likely to have a material financial impact or a material impact on the ability of the entity to maintain its critical operations.",
        },
        {
          cite: 2,
          label: "CPS 230 · Business continuity plan · ¶41",
          text:
            "An APRA-regulated entity must notify APRA as soon as possible, and not later than 24 hours after, if it has suffered a disruption to a critical operation outside tolerance. The notification must cover the nature of the disruption, the action taken, the likely impact on the entity’s business operations and the timeframe for returning to normal operations.",
        },
        {
          cite: 3,
          label: "CPS 230 · Critical operations and tolerance levels · ¶34",
          text:
            "Critical operations are processes undertaken by an APRA-regulated entity or its service provider which, if disrupted beyond tolerance levels, would have a material adverse impact on its depositors, policyholders, beneficiaries or other customers, or its role in the financial system.",
        },
        {
          cite: 4,
          label: "CPS 230 · Monitoring, notifications and review · ¶60(a)",
          text:
            "An APRA-regulated entity must notify APRA: (a) as soon as possible and not more than 20 business days after entering into or materially changing an agreement for the provision of a service on which the entity relies to undertake a critical operation; …",
        },
      ],
      trace: [
        { label: "Retrieve", detail: "hybrid (BM25 + dense), k=5, reciprocal-rank fusion", ms: 41 },
        { label: "Rerank", detail: "cross-encoder, keep top 4", ms: 24 },
        { label: "Generate", detail: "grounded prompt, cite-as-you-write", ms: 1420 },
      ],
      evals: {
        groundedness: "pass — every claim carries a citation",
        faithfulness: "0.97",
        recall: "4 / 4 relevant clauses in top-k",
      },
    },
    {
      question: "And what's the financial penalty if we miss the 72-hour deadline?",
      retrieved: [
        { cite: 0, score: 0.34, snippet: "…notify APRA as soon as possible, and not later than 72 hours…" },
      ],
      answer: [
        {
          text:
            "That isn't stated in the provided documents. CPS 230 sets the 72-hour notification obligation, but the excerpts here don't specify any financial penalty for late notification — so I won't guess. Escalating to a human, with the relevant clause attached.",
        },
      ],
      sources: [],
      trace: [
        { label: "Retrieve", detail: "hybrid (BM25 + dense), k=4", ms: 35 },
        { label: "Abstain", detail: "top score 0.34 < grounding threshold 0.60 → refuse", ms: 2 },
      ],
      evals: {
        groundedness: "pass — abstained, no unsupported claim",
        faithfulness: "n/a — no answer generated",
        recall: "no supporting clause in corpus",
      },
      abstained: true,
    },
  ],
};
