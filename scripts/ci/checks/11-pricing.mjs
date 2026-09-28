// Spec §11.5 check 11 (D4): no pricing in offer copy. Check 04's §3.5 pricing list
// (including "from $<n>") and any currency figure, (A|AU)?$ followed by a digit, fail in:
// - the offer sources: src/content/solutions/, src/content/kits/ and src/data/demos/
//   (every file but README.md and dotfiles), src/data/services.ts and src/data/contact.ts;
// - the visible text of the built offer pages: /, /solutions/**, /services/** (with
//   Evaluation Partner) and /contact/**.
// Regulatory JSON, src/data/platform-ai.json and insights are out of scope. Exceptions
// are check 04's: src/data/banned-phrase-exceptions.json, matched the same way.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { htmlFiles, listFiles, loadExceptions, readText, relPath, result, visibleText } from "../lib.mjs";
import { EXCEPTIONS_FILE, PRICING, scan } from "./04-banned-phrases.mjs";

export const NAME = "11-pricing";
/** `(A|AU)?\$\s?\d`. The lookbehind leaves "from $9" to PRICING's "from $<n>", so it is reported once. */
export const CURRENCY = {
  label: "currency figure",
  category: "currency figure (D4)",
  re: /(?<!\bfrom\s+(?:AU?)?)(?:\bAU?)?\$\s?\d/gi,
};
export const OFFER_RULES = [...PRICING, CURRENCY];
export const OFFER_DIRS = ["src/content/solutions", "src/content/kits", "src/data/demos"];
export const OFFER_FILES = ["src/data/services.ts", "src/data/contact.ts"];
export const OFFER_PAGES = /^(index\.html|(solutions|services|contact)\/.+\.html)$/;
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
    if (OFFER_PAGES.test(page)) scan(visibleText(readText(file)), `dist/${page}`, exceptions, r, { phrases: OFFER_RULES });
  }
  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
