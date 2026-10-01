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
// carries offers or a price (D4: CI check 11 bans pricing language). tests/json-ld.test.mjs holds the
// builders and every built page to this.
import { SITE } from "../data/nav.ts";

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
export const KNOWS_ABOUT = ["AI Workflow Automation", "AI Document Processing", "Internal Knowledge Assistants", "AI Implementation", "AI Evaluation"];

const AUSTRALIA = { "@type": "Country", name: "Australia" };
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
 * needn't be on every page. It carries no description (a page's meta description describes the
 * page, and would give the one organisation a different description on every page) and no person.
 * legalName appears only once SITE.legalName differs from the name: Google's docs describe it as the
 * registered name, "if applicable and different from the name property", and nav.ts holds the name
 * there, under an owner marker, until the owner confirms the registered entity (spec §12 item 5). The logo is the carbon square:
 * logo.svg's bone letters would vanish on the white Google shows a logo on.
 */
export function organization(site: SiteUrl, full: boolean): JsonLdNode {
  const node: JsonLdNode = { "@type": "Organization", "@id": organizationId(site), name: SITE.name, url: homeUrl(site) };
  if (!full) return node;
  return {
    ...node,
    ...(SITE.legalName === SITE.name ? {} : { legalName: SITE.legalName }),
    email: SITE.email,
    logo: new URL("/icon-512.png", site).href,
    slogan: `${SITE.slogan} ${SITE.proofLine}`,
    areaServed: AUSTRALIA,
    knowsAbout: KNOWS_ABOUT,
  };
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
    inLanguage: "en-AU",
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
    areaServed: AUSTRALIA,
  };
}

/**
 * An insight post (Google's Article docs require nothing, and recommend the headline, the dates and
 * the author). The author and publisher are the Organization, never a person (spec §11.3). The
 * dates are the post's calendar dates, parsed as UTC midnight, as ISO timestamps.
 */
export function blogPosting(
  site: SiteUrl,
  input: { path: string; headline: string; description: string; published: Date; modified: Date | null },
): JsonLdNode {
  const url = new URL(input.path, site).href;
  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: input.headline,
    description: input.description,
    datePublished: input.published.toISOString(),
    ...(input.modified ? { dateModified: input.modified.toISOString() } : {}),
    inLanguage: "en-AU",
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
