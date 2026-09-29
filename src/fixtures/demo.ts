// Preview-only fixture: the rules are in src/fixtures/index.ts.
// The register demo in the demo schema's `register` shape (Phase D): six fixture documents, and two
// registers of three rows whose cells each name the page they were read from. The first register
// shows every cell status: its first row is all "ok", its second has a cell to review and its
// third a blocked cell.
import type { DemoOf } from "../content/schemas.ts";

export const DEMO_FIXTURE_ID = "fixture-demo";

// Each page names itself, then carries the values the registers read from it, so the register
// demo's side panel has a value to highlight (Phase D Task 3). "Fixture value missing" is on no
// page: it records a signature the page doesn't have.
const doc = (n: number, title: string, template: string, lines: [string[], string[]]) => ({
  id: `fixture-doc-${n}`,
  title,
  template,
  pages: [
    { n: 1, text: [`Fixture page one of ${title}`, ...lines[0]].join("\n") },
    { n: 2, text: [`Fixture page two of ${title}`, ...lines[1]].join("\n") },
  ],
});
const AGREEMENT_PAGE_ONE = ["Fixture repair limit: Fixture value present"];
const DEED_PAGES: [string[], string[]] = [
  ["Fixture trustee: Fixture trustee name"],
  ["Fixture vesting: Fixture vesting date", "Fixture appointor: Fixture appointor name"],
];

const FIELDS = [
  { key: "fixture-repair-limit", label: "Fixture repair limit" },
  { key: "fixture-landlord-insurance", label: "Fixture landlord insurance" },
  { key: "fixture-signed-authority", label: "Fixture signed authority" },
];
const DEED_FIELDS = [
  { key: "fixture-trustee", label: "Fixture trustee" },
  { key: "fixture-vesting-date", label: "Fixture vesting date" },
  { key: "fixture-appointor", label: "Fixture appointor" },
];

export const demoFixture: DemoOf<"register"> = {
  solution: "fixture-solution",
  title: "Fixture register demo",
  kind: "register",
  provenance: "illustrative",
  data: {
    documents: [
      doc(1, "Fixture agreement A", "Fixture template A", [AGREEMENT_PAGE_ONE, ["Fixture landlord insurance: Fixture value current", "Fixture signed authority: Fixture value signed"]]),
      doc(2, "Fixture agreement B", "Fixture template A", [AGREEMENT_PAGE_ONE, ["Fixture landlord insurance: Fixture value expired", "Fixture signed authority: Fixture value signed"]]),
      doc(3, "Fixture agreement C", "Fixture template B", [AGREEMENT_PAGE_ONE, ["Fixture landlord insurance: Fixture value current", "Fixture signed authority: Fixture line left blank"]]),
      doc(4, "Fixture deed D", "Fixture deed template", DEED_PAGES),
      doc(5, "Fixture deed E", "Fixture deed template", DEED_PAGES),
      doc(6, "Fixture deed F", "Fixture deed template", DEED_PAGES),
    ],
    registers: [
      {
        id: "fixture-agreements",
        title: "Fixture register over three fixture agreements",
        fields: FIELDS,
        rows: [
          {
            doc: "fixture-doc-1",
            cells: {
              "fixture-repair-limit": { value: "Fixture value present", page: 1, status: "ok" },
              "fixture-landlord-insurance": { value: "Fixture value current", page: 2, status: "ok" },
              "fixture-signed-authority": { value: "Fixture value signed", page: 2, status: "ok" },
            },
          },
          {
            doc: "fixture-doc-2",
            cells: {
              "fixture-repair-limit": { value: "Fixture value present", page: 1, status: "ok" },
              "fixture-landlord-insurance": { value: "Fixture value expired", page: 2, status: "review", note: "Fixture note: the fixture policy has lapsed" },
              "fixture-signed-authority": { value: "Fixture value signed", page: 2, status: "ok" },
            },
          },
          {
            doc: "fixture-doc-3",
            cells: {
              "fixture-repair-limit": { value: "Fixture value present", page: 1, status: "ok" },
              "fixture-landlord-insurance": { value: "Fixture value current", page: 2, status: "ok" },
              "fixture-signed-authority": { value: "Fixture value missing", page: 2, status: "blocked", note: "Fixture note: no fixture signature" },
            },
          },
        ],
      },
      {
        id: "fixture-deeds",
        title: "Fixture register over three fixture deeds",
        fields: DEED_FIELDS,
        rows: [4, 5, 6].map((n) => ({
          doc: `fixture-doc-${n}`,
          cells: {
            "fixture-trustee": { value: "Fixture trustee name", page: 1, status: "ok" as const },
            "fixture-vesting-date": { value: "Fixture vesting date", page: 2, status: "ok" as const },
            "fixture-appointor": { value: "Fixture appointor name", page: 2, status: "ok" as const },
          },
        })),
      },
    ],
    download: "/downloads/fixture-demo-register.csv",
  },
};
