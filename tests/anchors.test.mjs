// The "Rules that travel" chip labels (go-global §5.2): "{Kind} · {status} · as at {Mon YYYY}",
// which src/lib/anchors.ts builds for the industry view. Pure functions: no build needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { anchorChipLabel, anchorStatusText } from "../src/lib/anchors.ts";
import { anchorKind, anchorStatus } from "../src/content/schemas.ts";
import { ANCHOR_KIND_LABEL } from "../src/lib/fixed-copy.ts";

const day = (iso) => new Date(iso); // a JSON date parses as UTC midnight
const AS_AT = day("2026-10-01");

test("anchorStatusText words every status, and dates the two whose chip prints a date", () => {
  assert.equal(anchorStatusText({ status: "in-force" }), "in force");
  assert.equal(anchorStatusText({ status: "applies-from", statusDate: day("2027-12-02") }), "applies from 2 Dec 2027");
  assert.equal(anchorStatusText({ status: "published", statusDate: day("2026-09-16") }), "published Sep 2026");
  assert.equal(anchorStatusText({ status: "draft" }), "draft");
  assert.equal(anchorStatusText({ status: "not-in-force" }), "not in force");
  // A status that prints no date ignores a statusDate it is given.
  assert.equal(anchorStatusText({ status: "in-force", statusDate: day("2025-01-17") }), "in force");
  for (const status of anchorStatus.options) assert.ok(anchorStatusText({ status, statusDate: AS_AT }).length > 0, status);
});

test("anchorStatusText throws for a dated status without its statusDate, so the build fails instead of printing a gap", () => {
  for (const status of ["applies-from", "published"]) {
    assert.throws(() => anchorStatusText({ status }), new RegExp(`${status} needs its statusDate`));
  }
});

test("anchorChipLabel: the kind label, the status and the as-at month, joined by a spaced middle dot (go-global §5.2)", () => {
  assert.equal(
    anchorChipLabel({ kind: "law", status: "applies-from", statusDate: day("2027-12-02"), asAt: day("2026-10-12") }),
    "Law · applies from 2 Dec 2027 · as at Oct 2026",
  );
  assert.equal(
    anchorChipLabel({ kind: "international-standard", status: "published", statusDate: day("2023-12-18"), asAt: AS_AT }),
    "Standard · published Dec 2023 · as at Oct 2026",
  );
  assert.equal(anchorChipLabel({ kind: "treaty", status: "not-in-force", asAt: AS_AT }), "Law · not in force · as at Oct 2026");
  assert.equal(anchorChipLabel({ kind: "professional-ethics", status: "in-force", asAt: AS_AT }), "Standard · in force · as at Oct 2026");
  assert.equal(
    anchorChipLabel({ kind: "supervisory-principles", status: "published", statusDate: day("2021-03-31"), asAt: AS_AT }),
    "Guidance · published Mar 2021 · as at Oct 2026",
  );
  assert.equal(anchorChipLabel({ kind: "guidance", status: "draft", asAt: AS_AT }), "Guidance · draft · as at Oct 2026");
  // The separator is U+00B7 with a space either side, and every kind takes its ANCHOR_KIND_LABEL.
  for (const kind of anchorKind.options) {
    const parts = anchorChipLabel({ kind, status: "in-force", asAt: AS_AT }).split(" · ");
    assert.deepEqual(parts, [ANCHOR_KIND_LABEL[kind], "in force", "as at Oct 2026"], kind);
  }
});
