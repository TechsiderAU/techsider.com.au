// The industry page's view model (spec §8.5, §5). Pure TypeScript that Node can import: it never
// imports astro:content, and it reads every reference field through refId(). IndustryTemplate
// renders the result; a Phase C route builds it from the content collections, the gallery
// specimens from the fixtures.
// - Every link comes from the SiteContext: a page that isn't shown has a null href, and an
//   on-request package or the contact CTA falls back to email while /contact/ isn't shown.
// - Regulatory-map rows get page-unique anchors: `reg-${rowId}` on a single-map page, and
//   `reg-${section}-${rowId}` on a jurisdiction page (Government), where one row can sit in two
//   sections (a Commonwealth rule that also binds NSW, say) and so renders twice.
// - Broken data fails the build: a chip whose row isn't in its map, a package that doesn't
//   exist or is internal, a missing scenario trace, a repeated regulatory row id, a workflow
//   stage id that repeats or that the page already writes (a section id or a reg- row anchor),
//   or (jurisdiction mode) a row that names no jurisdiction.
import type { z } from "astro/zod";
import type {
  MockPanelData, SectionId, TraceData, jurisdiction, makeIndustrySchema, makeSolutionSchema, regulatoryRow,
} from "../../content/schemas.ts";
import { JURISDICTION_SECTION, SECTION_ORDER, SECTION_TITLE } from "../../content/schemas.ts";
import { WORKS_METHOD_LABEL } from "../fixed-copy.ts";
import type { Link, SiteContext } from "../site.ts";
import { crumbs, industryLink, refId, solutionLink } from "../site.ts";
import type { InsightCardView } from "./insights.ts";

type IndustryData = z.infer<ReturnType<typeof makeIndustrySchema>>;
type SolutionData = z.infer<ReturnType<typeof makeSolutionSchema>>;
type RegulatoryRow = z.infer<typeof regulatoryRow>;
type Jurisdiction = z.infer<typeof jurisdiction>;

export interface ChipView { label: string; href: string }
export interface WorksView { system: string; method: "read-only" | "import" | "draft-for-approval"; methodLabel: string; verified: Date }
export interface RecommendedPackageView {
  id: string; name: string; status: "launch" | "on-request"; summary: string;
  solution: { number: string; shortName: string; href: string | null };
  href: string | null;
}
export interface RegRowView {
  anchor: string; obligation: string; meaning: string; design: string; evidence: string;
  source: string; asAt: Date; lastReviewed: Date; appliesTo: string | null;
}
export interface RegulatoryBlockView { chips: ChipView[]; works: WorksView[]; packages: RecommendedPackageView[]; rows: RegRowView[]; lastReviewed: Date }
export interface JurisdictionSectionView extends RegulatoryBlockView { id: SectionId; title: string }
export interface IndustryView {
  id: string; shortName: string; fullName: string; breadcrumb: Link[];
  promise: string; constraintSet: string;
  ctas: { primary: Link; secondary: Link };
  mode: "single" | "jurisdictions";
  single: RegulatoryBlockView | null; sections: JurisdictionSectionView[];
  problem: { from: string; to: string; source: { label: string; url: string; asAt: Date } };
  workflow: { id: string; stage: string; useCases: { name: string; solution: { number: string; shortName: string; href: string | null }; onRequest: boolean; note: string | null }[] }[];
  mockPanel: MockPanelData;
  leadSolutions: { number: string; shortName: string; href: string | null }[];
  demoHref: string | null;
  platformFirst: string | null; dontDo: string[];
  scenario: { title: string; problem: string; approach: string; measure: string[]; shipsFirst: string; trace: TraceData };
  firstEngagement: { needFromYou: string[]; youGet: string[]; exitRamp: string };
  insights: InsightCardView[];
  faq: { q: string; a: string }[];
  closing: { command: "talk_to_us"; args: string; label: string; href: string };
}

/** The "Applies to" cell of a state-section row: its states, in NSW, Vic, Qld order. */
const STATES: { id: Jurisdiction; label: string }[] = [
  { id: "nsw", label: "NSW" },
  { id: "vic", label: "Vic" },
  { id: "qld", label: "Qld" },
];
const MAX_INSIGHTS = 3;

type Ref = string | { id: string };
type PackageRef = { solution: Ref; package: string; jurisdiction?: Jurisdiction };
type ChipRef = { label: string; row: string; jurisdiction?: Jurisdiction };
type WorksRef = { system: string; method: WorksView["method"]; verified: Date; jurisdiction?: Jurisdiction };

