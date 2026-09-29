// Production dist/ ships only what its pages load (BR-5): every file under dist/_astro/ is named
// by some HTML, CSS or JS file in dist/. While the preview gallery was a page in src/pages/, the
// production build bundled its CSS and the Tabs script although no production page loads them;
// since src/preview/integration.mjs injects the gallery only into preview builds, it can't.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const REFERRER_EXT = new Set([".html", ".css", ".js", ".mjs"]);

const filesUnder = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? filesUnder(p) : [p];
  });

/**
 * The assets that no *other* referrer names. `assets` are paths; `referrers` are [path, text]
 * pairs. Built asset names carry a content hash, so a plain file-name match is exact enough, and
 * it covers every way a build refers to an asset: <link href>, <script src>, CSS url() and a JS
 * chunk's `import "./x.js"`.
 */
function orphans(assets, referrers) {
  return assets.filter((asset) => {
    const name = basename(asset);
    return !referrers.some(([path, text]) => path !== asset && text.includes(name));
  });
}

test("orphans() flags an asset that no other file names, and a self-reference doesn't count", () => {
  const referrers = [
    ["index.html", '<link rel="stylesheet" href="/_astro/Base.Ab12Cd34.css"><script type="module" src="/_astro/page.Ef56Gh78.js"></script>'],
    ["_astro/Base.Ab12Cd34.css", "@font-face{src:url(/_astro/font.Ij90Kl12.woff2)}"],
    ["_astro/page.Ef56Gh78.js", 'import"./chunk.Mn34Op56.js";'],
    ["_astro/Lonely.Qr78St90.js", "//# sourceURL=Lonely.Qr78St90.js"],
  ];
  const assets = [
    "_astro/Base.Ab12Cd34.css", "_astro/font.Ij90Kl12.woff2", "_astro/page.Ef56Gh78.js",
    "_astro/chunk.Mn34Op56.js", "_astro/Lonely.Qr78St90.js", "_astro/unused.Uv12Wx34.css",
  ];
  assert.deepEqual(orphans(assets, referrers), ["_astro/Lonely.Qr78St90.js", "_astro/unused.Uv12Wx34.css"]);
});

test("production: every file in dist/_astro/ is named by an HTML, CSS or JS file in dist/", () => {
  assert.ok(existsSync(join(DIST, "_astro")), "dist/_astro/ is missing — run `npm run build` first");
  const all = filesUnder(DIST).map((p) => relative(DIST, p).split(sep).join("/")).sort();
  const assets = all.filter((rel) => rel.startsWith("_astro/"));
  assert.ok(assets.length > 0, "dist/_astro/ is empty — run `npm run build` first");
  const referrers = all
    .filter((rel) => REFERRER_EXT.has(extname(rel)))
    .map((rel) => [rel, readFileSync(join(DIST, rel), "utf8")]);
  assert.deepEqual(orphans(assets, referrers), [], "dist/_astro/ holds files no production page, stylesheet or script loads");
});
