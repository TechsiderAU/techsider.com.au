// The careers page view (careers spec §3, §4.6, §9). A pure view builder, like the other page views:
// it never imports astro:content, so node tests run it on the typed data and on edited copies of it.
// It numbers the roles, derives each role's anchor and per-role email subject from the SiteContext's
// address, and fills the apply opening and the applicant notice from SITE, CONTACT and the
// SiteContext. A role list or a token that would put a broken page live throws, so the build fails.
// Copy rules: careers spec §5. Its only words are the derived phrases spec §3 and §4.6 give (the
// storage clause, the ABN part and the email subject's prefix), and its messages quote no watched
// phrase.
import type { CareersData, ContactData } from "../../content/page-schemas.ts";
import { SITE, hqPlace, slugify } from "../../data/nav.ts";
import type { SiteContext } from "../site.ts";

type CareersRole = CareersData["roles"]["items"][number];

/** One card in the roles grid (careers spec §3). */
export interface RoleCard {
  /** "01", "02"…: two digits, in data order. */
  number: string;
  /** slugify(title): the role section's id. */
  id: string;
  /** `#${id}`: "Read the role". */
  href: string;
  /** "Apply by email": the SiteContext's address, with "Application: <title>" as the encoded subject. */
  mailto: string;
  title: string;
  /** Set only for a role that has one (the Forward Deployed Engineer's "Partner track"). */
  label?: string;
  tagline: string;
  description: string;
  tags: string[];
}

/** One role's own section (careers spec §3, §9), with the same number, anchor and mailto as its card. Its tags show only on the card. */
export interface RoleSection extends Omit<RoleCard, "description" | "tags"> {
  responsibilities: string[];
  bring: string[];
  /** The "How the role works" line. */
  terms: string;
}

export interface CareersView {
  hero: CareersData["hero"];
  firm: CareersData["firm"];
  roles: { heading: string; lede: string; where: string; cards: RoleCard[] };
  sections: RoleSection[];
  /** How to apply, with the opening's {email} filled. */
  apply: {
    heading: string;
    opening: string;
    sendHeading: string;
    send: string[];
    leaveOut: string;
    rightToWork: string;
    nextHeading: string;
    next: string;
  };
  /** The applicant privacy notice, every token filled. */
  notice: { heading: string; paragraphs: [string, string, string] };
}

const TOKEN = /\{([a-zA-Z]+)\}/g;

/** Fills each {token} from `values`; an unknown token, or a brace left after filling, throws. */
function fill(text: string, values: Record<string, string>, where: string): string {
  const out = text.replace(TOKEN, (m, k: string) => {
    if (!Object.hasOwn(values, k)) throw new Error(`careersView: unknown token ${m} in ${where} (careers spec §4.6)`);
    return values[k];
  });
  if (/[{}]/.test(out)) throw new Error(`careersView: an unfilled token is left in ${where} (careers spec §4.6)`);
  return out;
}

/**
 * Careers spec §3, §4.6 and §9. `site.email` is the only address used: SITE.email in a real build,
 * the fixture address in the gallery. The storage clause reads the email provider's row in the
 * sub-processor table the Trust page shows, so the two pages can't disagree.
 */
export function careersView(
  data: CareersData,
  site: SiteContext,
  contact: Pick<ContactData, "emailProvider" | "subProcessors">,
): CareersView {
  const items = data.roles.items;
  if (items.length === 0) throw new Error("careersView: no role is listed, and the page never says coming soon (careers spec §9)");
  const seen = new Set<string>();
  for (const r of items) {
    if (seen.has(r.id)) throw new Error(`careersView: duplicate role id ${r.id} (careers spec §3)`);
    seen.add(r.id);
    if (r.id !== slugify(r.title)) throw new Error(`careersView: role id ${r.id} isn't slugify("${r.title}") (careers spec §3)`);
  }
  if (data.notice.paragraphs.length !== 3) {
    throw new Error(`careersView: the applicant privacy notice has three paragraphs, not ${data.notice.paragraphs.length} (careers spec §4.6)`);
  }

  const row = contact.subProcessors.find((s) => s.entity === contact.emailProvider.name);
  if (!row) throw new Error(`careersView: no sub-processor row for ${contact.emailProvider.name} (careers spec §4.6)`);
  // The clause reads two shapes of the row's country (careers spec §4.6): "Not yet confirmed…", or one
  // named place. Any other shape, such as other unconfirmed wording or a list of places, fails the
  // build, so the owner rewords the row or the clause instead of publishing a sentence that misreads.
  const UNCONFIRMED = /^Not yet confirmed/i;
  const NOT_ONE_PLACE = /confirm|pending|\btb[cd]\b|\bto be\b|[,;\/&]|\b(and|or)\b/i;
  if (!UNCONFIRMED.test(row.country) && NOT_ONE_PLACE.test(row.country)) {
    throw new Error(`careersView: ${row.entity}'s storage country "${row.country}" is neither one place nor "Not yet confirmed…", so the notice can't state it (careers spec §4.6)`);
  }
  const storage = UNCONFIRMED.test(row.country) ? "the countries are not yet confirmed" : `its storage country is ${row.country}`;
  const values: Record<string, string> = {
    legalName: SITE.legalName,
    abnPart: SITE.abn ? ` (ABN ${SITE.abn})` : "",
    hq: hqPlace(),
    provider: contact.emailProvider.name,
    storage,
    email: site.email,
  };

  const common = (r: CareersRole) => ({
    id: r.id,
    href: `#${r.id}`,
    mailto: `mailto:${site.email}?subject=${encodeURIComponent(`Application: ${r.title}`)}`,
    title: r.title,
    ...(r.label !== undefined ? { label: r.label } : {}),
    tagline: r.tagline,
  });
  const numberOf = (i: number) => String(i + 1).padStart(2, "0");
  const cards: RoleCard[] = items.map((r, i) => ({ number: numberOf(i), ...common(r), description: r.description, tags: r.tags }));
  const sections: RoleSection[] = items.map((r, i) => ({ number: numberOf(i), ...common(r), responsibilities: r.responsibilities, bring: r.bring, terms: r.terms }));

  const [p1, p2, p3] = data.notice.paragraphs.map((p, i) => fill(p, values, `notice paragraph ${i + 1}`));
  return {
    hero: data.hero,
    firm: data.firm,
    roles: { heading: data.roles.heading, lede: data.roles.lede, where: data.roles.where, cards },
    sections,
    apply: { ...data.apply, opening: fill(data.apply.opening, values, "the apply opening") },
    notice: { heading: data.notice.heading, paragraphs: [p1, p2, p3] },
  };
}
