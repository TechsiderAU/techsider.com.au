// View builders for the Solutions hub (spec §8.2), the Industries hub (§8.4) and the
// solution × industry matrix they share. Pure TypeScript (Phase B2 scope ruling 3): no
// astro:content and no fixtures, so node tests run it on the fixture sets and a Phase C route
// passes it its collection entries. Every href comes from the SiteContext: a page that isn't
// shown gives null, and the templates render it as plain text, never as a dead link.
import type { z } from "astro/zod";
import { JURISDICTION_SECTION, type makeIndustrySchema, type makeSolutionSchema } from "../../content/schemas.ts";
import type { Cell } from "../data-table.ts";
import { refId, solutionLink, type SiteContext } from "../site.ts";

type SolutionData = z.infer<ReturnType<typeof makeSolutionSchema>>;
type IndustryData = z.infer<ReturnType<typeof makeIndustrySchema>>;
type ObligationChip = IndustryData["obligationChips"][number];

/** A DataTable cell: plain text, or a link cell ({ href: null } renders as text). Task 2's type, re-exported. */
export type { Cell };

export interface MatrixView {
  caption: string;
  columns: { key: string; label: string }[];
  rows: Record<string, Cell>[];
  rowHeader: "industry";
  rowIds: string[];
}

export interface BuyerItem {
  name: string;
  solution: { number: string; shortName: string };
  /** `${solution href}#${packageId}` (the package's block or tab), or null while the solution page isn't shown. */
  href: string | null;
}

export interface SolutionsHubView {
  jobs: { number: string; shortName: string; fullName: string; oneLiner: string; job: string; href: string | null }[];
  matrix: MatrixView;
  byBuyer: { midMarket: BuyerItem[]; enterprise: BuyerItem[] };
  servicesHref: string | null;
  closing: { command: "talk_to_us"; args: "--about=<solution>"; label: "Talk to us"; href: string };
}

export interface IndustriesHubView {
  cards: {
    id: string;
    shortName: string;
    fullName: string;
    hook: string;
    /** The first three flagship use cases; an on-request one is labelled "On request" (spec §5). */
    useCases: { name: string; number: string; onRequest: boolean }[];
    chips: { label: string; href: string | null }[];
    href: string | null;
  }[];
  matrix: MatrixView;
  closing: { command: "talk_to_us"; args: "--about=<industry>"; label: "Talk to us"; href: string };
}

const MATRIX_CAPTION = "What each solution does in each industry";
/** The cell for an industry a solution has no matrix entry for. */
const NO_ENTRY = "—";
/** Hub cards show three flagship use cases and three obligation chips (spec §8.4). */
const CARD_ITEMS = 3;

function solutionData(solutions: Record<string, SolutionData>, id: string): SolutionData {
  const data = solutions[id];
  if (!data) throw new Error(`hubs: no solution data for "${id}"`);
  return data;
}

function industryData(industries: Record<string, IndustryData>, id: string): IndustryData {
  const data = industries[id];
  if (!data) throw new Error(`hubs: no industry data for "${id}"`);
  return data;
}

/**
 * The id of the regulatory-map row a chip links to on its industry page (Task 7's anchors):
 * `reg-${row}`, or `reg-${section}-${row}` when the industry is split by jurisdiction, where the
 * section is the chip's own (a row shared by two sections has one anchor in each).
 */
function rowAnchor(data: IndustryData, chip: ObligationChip): string {
  if (!data.jurisdictions) return `reg-${chip.row}`;
  if (!chip.jurisdiction) throw new Error(`hubs: chip "${chip.label}" has no jurisdiction, but its industry is split by jurisdiction`);
  return `reg-${JURISDICTION_SECTION[chip.jurisdiction]}-${chip.row}`;
}

/**
 * The solution × industry matrix (spec §8.2 "By industry", §8.4): one row per industry in
 * spec §5 order, one column per solution in §4.1 order. A cell is the solution's 3–6-word
 * example for that industry, linking to the solution page, or "—" when it has none.
 */
