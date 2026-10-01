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
/** Spec §4.6: (a) the client's own account, (b) managed by Techsider, (c) a platform the client already licenses. */
export const deliveryChoice = z.enum(["your-account", "managed", "platform-you-license"]);
/** Who a launch package is sold to (spec §4.3); the Solutions hub's "By buyer" view reads it. */
export const buyer = z.enum(["mid-market", "enterprise-government"]);

// Spec §8.5 Government: blocks 2, 5 and 6 repeat per sub-section. Each jurisdiction belongs to
// exactly one sub-section, and the three sub-sections render in this order.
export type SectionId = "commonwealth" | "state" | "local";
export const JURISDICTION_SECTION: Record<z.infer<typeof jurisdiction>, SectionId> = { cth: "commonwealth", nsw: "state", vic: "state", qld: "state", local: "local" };
export const SECTION_TITLE: Record<SectionId, string> = { commonwealth: "Commonwealth", state: "State (NSW, Vic, Qld)", local: "Local government" };
export const SECTION_ORDER: SectionId[] = ["commonwealth", "state", "local"];

export const launchPackage = z.strictObject({
  id: slug, name: z.string(), status: z.literal("launch"), onshore: z.boolean(),
  buyers: z.array(buyer).min(1),
  forWhom: z.string(), scope: z.string(), inclusions: z.array(z.string()).min(1),
  clientTime: z.string(), timeline: z.string(), outOfScope: z.array(z.string()).min(1),
  gate: z.string(), onshoreNote: z.string(), precondition: z.string().optional(),
  // false where the package holds no test on your own examples (④'s Agentic AI Control Evaluation
  // is a configuration review): its block leaves out the standard inclusion that promises one.
  testInclusion: z.literal(false).optional(),
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
  forLine: z.string().min(10).max(90), // the Home row's "For: …" line (spec §8.1.3)
  needProfiles: z.array(z.strictObject({ title: z.string(), body: z.string() })).min(2),
  byIndustry: z.array(ref("industries")),
  genericPackage: launchPackage,
  packages: z.array(solutionPackage),
  packagesHeading: z.enum(["Packages", "Engagements"]).default("Packages"), // ④ titles block 4 "Engagements" (spec §8.3)
  program: z.strictObject({ title: z.string(), summary: z.string(), duration: z.string(), bullets: z.array(z.string()).min(1) }).optional(),
  howWeTest: z.strictObject({ summary: z.string(), bullets: z.array(z.string()).min(2) }),
  whereItRuns: z.strictObject({ choices: z.array(deliveryChoice).min(1), note: z.string() }),
  independencePolicy: z.boolean().default(false), // ④ renders the §4.4 independence policy
  platformFirst: z.string().optional(),
  dontDo: z.array(z.string()).min(1),
  matrix: z.record(z.string(), z.string().max(60).regex(/\S/, "a matrix cell is never empty")), // a DataTable cell
  demo: slug.optional(),
  faq: z.array(faqItem).min(3),
});

// Spec §8.5 blocks 2 and 5: 4–6 obligation chips, 3–5 "works alongside" systems and 3–4
// recommended packages. An industry with `jurisdictions` (Government) meets them per sub-section,
// and every chip, system and package then names the jurisdiction it belongs to.
const SECTION_LIMITS = [
  { key: "obligationChips", noun: "chips", min: 4, max: 6 },
  { key: "worksAlongside", noun: "works-alongside systems", min: 3, max: 5 },
  { key: "packages", noun: "packages", min: 3, max: 4 },
] as const;
type Tagged = { jurisdiction?: z.infer<typeof jurisdiction> };
interface SectionedIndustry {
  jurisdictions?: z.infer<typeof jurisdiction>[];
  obligationChips: Tagged[];
  worksAlongside: Tagged[];
  packages: Tagged[];
}

