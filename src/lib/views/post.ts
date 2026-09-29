// An insight post page (spec §8.9): the page title, breadcrumb, meta dates, industry chips, the
// §10.1 contextual closing CTA and the BlogPosting JSON-LD (§11.3). A pure view builder (Phase B2
// scope ruling 3): it never imports astro:content, so node tests run it on plain posts, and the
// route passes it its collection entry. Every link comes from the SiteContext, so a live post never
// links to a page that isn't shown: while /contact/ is planned, the closing CTA is a mailto.
import { SITE } from "../../data/nav.ts";
import { SCENARIO_LABEL } from "../fixed-copy.ts";
import { crumbs, industryLink, refId, solutionLink, type Link, type SiteContext } from "../site.ts";
import { insightCards, type InsightCardView } from "./insights.ts";

/** A post as insightCards() reads it: an insights collection entry, or a plain post in a test. */
export type InsightPost = Parameters<typeof insightCards>[0][number];

/** The closing terminal-prompt block (PromptBlock props). A post with no refs has no `--about`. */
export interface PostClosing {
  command: "talk_to_us";
  args?: string;
  label: string;
  href: string;
}

export interface OrganizationRef {
  "@type": "Organization";
  name: string;
  url: string;
}

export interface BlogPostingJsonLd {
  "@context": "https://schema.org";
  "@type": "BlogPosting";
  headline: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  inLanguage: "en-AU";
  url: string;
  mainEntityOfPage: string;
  author: OrganizationRef;
  publisher: OrganizationRef;
}

export interface PostView {
  /** Title, description, type label, date, reading time, industry chips and href, as on the index. */
  card: InsightCardView;
  /** The document <title>: `${title} | Techsider`. */
  metaTitle: string;
  /** The frontmatter updatedDate, shown as "Updated {date}". */
  updated: Date | null;
  /** Home › Insights › the post (crumbs() leaves out a hub that isn't shown). */
  breadcrumb: Link[];
  /** SCENARIO_LABEL when the post is marked illustrative (spec §9.3), else null. */
  illustrativeLabel: string | null;
  /** Spec §10.1: the first solution ref, else the first industry ref, else plain "Talk to us". */
  closing: PostClosing;
  /** Spec §11.3: BlogPosting, authored and published by the Organization, never a person. */
  jsonLd: BlogPostingJsonLd;
}

function closingFor(site: SiteContext, solutions: string[], industries: string[]): PostClosing {
  const [solutionId] = solutions;
  if (solutionId !== undefined) {
    const solution = solutionLink(site, solutionId);
    return {
      command: "talk_to_us",
      args: `--about=${solution.id}`,
      label: `Talk to us about ${solution.shortName}`,
      href: site.contact({ interest: solution.id }),
    };
  }
  const [industryId] = industries;
  if (industryId !== undefined) {
    const industry = industryLink(site, industryId);
    return {
      command: "talk_to_us",
      args: `--about=${industry.id}`,
      label: `Talk to us about AI for ${industry.shortName.toLowerCase()}`,
      href: site.contact({ industry: industry.id }),
    };
  }
  return { command: "talk_to_us", label: "Talk to us", href: site.contact() };
}

/**
 * The view of one published post. `siteUrl` is the site's origin (Astro.site), for the JSON-LD's
 * absolute URLs. Throws on a draft (drafts have no page) and on an unknown solution or industry ref.
 */
export function postView(input: { post: InsightPost; site: SiteContext; siteUrl: string | URL }): PostView {
  const { post, site, siteUrl } = input;
  const [card] = insightCards([post], site);
  if (card === undefined) throw new Error(`postView(): "${post.id}" is a draft, and a draft has no page`);
  const { data } = post;
  const url = new URL(card.href, siteUrl).href;
  const organization: OrganizationRef = { "@type": "Organization", name: SITE.name, url: new URL(siteUrl).origin };
  return {
    card,
    metaTitle: `${card.title} | ${SITE.name}`,
    updated: data.updatedDate ?? null,
    breadcrumb: crumbs(site, ["insights", { label: card.title, path: card.href }]),
    illustrativeLabel: data.illustrative ? SCENARIO_LABEL : null,
    closing: closingFor(site, data.solutions.map(refId), data.industries.map(refId)),
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: card.title,
      description: card.description,
      datePublished: card.date.toISOString(),
      ...(data.updatedDate ? { dateModified: data.updatedDate.toISOString() } : {}),
      inLanguage: "en-AU",
      url,
      mainEntityOfPage: url,
      author: organization,
      publisher: organization,
    },
  };
}
