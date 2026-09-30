// Route helpers for src/pages/ (Phase C). A singleton page is a `[...page].astro` file in its own
// directory, built only while nav.ts shows it; a collection page (`[id].astro`) builds the shown ids
// under its hub. Both read isPreview() at build time, so putting a page live is its one-line status
// change in nav.ts, and a planned page has no file in production for anything to link to.
// Node-importable: it imports only nav.ts, which has no imports.
import { PAGES, isPreview, isShown, type PageEntry } from "../data/nav.ts";

/** The nav entry at `path`; throws on an unknown path. */
export function pageAt(path: string): PageEntry {
  const entry = PAGES.find((p) => p.path === path);
  if (!entry) throw new Error(`nav.ts has no page at ${path}`);
  return entry;
}

/**
 * getStaticPaths for a singleton page at `path`, served by a `[...page].astro` file in that
 * directory: [{ params: { page: undefined } }] when the page is shown, else []. An undefined rest
 * parameter builds the directory's own index.html; an empty list builds nothing.
 */
export function singletonPaths(path: string): { params: { page: undefined } }[] {
  return isShown(pageAt(path), isPreview()) ? [{ params: { page: undefined } }] : [];
}

/**
 * getStaticPaths for a gated singleton page, one that may only go live once `open` holds (spec
 * §10.2: /contact/sent/ needs the contact form's endpoint): singletonPaths(path), except that the
 * build fails, naming `why`, while nav.ts has the page live and `open` is false. The preview build
 * shows planned pages, so it builds the page either way.
 */
export function gatedPaths(path: string, open: boolean, why: string): { params: { page: undefined } }[] {
  if (pageAt(path).status === "live" && !open) throw new Error(`nav.ts: ${path} is live, but ${why}`);
  return singletonPaths(path);
}

/**
 * Ids (last path segment) of the shown pages directly under `base` (e.g. "/solutions/"), in nav
 * order. Throws when no nav page sits under `base`, so a mistyped base fails the build instead of
 * building nothing.
 */
export function shownIds(base: string): string[] {
  const under = PAGES.filter((p) => p.base === base && p.path !== base);
  if (under.length === 0) throw new Error(`nav.ts has no page under ${base}`);
  const preview = isPreview();
  return under.filter((p) => isShown(p, preview)).map((p) => p.path.slice(base.length).replace(/\/$/, ""));
}
