// The site's structured data (spec §11.3): the JSON-LD node builders, and the serialiser every
// <script type="application/ld+json"> goes through.
//
// BaseLayout emits one @graph per page, from pageGraph():
// - the Organization, on every page, with one stable @id (https://techsider.com.au/#organization).
//   Home carries it in full, with the WebSite: Google requires the WebSite on the home page and
//   recommends the Organization there. Every other page carries a minimal node (@id, name, url), so
//   the nodes that point to it resolve within their own page;
// - then the nodes the route passes: a Service on each solution page, on /services/ (one per service
//   it lists) and on the Evaluation Partner page; a BlogPosting on each post.
// A page's own node is identified by the page's URL and a fragment ("#service", "#article").
// Breadcrumb and FaqList emit their own BreadcrumbList and FAQPage beside the graph.
// No node names a person (no founder, employee, member or Person author: spec §11.3), and no Service
// carries offers or a price (D4: CI check 11 bans pricing language). The Organization and every
// Service are served "Worldwide"; the full Organization carries the headquarters (SITE.hq, no street
// address), a sales contact point and the site language (go-global §9.2). tests/json-ld.test.mjs
// holds the builders and every built page to this.
import { SITE, shownProfiles } from "../data/nav.ts";

/** The site's origin: Astro.site in a layout or route, a string in a test. */
export type SiteUrl = string | URL;

/** A pointer to a node elsewhere in the same page's JSON-LD. */
export interface IdRef {
  "@id": string;
}

/** One node of a page's @graph. */
export interface JsonLdNode {
  "@type": string;
  "@id": string;
  [property: string]: unknown;
}

export interface JsonLdGraph {
  "@context": "https://schema.org";
  "@graph": JsonLdNode[];
}

/**
 * The topics the Organization names (schema.org knowsAbout). Spec §3.4 keeps "agents" from naming
 * what Techsider builds on mid-market and government pages, and the Organization is on every page,
 * so no topic names agents (the Phase C review's WB-3).
 */
export const KNOWS_ABOUT = [
  "AI Workflow Automation",
  "AI Document Processing",
  "Intelligent Document Processing",
  "Internal Knowledge Assistants",
  "Retrieval-Augmented Generation",
  "AI Implementation",
  "Microsoft 365 Copilot Adoption",
  "AI Evaluation",
  "LLM Evaluation",
];

/** Where Techsider works (go-global §9.2): anywhere, as schema.org text, on the Organization, its contact point and every Service. */
const AREA_SERVED = "Worldwide";
const homeUrl = (site: SiteUrl): string => new URL("/", site).href;

export function organizationId(site: SiteUrl): string {
  return new URL("/#organization", site).href;
}

export function websiteId(site: SiteUrl): string {
  return new URL("/#website", site).href;
}

export function organizationRef(site: SiteUrl): IdRef {
  return { "@id": organizationId(site) };
}

/**
 * The Organization. `full` on Home only: Google recommends placing it on the home page and says it
 * needn't be on every page. Its description is SITE.summary, the one fixed sentence the site uses
 * to say what Techsider is, never a page's meta description (which describes the page, and would
 * give the one organisation a different description on every page). It names no person.
 * legalName appears only once SITE.legalName differs from the name: Google's docs describe it as the
 * registered name, "if applicable and different from the name property", and nav.ts holds the name
 * there; the owner confirmed the registered entity and its ABN (spec §12 item 5). The logo is the carbon square:
 * logo.svg's bone letters would vanish on the white Google shows a logo on.
 * Go-global §9.2: the address is the headquarters (locality, region and country from SITE.hq, never a
 * street address); the contact point is the sales mailbox, for anywhere, in English; sameAs is the
 * ABN Lookup record, then each profile the owner has given a URL (shownProfiles()). No
 * hoursAvailable, numberOfEmployees or offers.
 */
