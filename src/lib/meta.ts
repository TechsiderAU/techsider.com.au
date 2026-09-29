// Page <title> rules (spec §11.3): `{fullName} | Techsider`, or `AI for {shortName} in Australia |
// Techsider` on industry pages, unique and 60 characters or fewer. tests/meta.test.mjs holds every
// nav.ts page to both rules. Node-importable: nav.ts has no imports.
import { SITE, type PageEntry } from "../data/nav.ts";

export function pageTitle(entry: PageEntry): string {
  if (entry.path === "/") return `${SITE.name}: ${SITE.slogan} ${SITE.proofLine}`;
  if (entry.base === "/industries/") return `AI for ${entry.shortName} in Australia | ${SITE.name}`;
  return `${entry.fullName} | ${SITE.name}`;
}
