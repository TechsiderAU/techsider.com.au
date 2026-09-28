import { z } from "astro/zod";
// Every object schema is strict (z.strictObject): an unknown key, such as a typo ("metrc",
// "illustative") or a leftover legacy field, fails validation instead of being silently dropped.
export type CollectionName = "solutions" | "industries";
export type RefFactory = (collection: CollectionName) => z.ZodType<string | { id: string; collection: string }>;
/** Plain refs for Node tests/fixtures; content.config.ts passes Astro's reference() instead. */
export const plainRef: RefFactory = () => z.string().regex(/^[a-z0-9-]+$/);
export const slug = z.string().regex(/^[a-z0-9-]+$/);
export const jurisdiction = z.enum(["cth", "nsw", "vic", "qld", "local"]);
export const faqItem = z.strictObject({ q: z.string().min(5), a: z.string().min(20) });
export const sourceRef = z.strictObject({ label: z.string().min(3), url: z.url(), asAt: z.coerce.date() });
export const metric = z.strictObject({ value: z.number(), unit: z.string().optional() });
export const provenance = z.enum(["measured", "illustrative"]);

export const launchPackage = z.strictObject({
  id: slug, name: z.string(), status: z.literal("launch"), onshore: z.boolean(),
  forWhom: z.string(), scope: z.string(), inclusions: z.array(z.string()).min(1),
  clientTime: z.string(), timeline: z.string(), outOfScope: z.array(z.string()).min(1),
  gate: z.string(), onshoreNote: z.string(), precondition: z.string().optional(),
});
export const listedPackage = z.strictObject({
  id: slug, name: z.string(), status: z.enum(["on-request", "internal"]), oneLiner: z.string(),
  precondition: z.string().optional(),
});
export const solutionPackage = z.discriminatedUnion("status", [launchPackage, listedPackage]);

export const mockPanel = z.strictObject({
  title: z.string(),
  fields: z.array(z.strictObject({ label: z.string(), value: z.string(), redacted: z.boolean().optional() })).min(1),
  chips: z.array(z.strictObject({ status: z.enum(["ok", "review", "blocked"]), text: z.string() })),
  citations: z.array(z.strictObject({ source: z.string(), clause: z.string(), href: z.url().optional() })),
  decision: z.strictObject({ approve: z.string(), reject: z.string() }).optional(),
});

export const makeSolutionSchema = (ref: RefFactory) => z.strictObject({
  job: z.string().min(20), artefact: z.string().min(20),
  needProfiles: z.array(z.strictObject({ title: z.string(), body: z.string() })).min(2),
  byIndustry: z.array(ref("industries")),
  genericPackage: launchPackage,
  packages: z.array(solutionPackage),
  program: z.strictObject({ title: z.string(), summary: z.string(), duration: z.string(), bullets: z.array(z.string()).min(1) }).optional(),
  howWeTest: z.strictObject({ summary: z.string(), bullets: z.array(z.string()).min(2) }),
  whereItRuns: z.strictObject({ choices: z.array(z.enum(["your-account", "managed", "platform-you-license"])).min(1), note: z.string() }),
  platformFirst: z.string().optional(),
  dontDo: z.array(z.string()).min(1),
  matrix: z.record(z.string(), z.string().max(60)),
  demo: slug.optional(),
  faq: z.array(faqItem).min(3),
});

