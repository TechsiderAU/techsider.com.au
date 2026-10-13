// The go-global S1 scan (spec §1, §10.3): the words a built page carries outside the contexts S1
// allows, and every S1 banned string among them. tests/global-identity.test.mjs uses it.
//
// S1: no built page says Techsider is Australian, serves Australian organisations or targets
// Australia. The allowed contexts are:
// - the subtree of any [data-region="au"] element: the industry pages' Australia band and every
//   other Australia-only wrapper (region posts' bodies and cards, packages, kits, demos, traces,
//   the checker, the industry hub's chips);
// - [data-hq] (the HQ line in the footer and on About) and [data-region-label] (region labels);
// - the exact SITE.summary sentence, wherever it appears;
// - the contact form's privacy notice: [data-collection-notice] and #enquiry-privacy;
// - the <title>, meta description, og:* and twitter:* tags of a post tagged region: "au".
// /legal/* pages are allowed whole, so the caller skips them. The scan reads the whole page, <head>,
// attributes and JSON-LD included, with entities decoded, curly apostrophes made straight and
// every run of whitespace read as one space. It reads that text twice: as it is, and with every tag
// blanked, so a phrase split by inline markup ("for <em>Australian</em> teams") is found too. A
// phrase across two blocks ("for</li><li>Australian teams") is reported, which fails closed.
import { decodeEntities, elements, excerpt, normalizeQuotes } from "../../scripts/ci/lib.mjs";

/** Spec §1: the S1 banned strings, matched in any case. */
export const S1_BANNED = [
  "Australian organisations", "for Australian", "in Australia |", "Australia's leading",
  "Australian AI", "Australian teams", "Australian-owned", "most Australian",
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * What a space or a hyphen in a banned string matches: any run of whitespace, hyphens (U+2010,
 * U+2011), figure, en and em dashes and bars (U+2012 to U+2015) and minus signs (U+2212). Check 04
 * treats a hyphen and a space as the same (lib.mjs GAP), so "Australian owned" is "Australian-owned".
 */
const SEPARATOR = "[\\s\\-\\u2010-\\u2015\\u2212]+";

/**
 * A banned string as a global, case-insensitive RegExp that starts at the start of a word (so
 * "almost Australian" isn't "most Australian"); each space or hyphen in it matches SEPARATOR. Like
 * the part-end grep, its end is open: "for Australians" is "for Australian".
 */
export function bannedRegExp(phrase) {
  const body = phrase
    .split(/(\s+|-)/)
    .map((part) => (/^\s+$/.test(part) || part === "-" ? SEPARATOR : escapeRe(part)))
    .join("");
  return new RegExp(`\\b${body}`, "gi");
}

/** An element S1 allows whole, wherever it is (spec §1). */
export function allowedElement(tag) {
  return (
    tag.attrs["data-region"] === "au" ||
    "data-hq" in tag.attrs ||
    "data-region-label" in tag.attrs ||
    "data-collection-notice" in tag.attrs ||
    tag.attrs.id === "enquiry-privacy"
  );
}

/** A head tag S1 allows on a region post: <title>, the meta description, og:* and twitter:*. */
export function regionPostHeadTag(tag) {
  if (tag.name === "title") return true;
  if (tag.name !== "meta") return false;
  const key = tag.attrs.property ?? tag.attrs.name ?? "";
  return key === "description" || key.startsWith("og:") || key.startsWith("twitter:");
}

const flat = (s) => normalizeQuotes(decodeEntities(s)).replace(/\s+/g, " ");

/**
 * The page as S1 reads it: every allowed element cut out (and, on a region post, its search and
 * sharing tags), entities decoded, apostrophes straight, whitespace runs one space, and every
 * occurrence of the summary sentence removed.
 * @param {string} html a built page
 * @param {{ regionPost: boolean, summary: string }} options
 */
export function s1Text(html, { regionPost, summary }) {
  const headEnd = html.indexOf("</head>");
  const head = headEnd < 0 ? "" : html.slice(0, headEnd);
  const cuts = [...elements(html, allowedElement), ...(regionPost ? elements(head, regionPostHeadTag) : [])]
    .map(({ start, end }) => [start, end])
    .sort((a, b) => a[0] - b[0]);
  let kept = "";
  let at = 0;
  for (const [start, end] of cuts) {
    if (start > at) kept += `${html.slice(at, start)} `;
    at = Math.max(at, end);
  }
  kept += html.slice(at);
  const sentence = flat(summary).trim();
  return sentence ? flat(kept).replaceAll(sentence, " ") : flat(kept);
}

/** A start or end tag, or a comment, in s1Text's output. */
const TAG = /<!--[\s\S]*?-->|<\/?[a-zA-Z][^<>]*>/g;

/**
 * Every S1 banned string the page carries outside the allowed contexts, in S1_BANNED order, each
 * phrase's hits in page order. It scans s1Text twice: as it is, which reads attributes and
 * JSON-LD, and with every tag replaced by as many spaces, so the words a tag splits ("for
 * <em>Australian</em> teams", "Australian<br>teams") meet, as visibleText would show them. Blanking
 * keeps every offset, so a hit both passes find starts at the same index and is reported once.
 * @param {string} html a built page
 * @param {{ regionPost: boolean, summary: string }} options
 * @returns {{ phrase: string, at: string }[]} the phrase, and the words around the hit
 */
export function s1Hits(html, options) {
  const text = s1Text(html, options);
  const bare = text.replace(TAG, (tag) => " ".repeat(tag.length));
  return S1_BANNED.flatMap((phrase) => {
    const hits = new Map();
    for (const t of [text, bare]) {
      for (const m of t.matchAll(bannedRegExp(phrase))) {
        if (!hits.has(m.index)) hits.set(m.index, { phrase, at: excerpt(t, m.index, m.index + m[0].length, 40) });
      }
    }
    return [...hits].sort(([a], [b]) => a - b).map(([, hit]) => hit);
  });
}