function industrySections(d: SectionedIndustry, ctx: z.core.$RefinementCtx): void {
  const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
  const range = (n: number, noun: string, min: number, max: number) => `${n} ${noun}; the spec needs ${min}–${max}`;
  if (!d.jurisdictions) {
    for (const { key, noun, min, max } of SECTION_LIMITS) {
      d[key].forEach((item, i) => {
        if (item.jurisdiction !== undefined) issue([key, i, "jurisdiction"], `${key}[${i}] names a jurisdiction, but the industry lists no jurisdictions`);
      });
      if (d[key].length < min || d[key].length > max) issue([key], range(d[key].length, noun, min, max));
    }
    return;
  }
  const listed = d.jurisdictions;
  const sections = SECTION_ORDER.filter((s) => listed.some((j) => JURISDICTION_SECTION[j] === s));
  for (const { key, noun, min, max } of SECTION_LIMITS) {
    d[key].forEach((item, i) => {
      if (item.jurisdiction === undefined) issue([key, i, "jurisdiction"], `${key}[${i}] needs a jurisdiction: the industry lists jurisdictions`);
      else if (!listed.includes(item.jurisdiction)) issue([key, i, "jurisdiction"], `${key}[${i}] names "${item.jurisdiction}", which is not in jurisdictions`);
    });
    for (const s of sections) {
      const n = d[key].filter((item) => item.jurisdiction !== undefined && JURISDICTION_SECTION[item.jurisdiction] === s).length;
      if (n < min || n > max) issue([key], `${s}: ${range(n, noun, min, max)}`);
    }
  }
}

const useCase = (ref: RefFactory) => z.strictObject({ name: z.string(), solution: ref("solutions"), status: z.enum(["launch", "on-request"]), note: z.string().optional() });
export const makeIndustrySchema = (ref: RefFactory) => z.strictObject({
  promise: z.string(), constraintSet: z.string(), constraintHook: z.string(),
  flagshipUseCases: z.array(useCase(ref)).min(3),
  obligationChips: z.array(z.strictObject({ label: z.string(), row: slug, jurisdiction: jurisdiction.optional() })).min(4),
  worksAlongside: z.array(z.strictObject({ system: z.string(), method: z.enum(["read-only", "import", "draft-for-approval"]), verified: z.coerce.date(), jurisdiction: jurisdiction.optional() })).min(3),
  leadSolutions: z.array(ref("solutions")).min(1),
  packages: z.array(z.strictObject({ solution: ref("solutions"), package: slug, jurisdiction: jurisdiction.optional() })).min(3),
  platformFirst: z.string().optional(),
  dontDo: z.array(z.string()).min(1),
  problem: z.strictObject({ from: z.string(), to: z.string(), source: sourceRef }),
  workflow: z.array(z.strictObject({ id: slug, stage: z.string(), useCases: z.array(useCase(ref)).min(1) })).length(4),
  mockPanel,
  scenario: z.strictObject({ title: z.string(), problem: z.string(), approach: z.string(), measure: z.array(z.string()).min(1), shipsFirst: z.string(), trace: slug }),
  firstEngagement: z.strictObject({ needFromYou: z.array(z.string()).min(1), youGet: z.array(z.string()).min(1), exitRamp: z.string() }),
  faq: z.array(faqItem).min(5).max(7),
  jurisdictions: z.array(jurisdiction).min(1).optional(),
}).superRefine(industrySections);

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

// Demo data (spec §9.1, §9.3): one data schema per demo kind; makeDemoSchema, after sampleReport
// below, joins them into one entry schema keyed by `kind`. Scores, latencies and counts are typed
// metrics, never free text, and nothing here can say "measured" without a run.
type RefineCtx = z.core.$RefinementCtx;
const issueAt = (ctx: RefineCtx) => (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });
/** Each value that occurs more than once, once. */
const repeats = <T>(values: T[]): T[] => [...new Set(values.filter((v, i) => values.indexOf(v) !== i))];

// ② Knowledge Assistant. A source is one passage of a public corpus, quoted verbatim, with the
// section label and the page it came from. A retrieved chunk's `cite` is the source it came from,
// or 0 for a passage outside the source panel (a distractor). An answer segment with `cite`
// carries that source's citation chip.
export const citedSource = z.strictObject({ cite: z.number().int().positive(), label: z.string(), text: z.string(), href: z.url() });
/**
 * The corpus a scenario answers from, with its licence. `attribution` is the licence research's
 * attribution string, exactly: plain text with *italic* titles and [text](https://…) links, which
 * src/lib/attribution.ts splits for rendering.
 */