function solutionChip(site: SiteContext, ref: Ref) {
  const link = solutionLink(site, refId(ref));
  return { number: link.number, shortName: link.shortName, href: link.href };
}

function recommendedPackage(industryId: string, ref: PackageRef, solutions: Record<string, SolutionData>, site: SiteContext): RecommendedPackageView {
  const solutionId = refId(ref.solution);
  const data = solutions[solutionId];
  if (!data) throw new Error(`industryView(${industryId}): package "${ref.package}" names solution "${solutionId}", which isn't in solutions`);
  const found = data.genericPackage.id === ref.package ? data.genericPackage : data.packages.find((p) => p.id === ref.package);
  if (!found) throw new Error(`industryView(${industryId}): solution "${solutionId}" has no package "${ref.package}"`);
  if (found.status === "internal") throw new Error(`industryView(${industryId}): package "${ref.package}" of solution "${solutionId}" is internal and never renders`);
  const solution = solutionChip(site, solutionId);
  if (found.status === "launch") {
    // The solution page gives every launch package this id: the generic package's block, or the
    // tab panel of a tabbed one.
    return { id: found.id, name: found.name, status: "launch", summary: found.scope, solution, href: solution.href === null ? null : `${solution.href}#${found.id}` };
  }
  return { id: found.id, name: found.name, status: "on-request", summary: found.oneLiner, solution, href: site.contact({ interest: solutionId }) };
}

function rowView(row: RegulatoryRow, section: SectionId | null): RegRowView {
  const appliesTo = section === "state"
    ? STATES.filter((s) => row.jurisdictions?.includes(s.id)).map((s) => s.label).join(", ")
    : null;
  return {
    anchor: section === null ? `reg-${row.id}` : `reg-${section}-${row.id}`,
    obligation: row.obligation, meaning: row.meaning, design: row.design, evidence: row.evidence,
    source: row.source, asAt: row.asAt, lastReviewed: row.lastReviewed, appliesTo,
  };
}

function block(
  industryId: string,
  section: SectionId | null,
  parts: { chips: ChipRef[]; works: WorksRef[]; packages: PackageRef[]; rows: RegulatoryRow[] },
  solutions: Record<string, SolutionData>,
  site: SiteContext,
): RegulatoryBlockView {
  const where = section === null ? "the regulatory map" : `the ${section} section's regulatory map`;
  const rows = parts.rows.map((r) => rowView(r, section));
  const anchorOf = new Map(parts.rows.map((r, i) => [r.id, rows[i].anchor]));
  const chips = parts.chips.map((c) => {
    const anchor = anchorOf.get(c.row);
    if (!anchor) throw new Error(`industryView(${industryId}): chip "${c.label}" links to row "${c.row}", which isn't in ${where}`);
    return { label: c.label, href: `#${anchor}` };
  });
  if (rows.length === 0) throw new Error(`industryView(${industryId}): ${where} has no rows`);
  const packages = parts.packages.map((p) => recommendedPackage(industryId, p, solutions, site));
  return {
    chips,
    works: parts.works.map((w) => ({ system: w.system, method: w.method, methodLabel: WORKS_METHOD_LABEL[w.method], verified: w.verified })),
    // Launch packages lead (spec §5); the sort is stable, so each group keeps its data order.
    packages: [...packages].sort((a, b) => Number(a.status !== "launch") - Number(b.status !== "launch")),
    rows,
    lastReviewed: new Date(Math.max(...parts.rows.map((r) => r.lastReviewed.getTime()))),
  };
}

