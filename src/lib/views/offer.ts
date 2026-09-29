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
  /** true → ONSHORE_PILLAR (data-onshore-pillar data-onshore="true"); false → PROCESSING_NOTE, linking to the block's onshore note. */
  onshore: boolean;
}

export interface ListedPackageView {
  id: string;
  name: string;
  status: "on-request";
  oneLiner: string;
  precondition: string | null;
  /** site.contact({ interest: solutionId }): the solution is preselected on the form (spec §8.3 block 4). */
  href: string;
}

/** The services copy every solution page repeats: §4.5 inclusions, §4.6 delivery choices and onshore note, §4.4 independence. */
export type SharedOfferCopy = Pick<ServicesData, "standardInclusions" | "deliveryChoices" | "independence" | "onshoreNote">;

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
  };
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
      onRequest.push({ id: p.id, name: p.name, status: "on-request", oneLiner: p.oneLiner, precondition: p.precondition ?? null, href });
    }
  }
  return { generic: launchView(data.genericPackage), launch, onRequest };
}
