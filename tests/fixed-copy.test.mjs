// The fixed spec copy (Phase B2 scope ruling 6), pinned word for word. Templates render these
// constants and no fixture or prop can change them, so a change to any of them changes every page
// that carries it, and must be made here on purpose.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as copy from "../src/lib/fixed-copy.ts";

test("fixed copy: every constant is the spec's text, word for word", () => {
  assert.equal(copy.PACKAGED_OFFER_DISCLAIMER, "This page describes a packaged offer, not a delivered engagement.");
  assert.equal(copy.NOT_LEGAL_ADVICE, "General information, not legal advice.");
  assert.equal(
    copy.kitReviewedNote("1 September 2026"),
    "General information, not legal advice. Reviewed by an Australian legal practitioner as at 1 September 2026. Get advice for your circumstances.",
  );
  assert.equal(
    copy.KIT_PENDING_NOTE,
    "General information, not legal advice. This kit is waiting for review by an Australian legal practitioner, so its download isn't published yet.",
  );
  assert.equal(copy.SCENARIO_LABEL, "Illustrative scenario: not a client engagement");
  assert.equal(copy.DEMO_BADGE, "Canned replay · synthetic or public data");
  assert.equal(copy.CHECKER_BADGE, "Client-side tool · dated vendor data");
  // Ledger ruling R4: the ④ demo is a sample report, not a replay, so it never carries DEMO_BADGE.
  assert.equal(copy.REPORT_BADGE, "Sample report · Techsider testing its own demo system");
  assert.equal(copy.DEMO_CTA, "Want this on your documents, in your environment?");
  assert.equal(copy.ONSHORE_PILLAR, "Your data stays onshore.");
  assert.equal(copy.PROCESSING_NOTE, "We show you where your data is processed.");
  assert.equal(copy.ACCEPTANCE_TEST_LABEL, "Acceptance test (not independent)");
  assert.deepEqual(copy.HOME_PROMPT, { command: "applied_ai", args: "--region=au" });
  assert.deepEqual(copy.HOME_CLOSING, { command: "talk_to_us", args: "--about=<industry>" });
  assert.equal(copy.HOME_TRUST_QUESTION, "You're new. Why should we trust you?");
  assert.equal(copy.CONTACT_H1, "Tell us what you're trying to fix.");
  assert.equal(copy.SERVICES_H1, "From first use case to a system your team runs.");
  assert.equal(
    copy.MESSAGE_PLACEHOLDER,
    "What are you trying to fix? Any deployment or data constraints? Please don't include sensitive personal information.",
  );
  assert.deepEqual(copy.ORG_SIZES, ["<20", "20–199", "200–999", "1,000+", "Government"]);
  assert.deepEqual(copy.EXTRA_INTERESTS, [{ id: "evaluation-partner", label: "Evaluation Partner" }, { id: "not-sure", label: "Not sure yet" }]);
  assert.deepEqual(copy.WORKS_METHOD_LABEL, { "read-only": "Read-only access", import: "File/CSV import", "draft-for-approval": "Drafts a person actions" });
  assert.deepEqual(copy.DELIVERY_LETTER, { "your-account": "a", managed: "b", "platform-you-license": "c" });
});

test("fixed copy: the module exports exactly the blueprint's constants", () => {
  assert.deepEqual(Object.keys(copy).sort(), [
    "ACCEPTANCE_TEST_LABEL", "CHECKER_BADGE", "CONTACT_H1", "DELIVERY_LETTER", "DEMO_BADGE", "DEMO_CTA",
    "EXTRA_INTERESTS", "HOME_CLOSING", "HOME_PROMPT", "HOME_TRUST_QUESTION", "KIT_PENDING_NOTE", "MESSAGE_PLACEHOLDER",
    "NOT_LEGAL_ADVICE", "ONSHORE_PILLAR", "ORG_SIZES", "PACKAGED_OFFER_DISCLAIMER", "PROCESSING_NOTE",
    "REPORT_BADGE", "SCENARIO_LABEL", "SERVICES_H1", "WORKS_METHOD_LABEL", "kitReviewedNote",
  ]);
  // The pending note starts with the same disclaimer as the reviewed one; only the review state differs.
  assert.ok(copy.KIT_PENDING_NOTE.startsWith(`${copy.NOT_LEGAL_ADVICE} `));
  assert.ok(copy.kitReviewedNote("x").startsWith(`${copy.NOT_LEGAL_ADVICE} `));
});