export function industryView(input: {
  id: string;
  data: IndustryData;
  rows: RegulatoryRow[];
  solutions: Record<string, SolutionData>;
  traces: Record<string, TraceData>;
  insights: InsightCardView[];
  site: SiteContext;
}): IndustryView {
  const { id, data, rows, solutions, traces, insights, site } = input;
  const link = industryLink(site, id);
  const lower = link.shortName.toLowerCase();
  const talk = { label: "Start with one workflow", href: site.contact({ industry: id }) };

  // Stage ids are page anchors: each stage is a TabPanel whose id is the stage id (its heading is
  // `${stage}-heading`). The schema doesn't make them unique, so a repeated stage id, or one that
  // is also an id the template writes (a section, a jurisdiction sub-block, a chip row, the
  // workflow tab group or a reg- row anchor), would give the page two elements with one id.
  const pageIds = new Set<string>([
    "designed-around", "designed-around-obligations", "designed-around-systems",
    ...SECTION_ORDER.flatMap((s) => [s, `${s}-designed-around`, `${s}-obligations`, `${s}-systems`, `${s}-packages`, `${s}-regulatory-map`]),
    "problem", "workflow", "packages", "packages-lead", "regulatory-map", "scenario", "first-engagement", "insights", "faq", "contact",
    `${id}-workflow`,
  ]);
  const stageIds = new Set<string>();
  for (const stage of data.workflow) {
    if (stageIds.has(stage.id)) throw new Error(`industryView(${id}): stage id "${stage.id}" appears twice; stage ids are page anchors`);
    if (pageIds.has(stage.id) || stage.id.startsWith("reg-")) {
      throw new Error(`industryView(${id}): stage id "${stage.id}" is also a section id or row anchor on the page`);
    }
    stageIds.add(stage.id);
  }
  // Row ids are page anchors too (reg-<row>, or reg-<section>-<row>), and neither the schema nor
  // check 08 makes them unique within a regulatory file: a repeated one would give the page two
  // rows with one id, and a chip would land on the first.
  const rowIds = new Set<string>();
  for (const row of rows) {
    if (rowIds.has(row.id)) throw new Error(`industryView(${id}): row "${row.id}" appears twice; row ids are page anchors`);
    rowIds.add(row.id);
  }

  let single: RegulatoryBlockView | null = null;
  let sections: JurisdictionSectionView[] = [];
  if (data.jurisdictions) {
    const jurisdictions = data.jurisdictions;
    for (const row of rows) {
      if (!row.jurisdictions?.length) throw new Error(`industryView(${id}): row "${row.id}" names no jurisdiction, so it has no section`);
    }
    const inSection = (s: SectionId) => (item: { jurisdiction?: Jurisdiction }) => item.jurisdiction !== undefined && JURISDICTION_SECTION[item.jurisdiction] === s;
    sections = SECTION_ORDER.filter((s) => jurisdictions.some((j) => JURISDICTION_SECTION[j] === s)).map((s) => ({
      id: s,
      title: SECTION_TITLE[s],
      ...block(id, s, {
        chips: data.obligationChips.filter(inSection(s)),
        works: data.worksAlongside.filter(inSection(s)),
        packages: data.packages.filter(inSection(s)),
        rows: rows.filter((r) => (r.jurisdictions ?? []).some((j) => JURISDICTION_SECTION[j] === s)),
      }, solutions, site),
    }));
  } else {
    single = block(id, null, { chips: data.obligationChips, works: data.worksAlongside, packages: data.packages, rows }, solutions, site);
  }

  const trace = traces[data.scenario.trace];
  if (!trace) throw new Error(`industryView(${id}): scenario trace "${data.scenario.trace}" isn't in traces`);

  return {
    id,
    shortName: link.shortName,
    fullName: link.fullName,
    breadcrumb: crumbs(site, ["industries", { label: link.shortName, path: link.path }]),
    promise: data.promise,
    constraintSet: data.constraintSet,
    ctas: { primary: talk, secondary: { label: `See the ${lower} scenario`, href: "#scenario" } },
    mode: data.jurisdictions ? "jurisdictions" : "single",
    single,
    sections,
    problem: { from: data.problem.from, to: data.problem.to, source: { label: data.problem.source.label, url: data.problem.source.url, asAt: data.problem.source.asAt } },
    workflow: data.workflow.map((stage) => ({
      id: stage.id,
      stage: stage.stage,
      useCases: stage.useCases.map((u) => ({ name: u.name, solution: solutionChip(site, u.solution), onRequest: u.status === "on-request", note: u.note ?? null })),
    })),
    mockPanel: data.mockPanel,
    leadSolutions: data.leadSolutions.map((ref) => solutionChip(site, ref)),
    demoHref: site.demo(refId(data.leadSolutions[0])),
    platformFirst: data.platformFirst ?? null,
    dontDo: [...data.dontDo],
    scenario: {
      title: data.scenario.title,
      problem: data.scenario.problem,
      approach: data.scenario.approach,
      measure: [...data.scenario.measure],
      shipsFirst: data.scenario.shipsFirst,
      trace,
    },
    firstEngagement: { needFromYou: [...data.firstEngagement.needFromYou], youGet: [...data.firstEngagement.youGet], exitRamp: data.firstEngagement.exitRamp },
    // Cards that reference this industry, matched by id (WB-15): a chip's label is display copy.
    insights: insights
      .filter((card) => card.industries.some((i) => i.id === id))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, MAX_INSIGHTS),
    faq: data.faq.map((f) => ({ q: f.q, a: f.a })),
    closing: { command: "talk_to_us", args: `--about=${id}`, label: talk.label, href: talk.href },
  };
}