const useCase = (ref: RefFactory) => z.strictObject({ name: z.string(), solution: ref("solutions"), status: z.enum(["launch", "on-request"]), note: z.string().optional() });
export const makeIndustrySchema = (ref: RefFactory) => z.strictObject({
  promise: z.string(), constraintSet: z.string(), constraintHook: z.string(),
  flagshipUseCases: z.array(useCase(ref)).min(3),
  obligationChips: z.array(z.strictObject({ label: z.string(), row: slug, jurisdiction: jurisdiction.optional() })).min(3),
  worksAlongside: z.array(z.strictObject({ system: z.string(), method: z.enum(["read-only", "import", "draft-for-approval"]), verified: z.coerce.date() })),
  leadSolutions: z.array(ref("solutions")).min(1),
  problem: z.strictObject({ from: z.string(), to: z.string(), source: sourceRef }),
  workflow: z.array(z.strictObject({ id: slug, stage: z.string(), useCases: z.array(useCase(ref)).min(1) })).length(4),
  mockPanel,
  scenario: z.strictObject({ title: z.string(), problem: z.string(), approach: z.string(), measure: z.array(z.string()).min(1), shipsFirst: z.string(), trace: slug }),
  firstEngagement: z.strictObject({ needFromYou: z.array(z.string()).min(1), youGet: z.array(z.string()).min(1), exitRamp: z.string() }),
  faq: z.array(faqItem).min(5).max(7),
  jurisdictions: z.array(jurisdiction).optional(),
});

export const regulatoryRow = z.strictObject({
  id: slug, obligation: z.string(), meaning: z.string(), design: z.string(), evidence: z.string(),
  source: z.url(), asAt: z.coerce.date(), lastReviewed: z.coerce.date(),
  jurisdictions: z.array(jurisdiction).min(1).optional(),
});
export const regulatoryFile = z.strictObject({ rows: z.array(regulatoryRow).min(1) });

export const makeKitSchema = (ref: RefFactory) => z.strictObject({
  industry: ref("industries"), title: z.string(), summary: z.string(), contents: z.array(z.string()).min(1),
  source: sourceRef, asAt: z.coerce.date(), lawyerReviewedAt: z.coerce.date().nullable(), download: z.string().regex(/^\/downloads\/[a-z0-9-]+\.(pdf|docx)$/),
});

export const traceLine = z.strictObject({ t: z.string().regex(/^\d{2}:\d{2}:\d{2}$/), op: z.string(), detail: z.string(), metric: metric.optional() });
export const traceFile = z.strictObject({ title: z.string(), provenance, run: z.string().optional(), lines: z.array(traceLine).min(1) })
  .refine((t) => t.provenance !== "measured" || !!t.run, { message: "measured traces need a run path" });

export const makeDemoSchema = (ref: RefFactory) => z.strictObject({
  solution: ref("solutions"), title: z.string(),
  kind: z.enum(["register", "assistant", "inbox", "report", "checker"]),
  provenance, run: z.string().optional(), data: z.unknown(),
}).refine((d) => d.provenance !== "measured" || !!d.run, { message: "measured demos need a run path" });

// A report dataset declares its provenance like a trace or demo (spec §9.3): the ④ report is
// measured (a committed harness run); anything else, fixtures included, is illustrative and says so.
export const sampleReport = z.strictObject({
  system: z.string(), n: z.number().int().positive(), method: z.string(),
  provenance, run: z.string().optional(),
  thresholds: z.array(z.strictObject({ metric: z.string(), target: metric, result: metric, pass: z.boolean() })).min(1),
  failures: z.array(z.strictObject({ id: z.string(), rating: z.enum(["low", "medium", "high"]), description: z.string() })).min(3),
}).refine((r) => r.provenance !== "measured" || !!r.run, { message: "measured sample reports need a run path" });

export const makeInsightSchema = (ref: RefFactory) => z.strictObject({
  title: z.string(), description: z.string(), publishDate: z.coerce.date(), updatedDate: z.coerce.date().optional(),
  type: z.enum(["article", "reference-scenario", "platform-guide"]),
  industries: z.array(ref("industries")).default([]), solutions: z.array(ref("solutions")).default([]),
  illustrative: z.boolean().default(false), draft: z.boolean().default(false),
}).refine((i) => i.type !== "reference-scenario" || i.illustrative, {
  message: "reference scenarios must set illustrative: true", path: ["illustrative"],
});
export const INSIGHT_TYPE_LABEL = { article: "Article", "reference-scenario": "Reference scenario", "platform-guide": "Platform guide" } as const;
export type MockPanelData = z.infer<typeof mockPanel>;
export type SampleReportData = z.infer<typeof sampleReport>;
export type TraceData = z.infer<typeof traceFile>;
