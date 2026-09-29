// The links a page template may render (Phase B2 scope ruling 4: links never dangle).
// siteContext() joins src/data/nav.ts to the pages a build shows: a page that isn't shown
// (planned, in a production build) gets `href: null`, and templates render a null href as
// plain text, never as <a>. src/fixtures/site.ts builds the gallery's SiteContext in the same
// shape. Node-importable: nav.ts and fixed-copy.ts have no imports.
import { PAGES, SITE, footerLabel, isShown, type PageEntry } from "../data/nav.ts";
import { EXTRA_INTERESTS } from "./fixed-copy.ts";

export interface Link {
  label: string;
  href: string;
}

export interface SolutionLink {
  /** The nav slug, e.g. "document-registers". */
  id: string;
  /** "①".."⑤" from CIRCLED, in spec §4.1 order. */
  number: string;
  shortName: string;
  fullName: string;
  oneLiner: string;
  /** Always the page path. */
  path: string;
  /** The path when the page is shown, else null. */
  href: string | null;
}

export interface IndustryLink {
  id: string;
  shortName: string;
  fullName: string;
  footerLabel: string;
  path: string;
  href: string | null;
}

export type PageKey =
  | "home" | "solutions" | "industries" | "services" | "evaluationPartner"
  | "resources" | "insights" | "demos" | "safeUseKits" | "payFor" | "evaluationMethod"
  | "about" | "trust" | "legal" | "privacy" | "websiteTerms" | "contact";

export interface PageLink {
  key: PageKey;
  label: string;
  oneLiner?: string;
  path: string;
  href: string | null;
}

export interface ContactQuery {
  interest?: string;
  industry?: string;
}

export interface SiteContext {
  /** All 5, in spec §4.1 order. */
  solutions: SolutionLink[];
  /** All 9, in spec §5 order. */
  industries: IndustryLink[];
  /** Insights, Demos, Safe-Use Kits, What you already pay for, Evaluation method (nav order). */
  resources: PageLink[];
  /** href is null when the page isn't shown. Throws on an unknown key. */
  page(key: PageKey): PageLink;
  /** That solution's demo page when shown, else null. Throws on an unknown solution id. */
  demo(solutionId: string): string | null;
  /** "/contact/?interest=x" | "/contact/?industry=y" | "/contact/" while /contact/ is shown, else `mailto:${email}`. */
  contact(query?: ContactQuery): string;
  email: string;
}

export const CIRCLED = ["①", "②", "③", "④", "⑤"] as const;

/** A reference field is a plain id (fixtures, plainRef) or Astro's `{ id, collection }` (reference()). */
export function refId(ref: string | { id: string }): string {
  return typeof ref === "string" ? ref : ref.id;
}

// Each page key names one permanent nav path (spec §7.1); siteContext() throws if nav.ts loses one.
const PAGE_PATHS: Record<PageKey, string> = {
  home: "/",
  solutions: "/solutions/",
  industries: "/industries/",
  services: "/services/",
  evaluationPartner: "/services/evaluation-partner/",
  resources: "/resources/",
  insights: "/insights/",
  demos: "/demos/",
  safeUseKits: "/resources/safe-use-kits/",
  payFor: "/resources/what-you-already-pay-for/",
  evaluationMethod: "/resources/evaluation-method/",
  about: "/about/",
  trust: "/trust/",
  legal: "/legal/",
  privacy: "/legal/privacy/",
  websiteTerms: "/legal/website-terms/",
  contact: "/contact/",
};
const RESOURCE_KEYS: PageKey[] = ["insights", "demos", "safeUseKits", "payFor", "evaluationMethod"];

/**
 * The query string of a contact link (spec §10.1): at most one key, and `interest` wins over
 * `industry`. An interest is a solution id, "evaluation-partner" or "not-sure"; an industry is an
 * industry id. Anything else throws, so a typo fails the build instead of preselecting nothing.
 */
