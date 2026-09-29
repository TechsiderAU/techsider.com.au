// Helpers for tests that assert against the built site: dist/ (production) and
// dist-preview/ (TECHSIDER_NAV_PREVIEW=1, which adds the /preview/ template gallery).
// Run `npm run build && npm run build:preview` before `npm test`.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { elements } from "../scripts/ci/lib.mjs";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const DIST_PREVIEW = fileURLToPath(new URL("../dist-preview/", import.meta.url));

export function readDist(rel) {
  const p = join(DIST, rel);
  if (!existsSync(p)) throw new Error(`dist/${rel} is missing — run \`npm run build\` first`);
  return readFileSync(p, "utf8");
}

export function readPreviewDist(rel) {
  const p = join(DIST_PREVIEW, rel);
  if (!existsSync(p)) throw new Error(`dist-preview/${rel} is missing — run \`npm run build:preview\` first`);
  return readFileSync(p, "utf8");
}

export function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

export function allHtmlFiles(dir = DIST) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...allHtmlFiles(p));
    else if (name.endsWith(".html")) out.push(relative(DIST, p));
  }
  return out;
}

/**
 * The words a reader reads in a page's own copy in <main> (spec §8.5's industry-page length, which
 * counts the regulatory map and the FAQ): whitespace-separated tokens holding a letter or a digit.
 * aria-hidden copies (the DataTable's stacked-card column labels, bracket glyphs, the mock panel's
 * decorative buttons) repeat what the page already says once, and the Related insights cards
 * (#insights) are generated links to posts, so neither counts. Every industry page test uses it.
 */
export function pageWords(html) {
  let main = html.slice(html.search(/<main\b/), html.indexOf("</main>"));
  const [insights] = elements(main, (t) => t.attrs.id === "insights");
  if (insights) main = main.replace(insights.outer, " ");
  for (const hidden of elements(main, (t) => t.attrs["aria-hidden"] === "true")) main = main.replace(hidden.outer, " ");
  return visibleText(main).split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
