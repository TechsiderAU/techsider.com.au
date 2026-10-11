import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { shikiClasses } from "./src/lib/shiki-classes.ts";
import { PAGES } from "./src/data/nav.ts";
import { previewGallery } from "./src/preview/integration.mjs";
import { insightLastmod } from "./scripts/sitemap-lastmod.mjs";

// A sitemap lists canonical, indexable URLs only. It leaves out a page whose canonical URL is
// another page's (nav.ts canonicalPath: the ⑤ demo page, whose checker's own page is
// /resources/what-you-already-pay-for/) and a page kept out of search (nav.ts noindex: /contact/sent/).
const NOT_LISTED = new Set(PAGES.filter((p) => p.canonicalPath !== undefined || p.noindex === true).map((p) => p.path));
// <lastmod> on each insight post (its updatedDate, else its publishDate) and on /insights/ (the
// newest of those), so crawlers can tell which posts changed. Other pages carry none: a lastmod
// is only useful while it stays accurate, and their content has no recorded date.
const LASTMOD = insightLastmod();

export default defineConfig({
  site: "https://techsider.com.au",
  // previewGallery() adds the /preview/ template gallery to preview builds only (TECHSIDER_NAV_PREVIEW=1).
  integrations: [previewGallery(), sitemap({
      filter: (page) => !NOT_LISTED.has(new URL(page).pathname),
      serialize: (item) => {
        const lastmod = LASTMOD.get(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    })],
  // Code blocks in Markdown: Shiki's css-variables theme, turned into classes that Prose.astro
  // colours with the spec §6.1 tokens, so no code block carries an inline style (WB-8).
  markdown: {
    shikiConfig: { theme: "css-variables", transformers: [shikiClasses()] },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