export function organization(site: SiteUrl, full: boolean): JsonLdNode {
  const node: JsonLdNode = { "@type": "Organization", "@id": organizationId(site), name: SITE.name, url: homeUrl(site) };
  if (!full) return node;
  const { identifier, sameAs: abnRecord = [] } = abnProperties(SITE.abn);
  const sameAs = [...abnRecord, ...shownProfiles().map((p) => p.url)];
  return {
    ...node,
    ...(SITE.legalName === SITE.name ? {} : { legalName: SITE.legalName }),
    ...(identifier ? { identifier } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    description: SITE.summary,
    email: SITE.email,
    logo: new URL("/icon-512.png", site).href,
    slogan: `${SITE.slogan} ${SITE.proofLine}`,
    address: { "@type": "PostalAddress", addressLocality: SITE.hq.locality, addressRegion: SITE.hq.region, addressCountry: SITE.hq.country },
    contactPoint: { "@type": "ContactPoint", contactType: "sales", email: SITE.email, areaServed: AREA_SERVED, availableLanguage: SITE.lang },
    areaServed: AREA_SERVED,
    knowsLanguage: SITE.lang,
    knowsAbout: KNOWS_ABOUT,
  };
}

/** The ABN Lookup page for an ABN ("12 345 678 901" → …?abn=12345678901). */
export function abnLookupUrl(abn: string): string {
  return `https://abr.business.gov.au/ABN/View?abn=${abn.replace(/\s/g, "")}`;
}

/**
 * The full Organization's ABN, once SITE.abn is set: an identifier (schema.org PropertyValue) and
 * the public ABN Lookup record in sameAs. Throws on anything but 11 digits, so a typo fails the build.
 */
export function abnProperties(abn: string | null): { identifier?: { "@type": "PropertyValue"; propertyID: "ABN"; value: string }; sameAs?: string[] } {
  if (abn === null) return {};
  if (!/^\d{2} \d{3} \d{3} \d{3}$/.test(abn)) throw new Error(`SITE.abn "${abn}" isn't an ABN as the ABR prints it ("12 345 678 901")`);
  return { identifier: { "@type": "PropertyValue", propertyID: "ABN", value: abn }, sameAs: [abnLookupUrl(abn)] };
}

/**
 * The WebSite, on Home only (Google's site names: name and url, which is the home page). No
 * SearchAction: the site has no search.
 */
export function website(site: SiteUrl): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": websiteId(site),
    name: SITE.name,
    url: homeUrl(site),
    inLanguage: SITE.lang,
    publisher: organizationRef(site),
  };
}

/**
 * A service Techsider provides (schema.org Service; Google shows no rich result for it), described
 * on the page at `path`, whose URL and `#key` make its @id. The name and description are words the
 * page shows (Google's structured-data policies: mark up only what readers can see). Never offers,
 * a price or an offer catalogue (D4).
 */
export function service(site: SiteUrl, input: { path: string; key: string; name: string; description: string }): JsonLdNode {
  const url = new URL(input.path, site).href;
  return {
    "@type": "Service",
    "@id": `${url}#${input.key}`,
    name: input.name,
    description: input.description,
    url,
    provider: organizationRef(site),
    areaServed: AREA_SERVED,
  };
}

/**
 * An insight post (Google's Article docs require nothing, and recommend the headline, the image, the
 * dates and the author). The author and publisher are the Organization, never a person (spec
 * §11.3). The dates are the post's calendar dates, parsed as UTC midnight, as ISO timestamps. The
 * image is the post's social card (src/lib/social-image.ts), root-relative, made absolute here.
 */
export function blogPosting(
  site: SiteUrl,
  input: { path: string; headline: string; description: string; image: string; published: Date; modified: Date | null },
): JsonLdNode {
  const url = new URL(input.path, site).href;
  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: input.headline,
    description: input.description,
    image: new URL(input.image, site).href,
    datePublished: input.published.toISOString(),
    ...(input.modified ? { dateModified: input.modified.toISOString() } : {}),
    inLanguage: SITE.lang,
    url,
    mainEntityOfPage: url,
    author: organizationRef(site),
    publisher: organizationRef(site),
  };
}

/**
 * The @graph of the page at `path`: the Organization (in full, with the WebSite, on Home at "/";
 * minimal elsewhere), then the route's own nodes, in order.
 */
export function pageGraph(site: SiteUrl, path: string, nodes: JsonLdNode[] = []): JsonLdGraph {
  const base = path === "/" ? [organization(site, true), website(site)] : [organization(site, false)];
  return { "@context": "https://schema.org", "@graph": [...base, ...nodes] };
}

// The body of a <script type="application/ld+json"> (spec §11.3 structured data).
// The data is JSON.stringify'd with every "<" written as \u003c, so no string in it (a post
// title, an FAQ answer) can close the script element ("</script>") or open an HTML comment
// ("<!--") inside it. JSON parsers read \u003c back as "<". Every ld+json script uses this;
// tests/json-ld.test.mjs checks that.
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
