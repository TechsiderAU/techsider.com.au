import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { PAGES, SITE } from "../data/nav.ts";

// The Insights feed. Its description is the Insights page's own meta description (nav.ts), so the
// feed, the page and search results describe the section in the same words. BaseLayout links it
// from every page's <head>, so feed readers and crawlers find it.
const INSIGHTS = PAGES.find((p) => p.path === "/insights/");

export async function GET(context) {
  const posts = (await getCollection("insights", ({ data }) => data.draft !== true)).sort(
    (a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf(),
  );
  return rss({
    title: "Techsider Insights",
    description: INSIGHTS.description,
    site: context.site,
    customData: `<language>${SITE.lang}</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishDate,
      description: post.data.description,
      link: `/insights/${post.id}/`,
    })),
  });
}