export const corpusRef = z.strictObject({ title: z.string(), version: z.string(), url: z.url(), licence: z.string(), attribution: z.string() });
export const assistantTurn = z.strictObject({
  question: z.string(),
  retrieved: z.array(z.strictObject({ cite: z.number().int().min(0), snippet: z.string(), score: metric })).min(1),
  answer: z.array(z.strictObject({ text: z.string(), cite: z.number().int().positive().optional() })).min(1),
  outcome: z.enum(["answered", "refused", "false-answer-caught"]),
  caught: z.string().optional(), // what the acceptance test caught: set on a "false-answer-caught" turn, and only there
  trace: z.array(z.strictObject({ label: z.string(), detail: z.string(), ms: metric })).min(1),
}).refine((t) => (t.outcome === "false-answer-caught") === (t.caught !== undefined), {
  message: 'a "false-answer-caught" turn says what the test caught, and no other turn does',
  path: ["caught"],
});
export const assistantScenario = z.strictObject({
  id: slug, title: z.string(), corpus: corpusRef, sources: z.array(citedSource).min(1), turns: z.array(assistantTurn).min(2),
});
// Spec §9.1: across its scenarios the demo shows at least one refusal and one false answer the test
// caught, and every citation resolves to a source of its own scenario.
function assistantRules(d: { scenarios: z.infer<typeof assistantScenario>[] }, ctx: RefineCtx): void {
  const issue = issueAt(ctx);
  for (const id of repeats(d.scenarios.map((s) => s.id))) issue(["scenarios"], `scenario id "${id}" repeats`);
  d.scenarios.forEach((s, i) => {
    const at = ["scenarios", i];
    const cites = s.sources.map((src) => src.cite);
    for (const c of repeats(cites)) issue([...at, "sources"], `scenario "${s.id}": source cite ${c} repeats`);
    s.turns.forEach((t, j) => {
      t.retrieved.forEach((r, k) => {
        if (r.cite !== 0 && !cites.includes(r.cite)) issue([...at, "turns", j, "retrieved", k, "cite"], `scenario "${s.id}" turn ${j + 1}: retrieved cite ${r.cite} names no source`);
      });
      t.answer.forEach((a, k) => {
        if (a.cite !== undefined && !cites.includes(a.cite)) issue([...at, "turns", j, "answer", k, "cite"], `scenario "${s.id}" turn ${j + 1}: answer cite ${a.cite} names no source`);
      });
    });
  });
  const outcomes = d.scenarios.flatMap((s) => s.turns.map((t) => t.outcome));
  for (const needed of ["refused", "false-answer-caught"] as const) {
    if (!outcomes.includes(needed)) issue(["scenarios"], `the scenarios need at least one "${needed}" turn (spec §9.1)`);
  }
}
export const assistantData = z.strictObject({ scenarios: z.array(assistantScenario).min(1) }).superRefine(assistantRules);

// ① Document Registers: synthetic documents, and registers whose cells each point at the page they
// were read from.
export const registerCell = z.strictObject({ value: z.string(), page: z.number().int().positive(), status: z.enum(["ok", "review", "blocked"]), note: z.string().optional() });
export const syntheticDoc = z.strictObject({ id: slug, title: z.string(), template: z.string(), pages: z.array(z.strictObject({ n: z.number().int().positive(), text: z.string() })).min(1) });
const registerTable = z.strictObject({
  id: slug, title: z.string(),
  fields: z.array(z.strictObject({ key: slug, label: z.string() })).min(3),
  rows: z.array(z.strictObject({ doc: slug, cells: z.record(z.string(), registerCell) })).min(3),
});
// Every row names a document, has one cell per field key and nothing else, and every cell's page
// is a page of that row's document.
function registerRules(d: { documents: z.infer<typeof syntheticDoc>[]; registers: z.infer<typeof registerTable>[] }, ctx: RefineCtx): void {
  const issue = issueAt(ctx);
  for (const id of repeats(d.documents.map((doc) => doc.id))) issue(["documents"], `document id "${id}" repeats`);
  d.documents.forEach((doc, i) => {
    for (const n of repeats(doc.pages.map((p) => p.n))) issue(["documents", i, "pages"], `document "${doc.id}": page ${n} repeats`);
  });
  for (const id of repeats(d.registers.map((r) => r.id))) issue(["registers"], `register id "${id}" repeats`);
  const docs = new Map(d.documents.map((doc) => [doc.id, doc]));
  d.registers.forEach((r, i) => {
    const keys = r.fields.map((f) => f.key);
    for (const k of repeats(keys)) issue(["registers", i, "fields"], `register "${r.id}": field key "${k}" repeats`);
    r.rows.forEach((row, j) => {
      const at = ["registers", i, "rows", j];
      const where = `register "${r.id}" row ${j + 1}`;
      const doc = docs.get(row.doc);
      if (!doc) issue([...at, "doc"], `${where}: document "${row.doc}" doesn't exist`);
      for (const k of keys) if (!(k in row.cells)) issue([...at, "cells"], `${where}: no cell for field "${k}"`);
      for (const [k, cell] of Object.entries(row.cells)) {
        if (!keys.includes(k)) issue([...at, "cells", k], `${where}: cell "${k}" is not a field`);
        else if (doc && !doc.pages.some((p) => p.n === cell.page)) issue([...at, "cells", k, "page"], `${where}, cell "${k}": page ${cell.page} isn't a page of document "${row.doc}"`);
      }
    });
  });
}
export const registerData = z.strictObject({
  documents: z.array(syntheticDoc).min(6),
  registers: z.array(registerTable).min(2),
  download: z.string().regex(/^\/downloads\/[a-z0-9-]+\.(csv|txt)$/),
}).superRefine(registerRules);

