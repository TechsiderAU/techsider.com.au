// An insight post page (spec §8.9): the page title, breadcrumb, meta dates, industry chips, the
// §10.1 contextual closing CTA and the BlogPosting JSON-LD (§11.3). A pure view builder (Phase B2
// scope ruling 3): it never imports astro:content, so node tests run it on plain posts, and the
// route passes it its collection entry. Every link comes from the SiteContext, so a live post never
// links to a page that isn't shown: while /contact/ is planned, the closing CTA is a mailto.
import { SITE } from "../../data/nav.ts";
import { SCENARIO_LABEL } from "../fixed-copy.ts";
import { blogPosting, type JsonLdNode } from "../json-ld.ts";
import { socialImage } from "../social-image.ts";
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

export interface PostView {
  /** Title, description, type label, date, reading time, industry chips and href, as on the index. */
  card: InsightCardView;
  /**
   * The document <title>: `${seoTitle} | Techsider`, or the title without its closing full stop (a
   * sentence-case H1 reads as a sentence; a search result's title doesn't).
   */
  metaTitle: string;
  /** The frontmatter updatedDate, shown as "Updated {date}". */
  updated: Date | null;
  /** Home › Insights › the post (crumbs() leaves out a hub that isn't shown). */
  breadcrumb: Link[];
  /** SCENARIO_LABEL when the post is marked illustrative (spec §9.3), else null. */
  illustrativeLabel: string | null;
  /** Spec §10.1: the first solution ref, else the first industry ref, else plain "Talk to us". */
  closing: PostClosing;
  /** The shown pages of the solutions the post refers to, in its order: links into the offer. */
  solutions: Link[];
  /**
   * Up to RELATED_COUNT other published posts, most alike first (shared solution and industry refs
   * over all the refs the two name, a solution counting double), then newest, then by id. Internal links between posts let
   * readers, crawlers and AI assistants find the rest of a topic from any post in it.
   */
  related: InsightCardView[];
  /**
   * Spec §11.3: the BlogPosting node (src/lib/json-ld.ts blogPosting()), authored and published by
   * the Organization, never a person. PostLayout puts it in BaseLayout's @graph.
   */
  jsonLd: JsonLdNode;
}

/** How many related posts a post lists. */
export const RELATED_COUNT = 3;

/**
 * How alike two posts are: shared refs over all refs either names (a solution counts double), so
 * a post that names many solutions isn't related to everything. 0 when neither names any.
 */
function similarity(a: InsightPost, b: InsightPost): number {
  const overlap = (x: string[], y: string[]) => {
    const ys = new Set(y);
    const shared = x.filter((id) => ys.has(id)).length;
    return { shared, union: new Set([...x, ...y]).size };
  };
  const sol = overlap(a.data.solutions.map(refId), b.data.solutions.map(refId));
  const ind = overlap(a.data.industries.map(refId), b.data.industries.map(refId));
  const union = 2 * sol.union + ind.union;
  return union === 0 ? 0 : (2 * sol.shared + ind.shared) / union;
}

function relatedPosts(post: InsightPost, others: InsightPost[], site: SiteContext): InsightCardView[] {
  const scores = new Map(others.map((p) => [p.id, similarity(post, p)]));
  return insightCards(others.filter((p) => p.id !== post.id), site)
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id))
    .slice(0, RELATED_COUNT);
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
 * absolute URLs; `posts` is every post in the collection, which the related posts come from (drafts
 * are dropped). Throws on a draft (drafts have no page) and on an unknown solution or industry ref.
 */
export function postView(input: { post: InsightPost; site: SiteContext; siteUrl: string | URL; posts?: InsightPost[] }): PostView {
  const { post, site, siteUrl, posts = [] } = input;
  const [card] = insightCards([post], site);
  if (card === undefined) throw new Error(`postView(): "${post.id}" is a draft, and a draft has no page`);
  const { data } = post;
  return {
    card,
    metaTitle: `${data.seoTitle ?? card.title.replace(/\.$/, "")} | ${SITE.name}`,
    updated: data.updatedDate ?? null,
    breadcrumb: crumbs(site, ["insights", { label: card.title, path: card.href }]),
    illustrativeLabel: data.illustrative ? SCENARIO_LABEL : null,
    closing: closingFor(site, data.solutions.map(refId), data.industries.map(refId)),
    solutions: data.solutions
      .map((ref) => solutionLink(site, refId(ref)))
      .flatMap((s) => (s.href === null ? [] : [{ label: s.fullName, href: s.href }])),
    related: relatedPosts(post, posts, site),
    jsonLd: blogPosting(siteUrl, {
      path: card.href,
      headline: card.title,
      description: card.description,
      image: socialImage(card.href).path,
      published: card.date,
      modified: data.updatedDate ?? null,
    }),
  };
}
