import { z } from "astro/zod";
import { deliveryChoice, faqItem, slug } from "./schemas.ts";
import { HOME_TRUST_QUESTION } from "../lib/fixed-copy.ts";
// Typed page data for the singleton pages (Services, Evaluation Partner, Contact, Trust, About,
// Home) and the positioning copy they share. Phase C writes the data in src/data/*.ts; long
// prose (the legal documents and the evaluation method) is the `documents` markdown collection.
// Like schemas.ts, every object is strict, and the file imports only astro/zod and plain modules,
// so Node tests and CI checks can import it.

const PILLAR_ORDER = ["cited", "measured", "onshore", "ownership"] as const;
const PHASE_ORDER = ["prove", "build", "run"] as const;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Spec §3.2: a pillar, its mechanism and its plain mid-market version. */
export const pillar = z.strictObject({ id: z.enum(PILLAR_ORDER), title: z.string(), mechanism: z.string(), midMarket: z.string() });
export const positioningData = z.strictObject({
  subPromise: z.string().min(40), originLine: z.string().min(20),
  pillars: z.array(pillar).length(4),
}).refine((p) => p.pillars.map((x) => x.id).join() === PILLAR_ORDER.join(), {
  message: `pillars run ${PILLAR_ORDER.join(", ")}, in that order (spec §3.2)`, path: ["pillars"],
});

export const titled = z.strictObject({ title: z.string(), body: z.string() });
export const servicePhase = z.strictObject({
  id: z.enum(PHASE_ORDER), name: z.string(), duration: z.string(), summary: z.string(),
  deliverables: z.array(z.string()).min(1), exitCriteria: z.array(z.string()).min(1),
});
export const serviceItem = z.strictObject({
  id: slug, name: z.string(), what: z.string(), forWhom: z.string(),
  entry: z.enum(["entry", "after-audit-or-trial", "secondary", "not-entry"]),
});
export const routeStep = z.strictObject({ name: z.string(), body: z.string() });
export const servicesData = z.strictObject({
  phases: z.array(servicePhase).length(3),
  services: z.array(serviceItem).min(3),
  entryOffers: z.array(z.strictObject({ buyer: z.string(), entry: z.string(), then: z.string() })).min(3),
  team: z.strictObject({ summary: z.string(), functions: z.array(titled).min(2) }),
  deliveryChoices: z.array(z.strictObject({ id: deliveryChoice, title: z.string(), body: z.string() })).length(3),
  onshoreNote: z.array(z.string()).min(3),
  independence: z.array(z.string()).min(3),
  deRisk: z.array(titled).min(3),
  standardInclusions: z.array(z.string()).min(5),
  routes: z.strictObject({
    midMarket: z.strictObject({ title: z.string(), steps: z.array(routeStep).min(3) }),
    enterprise: z.strictObject({ title: z.string(), steps: z.array(routeStep).min(2), partnerLine: z.string() }),
  }),
  faq: z.array(faqItem).min(3),
  evaluationPartner: z.strictObject({
    promise: z.string(), audiences: z.array(z.string()).min(3), delivers: z.array(z.string()).min(3),
    fit: z.array(z.string()).min(2), methodSummary: z.string(), faq: z.array(faqItem).min(3),
  }),
}).superRefine((s, ctx) => {
  if (s.phases.map((p) => p.id).join() !== PHASE_ORDER.join()) {
    ctx.addIssue({ code: "custom", path: ["phases"], message: `phases run ${PHASE_ORDER.join(", ")}, in that order (spec §4.2)` });
  }
  if (new Set(s.deliveryChoices.map((c) => c.id)).size !== deliveryChoice.options.length) {
    ctx.addIssue({ code: "custom", path: ["deliveryChoices"], message: `deliveryChoices has one entry per choice: ${deliveryChoice.options.join(", ")} (spec §4.6)` });
  }
});

