// Preview-only fixture: the rules are in src/fixtures/index.ts.
// The register demo in the demo schema's `register` shape (Phase D): six fixture documents, and two
// registers of three rows whose cells each name the page they were read from. The first register
// shows every cell status: its first row is all "ok", its second has a cell to review and its
// third a blocked cell.
import type { DemoOf } from "../content/schemas.ts";

export const DEMO_FIXTURE_ID = "fixture-demo";

const doc = (n: number, title: string, template: string) => ({
  id: `fixture-doc-${n}`,
  title,
  template,
  pages: [
    { n: 1, text: `Fixture page one of ${title}` },
    { n: 2, text: `Fixture page two of ${title}` },
  ],
});

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
      doc(1, "Fixture agreement A", "Fixture template A"),
      doc(2, "Fixture agreement B", "Fixture template A"),
      doc(3, "Fixture agreement C", "Fixture template B"),
      doc(4, "Fixture deed D", "Fixture deed template"),
      doc(5, "Fixture deed E", "Fixture deed template"),
      doc(6, "Fixture deed F", "Fixture deed template"),
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