// ③ Draft-for-Approval: a synthetic shared inbox of eight messages, exactly one escalated. A drafted
// message carries its draft and `to`, who the draft goes to: a contractor, a property manager or an
// owner (work orders, tasks, owner updates and replies to contractors), never a tenant, whose replies
// spec §4.1 leaves to the property system (controller ruling 5). No other message has a draft.
export const inboxMessage = z.strictObject({
  id: slug, channel: z.enum(["email", "sms"]), from: z.string(), subject: z.string().optional(), body: z.string(),
  category: z.string(), action: z.enum(["draft-for-approval", "escalate", "file"]), draft: z.string().optional(), to: z.string().optional(),
  reason: z.string(),
});
function inboxRules(d: { messages: z.infer<typeof inboxMessage>[] }, ctx: RefineCtx): void {
  const issue = issueAt(ctx);
  for (const id of repeats(d.messages.map((m) => m.id))) issue(["messages"], `message id "${id}" repeats`);
  const escalated = d.messages.filter((m) => m.action === "escalate").length;
  if (escalated !== 1) issue(["messages"], `exactly one message is escalated (spec §9.1); found ${escalated}`);
  d.messages.forEach((m, i) => {
    if (m.action !== "draft-for-approval") {
      if (m.draft !== undefined || m.to !== undefined) issue(["messages", i], `message "${m.id}" isn't drafted for approval, so it has no draft and no recipient`);
      return;
    }
    if (m.draft === undefined) issue(["messages", i, "draft"], `message "${m.id}" is drafted for approval, so it needs a draft`);
    if (m.to === undefined) issue(["messages", i, "to"], `message "${m.id}" is drafted for approval, so it says who the draft goes to`);
  });
}
export const inboxData = z.strictObject({
  messages: z.array(inboxMessage).length(8),
  trace: z.array(z.strictObject({ label: z.string(), detail: z.string(), ms: metric })).min(3),
}).superRefine(inboxRules);

// ⑤ AI Switch-On: the checker reads the dated vendor facts in src/data/platform-ai.json (spec §8.7).
export const checkerData = z.strictObject({ source: z.literal("platform-ai") });
/**
 * One vendor AI feature. `included` is "included" in the named plans or an "add-on" bought
 * separately, never a price (D4). `processingLocation` starts "Not published" when the vendor
 * doesn't say where AI processing runs for Australian customers. `category` routes the checker's
 * Safe-Use Kit link (accounting, legal, property); "general" has no kit.
 */
export const platformAiEntry = z.strictObject({
  vendor: z.string(), product: z.string(), feature: z.string(), plans: z.array(z.string()).min(1),
  included: z.enum(["included", "add-on"]), processingLocation: z.string(), source: z.url(), asAt: z.coerce.date(),
  category: z.enum(["accounting", "legal", "property", "general"]),
});
export const platformAiFile = z.strictObject({ asAt: z.coerce.date(), entries: z.array(platformAiEntry).min(20) });

/** A confidence interval. Its unit is the unit of the result it belongs to. */
export const interval = z.strictObject({ low: z.number(), high: z.number(), level: z.number().int().min(50).max(99) })
  .refine((i) => i.low <= i.high, { message: "an interval's low bound is above its high bound" });