export const contactData = z.strictObject({
  replyTime: z.string(), // written once: /contact/ and /contact/sent/ read it, and no other page states a reply time (spec §8.11)
  // null until Phase E: the page then shows the email fallback only. https only: the form posts personal data.
  formEndpoint: z.url({ protocol: /^https$/ }).nullable(),
  // null until Phase E chooses the form provider: no placeholder names one before then (blueprint
  // ruling 16). A form endpoint needs it, because the collection notice names it (spec §10.2).
  formProvider: z.strictObject({ name: z.string(), country: z.string() }).nullable(),
  emailProvider: z.strictObject({ name: z.string(), country: z.string() }),
  subProcessors: z.array(z.strictObject({ entity: z.string(), purpose: z.string(), country: z.string(), data: z.string() })).min(2),
  whatNext: z.array(z.string()).min(3),
  deflection: z.array(z.strictObject({ title: z.string(), body: z.string(), email: z.email() })).min(3),
}).refine((c) => c.formEndpoint === null || c.formProvider !== null, {
  message: "a form endpoint needs its form provider: the collection notice names it (spec §10.2)", path: ["formProvider"],
});

export const trustData = z.strictObject({
  asAt: z.coerce.date(),
  partA: z.strictObject({ cookies: z.string(), analytics: z.string(), enquiries: z.string(), securityContact: z.email() }),
  partB: z.array(z.strictObject({ id: slug, title: z.string(), body: z.string(), confirmed: z.boolean() })).min(1),
  // `term`: the partB id a Part B answer rests on. The page shows that answer only while the term
  // is confirmed, so no answer states a commitment the owner hasn't confirmed (spec §12 item 2).
  faq: z.array(z.strictObject({
    q: z.string().min(5), a: z.string(), part: z.enum(["A", "B"]), term: slug.optional(), asAt: z.coerce.date(),
  })).min(5),
  transparency: z.strictObject({
    statement: z.string(),
    systems: z.array(z.strictObject({ name: z.string(), purpose: z.string(), data: z.string(), human: z.string(), demo: slug.optional() })).min(1),
  }),
  changes: z.array(z.strictObject({ date: z.coerce.date(), change: z.string() })).min(1),
}).superRefine((t, ctx) => {
  // Spec §8.11: each questionnaire answer is 30–110 words, direct answer first.
  t.faq.forEach((f, i) => {
    const n = words(f.a);
    if (n < 30 || n > 110) ctx.addIssue({ code: "custom", path: ["faq", i, "a"], message: `faq[${i}].a has ${n} words; the spec needs 30–110` });
  });
  // Spec §8.11, §12 item 2: a Part B answer describes a contract commitment, so it names the Part B
  // term it rests on; a Part A answer describes the website and email today, and names none.
  const terms = new Set(t.partB.map((b) => b.id));
  t.faq.forEach((f, i) => {
    const issue = (message: string) => ctx.addIssue({ code: "custom", path: ["faq", i, "term"], message });
    if (f.part === "A" && f.term !== undefined) issue(`faq[${i}] describes Part A, so it names no Part B term`);
    else if (f.part === "B" && f.term === undefined) issue(`faq[${i}] describes Part B, so it names the Part B term it rests on (spec §8.11, §12 item 2)`);
    else if (f.part === "B" && f.term !== undefined && !terms.has(f.term)) issue(`faq[${i}].term "${f.term}" names no Part B term`);
  });
});

export const aboutData = z.strictObject({
  mission: z.string(), whoWeServe: z.string(), whyControl: z.string(),
  principles: z.array(titled).min(5), howWeWork: z.array(titled).min(3),
  buildLog: z.array(z.strictObject({ date: z.coerce.date(), event: z.string() })).min(1),
});

export const homeData = z.strictObject({ heroTrace: slug, faq: z.array(faqItem).min(4) })
  .refine((h) => h.faq.filter((f) => f.q === HOME_TRUST_QUESTION).length === 1, {
    message: `the Home FAQ asks "${HOME_TRUST_QUESTION}" exactly once (spec §8.1.10)`, path: ["faq"],
  });

/** Frontmatter of a src/content/documents/*.md entry: the legal documents and the evaluation method. */
export const documentSchema = z.strictObject({
  title: z.string(), summary: z.string().min(20), lastUpdated: z.coerce.date(),
  effective: z.coerce.date().optional(), draft: z.boolean().default(false),
});

export type PositioningData = z.infer<typeof positioningData>;
export type ServicesData = z.infer<typeof servicesData>;
export type ContactData = z.infer<typeof contactData>;
export type TrustData = z.infer<typeof trustData>;
export type AboutData = z.infer<typeof aboutData>;
export type HomeData = z.infer<typeof homeData>;
export type DocumentData = z.infer<typeof documentSchema>;
