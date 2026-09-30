// Spec §11.4, "Fonts: subset, preload the display face", on every production page:
// - each page preloads one font, and only one: the display face's (Archivo's) latin file, as a
//   woff2 with crossorigin, the very file its @font-face rule serves, with font-display: swap;
// - every face is split into subsets by unicode-range, and no page's text needs a file beyond the
//   two latin ones, so no page downloads Archivo's or JetBrains Mono's latin-ext, Vietnamese,
//   Cyrillic or Greek subset. A character outside every subset (such as ① or →) draws in a system
//   font and downloads nothing.
// Run `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { htmlFiles, listFiles, pageUrl, readText, startTags, visibleText } from "../scripts/ci/lib.mjs";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const DISPLAY_FAMILY = "Archivo Variable";
const CSS = listFiles(`${DIST}_astro`, (rel) => rel.endsWith(".css")).map(readText).join("\n");

/** "U+??,U+131,U+2000-206F" as [first, last] code point pairs; "?" is any hex digit. */
function parseRange(value) {
  return value.split(",").map((part) => {
    const [first, last = first] = part.trim().replace(/^U\+/i, "").split("-");
    return [parseInt(first.replaceAll("?", "0"), 16), parseInt(last.replaceAll("?", "F"), 16)];
  });
}

/** Every @font-face rule in the built CSS: its family, file, unicode-range and font-display. */
const FACES = [...CSS.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, body]) => {
  const value = (prop) => body.match(new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`))?.[1].trim();
  const src = value("src") ?? "";
  return {
    family: (value("font-family") ?? "").replace(/^["']|["']$/g, ""),
    file: src.match(/url\(\s*["']?([^"')]+)["']?\s*\)/)?.[1] ?? "",
    ranges: value("unicode-range") ? parseRange(value("unicode-range")) : null,
    display: value("font-display"),
  };
});
const covers = (face, cp) => face.ranges.some(([first, last]) => cp >= first && cp <= last);
const LATIN = "A".codePointAt(0);
const pages = htmlFiles(DIST);

test("the built CSS declares both families, each face subset by unicode-range and swapped in", () => {
  assert.deepEqual([...new Set(FACES.map((f) => f.family))].sort(), [DISPLAY_FAMILY, "JetBrains Mono Variable"]);
  for (const face of FACES) {
    assert.ok(face.ranges, `${face.family} ${face.file.slice(0, 60)} has no unicode-range, so every page would download it whole`);
    assert.equal(face.display, "swap", `${face.family} ${face.file.slice(0, 60)}`);
  }
});

test("every page preloads the display face's latin file, and no other font", () => {
  const latin = FACES.find((f) => f.family === DISPLAY_FAMILY && covers(f, LATIN));
  assert.ok(latin, `no ${DISPLAY_FAMILY} face covers latin text`);
  assert.ok(pages.length > 0, "dist/ has no page: run npm run build");
  for (const file of pages) {
    const preloads = startTags(readText(file)).filter((t) => t.name === "link" && t.attrs.rel === "preload" && t.attrs.as === "font");
    const where = pageUrl(DIST, file);
    assert.equal(preloads.length, 1, `${where} preloads ${preloads.length} fonts`);
    const [link] = preloads;
    assert.equal(link.attrs.href, latin.file, `${where} preloads ${link.attrs.href}, not the file ${DISPLAY_FAMILY}'s latin face serves`);
    assert.equal(link.attrs.type, "font/woff2", where);
    assert.ok("crossorigin" in link.attrs, `${where}: a font preload without crossorigin is fetched twice`);
  }
});

test("no page's text needs a font file beyond the latin subsets", () => {
  const extra = new Map();
  for (const file of pages) {
    const html = readText(file);
    const text = visibleText(html.slice(html.search(/<body\b/)));
    for (const char of new Set(text)) {
      const cp = char.codePointAt(0);
      for (const face of FACES) {
        if (covers(face, LATIN) || !covers(face, cp)) continue;
        const key = `U+${cp.toString(16).toUpperCase().padStart(4, "0")} "${char}" pulls in ${face.family} ${face.file.split("/").pop().slice(0, 48)}`;
        extra.set(key, [...(extra.get(key) ?? []), pageUrl(DIST, file)]);
      }
    }
  }
  assert.deepEqual([...extra].map(([key, where]) => `${key} on ${where.join(", ")}`), []);
});
