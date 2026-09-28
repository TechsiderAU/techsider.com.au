import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { readDist, readPreviewDist } from "./helpers.mjs";
import { PREVIEW_PAGES, previewPath } from "../src/fixtures/preview-pages.ts";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const BANNER = "Template preview — fictional fixture data";
const TEXT_EXT = new Set([".html", ".js", ".mjs", ".css", ".xml", ".json", ".webmanifest", ".txt", ".svg"]);
const textFiles = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return textFiles(p);
    return TEXT_EXT.has(extname(name)) ? [p] : [];
  });
// True only for an attribute *name* on the tag (as in tests/shell.test.mjs): quoted values
// are blanked first, so `data-fixture` inside a class or text can't pass for the attribute.
const hasAttr = (tag, name) =>
  new RegExp(`\\s${name}(?=[\\s=/>])`).test(tag.replace(/"[^"]*"|'[^']*'/g, '""'));
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const previewFile = (page) => `${previewPath(page).slice(1)}index.html`;
const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>"));

test("the preview registry lists the gallery index, components and tabs pages", () => {
  assert.deepEqual(
    PREVIEW_PAGES.map((p) => [p.slug, p.kind]),
    [["", "index"], ["components", "components"], ["tabs", "tabs"]],
  );
  assert.deepEqual(PREVIEW_PAGES.map(previewPath), ["/preview/", "/preview/components/", "/preview/tabs/"]);
  for (const p of PREVIEW_PAGES) assert.match(p.title, /\bFixture\b/, `"${p.title}" is not visibly fictional`);
});

test("production: no /preview/ pages are built or listed in the sitemap", () => {
  assert.equal(existsSync(join(DIST, "preview")), false, "dist/preview/ exists");
  assert.doesNotMatch(readDist("sitemap-0.xml"), /\/preview\//);
});

test("production: no fixture markup, banner or fixture data in any dist/ file", () => {
  const files = textFiles(DIST);
  assert.ok(files.some((f) => f.endsWith("index.html")), "dist/ has no pages; run `npm run build` first");
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const rel = relative(DIST, file);
    assert.doesNotMatch(text, /data-fixture/, `${rel} carries data-fixture`);
    assert.doesNotMatch(text, /\bFixture\b|\bfixture-[a-z0-9]/, `${rel} contains fixture data`);
    assert.ok(!text.includes(BANNER), `${rel} contains the template-preview banner`);
  }
});

test("production: BaseLayout pages carry no robots meta by default", () => {
  for (const f of ["index.html", "insights/index.html"]) {
    assert.doesNotMatch(readDist(f), /<meta[^>]*name="robots"/, f);
  }
});

test("preview build: every gallery page is noindex and opens <main> with the fixture banner", () => {
  for (const page of PREVIEW_PAGES) {
    const html = readPreviewDist(previewFile(page));
    const head = html.slice(0, html.indexOf("</head>"));
    assert.match(head, /<meta name="robots" content="noindex">/, `${previewPath(page)}: no robots noindex`);
    assert.match(head, new RegExp(`<title>${escapeRe(page.title)} \\| Template preview \\| Techsider</title>`));
    const main = mainOf(html);
    const banner = main.match(/<p\b[^>]*class="preview-banner"[^>]*>([^<]*)<\/p>/);
    assert.ok(banner, `${previewPath(page)}: no .preview-banner`);
    assert.ok(hasAttr(banner[0].match(/^<p\b[^>]*>/)[0], "data-fixture"), `${previewPath(page)}: banner lacks data-fixture`);
    assert.equal(banner[1], BANNER);
    assert.equal(main.indexOf(banner[0]), main.indexOf(">") + 1, `${previewPath(page)}: the banner is not the first thing in <main>`);
    assert.match(main, new RegExp(`<h1\\b[^>]*>${escapeRe(page.title)}</h1>`));
  }
});

test("preview build: the gallery index links to the components and tabs pages", () => {
  const index = readPreviewDist("preview/index.html");
  const nav = index.match(/<nav\b[^>]*aria-label="Template preview pages"[^>]*>[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.ok(nav, 'no <nav aria-label="Template preview pages"> on /preview/');
  assert.match(nav, /<a[^>]*href="\/preview\/components\/"/);
  assert.match(nav, /<a[^>]*href="\/preview\/tabs\/"/);
  assert.match(nav, /<a[^>]*href="\/preview\/"[^>]*aria-current="page"/);
});

test("preview build: the components page has carbon and bone surfaces; the tabs page a tab-groups section", () => {
  const components = readPreviewDist("preview/components/index.html");
  assert.match(components, /<section\b[^>]*id="surface-carbon"/);
  const bone = components.match(/<section\b[^>]*id="surface-bone"[^>]*>/)?.[0] ?? "";
  assert.match(bone, /class="[^"]*\bsurface-bone\b/, "the bone surface lacks the surface-bone class");
  assert.match(readPreviewDist("preview/tabs/index.html"), /<section\b[^>]*id="tab-groups"/);
});
