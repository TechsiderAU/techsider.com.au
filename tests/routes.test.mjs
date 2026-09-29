// The Phase C routes as the builds render them. /404 is always built, as 404.html (GitHub Pages
// serves it for any path it has no file for): noindex, with its own title and description, one h1
// and a card for each hub the build shows. Production builds exactly the live nav pages and the
// published insights, and check 02 passes on it, so no live page links to a planned one.
// Run `npm run build && npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allHtmlFiles, readDist, readPreviewDist, visibleText } from "./helpers.mjs";
import { decodeEntities, elements, elementsWith, listFiles, readFrontmatter } from "../scripts/ci/lib.mjs";
import { run as checkLinks } from "../scripts/ci/checks/02-links.mjs";
import { PAGES, SITE } from "../src/data/nav.ts";
import { pageDescription, pageTitle } from "../src/lib/meta.ts";
import { pageAt } from "../src/lib/pages.ts";
import { siteContext } from "../src/lib/site.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = join(ROOT, "dist");
/** The hubs NotFoundTemplate offers, in its order. */
const HUBS = ["home", "solutions", "industries", "services", "resources", "insights", "demos", "about"];
const text = (html) => visibleText(html).trim();
/** Text with tags removed outright, so "Page not <span>found</span>." reads "Page not found.". */
const inlineText = (html) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const mainOf = (html) => elements(html, (t) => t.name === "main")[0]?.inner ?? "";
/** The dist file a nav path is built as: "/" → index.html, "/404" → 404.html, "/x/" → x/index.html. */
const fileOf = (path) => (path === "/404" ? "404.html" : `${path.slice(1)}index.html`);

function expectNotFoundPage(html, site, build) {
  const head = html.slice(0, html.indexOf("</head>"));
  assert.match(head, /<meta name="robots" content="noindex">/, `${build}: the 404 is indexable`);
  assert.equal(head.match(/<title>([^<]*)<\/title>/)?.[1], pageTitle(pageAt("/404")), `${build}: title`);
  assert.equal(pageTitle(pageAt("/404")), "Not found | Techsider");
  const description = head.match(/<meta name="description" content="([^"]*)">/)?.[1];
  assert.equal(description === undefined ? undefined : decodeEntities(description), pageDescription(pageAt("/404")), `${build}: meta description`);
  const main = mainOf(html);
  const h1 = elements(main, (t) => t.name === "h1");
  assert.equal(h1.length, 1, `${build}: ${h1.length} h1 elements`);
  assert.equal(inlineText(h1[0].inner), "Page not found.");
  assert.equal(elementsWith(main, "data-template", "not-found").length, 1, `${build}: NotFoundTemplate isn't rendered once`);
  const shown = HUBS.map((key) => site.page(key)).filter((p) => p.href !== null);
  const cards = elementsWith(main, "data-hub");
  assert.deepEqual(cards.map((c) => c.attrs["data-hub"]), shown.map((p) => p.key), `${build}: hub cards`);
  cards.forEach((card, i) => {
    const links = elements(card.inner, (t) => t.name === "a").map((a) => [text(a.inner), a.attrs.href]);
    assert.deepEqual(links, [[shown[i].label, shown[i].href]], `${build}: the ${shown[i].key} card`);
  });
  const [report] = elementsWith(main, "data-report-link");
  assert.deepEqual(
    elements(report.inner, (t) => t.name === "a").map((a) => [text(a.inner), a.attrs.href]),
    [["Report this link", `mailto:${SITE.email}?subject=Broken%20link`]],
  );
  assert.ok(text(report.inner).includes(SITE.email), `${build}: the address isn't plain text`);
}

test("production: dist/404.html is noindex, titled and described, with one h1 and only the shown hubs", () => {
  const site = siteContext(false);
  expectNotFoundPage(readDist("404.html"), site, "dist");
  const shown = HUBS.filter((key) => site.page(key).href !== null);
  assert.ok(shown.includes("home") && shown.includes("insights"), "Home or Insights isn't offered");
  assert.ok(!shown.includes("demos"), "the Demos hub is offered before Phase D builds it");
});

test("preview: dist-preview/404.html offers every hub, since the preview build shows every page", () => {
  const site = siteContext(true);
  assert.ok(HUBS.every((key) => site.page(key).href !== null));
  expectNotFoundPage(readPreviewDist("404.html"), site, "dist-preview");
});

test("production builds exactly the live nav pages and the published insights", () => {
  const posts = listFiles(join(ROOT, "src/content/insights"), (rel) => rel.endsWith(".md"))
    .filter((file) => readFrontmatter(file).draft !== true)
    .map((file) => `insights/${basename(file, ".md")}/index.html`);
  const live = PAGES.filter((p) => p.status === "live").map((p) => fileOf(p.path));
  assert.deepEqual(allHtmlFiles().sort(), [...live, ...posts].sort());
  assert.ok(live.includes("404.html"), "the 404 isn't built");
});

test("check 02 passes on production dist/: every link lands, the 404's included, and every live page is built", async () => {
  const html = readDist("404.html");
  assert.ok(elementsWith(html, "data-hub").length > 0, "the 404 has no hub links to check");
  const { errors } = await checkLinks({ root: ROOT, dist: DIST });
  assert.deepEqual(errors, []);
});

test("the sitemap leaves the 404 out", () => {
  const sitemap = readDist("sitemap-0.xml");
  assert.ok(sitemap.includes("<loc>https://techsider.com.au/insights/</loc>"), "the sitemap lists no pages");
  assert.doesNotMatch(sitemap, /\/404\b/);
});
