import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { PAGES } from "./src/data/nav.ts";
import { previewGallery } from "./src/preview/integration.mjs";

// A sitemap lists canonical URLs only, so a page whose canonical URL is another page's (nav.ts
// canonicalPath: the ⑤ demo page, whose checker's own page is /resources/what-you-already-pay-for/)
// is left out.
const NOT_CANONICAL = new Set(PAGES.filter((p) => p.canonicalPath !== undefined).map((p) => p.path));

export default defineConfig({
  site: "https://techsider.com.au",
  // previewGallery() adds the /preview/ template gallery to preview builds only (TECHSIDER_NAV_PREVIEW=1).
  integrations: [previewGallery(), sitemap({ filter: (page) => !NOT_CANONICAL.has(new URL(page).pathname) })],
  vite: {
    plugins: [tailwindcss()],
  },
});