export function matrixView(solutions: Record<string, SolutionData>, site: SiteContext): MatrixView {
  const columns = site.solutions.map((s) => ({ link: s, matrix: solutionData(solutions, s.id).matrix }));
  return {
    caption: MATRIX_CAPTION,
    columns: [{ key: "industry", label: "Industry" }, ...site.solutions.map((s) => ({ key: s.id, label: `${s.number} ${s.shortName}` }))],
    rows: site.industries.map((industry) => {
      const row: Record<string, Cell> = { industry: { text: industry.shortName, href: industry.href } };
      for (const { link, matrix } of columns) {
        row[link.id] = Object.hasOwn(matrix, industry.id) ? { text: matrix[industry.id], href: link.href } : NO_ENTRY;
      }
      return row;
    }),
    rowHeader: "industry",
    rowIds: site.industries.map((industry) => `matrix-${industry.id}`),
  };
}

/**
 * The Solutions hub (spec §8.2): the five jobs, the matrix, and every launch package (the generic
 * package first, then the solution's launch packages) listed under each buyer it names, so a
 * package for both buyers appears in both lists. On-request and internal packages never appear.
 */
export function solutionsHubView(input: { solutions: Record<string, SolutionData>; site: SiteContext }): SolutionsHubView {
  const { solutions, site } = input;
  const midMarket: BuyerItem[] = [];
  const enterprise: BuyerItem[] = [];
  const jobs = site.solutions.map((s) => {
    const data = solutionData(solutions, s.id);
    const launch = [data.genericPackage, ...data.packages.flatMap((p) => (p.status === "launch" ? [p] : []))];
    for (const pkg of launch) {
      const item: BuyerItem = {
        name: pkg.name,
        solution: { number: s.number, shortName: s.shortName },
        href: s.href === null ? null : `${s.href}#${pkg.id}`,
      };
      if (pkg.buyers.includes("mid-market")) midMarket.push(item);
      if (pkg.buyers.includes("enterprise-government")) enterprise.push({ ...item, solution: { ...item.solution } });
    }
    return { number: s.number, shortName: s.shortName, fullName: s.fullName, oneLiner: s.oneLiner, job: data.job, href: s.href };
  });
  return {
    jobs,
    matrix: matrixView(solutions, site),
    byBuyer: { midMarket, enterprise },
    servicesHref: site.page("services").href,
    closing: { command: "talk_to_us", args: "--about=<solution>", label: "Talk to us", href: site.contact() },
  };
}

/**
 * The Industries hub (spec §8.4): one deep card per industry in spec §5 order (its constraint
 * hook, its first three flagship use cases with their solution numbers, and its first three
 * obligation chips, each linking to its row on the industry page), then the matrix. An
 * on-request use case is flagged, so its card labels it "On request" (spec §5).
 */
export function industriesHubView(input: {
  industries: Record<string, IndustryData>;
  solutions: Record<string, SolutionData>;
  site: SiteContext;
}): IndustriesHubView {
  const { industries, solutions, site } = input;
  const cards = site.industries.map((industry) => {
    const data = industryData(industries, industry.id);
    return {
      id: industry.id,
      shortName: industry.shortName,
      fullName: industry.fullName,
      hook: data.constraintHook,
      useCases: data.flagshipUseCases.slice(0, CARD_ITEMS).map((u) => ({
        name: u.name,
        number: solutionLink(site, refId(u.solution)).number,
        onRequest: u.status === "on-request",
      })),
      chips: data.obligationChips.slice(0, CARD_ITEMS).map((chip) => ({
        label: chip.label,
        href: industry.href === null ? null : `${industry.href}#${rowAnchor(data, chip)}`,
      })),
      href: industry.href,
    };
  });
  return {
    cards,
    matrix: matrixView(solutions, site),
    closing: { command: "talk_to_us", args: "--about=<industry>", label: "Talk to us", href: site.contact() },
  };
}
