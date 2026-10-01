// The enquiry form's fields, its error copy and the pure logic behind its JavaScript (spec §10.2).
// ContactForm.astro renders the fields and writes the copy into the markup, page-schemas.ts keeps a
// provider's own field names clear of the fields, src/scripts/contact-form.ts runs the logic in the
// browser, and tests import it directly. The script reads the copy from the markup rather than
// importing it, so it stays under Astro's 4 KB inline limit: a larger script would be emitted to
// dist/_astro/ even where no page renders the form. Plain TypeScript with no imports.

/** The fields ContactForm posts, in form order (spec §10.2). A provider's own fields never reuse these names. */
export const ENQUIRY_FIELDS = ["name", "email", "organisation", "industry", "size", "interest", "message", "consent"] as const;
export type EnquiryField = (typeof ENQUIRY_FIELDS)[number];

/** The longest message the form takes (spec §10.2: up to 1,000 characters). */
export const MESSAGE_MAX = 1000;

/**
 * What each field's error line says: `missing` while it is empty, `invalid` when its answer is
 * wrong. A field with no `invalid` line uses its `missing` line for both.
 */
export const FIELD_ERRORS: Record<EnquiryField, { missing: string; invalid?: string }> = {
  name: { missing: "Enter your name." },
  email: { missing: "Enter your work email address.", invalid: "Enter an email address like name@example.com." },
  organisation: { missing: "Enter your organisation's name." },
  industry: { missing: "Choose your industry, or Other." },
  size: { missing: "Choose your organisation's size." },
  interest: { missing: "Choose what you'd like to talk about, or Not sure yet." },
  message: { missing: "Tell us what you're trying to fix.", invalid: `Keep your message to ${MESSAGE_MAX.toLocaleString("en-AU")} characters or fewer.` },
  consent: { missing: "Tick the box to agree to how we handle your enquiry." },
};

/** Client validation or a supported 422 field rejection proves non-delivery. Server errors,
 * network/CORS failures and timeouts leave delivery uncertain, so advise email without a retry. */
export const FORM_MESSAGES = {
  invalid: "Your enquiry wasn't sent. Check these answers:",
  sending: "Sending your enquiry…",
  unconfirmed: "Your enquiry may not have been sent. Email us at the address on this page instead of sending it again.",
} as const;

export type Problem = "missing" | "invalid";

/** A control's problem as the browser's constraint validation sees it, or null when it is valid. */
export function problemOf(validity: Pick<ValidityState, "valid" | "valueMissing">): Problem | null {
  if (validity.valid) return null;
  return validity.valueMissing ? "missing" : "invalid";
}

/** The line an error shows: for a wrong answer its `invalid` line when it has one, otherwise its `missing` line. */
export function errorLine(copy: { missing: string; invalid?: string }, problem: Problem): string {
  return problem === "invalid" ? (copy.invalid ?? copy.missing) : copy.missing;
}

export type Preselectable = "industry" | "interest";

/**
 * The industry and interest a /contact/ link preselects (spec §10.1), read from its query string.
 * Only a value its select offers counts, so ?interest=pricing preselects nothing.
 */
export function preselection(search: string, offered: Record<Preselectable, readonly string[]>): Partial<Record<Preselectable, string>> {
  const params = new URLSearchParams(search);
  const chosen: Partial<Record<Preselectable, string>> = {};
  for (const key of ["industry", "interest"] as const) {
    const value = params.get(key);
    if (value !== null && value !== "" && offered[key].includes(value)) chosen[key] = value;
  }
  return chosen;
}

/**
 * Fields named by the local mock's supported 422 validation shape: an `errors` list of
 * `{ field, message }` or an object keyed by field. This does not verify any real provider's
 * response contract; the chosen provider must be checked before connecting it.
 */
export function rejectedFields(body: unknown): EnquiryField[] {
  if (typeof body !== "object" || body === null) return [];
  const errors = (body as { errors?: unknown }).errors;
  const named = new Set<string>();
  if (Array.isArray(errors)) {
    for (const e of errors) {
      const field = typeof e === "object" && e !== null ? (e as { field?: unknown }).field : undefined;
      if (typeof field === "string") named.add(field);
    }
  } else if (typeof errors === "object" && errors !== null) {
    for (const key of Object.keys(errors)) named.add(key);
  }
  return ENQUIRY_FIELDS.filter((f) => named.has(f));
}
