// Template-preview fixtures (spec §13 Phase B). The rules, pinned by tests/fixtures.test.mjs:
// - each fixture parses with the same Zod schemas as real content (plain string refs);
// - every human-readable string says "Fixture" or uses example.com, and every URL points at
//   example.com, so nothing here can pass for a real organisation, client, document or result;
// - references between fixtures resolve to the *_FIXTURE_ID constants;
// - only src/pages/preview/ imports fixtures (a dynamic import behind isPreview()), so no
//   fixture reaches the production dist/.
export * from "./solution.ts";
export * from "./industry.ts";
export * from "./regulatory.ts";
export * from "./kit.ts";
export * from "./trace.ts";
export * from "./demo.ts";
export * from "./report.ts";
export * from "./mock-panel.ts";
