// /llms.txt (llmstxt.org): the site summarised for language models and AI assistants. The text is
// llmsTxt() from src/lib/llms-txt.ts, over the shown pages in nav.ts and the published insights,
// each with its region, so an Australian post's line carries its label.
// robots.txt points to it; GitHub Pages serves it as text/plain from the .txt extension.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { isPreview } from "../data/nav.ts";
import { llmsTxt } from "../lib/llms-txt.ts";

export const GET: APIRoute = async ({ site }) => {
  if (!site) throw new Error("llms.txt: astro.config.mjs sets no site, so the page URLs are unknown");
  const posts = await getCollection("insights", ({ data }) => data.draft !== true);
  const body = llmsTxt({
    site,
    preview: isPreview(),
    posts: posts.map((p) => ({ id: p.id, title: p.data.title, description: p.data.description, publishDate: p.data.publishDate, region: p.data.region ?? null })),
  });
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
