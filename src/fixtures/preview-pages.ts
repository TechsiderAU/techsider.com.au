// Pages of the template-preview gallery, rendered by src/pages/preview/[...slug].astro.
// Only a TECHSIDER_NAV_PREVIEW=1 build (npm run build:preview → dist-preview/) generates them;
// the production build returns no paths, so dist/ never contains /preview/.
// Plain TypeScript with no imports, so node tests can import it directly.

export type PreviewKind = "index" | "components" | "tabs";

export interface PreviewPage {
  /** "" is the gallery index at /preview/. */
  slug: string;
  title: string;
  kind: PreviewKind;
}

export const PREVIEW_PAGES: PreviewPage[] = [
  { slug: "", title: "Fixture gallery", kind: "index" },
  { slug: "components", title: "Fixture components", kind: "components" },
  { slug: "tabs", title: "Fixture tabs", kind: "tabs" },
];

export function previewPath(page: PreviewPage): string {
  return page.slug === "" ? "/preview/" : `/preview/${page.slug}/`;
}
