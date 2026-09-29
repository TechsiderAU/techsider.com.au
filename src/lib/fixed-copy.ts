// Fixed spec copy (Phase B2 scope ruling 6). Templates render these constants; no fixture and
// no prop can change them. Each line cites the spec section it copies verbatim, and
// tests/fixed-copy.test.mjs pins every value. The MockPanel and SampleReport captions stay literals
// inside those components (B1). Plain TypeScript with no imports, so node tests and the
// content schemas (page-schemas.ts reads HOME_TRUST_QUESTION) can import it directly.

export const PACKAGED_OFFER_DISCLAIMER = "This page describes a packaged offer, not a delivered engagement."; // §4.5
export const NOT_LEGAL_ADVICE = "General information, not legal advice."; // §8.5 block 6, §11.6

/** The kit disclaimer once a practitioner has reviewed the kit (§8.7). `date` is already formatted for display. */
export function kitReviewedNote(date: string): string {
  return `General information, not legal advice. Reviewed by an Australian legal practitioner as at ${date}. Get advice for your circumstances.`;
}

export const KIT_PENDING_NOTE = "General information, not legal advice. This kit is waiting for review by an Australian legal practitioner, so its download isn't published yet.";
export const SCENARIO_LABEL = "Illustrative scenario: not a client engagement"; // §8.5 block 7
export const DEMO_BADGE = "Canned replay · synthetic or public data"; // §8.8
export const CHECKER_BADGE = "Client-side tool · dated vendor data"; // §8.8 ⑤
// §8.8 ④ and §9.1: the ④ demo is a sample report, not a replay (Phase D ledger ruling R4), so its
// badge names what it is in the words of SampleReport's fixed caption (§8.12), not DEMO_BADGE's.
export const REPORT_BADGE = "Sample report · Techsider testing its own demo system";
export const DEMO_CTA = "Want this on your documents, in your environment?"; // §8.8
export const ONSHORE_PILLAR = "Your data stays onshore."; // §3.2
export const PROCESSING_NOTE = "We show you where your data is processed."; // §3.2 scope rule
export const ACCEPTANCE_TEST_LABEL = "Acceptance test (not independent)"; // §4.4
export const HOME_PROMPT = { command: "applied_ai", args: "--region=au" } as const; // §8.1.1
export const HOME_CLOSING = { command: "talk_to_us", args: "--about=<industry>" } as const; // §8.1.11
export const HOME_TRUST_QUESTION = "You're new. Why should we trust you?"; // §8.1.10
export const CONTACT_H1 = "Tell us what you're trying to fix."; // §8.11
export const SERVICES_H1 = "From first use case to a system your team runs."; // §8.6.1
export const MESSAGE_PLACEHOLDER = "What are you trying to fix? Any deployment or data constraints? Please don't include sensitive personal information."; // §10.2
export const ORG_SIZES = ["<20", "20–199", "200–999", "1,000+", "Government"] as const; // §10.2
export const EXTRA_INTERESTS = [{ id: "evaluation-partner", label: "Evaluation Partner" }, { id: "not-sure", label: "Not sure yet" }] as const; // §10.2
export const WORKS_METHOD_LABEL = { "read-only": "Read-only access", import: "File/CSV import", "draft-for-approval": "Drafts a person actions" } as const; // §5
export const DELIVERY_LETTER = { "your-account": "a", managed: "b", "platform-you-license": "c" } as const; // §4.6
