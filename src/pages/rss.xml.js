import rss from "@astrojs/rss";
import { getCollection } from "astro:content";

export async function GET(context) {
  const posts = (await getCollection("insights", ({ data }) => data.draft !== true)).sort(
    (a, b) => b.data.publishDate.valueOf() - a.data.publishDate.valueOf(),
  );
  return rss({
    title: "Techsider — Insights",
    description:
      "Field notes on production LLM systems, RAG, agents, and AI data sovereignty for Australian regulated industries.",
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.publishDate,
      description: post.data.description,
      link: `/insights/${post.id}/`,
    })),
  });
}
