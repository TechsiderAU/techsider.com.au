// The template-preview gallery as an Astro integration (BR-5). The gallery route
// (src/preview/gallery.astro, served at /preview/[...slug]) is injected only when
// TECHSIDER_NAV_PREVIEW=1, which `npm run build:preview` sets. A production build never sees
// the route, so none of the gallery's pages, fixture data, CSS or scripts reach dist/.
import { fileURLToPath } from "node:url";
import { isPreview } from "../data/nav.ts";

/** @returns {import("astro").AstroIntegration} */
export function previewGallery() {
  return {
    name: "techsider:preview-gallery",
    hooks: {
      "astro:config:setup": ({ injectRoute }) => {
        if (!isPreview()) return;
        injectRoute({
          pattern: "/preview/[...slug]",
          entrypoint: fileURLToPath(new URL("./gallery.astro", import.meta.url)),
        });
      },
    },
  };
}
