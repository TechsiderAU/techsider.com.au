// Page <title> and meta description rules (spec §11.3). Titles: `{fullName} | Techsider`, or `AI for
// {shortName} in Australia | Techsider` on industry pages, unique and 60 characters or fewer.
// Descriptions: unique and 150–160 characters, written in nav.ts beside the page's names.
// tests/meta.test.mjs holds every nav.ts page to these rules, and requires a description of every
// live page. Node-importable: nav.ts has no imports.
import { SITE, type PageEntry } from "../data/nav.ts";

/** Spec §11.3: a meta description is 150–160 characters. */
export const DESCRIPTION_LENGTH = { min: 150, max: 160 } as const;

export function pageTitle(entry: PageEntry): string {
  if (entry.path === "/") return `AI Automation Solutions in Australia | ${SITE.name}`;
  if (entry.base === "/industries/") return `AI for ${entry.shortName} in Australia | ${SITE.name}`;
  return `${entry.fullName} | ${SITE.name}`;
}

/**
 * The page's meta description, for BaseLayout's required `description`. A page without one, or
 * with one outside 150–160 characters, fails the build: every route passes this, so no page falls
 * back to shared copy.
 */
export function pageDescription(entry: PageEntry): string {
  const { description, path } = entry;
  if (description === undefined) {
    throw new Error(`nav.ts: ${path} has no description. Every page needs a unique meta description of ${DESCRIPTION_LENGTH.min}–${DESCRIPTION_LENGTH.max} characters (spec §11.3).`);
  }
  if (description !== description.trim()) throw new Error(`nav.ts: ${path}'s description has leading or trailing space.`);
  const n = description.length;
  if (n < DESCRIPTION_LENGTH.min || n > DESCRIPTION_LENGTH.max) {
    throw new Error(`nav.ts: ${path}'s description is ${n} characters; spec §11.3 needs ${DESCRIPTION_LENGTH.min}–${DESCRIPTION_LENGTH.max}.`);
  }
  return description;
}
