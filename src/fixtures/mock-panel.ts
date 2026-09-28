// Preview-only fixture: the rules are in src/fixtures/index.ts.
import type { MockPanelData } from "../content/schemas.ts";

export const MOCK_PANEL_FIXTURE_ID = "fixture-mock-panel";

export const mockPanelFixture: MockPanelData = {
  title: "Fixture register: agreement A",
  fields: [
    { label: "Fixture party", value: "Northwind Fixture Pty Ltd" },
    { label: "Fixture term", value: "Fixture term: three years from signing" },
    { label: "Fixture signatory", value: "Fixture Signatory Name", redacted: true },
    { label: "Fixture repair limit", value: "Fixture clause not found" },
  ],
  chips: [
    { status: "ok", text: "Fixture check: agreement signed" },
    { status: "review", text: "Fixture check: insurance date unclear" },
    { status: "blocked", text: "Fixture check: no repair limit" },
  ],
  citations: [
    { source: "Fixture agreement A", clause: "Fixture clause 4.2", href: "https://example.com/fixture/agreement-a#clause-4-2" },
    { source: "Fixture agreement B", clause: "Fixture clause 9.1" },
  ],
  decision: { approve: "Approve fixture entry", reject: "Reject fixture entry" },
};
