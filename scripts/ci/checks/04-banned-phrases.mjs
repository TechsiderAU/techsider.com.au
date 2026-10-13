// Spec §11.5 check 4: the §3.5 banned phrases, over src/ and the visible text of
// every built page and built XML file (the RSS feed's channel and item copy, the sitemaps), and
// the text files at the build's root (llms.txt, robots.txt).
// FAIL phrases are errors; WARN phrases are printed as warnings. go-global §4.6 adds the
// conformity, residency and readiness claims to OVERCLAIM, and §10.2 adds VAT, sales tax and
// other currencies to PRICING.
// Matching is case-insensitive, whole phrase (\b at both ends), hyphen ≡ space.
import { join, resolve } from "node:path";
import {
  excepted, excerpt, findAll, htmlFiles, lineAt, listFiles, loadExceptions, looseRegExp as rx, normalizeQuotes,
  phraseRegExp, readText, relPath, result, visibleText,
} from "../lib.mjs";

export const NAME = "04-banned-phrases";
export const EXCEPTIONS_FILE = "src/data/banned-phrase-exceptions.json";

/**
 * { label, category, re }. `re` defaults to the label as a whole phrase; the hand-written ones
 * use rx() (looseRegExp), where a space in the source also matches a hyphen.
 */
const phrase = (label, category, re = phraseRegExp(label)) => ({ label, category, re });
const group = (category, labels) => labels.map((l) => (typeof l === "string" ? phrase(l, category) : phrase(l[0], category, l[1])));

export const IMPLIED = group("implied clients or track record", [
  "trusted by",
  // "working with your documents" talks about the client's own materials, so it passes.
  ["working with", rx("\\bworking with\\b(?! your\\b)")],
  "we work with",
  "our clients",
  "our customers",
  "clients include",
  "customers include",
  "in production at",
  "deployed in production",
  ["case study", rx("\\bcase stud(?:y|ies)\\b")],
  ["customer story", rx("\\bcustomer stor(?:y|ies)\\b")],
  ["bench", rx("\\bbench\\b")], // "benchmark" passes
  ["centre of excellence", rx("\\bcent(?:re|er) of excellence\\b")],
  "as seen in",
  "award-winning",
  "leading banks",
  "our team of",
  "10x",
  "leading provider",
  "most powerful",
]);

export const HYPE = group("hype", [
  ["revolutionise", rx("\\brevolutioni[sz](?:e[sd]?|ing)\\b")],
  "cutting-edge",
  "world-class",
  "world's best",
  ["seamless", rx("\\bseamless(?:ly)?\\b")],
  "unlock the power",
  "frontier",
]);

// go-global §4.6 adds the last eight entries. Bare "compliant" moved here from WARN_PHRASES, so it
// also covers the old "SOC 2 compliant" and "ISO 27001 compliant" entries. Patterns (a)–(d) are
// §4.6's own: (a) and (d) match its literals "nothing leaves your region", "EU AI Act-ready" and
// "AI Act ready", so those are their labels rather than separate entries (each would report the
// same words a second or third time). "conforms to" stays a literal, since it fails with any subject;
// "Techsider conforms to" is reported by it and by (b). Quoted third-party text goes in
// banned-phrase-exceptions.json.
export const OVERCLAIM = group("overclaim", [
  "certified",
  "IRAP-aligned",
  "ISM-aligned",
  "IRAP-assessed",
  "accredited",
  "official partner",
  "preferred partner",
  "integrates with",
  "integration partner",
  "our partner",
  "our partners",
  "compliant",
  "ISO 42001-aligned",
  "ISO/IEC 42001-aligned",
  "conforms to",
  // (a) A negated leave or send with a place. Short residency lines say where systems run (go-global §4.1).
  [
    "nothing leaves your region",
    rx("\\b(?:nothing|never|doesn't|does not|don't|do not|won't|will not|isn't|aren't|is not|are not)(?: ever)? (?:leaves?|leaving|sent|transferred|moved)(?: (?:out(?:side)?(?: of)?|from))? (?:your|the) (?:region|jurisdiction|country)\\b"),
  ],
  // (b) A compliance or conformity claim with Techsider as the subject. "Providers must comply with" passes.
  ["we comply with", rx("\\b(?:we|techsider|our(?: \\w+){1,2})(?: (?:are|is|fully|already))* (?:compl(?:y|ies)|conforms?) (?:with|to)\\b")],
  // (c) "Aligned" with a named standard or framework. "(?: )?" keeps the space optional: rx() reads " ?" as a required gap.
  ["aligned with ISO 42001", rx("\\baligned (?:with|to) (?:the )?(?:ISO(?:/IEC)?(?: )?(?:42001|27001)|NIST(?: AI RMF)?|SOC(?: )?2)\\b")],
  // (d) "Act-ready", with any dash: \u2010-\u2014 run from the hyphen to the em dash.
  ["EU AI Act-ready", rx("\\b(?:EU[\\s\\-\\u2010-\\u2014]+)?AI[\\s\\-\\u2010-\\u2014]+Act(?:[\\s\\-\\u2010\\u2011]+|[\\u2013\\u2014])ready\\b")],
]);

