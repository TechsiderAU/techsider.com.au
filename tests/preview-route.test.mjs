import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { readDist, readPreviewDist } from "./helpers.mjs";
import { PREVIEW_PAGES, previewPath } from "../src/fixtures/preview-pages.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = join(ROOT, "dist");
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
const galleryNavOf = (html) => html.match(/<nav\b[^>]*aria-label="Template preview pages"[^>]*>[\s\S]*?<\/nav>/)?.[0] ?? "";
// The gallery nav lists the index first, then each group's pages under its heading.
const NAV_GROUPS = [["components", "Components"], ["templates", "Templates"]];

test("the preview registry lists the gallery index, components and tabs pages, each in its group", () => {
  assert.deepEqual(
    PREVIEW_PAGES.map((p) => [p.slug, p.kind, p.group]),
    [
      ["", "index", "gallery"],
      ["components", "components", "components"],
      ["tabs", "tabs", "components"],
      ["page-kit", "page-kit", "components"],
      ["templates/solution", "solution", "templates"],
      ["templates/solution-evaluation", "solution-evaluation", "templates"],
      ["templates/solution-switch-on", "solution-switch-on", "templates"],
      ["templates/industry", "industry", "templates"],
      ["templates/industry-government", "industry-government", "templates"],
      ["templates/solutions-hub", "solutions-hub", "templates"],
      ["templates/industries-hub", "industries-hub", "templates"],
      ["templates/home", "home", "templates"],
      ["templates/home-stale-insights", "home-stale-insights", "templates"],
    ],
  );
  assert.deepEqual(PREVIEW_PAGES.map(previewPath), [
    "/preview/",
    "/preview/components/",
    "/preview/tabs/",
    "/preview/page-kit/",
    "/preview/templates/solution/",
    "/preview/templates/solution-evaluation/",
    "/preview/templates/solution-switch-on/",
    "/preview/templates/industry/",
    "/preview/templates/industry-government/",
    "/preview/templates/solutions-hub/",
    "/preview/templates/industries-hub/",
    "/preview/templates/home/",
    "/preview/templates/home-stale-insights/",
  ]);
  assert.equal(new Set(PREVIEW_PAGES.map((p) => p.kind)).size, PREVIEW_PAGES.length, "a kind is registered twice");
  for (const p of PREVIEW_PAGES) {
    assert.match(p.title, /\bFixture\b/, `"${p.title}" is not visibly fictional`);
    assert.equal(p.group === "gallery", p.kind === "index", `${p.kind}: only the index is in the gallery group`);
    if (p.group === "templates") assert.equal(p.slug, `templates/${p.kind}`, `${p.kind}: template pages live at templates/<kind>`);
    else assert.doesNotMatch(p.slug, /^templates\//, `${p.kind}: only template pages live under templates/`);
  }
});

test("the gallery route lives in src/preview/, outside src/pages/, and loads nothing dynamically", () => {
  const oldRoute = join(ROOT, "src/pages/preview");
  assert.deepEqual(existsSync(oldRoute) ? readdirSync(oldRoute) : [], [], "src/pages/preview/ still holds a route");
  const gallery = readFileSync(join(ROOT, "src/preview/gallery.astro"), "utf8");
  assert.doesNotMatch(gallery, /\bisPreview\b/, "the route still guards itself: the integration alone decides");
  assert.doesNotMatch(gallery, /\bimport\s*\(/, "the route imports a module dynamically");
});

test("previewGallery() injects /preview/[...slug] only when TECHSIDER_NAV_PREVIEW=1", async () => {
  const { previewGallery } = await import("../src/preview/integration.mjs");
  const setup = (value) => {
    const saved = process.env.TECHSIDER_NAV_PREVIEW;
    if (value === undefined) delete process.env.TECHSIDER_NAV_PREVIEW;
    else process.env.TECHSIDER_NAV_PREVIEW = value;
    try {
      const integration = previewGallery();
      const routes = [];
      integration.hooks["astro:config:setup"]({ injectRoute: (route) => routes.push(route) });
      return { name: integration.name, routes };
    } finally {
      if (saved === undefined) delete process.env.TECHSIDER_NAV_PREVIEW;
      else process.env.TECHSIDER_NAV_PREVIEW = saved;
    }
  };
  const preview = setup("1");
  assert.equal(preview.name, "techsider:preview-gallery");
  assert.deepEqual(preview.routes, [{ pattern: "/preview/[...slug]", entrypoint: join(ROOT, "src/preview/gallery.astro") }]);
  assert.deepEqual(setup(undefined).routes, [], "a production build got the gallery route");
  assert.deepEqual(setup("0").routes, [], "TECHSIDER_NAV_PREVIEW=0 got the gallery route");
});

test("astro.config.mjs runs previewGallery() before sitemap()", async () => {
  const { default: config } = await import("../astro.config.mjs");
  assert.deepEqual(config.integrations.map((i) => i.name), ["techsider:preview-gallery", "@astrojs/sitemap"]);
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

test("preview build: every gallery page is noindex and opens <main> with the fixture banner, then an All previews link", () => {
  for (const page of PREVIEW_PAGES) {
    const path = previewPath(page);
    const html = readPreviewDist(previewFile(page));
    const head = html.slice(0, html.indexOf("</head>"));
    assert.match(head, /<meta name="robots" content="noindex">/, `${path}: no robots noindex`);
    assert.match(head, new RegExp(`<title>${escapeRe(page.title)} \\| Template preview \\| Techsider</title>`));
    const main = mainOf(html);
    const banner = main.match(/<p\b[^>]*class="preview-banner"[^>]*>([^<]*)<\/p>/);
    assert.ok(banner, `${path}: no .preview-banner`);
    assert.ok(hasAttr(banner[0].match(/^<p\b[^>]*>/)[0], "data-fixture"), `${path}: banner lacks data-fixture`);
    assert.equal(banner[1], BANNER);
    assert.equal(main.indexOf(banner[0]), main.indexOf(">") + 1, `${path}: the banner is not the first thing in <main>`);
    const afterBanner = main.slice(main.indexOf(banner[0]) + banner[0].length);
    assert.match(
      afterBanner,
      /^\s*<p\b[^>]*class="preview-all"[^>]*>\s*<a\b[^>]*href="\/preview\/"[^>]*>All previews<\/a>\s*<\/p>/,
      `${path}: the banner is not followed by the All previews link`,
    );
    if (page.group === "templates") {
      // A template page is the specimen alone: the template supplies the page's one <h1>.
      assert.equal(galleryNavOf(main), "", `${path}: a template page renders the gallery intro`);
      assert.equal(main.match(/<h1\b/g)?.length, 1, `${path}: a template page needs exactly one <h1>`);
    } else {
      assert.match(main, new RegExp(`<h1\\b[^>]*>${escapeRe(page.title)}</h1>`), `${path}: the h1 is not the page title`);
    }
  }
});

test("preview build: the gallery nav lists the index, then every page under its group heading, marking the current one", () => {
  const expected = [
    ...PREVIEW_PAGES.filter((p) => p.group === "gallery"),
    ...NAV_GROUPS.flatMap(([group]) => PREVIEW_PAGES.filter((p) => p.group === group)),
  ];
  const headings = NAV_GROUPS.filter(([group]) => PREVIEW_PAGES.some((p) => p.group === group)).map(([, heading]) => heading);
  assert.ok(headings.includes("Components"), "no components pages registered");
  for (const page of PREVIEW_PAGES.filter((p) => p.group !== "templates")) {
    const path = previewPath(page);
    const nav = galleryNavOf(readPreviewDist(previewFile(page)));
    assert.ok(nav, `${path}: no <nav aria-label="Template preview pages">`);
    const links = [...nav.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)].map((m) => ({
      href: m[1].match(/\bhref="([^"]*)"/)?.[1],
      text: m[2],
      current: /\baria-current="page"/.test(m[1]),
    }));
    assert.deepEqual(links.map((l) => [l.href, l.text]), expected.map((p) => [previewPath(p), p.title]), path);
    assert.deepEqual(links.filter((l) => l.current).map((l) => l.href), [path], `${path}: aria-current marks the wrong link`);
    assert.deepEqual([...nav.matchAll(/<h2\b[^>]*>([^<]*)<\/h2>/g)].map((m) => m[1]), headings, `${path}: group headings`);
  }
});

test("preview build: the components page has carbon and bone surfaces; the tabs page a tab-groups section", () => {
  const components = readPreviewDist("preview/components/index.html");
  assert.match(components, /<section\b[^>]*id="surface-carbon"/);
  const bone = components.match(/<section\b[^>]*id="surface-bone"[^>]*>/)?.[0] ?? "";
  assert.match(bone, /class="[^"]*\bsurface-bone\b/, "the bone surface lacks the surface-bone class");
  assert.match(readPreviewDist("preview/tabs/index.html"), /<section\b[^>]*id="tab-groups"/);
});
