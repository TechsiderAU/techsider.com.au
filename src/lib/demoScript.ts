// Scripted transcript for the canned RAG demo. The source text is transcribed
// verbatim from APRA's public Prudential Standard CPS 230 (handbook.apra.gov.au).
// This is illustrative reference data — not a record of client work.

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
  doc: "Prudential Standard CPS 230 — Operational Risk Management · APRA (public reference data)",
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
          score: 0.74,
          snippet:
            "Critical operations are processes…which, if disrupted beyond tolerance levels, would have a material adverse impact…",
        },
        { cite: 0, score: 0.39, snippet: "(business continuity — tolerance levels for critical operations)" },
        { cite: 0, score: 0.31, snippet: "(roles and responsibilities of the Board)" },
      ],
      answer: [
        { text: "Under CPS 230, an operational risk incident must be notified to APRA " },
        {
          text:
            "as soon as possible, and no later than 72 hours, after you become aware of it — where the incident is likely to have a material financial impact or a material impact on your ability to maintain critical operations",
          cite: 1,
        },
        { text: ". " },
        {
          text:
            "“Critical operations” here means processes that, if disrupted beyond tolerance levels, would have a material adverse impact on your depositors, policyholders or other customers, or on your role in the financial system",
          cite: 2,
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
          label: "CPS 230 · Definitions · ¶37",
          text:
            "Critical operations are processes undertaken by an APRA-regulated entity or its service provider which, if disrupted beyond tolerance levels, would have a material adverse impact on its depositors, policyholders, beneficiaries or other customers, or its role in the financial system.",
        },
      ],
      trace: [
        { label: "Retrieve", detail: "hybrid (BM25 + dense), k=4, reciprocal-rank fusion", ms: 38 },
        { label: "Rerank", detail: "cross-encoder, keep top 2", ms: 21 },
        { label: "Generate", detail: "grounded prompt, cite-as-you-write", ms: 1180 },
      ],
      evals: {
        groundedness: "pass — every claim carries a citation",
        faithfulness: "0.98",
        recall: "2 / 2 relevant clauses in top-k",
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
