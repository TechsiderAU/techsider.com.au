// The launch sweep of the production build (spec §1 criteria 3 and 6, §11.3, §12 item 4). It holds
// every page in dist/, and the files that point search engines at them, to the site-wide launch
// rules no other sweep pins:
// - every page is in Australian English (<html lang="en-AU">);
// - robots.txt names the sitemap index, and the sitemaps list exactly the canonical URL of every
//   page that isn't noindex, each once;
// - every page shows the contact email as plain text, read by plainText() from
//   scripts/ci/live-check.mjs, the post-deploy live check's own reading: nothing in <head>,
//   <script>, <noscript>, <textarea>, a comment or an attribute counts. So when the live check can't
//   find the address on the live domain, the cause is Cloudflare's edge, not the build;
// - no page points to github.com, in any attribute or in its JSON-LD: nothing may until the org
//   cleanup of spec §12 item 4 is done.
// tests/site-sweep.test.mjs and the prod-*sweep specs hold every page to the rest.
// Run `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { elements, htmlFiles, pageUrl, readText, startTags } from "../scripts/ci/lib.mjs";
import { plainText } from "../scripts/ci/live-check.mjs";
import { SITE } from "../src/data/nav.ts";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const ORIGIN = "https://techsider.com.au";
const BUILT = htmlFiles(DIST).map((file) => ({ url: pageUrl(DIST, file), html: readText(file) }));
const headOf = (html) => html.slice(0, html.indexOf("</head>"));
const noindex = (html) =>
  startTags(headOf(html)).some((t) => t.name === "meta" && t.attrs.name === "robots" && /\bnoindex\b/i.test(t.attrs.content ?? ""));
const locsIn = (xml) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
/** A github.com URL, with a scheme or protocol-relative, anywhere in a string. */
const GITHUB = /(?:https?:)?\/\/(?:[\w-]+\.)*github\.com(?![\w.-])[^\s"'<>]*/gi;

test("the launch sweep reads the production build", () => {
  assert.ok(BUILT.length > 0, "dist/ holds no page: run `npm run build` first");
  assert.ok(BUILT.some((p) => !noindex(p.html)), "every page in dist/ is noindex");
});

test("every page is in Australian English: <html lang=\"en-AU\"> (spec §11.3)", () => {
  const others = BUILT.filter(({ html }) => startTags(html).find((t) => t.name === "html")?.attrs.lang !== "en-AU").map((p) => p.url);
  assert.deepEqual(others, []);
});

test("robots.txt names the sitemap index, and the sitemaps list exactly the canonical URL of every page meant to be found, once (spec §11.3)", () => {
  const robots = readText(join(DIST, "robots.txt"));
  assert.match(robots, /^Sitemap: https:\/\/techsider\.com\.au\/sitemap-index\.xml$/m);
  assert.doesNotMatch(robots, /^Disallow:\s*\/\s*$/m, "robots.txt blocks the whole site");
  const sitemaps = locsIn(readText(join(DIST, "sitemap-index.xml")));
  assert.ok(sitemaps.length > 0, "the sitemap index lists no sitemap");
  const listed = sitemaps.flatMap((loc) => {
    const file = join(DIST, new URL(loc).pathname);
    assert.ok(loc.startsWith(`${ORIGIN}/`) && existsSync(file), `the sitemap index lists ${loc}, which the build doesn't have`);
    return locsIn(readText(file));
  });
  const expected = new Set();
  for (const { url, html } of BUILT) {
    if (noindex(html)) continue;
    const canonical = startTags(headOf(html)).find((t) => t.name === "link" && t.attrs.rel === "canonical")?.attrs.href;
    assert.ok(canonical, `${url} is meant to be found, and has no canonical URL`);
    expected.add(canonical);
  }
  assert.equal(listed.length, new Set(listed).size, "the sitemaps list a URL twice");
  assert.deepEqual([...listed].sort(), [...expected].sort());
});

test("every page shows the contact email as plain text, as the post-deploy live check reads it (spec §1 criterion 3)", () => {
  assert.match(SITE.email, /^[^@\s]+@[^@\s]+$/, "SITE.email isn't an address");
  const missing = BUILT.filter(({ html }) => !plainText(html).includes(SITE.email)).map((p) => p.url);
  assert.deepEqual(missing, []);
});

test("no page points to github.com, in an attribute or in its JSON-LD, until spec §12 item 4's org cleanup is done", () => {
  const found = BUILT.flatMap(({ url, html }) => {
    const values = [
      ...startTags(html).flatMap((t) => Object.values(t.attrs)),
      ...elements(html, (t) => t.name === "script" && t.attrs.type === "application/ld+json").map((e) => e.inner),
    ];
    return values.flatMap((value) => value.match(GITHUB) ?? []).map((link) => `${url} → ${link}`);
  });
  assert.deepEqual(found, []);
});
