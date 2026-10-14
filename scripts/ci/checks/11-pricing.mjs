// Spec §11.5 check 11 (D4): no pricing in offer copy. Check 04's §3.5 pricing list
// (including "from $<n>", in any currency it knows) and any currency figure fail in:
// - the offer sources: src/content/solutions/, src/content/kits/ and src/data/demos/
//   (every file but README.md and dotfiles), src/data/services.ts and src/data/contact.ts;
// - the visible text of the built offer pages: /, /solutions/**, /services/** (with
//   Evaluation Partner) and /contact/**, and, in the preview build, the gallery's templates
//   of those pages (WB-11): home*, solution*, services, evaluation-partner, contact* and sent.
// Regulatory JSON, src/data/platform-ai.json and insights are out of scope. Exceptions
// are check 04's: src/data/banned-phrase-exceptions.json, matched the same way.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { htmlFiles, listFiles, loadExceptions, readText, relPath, result, visibleText } from "../lib.mjs";
import { EXCEPTIONS_FILE, PRICING, scan } from "./04-banned-phrases.mjs";

export const NAME = "11-pricing";
/**
 * A currency figure (go-global §10.2 widens it beyond dollars): `$`, `A$` or `AU$` (so US$, NZ$
 * and S$ too), `€` or `£` before a digit; USD, EUR, GBP or AUD before a digit, with or without a
 * space; or a number ending in a digit and then USD, EUR, GBP or AUD ("1,200 EUR", but not
 * "2028, EUR" or "1689 EUR-Lex"). The lookbehinds leave what PRICING's "from $<n>" catches
 * ("from €9", "from NZ$9", "from USD 9", "from AUD 9") to it, and a number already reported by
 * its symbol ("$900 USD") to that, so each figure is reported once; AUD takes the lookbehind USD,
 * EUR and GBP have (final review F33). Bare currency stays out of PRICING, which check 04 applies
 * site-wide: insights and regulatory data may cite third-party amounts.
 */
export const CURRENCY = {
  label: "currency figure",
  category: "currency figure (D4)",
  re: /(?<!\bfrom\s+(?:AU?|US|NZ|S)?)(?:(?:\bAU?)?\$|[€£])\s?\d|(?<!\bfrom\s+)\b(?:USD|EUR|GBP|AUD)\s\d|\b(?:USD|EUR|GBP|AUD)\d|(?<![\d,.]|[$€£]\s?)\d(?:[\d,.]*\d)?\s?(?:USD|EUR|GBP|AUD)\b(?![-\u2010\u2011]\w)/gi,
};
export const OFFER_RULES = [...PRICING, CURRENCY];
export const OFFER_DIRS = ["src/content/solutions", "src/content/kits", "src/data/demos"];
export const OFFER_FILES = ["src/data/services.ts", "src/data/contact.ts"];
export const OFFER_PAGES = /^(index\.html|(solutions|services|contact)\/.+\.html)$/;
/** The gallery's offer templates, which only the preview build has: the same rule as the pages they preview. */
export const GALLERY_OFFER_PAGES = /^preview\/templates\/(home[a-z-]*|solutions?[a-z-]*|services|evaluation-partner|contact[a-z-]*|sent)\/index\.html$/;
const NOT_COPY = /(^|\/)(README\.md|\.[^/]*)$/; // notes for editors, and dotfiles

export async function run({ root, dist }) {
  const r = result();
  const exceptions = loadExceptions(root, EXCEPTIONS_FILE, "phrase", r);
  const sources = [
    ...OFFER_DIRS.flatMap((dir) => listFiles(join(root, dir), (rel) => !NOT_COPY.test(rel))),
    ...OFFER_FILES.map((file) => join(root, file)).filter((file) => existsSync(file)),
  ];
  for (const file of sources) {
    scan(readText(file), relPath(root, file), exceptions, r, { lines: true, phrases: OFFER_RULES });
  }
  const out = resolve(dist);
  const pages = htmlFiles(out);
  if (pages.length === 0) r.add("error", `${dist}: no built HTML found (run the build first)`);
  for (const file of pages) {
    const page = relPath(out, file);
    if (OFFER_PAGES.test(page) || GALLERY_OFFER_PAGES.test(page)) scan(visibleText(readText(file)), `dist/${page}`, exceptions, r, { phrases: OFFER_RULES });
  }
  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
