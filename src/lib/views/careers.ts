// The careers page view (careers spec §3, §4.6, §9). A pure view builder, like the other page views:
// it never imports astro:content, so node tests run it on the typed data and on edited copies of it.
// It numbers the roles, derives each role's anchor and per-role email subject from the SiteContext's
// address, and fills the apply opening and the applicant notice from SITE, CONTACT and the
// SiteContext. A role list or a token that would put a broken page live throws, so the build fails.
// Copy rules: careers spec §5. This file holds no copy, and its messages quote no watched phrase.
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

/** One role's own section (careers spec §3), with the same anchor and mailto as its card. */
export interface RoleSection extends Omit<RoleCard, "number" | "description"> {
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
    if (!(k in values)) throw new Error(`careersView: unknown token ${m} in ${where} (careers spec §4.6)`);
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
  const storage = /^Not yet confirmed/i.test(row.country) ? "the countries are not yet confirmed" : `its storage country is ${row.country}`;
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
    tags: r.tags,
  });
  const cards: RoleCard[] = items.map((r, i) => ({ number: String(i + 1).padStart(2, "0"), ...common(r), description: r.description }));
  const sections: RoleSection[] = items.map((r) => ({ ...common(r), responsibilities: r.responsibilities, bring: r.bring, terms: r.terms }));

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
