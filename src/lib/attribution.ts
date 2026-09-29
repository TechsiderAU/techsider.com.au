// A demo corpus's attribution (corpusRef.attribution in src/data/demos/*.json) is stored exactly as
// the licence research words it: plain text with *italic* titles and [text](https://…) links. CC BY
// 4.0 §3(a)(1) asks for a link to the licence and to the material, so the links must render as
// links. attributionParts() splits the string into what a template renders; any other markup
// throws, so a typo fails the build instead of printing stray asterisks or brackets.
// Plain TypeScript with no imports, so node tests import it directly.

export type AttributionPart =
  | { kind: "text"; text: string }
  | { kind: "title"; text: string }
  | { kind: "link"; text: string; href: string };

const MARKUP = /\*([^*[\]]+)\*|\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g;
const STRAY = /[*[\]]/;

export function attributionParts(source: string): AttributionPart[] {
  const parts: AttributionPart[] = [];
  let last = 0;
  const text = (s: string) => {
    if (STRAY.test(s)) throw new Error(`attribution: unmatched markup in "${s}"`);
    if (s) parts.push({ kind: "text", text: s });
  };
  for (const m of source.matchAll(MARKUP)) {
    text(source.slice(last, m.index));
    if (m[1] !== undefined) parts.push({ kind: "title", text: m[1] });
    else parts.push({ kind: "link", text: m[2], href: m[3] });
    last = m.index + m[0].length;
  }
  text(source.slice(last));
  return parts;
}

/** The attribution as it reads: titles and link texts kept, markup dropped. */
export function attributionText(source: string): string {
  return attributionParts(source).map((p) => p.text).join("");
}