export function contactQuery(site: Pick<SiteContext, "solutions" | "industries">, query: ContactQuery = {}): string {
  const { interest, industry } = query;
  if (interest !== undefined && !site.solutions.some((s) => s.id === interest) && !EXTRA_INTERESTS.some((e) => e.id === interest)) {
    throw new Error(`contact(): unknown interest "${interest}"`);
  }
  if (industry !== undefined && !site.industries.some((i) => i.id === industry)) {
    throw new Error(`contact(): unknown industry "${industry}"`);
  }
  if (interest !== undefined) return `?interest=${encodeURIComponent(interest)}`;
  if (industry !== undefined) return `?industry=${encodeURIComponent(industry)}`;
  return "";
}

function entryAt(path: string): PageEntry {
  const entry = PAGES.find((p) => p.path === path);
  if (!entry) throw new Error(`nav.ts has no page at ${path}`);
  return entry;
}

/** The SiteContext of a build, from nav.ts. Pass isPreview(): true shows planned pages too. */
export function siteContext(preview: boolean): SiteContext {
  const hrefOf = (p: PageEntry) => (isShown(p, preview) ? p.path : null);
  const idOf = (p: PageEntry) => p.path.slice(p.base.length, -1);

  const solutionEntries = PAGES.filter((p) => p.base === "/solutions/");
  if (solutionEntries.length !== CIRCLED.length) {
    throw new Error(`nav.ts lists ${solutionEntries.length} solutions; CIRCLED numbers ${CIRCLED.length}`);
  }
  const solutions: SolutionLink[] = solutionEntries.map((p, i) => {
    if (!p.oneLiner) throw new Error(`nav.ts: ${p.path} has no oneLiner`);
    return { id: idOf(p), number: CIRCLED[i], shortName: p.shortName, fullName: p.fullName, oneLiner: p.oneLiner, path: p.path, href: hrefOf(p) };
  });
  const industries: IndustryLink[] = PAGES.filter((p) => p.base === "/industries/").map((p) => ({
    id: idOf(p), shortName: p.shortName, fullName: p.fullName, footerLabel: footerLabel(p), path: p.path, href: hrefOf(p),
  }));

  const pages = new Map<PageKey, PageLink>();
  for (const [key, path] of Object.entries(PAGE_PATHS) as [PageKey, string][]) {
    const p = entryAt(path);
    const link: PageLink = { key, label: p.shortName, path: p.path, href: hrefOf(p) };
    if (p.oneLiner) link.oneLiner = p.oneLiner;
    pages.set(key, link);
  }
  const page = (key: PageKey): PageLink => {
    const link = pages.get(key);
    if (!link) throw new Error(`Unknown page key "${key}"`);
    return link;
  };

  return {
    solutions,
    industries,
    resources: RESOURCE_KEYS.map(page),
    page,
    demo(solutionId) {
      if (!solutions.some((s) => s.id === solutionId)) throw new Error(`demo(): unknown solution "${solutionId}"`);
      return hrefOf(entryAt(`/demos/${solutionId}/`));
    },
    contact(query) {
      const q = contactQuery({ solutions, industries }, query);
      const href = page("contact").href;
      return href === null ? `mailto:${SITE.email}` : `${href}${q}`;
    },
    email: SITE.email,
  };
}

export function solutionLink(site: SiteContext, id: string): SolutionLink {
  const link = site.solutions.find((s) => s.id === id);
  if (!link) throw new Error(`Unknown solution id "${id}"`);
  return link;
}

export function industryLink(site: SiteContext, id: string): IndustryLink {
  const link = site.industries.find((i) => i.id === id);
  if (!link) throw new Error(`Unknown industry id "${id}"`);
  return link;
}

/**
 * A breadcrumb trail for <Breadcrumb items>. It always starts with Home ("/"), so a "home" key
 * adds nothing. A PageKey whose page isn't shown is left out, except as the last item: that is
 * the current page, which is being rendered, so it falls back to its path. A { label, path }
 * item is used as it stands.
 */
export function crumbs(site: SiteContext, trail: (PageKey | { label: string; path: string })[]): Link[] {
  const out: Link[] = [{ label: "Home", href: "/" }];
  trail.forEach((item, i) => {
    if (typeof item !== "string") {
      out.push({ label: item.label, href: item.path });
      return;
    }
    if (item === "home") return;
    const link = site.page(item);
    if (link.href !== null) out.push({ label: link.label, href: link.href });
    else if (i === trail.length - 1) out.push({ label: link.label, href: link.path });
  });
  return out;
}
