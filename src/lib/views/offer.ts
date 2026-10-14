// View models for a solution's packages (spec §4.1 package status, §4.5, §4.6, §8.3 block 4).
// Pure TypeScript: no astro:content, so Node tests import it directly. The package status
// decides where a package may appear:
// - launch: a full block (the generic package) or a tab (PackageBlock, CI check 10);
// - on-request: a one-line entry that links to the contact page with the solution preselected;
// - internal: never leaves this module.
import type { z } from "astro/zod";
import type { makeSolutionSchema } from "../../content/schemas.ts";
import type { ServicesData } from "../../content/page-schemas.ts";
import type { SiteContext } from "../site.ts";

type SolutionData = z.infer<ReturnType<typeof makeSolutionSchema>>;
type LaunchPackageData = SolutionData["genericPackage"];

export interface PackageView {
  id: string;
  name: string;
  status: "launch";
  buyers: ("mid-market" | "enterprise-government")[];
  forWhom: string;
  scope: string;
  inclusions: string[];
  clientTime: string;
  timeline: string;
  outOfScope: string[];
  gate: string;
  onshoreNote: string;
  precondition: string | null;
  /** go-global §4.2: true when every step runs in the region the client chooses (their own account, any cloud region; or managed by Techsider, an Australian region), as the region note says → ONSHORE_PILLAR, linking to the block's region note (data-onshore-pillar data-onshore="true"); false → PROCESSING_NOTE, linking to the same note. */
  onshore: boolean;
  /** false → the block leaves out the standard test inclusion (isTestInclusion): the package holds no test on your own examples. */
  testInclusion: boolean;
  /** "au" for an Australia-only package (region: au in its YAML; go-global §3.3): PackageBlock labels it "Australia". */
  region: "au" | null;
}

export interface ListedPackageView {
  id: string;
  name: string;
  status: "on-request";
  oneLiner: string;
  precondition: string | null;
  /** site.contact({ interest: solutionId }): the solution is preselected on the form (spec §8.3 block 4). */
  href: string;
  /** "au" for an Australia-only package (go-global §3.3): its entry is labelled "Australia". */
  region: "au" | null;
}

/** The services copy every solution page repeats: §4.5 inclusions, §4.6 delivery choices and onshore note, §4.4 independence. */
export type SharedOfferCopy = Pick<ServicesData, "standardInclusions" | "deliveryChoices" | "independence" | "onshoreNote">;

/** The standard inclusion that promises a test on your own examples: the one that names thresholds (spec §4.5). */
export function isTestInclusion(line: string): boolean {
  return /\bthresholds\b/.test(line);
}

function launchView(p: LaunchPackageData): PackageView {
  return {
    id: p.id,
    name: p.name,
    status: "launch",
    buyers: [...p.buyers],
    forWhom: p.forWhom,
    scope: p.scope,
    inclusions: [...p.inclusions],
    clientTime: p.clientTime,
    timeline: p.timeline,
    outOfScope: [...p.outOfScope],
    gate: p.gate,
    onshoreNote: p.onshoreNote,
    precondition: p.precondition ?? null,
    onshore: p.onshore,
    testInclusion: p.testInclusion !== false,
    region: p.region ?? null,
  };
}

/**
 * The region of the package a use case names (go-global §3.3; the contract's rule 5): the solution's
 * generic, launch or listed package whose name is exactly `name`, and its region ("au" or null).
 * A name that matches no package gives null: a use case may describe work no package is named for.
 */
export function packageRegion(data: Pick<SolutionData, "genericPackage" | "packages">, name: string): "au" | null {
  return [data.genericPackage, ...data.packages].find((p) => p.name === name)?.region ?? null;
}

/**
 * The generic package, the launch packages and the on-request packages, each in content order.
 * Internal packages are dropped. Package ids become page anchors (#<package-id> selects a tab),
 * so an id used twice in one solution throws.
 */
export function packageViews(
  solutionId: string,
  data: SolutionData,
  site: SiteContext,
): { generic: PackageView; launch: PackageView[]; onRequest: ListedPackageView[] } {
  const seen = new Set<string>();
  for (const p of [data.genericPackage, ...data.packages]) {
    if (seen.has(p.id)) throw new Error(`solution "${solutionId}": package id "${p.id}" appears twice; package ids are page anchors`);
    seen.add(p.id);
  }
  const href = site.contact({ interest: solutionId });
  const launch: PackageView[] = [];
  const onRequest: ListedPackageView[] = [];
  for (const p of data.packages) {
    if (p.status === "launch") launch.push(launchView(p));
    else if (p.status === "on-request") {
      onRequest.push({ id: p.id, name: p.name, status: "on-request", oneLiner: p.oneLiner, precondition: p.precondition ?? null, href, region: p.region ?? null });
    }
  }
  return { generic: launchView(data.genericPackage), launch, onRequest };
}
