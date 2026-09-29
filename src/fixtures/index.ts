// Template-preview fixtures (spec §13 Phase B). The rules, pinned by tests/fixtures.test.mjs:
// - each fixture parses with the same Zod schemas as real content (plain string refs);
// - every human-readable string says "Fixture" or uses example.com, and every URL points at
//   example.com, so nothing here can pass for a real organisation, client, document or result;
// - references between fixtures resolve to the *_FIXTURE_ID constants;
// - only src/preview/ imports fixtures, statically; src/preview/integration.mjs injects the
//   gallery route into preview builds only, so no fixture reaches the production dist/;
// - every export is deep-frozen (below): derived fixtures share nested objects, so an in-place
//   sort or splice in a template or preview page would otherwise change other specimens.
//   Map, filter or spread a fixture to change it.
import * as solution from "./solution.ts";
import * as industry from "./industry.ts";
import * as regulatory from "./regulatory.ts";
import * as kit from "./kit.ts";
import * as trace from "./trace.ts";
import * as demo from "./demo.ts";
import * as report from "./report.ts";
import * as mockPanel from "./mock-panel.ts";
import * as previewPages from "./preview-pages.ts";

function deepFreeze(value: unknown, seen = new Set<unknown>()): void {
  if ((typeof value !== "object" && typeof value !== "function") || value === null || seen.has(value)) return;
  seen.add(value);
  Object.freeze(value);
  for (const key of Reflect.ownKeys(value)) {
    const d = Object.getOwnPropertyDescriptor(value, key);
    if (d && "value" in d) deepFreeze(d.value, seen);
  }
}

for (const mod of [solution, industry, regulatory, kit, trace, demo, report, mockPanel, previewPages]) {
  for (const value of Object.values(mod)) deepFreeze(value);
}

export * from "./solution.ts";
export * from "./industry.ts";
export * from "./regulatory.ts";
export * from "./kit.ts";
export * from "./trace.ts";
export * from "./demo.ts";
export * from "./report.ts";
export * from "./mock-panel.ts";
export * from "./preview-pages.ts";