// A report dataset declares its provenance like a trace or demo (spec §9.3): the ④ report is
// measured (a committed harness run); anything else, fixtures included, is illustrative and says so.
// Spec §9.1: n, confidence intervals, the ground-truth method, inter-rater agreement, thresholds,
// at least three rated failures mapped to a framework's levels, and a model-change regression view.
export const sampleReport = z.strictObject({
  system: z.string(), n: z.number().int().positive(), method: z.string(),
  groundTruth: z.string().min(10),
  interRater: z.strictObject({ statistic: z.string(), value: metric }),
  framework: z.string(),
  provenance, run: z.string().optional(),
  thresholds: z.array(z.strictObject({ metric: z.string(), target: metric, result: metric, ci: interval, pass: z.boolean() })).min(1),
  failures: z.array(z.strictObject({ id: z.string(), rating: z.enum(["low", "medium", "high"]), description: z.string(), frameworkLevel: z.string() })).min(3),
  regression: z.strictObject({
    baseline: z.string(), candidate: z.string(),
    rows: z.array(z.strictObject({ metric: z.string(), baseline: metric, candidate: metric })).min(1),
  }),
}).refine((r) => r.provenance !== "measured" || !!r.run, { message: "measured sample reports need a run path" });

const demoKind = z.enum(["register", "assistant", "inbox", "report", "checker"]);
/** The demo schema's kind enum, for templates that badge a demo by its kind. */
export type DemoKind = z.infer<typeof demoKind>;
/** One replayed or reported demo kind's entry: the fields every such demo shares, and that kind's data. */
const demoEntry = <K extends DemoKind, D extends z.ZodType>(ref: RefFactory, kind: K, data: D) => z.strictObject({
  solution: ref("solutions"), title: z.string(), kind: z.literal(kind), provenance, run: z.string().optional(), data,
});
/**
 * The ⑤ checker's provenance (controller ruling 6). Its data is real, dated vendor facts, each with
 * its vendor source and as-at date (src/data/platform-ai.json), not illustrative data, so its entry
 * declares "sourced" and has no run. DemoFrame shows no "Illustrative data" label for it, and CI
 * check 06 accepts "sourced" from a checker demo file only.
 */
export const CHECKER_PROVENANCE = "sourced";
const checkerEntry = (ref: RefFactory) => z.strictObject({
  solution: ref("solutions"), title: z.string(), kind: z.literal("checker"), provenance: z.literal(CHECKER_PROVENANCE), data: checkerData,
});
// A demo entry's `kind` picks the schema of its `data` (the ④ report's data is its sample report).
export const makeDemoSchema = (ref: RefFactory) => z.discriminatedUnion("kind", [
  demoEntry(ref, "register", registerData),
  demoEntry(ref, "assistant", assistantData),
  demoEntry(ref, "inbox", inboxData),
  demoEntry(ref, "report", sampleReport),
  checkerEntry(ref),
]).refine((d) => d.provenance !== "measured" || !!d.run, { message: "measured demos need a run path" });

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
// Content types for view builders, fixtures and templates. A reference field is a plain id in
// fixtures and a { id, collection } object from Astro's reference(); builders read it with refId().
export type Jurisdiction = z.infer<typeof jurisdiction>;
export type SolutionData = z.infer<ReturnType<typeof makeSolutionSchema>>;
export type IndustryData = z.infer<ReturnType<typeof makeIndustrySchema>>;
export type RegulatoryRow = z.infer<typeof regulatoryRow>;
export type RegulatoryData = z.infer<typeof regulatoryFile>;
export type KitData = z.infer<ReturnType<typeof makeKitSchema>>;
export type DemoData = z.infer<ReturnType<typeof makeDemoSchema>>;
/** One kind's demo entry, e.g. DemoOf<"assistant">, whose `data` is AssistantData. */
export type DemoOf<K extends DemoKind> = Extract<DemoData, { kind: K }>;
export type AssistantData = z.infer<typeof assistantData>;
export type AssistantTurn = z.infer<typeof assistantTurn>;
export type RegisterData = z.infer<typeof registerData>;
export type InboxData = z.infer<typeof inboxData>;
export type PlatformAiEntry = z.infer<typeof platformAiEntry>;
export type PlatformAiFile = z.infer<typeof platformAiFile>;
export type InsightData = z.infer<ReturnType<typeof makeInsightSchema>>;
