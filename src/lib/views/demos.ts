// The demos collection as the Demos hub and the demo pages read it (spec §7.1, §8.8, §9.1): one
// demo per solution, in a file named after it (src/data/demos/<solution id>.json) whose `solution`
// names the same id. The hub lists the demos in spec §4.1 order; a demo page and a solution page's
// hero each read their solution's. Pure TypeScript: no astro:content, so Node tests pass plain
// { id, data } entries, as they do to the other view builders.
import type { DemoData, DemoKind } from "../../content/schemas.ts";
import { refId, type SiteContext } from "../site.ts";

/** A Demos hub card: DemosHubTemplate's `demos` prop, one per solution. */
export interface DemoCard {
  solutionId: string;
  title: string;
  kind: DemoKind;
}

/**
 * The demo of solution `id`, from the demos collection's entries. Throws when the solution has no
 * demo file, or when its file names another solution, so a missing or crossed demo fails the build.
 */
export function demoFor(entries: readonly { id: string; data: DemoData }[], id: string): DemoData {
  const entry = entries.find((e) => e.id === id);
  if (entry === undefined) throw new Error(`no demo for "${id}": src/data/demos/${id}.json does not exist (spec §9.1: one demo per solution)`);
  const solution = refId(entry.data.solution);
  if (solution !== id) throw new Error(`src/data/demos/${id}.json names solution "${solution}": a demo file is named after its own solution`);
  return entry.data;
}

/** One card per solution, in spec §4.1 order, whatever order the collection lists them in. Throws as demoFor() does. */
export function demoCards(entries: readonly { id: string; data: DemoData }[], site: SiteContext): DemoCard[] {
  return site.solutions.map((s) => {
    const demo = demoFor(entries, s.id);
    return { solutionId: s.id, title: demo.title, kind: demo.kind };
  });
}
