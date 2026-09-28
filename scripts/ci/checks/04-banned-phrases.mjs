// Spec §11.5 check 4: the §3.5 banned phrases, over src/ and the visible text of
// every built page. FAIL phrases are errors; WARN phrases are printed as warnings.
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

export const OVERCLAIM = group("overclaim", [
  "certified",
  "IRAP-aligned",
  "ISM-aligned",
  "IRAP-assessed",
  "accredited",
  ["SOC 2 compliant", rx("\\bsoc(?: )?2 compliant\\b")],
  ["ISO 27001 compliant", rx("\\biso(?: )?27001 compliant\\b")],
  "official partner",
  "preferred partner",
  "integrates with",
  "integration partner",
  "our partner",
  "our partners",
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
  "payback",
  "single-approver",
  "delegated authority",
  "SME band",
  "SME threshold",
  "direct-engagement",
  ["from $<n>", rx("\\bfrom\\s+(?:AU?)?\\$\\s?\\d")],
]);

export const FAIL_PHRASES = [...IMPLIED, ...HYPE, ...OVERCLAIM, ...PRICING];

export const WARN_PHRASES = group("warn", [
  "assurance",
  "assured",
  "compliant",
  "ensures compliance",
  "used by",
  "sovereign",
]);

/** src/ files in scope: content, components, data and pages, minus fixtures and the exceptions file itself. */
export function sourceFiles(root) {
  return listFiles(
    join(root, "src"),
    (rel) => /\.(astro|ts|md|yaml|json)$/.test(rel) && !rel.startsWith("fixtures/") && `src/${rel}` !== EXCEPTIONS_FILE,
  );
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
  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
