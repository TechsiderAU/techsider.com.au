// Spec §11.5 check 2: every internal link resolves (fragments included),
// every live nav.ts page is built, and no built hub page is empty.
import { resolve } from "node:path";
import {
  elements, fragmentOf, hrefsIn, htmlFiles, idsIn, isExternal, loadNav, readText, relPath, resolveDistPath, result,
} from "../lib.mjs";

export const NAME = "02-links";

export async function run({ root, dist }) {
  const r = result();
  const out = resolve(dist);
  const done = () => ({ name: NAME, errors: r.errors, warnings: r.warnings });
  const pages = htmlFiles(out);
  if (pages.length === 0) {
    r.add("error", `${dist}: no built HTML found (run the build first)`);
    return done();
  }
  const nav = await loadNav(root);

  const idCache = new Map();
  const idsOf = (file) => {
    if (!idCache.has(file)) idCache.set(file, idsIn(readText(file)));
    return idCache.get(file);
  };

  // Every internal href lands on a built file, and its fragment on an id there.
  // ("#top" and a bare "#" always scroll to the top, so they need no id.)
  for (const file of pages) {
    const page = relPath(out, file);
    for (const href of new Set(hrefsIn(readText(file)))) {
      if (isExternal(href)) continue;
      const target = resolveDistPath(out, href, file);
      if (!target) {
        r.add("error", `${page}: href="${href}" does not resolve to a built file`);
        continue;
      }
      const frag = fragmentOf(href);
      if (frag && frag.toLowerCase() !== "top" && target.endsWith(".html") && !idsOf(target).has(frag)) {
        r.add("error", `${page}: href="${href}" points at #${frag}, but ${relPath(out, target)} has no id="${frag}"`);
      }
    }
  }

  // Every live nav.ts page has been built.
  for (const p of nav.PAGES) {
    if (p.status === "live" && !resolveDistPath(out, p.path)) r.add("error", `src/data/nav.ts: ${p.path} is live but was not built`);
  }

  // A built hub's <main> links to at least one built child page (its group's items and pages under its path).
  for (const g of nav.NAV_GROUPS) {
    const hubFile = resolveDistPath(out, g.hub.path);
    if (!hubFile) continue;
    const children = [...g.items, ...nav.PAGES.filter((p) => p.base === g.hub.path)];
    const childFiles = new Set(children.map((c) => resolveDistPath(out, c.path)).filter(Boolean));
    const html = readText(hubFile);
    const main = elements(html, (t) => t.name === "main")[0]?.inner ?? html;
    const linked = hrefsIn(main).some((h) => !isExternal(h) && childFiles.has(resolveDistPath(out, h, hubFile)));
    if (!linked) r.add("error", `${relPath(out, hubFile)}: the ${g.hub.path} hub is empty (its <main> links to none of its built child pages)`);
  }

  return done();
}
