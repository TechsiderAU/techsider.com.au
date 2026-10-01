import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { shikiClasses } from "./src/lib/shiki-classes.ts";
import { PAGES } from "./src/data/nav.ts";
import { previewGallery } from "./src/preview/integration.mjs";

// A sitemap lists canonical, indexable URLs only. It leaves out a page whose canonical URL is
// another page's (nav.ts canonicalPath: the ⑤ demo page, whose checker's own page is
// /resources/what-you-already-pay-for/) and a page kept out of search (nav.ts noindex: /contact/sent/).
const NOT_LISTED = new Set(PAGES.filter((p) => p.canonicalPath !== undefined || p.noindex === true).map((p) => p.path));

export default defineConfig({
  site: "https://techsider.com.au",
  // previewGallery() adds the /preview/ template gallery to preview builds only (TECHSIDER_NAV_PREVIEW=1).
  integrations: [previewGallery(), sitemap({ filter: (page) => !NOT_LISTED.has(new URL(page).pathname) })],
  // Code blocks in Markdown: Shiki's css-variables theme, turned into classes that Prose.astro
  // colours with the spec §6.1 tokens, so no code block carries an inline style (WB-8).
  markdown: {
    shikiConfig: { theme: "css-variables", transformers: [shikiClasses()] },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
