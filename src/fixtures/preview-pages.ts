// Pages of the template-preview gallery, rendered by src/preview/gallery.astro. That route exists
// only in a TECHSIDER_NAV_PREVIEW=1 build (npm run build:preview → dist-preview/), because
// src/preview/integration.mjs injects it there and nowhere else: dist/ never contains /preview/.
// Plain TypeScript with no imports, so node tests can import it directly.
//
// Each B2 task that adds a preview page appends it to PREVIEW_PAGES, adds its kind to PreviewKind,
// and adds that kind's specimen to SPECIMENS in src/preview/gallery.astro. SPECIMENS is a Record over
// PreviewKind, so `astro check` fails while a registered kind has no specimen.

/** "gallery": the index. "components": shared-component pages. "templates": one §8 page template each. */
export type PreviewGroup = "gallery" | "components" | "templates";

export type PreviewKind =
  | "index" | "components" | "tabs" | "page-kit"
  | "solution" | "solution-evaluation" | "solution-switch-on"
  | "industry" | "industry-government"
  | "solutions-hub" | "industries-hub";

export interface PreviewPage {
  /** "" is the gallery index at /preview/. Template pages use `templates/<kind>`. */
  slug: string;
  /** Always contains the word "Fixture". */
  title: string;
  kind: PreviewKind;
  group: PreviewGroup;
}

export const PREVIEW_PAGES: PreviewPage[] = [
  { slug: "", title: "Fixture gallery", kind: "index", group: "gallery" },
  { slug: "components", title: "Fixture components", kind: "components", group: "components" },
  { slug: "tabs", title: "Fixture tabs", kind: "tabs", group: "components" },
  { slug: "page-kit", title: "Fixture page kit", kind: "page-kit", group: "components" },
  { slug: "templates/solution", title: "Fixture solution page", kind: "solution", group: "templates" },
  { slug: "templates/solution-evaluation", title: "Fixture evaluation solution page", kind: "solution-evaluation", group: "templates" },
  { slug: "templates/solution-switch-on", title: "Fixture switch-on solution page", kind: "solution-switch-on", group: "templates" },
  { slug: "templates/industry", title: "Fixture industry page", kind: "industry", group: "templates" },
  { slug: "templates/industry-government", title: "Fixture government industry page", kind: "industry-government", group: "templates" },
  { slug: "templates/solutions-hub", title: "Fixture solutions hub", kind: "solutions-hub", group: "templates" },
  { slug: "templates/industries-hub", title: "Fixture industries hub", kind: "industries-hub", group: "templates" },
];

export function previewPath(page: PreviewPage): string {
  return page.slug === "" ? "/preview/" : `/preview/${page.slug}/`;
}
