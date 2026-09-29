import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { previewGallery } from "./src/preview/integration.mjs";

export default defineConfig({
  site: "https://techsider.com.au",
  // previewGallery() adds the /preview/ template gallery to preview builds only (TECHSIDER_NAV_PREVIEW=1).
  integrations: [previewGallery(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