/** The D4 pricing list. Check 11 reuses it for offer copy. */
export const PRICING = group("pricing language (D4)", [
  "fixed price",
  "fixed fee",
  "fixed quote",
  "quoted separately",
  "balance of the fee",
  "fee is payable",
  "balance at risk",
  "at risk against",
  "fee credit",
  "paid discovery",
  "two-week discovery",
  "day rate",
  "price sheet",
  "price band",
  "price list",
  ["ex GST", rx("\\bex(?:cl?|cluding)?\\.? gst\\b")],
  ["inc GST", rx("\\binc(?:l|luding)?\\.? gst\\b")],
  // go-global §10.2: VAT and sales tax, read the way the GST entries are.
  ["ex VAT", rx("\\bex(?:cl?|cluding)?\\.? vat\\b")],
  "plus VAT",
  ["inc VAT", rx("\\binc(?:l|luding)?\\.? vat\\b")],
  "sales tax",
  "payback",
  "single-approver",
  "delegated authority",
  "SME band",
  "SME threshold",
  "direct-engagement",
  // "From" a price in any currency check 11 knows (go-global §10.2): $ (A$, AU$, US$, NZ$, S$), € or £,
  // or USD, EUR or GBP and a space.
  ["from $<n>", rx("\\bfrom\\s+(?:(?:AU?|US|NZ|S)?\\$|[€£]|(?:USD|EUR|GBP)\\s)\\s?\\d")],
]);

export const FAIL_PHRASES = [...IMPLIED, ...HYPE, ...OVERCLAIM, ...PRICING];

export const WARN_PHRASES = group("warn", [
  "assurance",
  "assured",
  "ensures compliance",
  "used by",
  "sovereign",
]);

/** Source files that can hold copy: Astro, JS/TS in every flavour (src/pages/rss.xml.js is public), Markdown/MDX, YAML, JSON. */
export const SOURCE_FILE = /\.(astro|m?[jt]sx?|mdx?|ya?ml|json)$/;

/** src/ files in scope: every copy-bearing source, minus fixtures and the exceptions file itself. */
export function sourceFiles(root) {
  return listFiles(
    join(root, "src"),
    (rel) => SOURCE_FILE.test(rel) && !rel.startsWith("fixtures/") && `src/${rel}` !== EXCEPTIONS_FILE,
  );
}

/**
 * The copy in a built XML file: CDATA unwrapped, tags stripped, entities decoded (as visibleText
 * does for pages), and URLs dropped, since a <link> or <loc> is an address, not copy.
 */
export function xmlText(xml) {
  return visibleText(xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/\bhttps?:\/\/\S+/g, " ");
}

/** The copy in a root text file (llms.txt): its URLs dropped, since an address is not copy. */
export function rootText(text) {
  return text.replace(/\bhttps?:\/\/[^\s)]+/g, " ");
}

/**
 * Adds one finding per phrase occurrence in `text` that no exception covers.
 * `file` is "src/…" or "dist/…"; `lines` adds ":<line>" (source files).
 */
export function scan(text, file, exceptions, r, { lines = false, phrases = FAIL_PHRASES, kind = "error" } = {}) {
  const t = normalizeQuotes(text);
  for (const p of phrases) {
    for (const hit of findAll(t, p.re)) {
      if (excepted(exceptions, "phrase", file, t, hit.start, hit.end)) continue;
      const where = lines ? `${file}:${lineAt(t, hit.start)}` : file;
      r.add(kind, `${where}: "${hit.match}" (${p.category}) in "${excerpt(t, hit.start, hit.end)}"`);
    }
  }
}

export async function run({ root, dist }) {
  const r = result();
  const exceptions = loadExceptions(root, EXCEPTIONS_FILE, "phrase", r);
  const both = (text, file, lines) => {
    scan(text, file, exceptions, r, { lines });
    scan(text, file, exceptions, r, { lines, phrases: WARN_PHRASES, kind: "warning" });
  };
  for (const file of sourceFiles(root)) both(readText(file), relPath(root, file), true);
  const out = resolve(dist);
  const pages = htmlFiles(out);
  if (pages.length === 0) r.add("error", `${dist}: no built HTML found (run the build first)`);
  for (const file of pages) both(visibleText(readText(file)), `dist/${relPath(out, file)}`, false);
  for (const file of listFiles(out, (rel) => rel.endsWith(".xml"))) both(xmlText(readText(file)), `dist/${relPath(out, file)}`, false);
  // Root text files only: public/downloads/ holds source data, not copy. URLs are addresses, as in XML.
  for (const file of listFiles(out, (rel) => /^[^/]+\.txt$/.test(rel))) both(rootText(readText(file)), `dist/${relPath(out, file)}`, false);
  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
