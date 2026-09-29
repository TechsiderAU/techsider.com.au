// View builders for the company pages (spec §8.11): what the Trust page and the Legal hub may show.
// Pure TypeScript with no SiteContext: node tests run it on the page fixtures, and a Phase C route
// passes it the typed data (src/data/trust.ts) or the documents mapped to their page hrefs.
import type { TrustData } from "../../content/page-schemas.ts";

type PartBTerm = TrustData["partB"][number];
type TrustAnswer = TrustData["faq"][number];

export interface TrustView {
  /** Part B: the confirmed terms only, in order. Empty when none is confirmed, and #part-b is then left out. */
  terms: PartBTerm[];
  /** The questionnaire answers the page shows: every Part A answer, and each Part B answer whose term is confirmed. */
  faq: TrustAnswer[];
}

/**
 * Spec §8.11 and §12 item 2: a Part B commitment is published only once the owner confirms it is
 * in the standard terms. That holds for the questionnaire as well as for Part B itself, so a Part B
 * answer shows only while the term it rests on (trustData requires `term`) is confirmed.
 */
export function trustView(trust: TrustData): TrustView {
  const terms = trust.partB.filter((term) => term.confirmed);
  const confirmed = new Set(terms.map((term) => term.id));
  const faq = trust.faq.filter((f) => f.part === "A" || (f.term !== undefined && confirmed.has(f.term)));
  return { terms, faq };
}

export interface LegalDoc {
  title: string;
  summary: string;
  /** The document page's href from the SiteContext: null while the page isn't shown. */
  href: string | null;
  lastUpdated: Date;
}

/**
 * The documents the Legal hub lists: those whose page is shown, in order (spec §8.11 "a hub listing
 * only the documents that exist", §7.1: nothing "coming soon"). A hub with none has nothing to list,
 * so it fails the build rather than render an empty "Documents" section.
 */
export function legalHubDocs(docs: readonly LegalDoc[]): (LegalDoc & { href: string })[] {
  const shown = docs.filter((doc): doc is LegalDoc & { href: string } => doc.href !== null);
  if (shown.length === 0) {
    throw new Error("LegalHubTemplate: no legal document's page is shown, so the hub has nothing to list. Show /legal/ only once a document's page is shown.");
  }
  return shown;
}
