// Provenance labels (spec §9.3): an illustrative item renders a visible label, and a measured one
// names the committed harness run it comes from. TracePanel's caption and the Home hero's static
// copy of its trace both read traceProvenanceLabel(), so the two can never say different things.
// Node-importable: it imports only a type.
import type { TraceData } from "../content/schemas.ts";

/** "Illustrative trace", or "Measured run: <run path>". A measured trace without a run fails the build. */
export function traceProvenanceLabel(trace: Pick<TraceData, "title" | "provenance" | "run">): string {
  if (trace.provenance === "illustrative") return "Illustrative trace";
  if (!trace.run) throw new Error(`trace "${trace.title}": provenance is "measured", but no run path is given`);
  return `Measured run: ${trace.run}`;
}
