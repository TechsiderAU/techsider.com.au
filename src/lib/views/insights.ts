// Insight cards for the Insights index, Home's latest insights (spec §8.1 block 9), industry
// pages and About. A pure view builder (Phase B2 scope ruling 3): it never imports astro:content,
// so node tests run it on fixtures, and pages pass it their collection entries.
import type { z } from "astro/zod";
import { INSIGHT_TYPE_LABEL, type makeInsightSchema } from "../../content/schemas.ts";
import { readingMinutes } from "../readingTime.ts";
import { industryLink, refId, type SiteContext } from "../site.ts";

type InsightData = z.infer<ReturnType<typeof makeInsightSchema>>;

export interface InsightCardView {
  id: string;
  href: string;
  title: string;
  description: string;
  typeLabel: string;
  date: Date;
  minutes: number;
  /** One chip per industry reference: the industry's id (industry pages match cards on it), its short name and its link. */
  industries: { id: string; label: string; href: string | null }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const newestFirst = (a: InsightCardView, b: InsightCardView) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id);

/**
 * One card per published post, newest first (ties by id). Drafts are dropped. Each industry
 * reference becomes a chip labelled with the industry's short name, linking to its page when the
 * page is shown, and keeping the industry's id for matching (WB-15). An unknown industry id throws.
 */
export function insightCards(posts: { id: string; body?: string; data: InsightData }[], site: SiteContext): InsightCardView[] {
  return posts
    .filter((post) => post.data.draft !== true)
    .map((post) => ({
      id: post.id,
      href: `/insights/${post.id}/`,
      title: post.data.title,
      description: post.data.description,
      typeLabel: INSIGHT_TYPE_LABEL[post.data.type],
      date: post.data.publishDate,
      minutes: readingMinutes(post.body),
      industries: post.data.industries.map((ref) => {
        const industry = industryLink(site, refId(ref));
        return { id: industry.id, label: industry.shortName, href: industry.href };
      }),
    }))
    .sort(newestFirst);
}

/**
 * Home's latest insights (spec §8.1 block 9): the newest 3 cards while the newest post is at most
 * `maxAgeDays` whole days old at `now` (the build time), otherwise none, and the section falls back
 * to its "All insights" link. Exactly 45 days old still shows; 46 doesn't.
 */
export function latestInsights(cards: InsightCardView[], now: Date, maxAgeDays = 45): InsightCardView[] {
  const sorted = [...cards].sort(newestFirst);
  if (sorted.length === 0) return [];
  const ageDays = Math.floor((now.getTime() - sorted[0].date.getTime()) / DAY_MS);
  return ageDays > maxAgeDays ? [] : sorted.slice(0, 3);
}
