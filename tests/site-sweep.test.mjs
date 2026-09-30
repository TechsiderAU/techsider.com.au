// The full-site sweep of the production build, static half (spec §6.6, §7.4, §11.3; Phase C Review
// Focus 2). Every page in dist/ is swept, whatever it is (a live nav page, an insight, the 404), so a
// page is held to these rules from the build in which it goes live:
// - one h1, inside <main>, where the headings start at it and never skip a level;
// - no id twice;
// - a <title> and a meta description of 150–160 characters that no other page shares;
// - robots noindex on the 404 alone;
// - no link, anywhere on the page, to a planned page of nav.ts or a path inside one. Check 02 then
//   proves that every link lands: `npm run build` runs it on dist/.
// tests/e2e/prod-site-sweep.spec.mjs holds the browser half (axe, 320px, links landing).
// Run `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { decodeEntities, elements, hrefsIn, htmlFiles, isExternal, pageUrl, readText, startTags } from "../scripts/ci/lib.mjs";
import { PAGES } from "../src/data/nav.ts";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const BUILT = htmlFiles(DIST).map((file) => ({ url: pageUrl(DIST, file), html: readText(file) }));
const mainOf = (html) => elements(html, (t) => t.name === "main")[0]?.inner ?? "";
const headOf = (html) => html.slice(0, html.indexOf("</head>"));
const titleOf = (html) => {
  const m = headOf(html).match(/<title>([^<]*)<\/title>/);
  return m ? decodeEntities(m[1]).trim() : undefined;
};
const descriptionOf = (html) => {
  const m = headOf(html).match(/<meta name="description" content="([^"]*)"/);
  return m ? decodeEntities(m[1]) : undefined;
};
const PLANNED = PAGES.filter((p) => p.status === "planned").map((p) => p.path);
/** True for a planned page of nav.ts, or a path inside one ("/demos/" holds "/demos/x/"). */
const inPlanned = (path) => PLANNED.some((p) => path === p || (p.endsWith("/") && path.startsWith(p)));
/** Values seen more than once, each with every page it appears on. */
function repeated(pairs) {
  const where = new Map();
  for (const [value, url] of pairs) where.set(value, [...(where.get(value) ?? []), url]);
  return [...where].filter(([, urls]) => urls.length > 1).map(([value, urls]) => `"${value}" on ${urls.join(", ")}`);
}

test("the sweep reads the production build: Home, the 404, Insights and at least one post", () => {
  const urls = BUILT.map((p) => p.url);
  assert.ok(urls.length > 0, "dist/ holds no page: run `npm run build` first");
  for (const url of ["/", "/404.html", "/insights/"]) assert.ok(urls.includes(url), `dist/ has no ${url}`);
  assert.ok(urls.some((u) => /^\/insights\/[^/]+\/$/.test(u)), "dist/ has no insight post");
});

test("every page has one h1, in <main>, and the headings in <main> start at it and never skip a level", () => {
  for (const { url, html } of BUILT) {
    assert.equal(startTags(html).filter((t) => t.name === "h1").length, 1, `${url}: not exactly one h1`);
    const levels = startTags(mainOf(html)).filter((t) => /^h[1-6]$/.test(t.name)).map((t) => Number(t.name[1]));
    assert.equal(levels[0], 1, `${url}: the first heading in <main> is not the h1`);
    const skips = levels.flatMap((level, i) => (i > 0 && level > levels[i - 1] + 1 ? [`h${levels[i - 1]} → h${level}`] : []));
    assert.deepEqual(skips, [], `${url}: headings skip a level`);
  }
});

test("no page repeats an id", () => {
  for (const { url, html } of BUILT) {
    const ids = startTags(html).map((t) => t.attrs.id).filter(Boolean);
    assert.deepEqual([...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))], [], `${url} repeats these ids`);
  }
});

test("every page has its own title and its own meta description of 150–160 characters (spec §11.3)", () => {
  for (const { url, html } of BUILT) {
    assert.ok(titleOf(html), `${url} has no <title>`);
    const d = descriptionOf(html);
    assert.ok(d, `${url} has no meta description`);
    assert.ok(d.length >= 150 && d.length <= 160, `${url}: its description is ${d.length} characters`);
  }
  assert.deepEqual(repeated(BUILT.map(({ url, html }) => [titleOf(html), url])), [], "titles shared between pages");
  assert.deepEqual(repeated(BUILT.map(({ url, html }) => [descriptionOf(html), url])), [], "descriptions shared between pages");
});

test("only the 404 is noindex: every other page production builds is meant to be found", () => {
  const noindex = BUILT.filter(({ html }) => /<meta name="robots" content="noindex"/.test(headOf(html))).map((p) => p.url);
  assert.deepEqual(noindex, ["/404.html"]);
});

test("no page links to a planned page, or to a path inside one, anywhere on the page (Review Focus 2)", () => {
  // Phase D Task 7 put /demos/ and its pages live; these wait for owner or lawyer review.
  for (const path of ["/trust/", "/resources/safe-use-kits/", "/legal/", "/legal/privacy/", "/contact/sent/"]) {
    assert.ok(inPlanned(path), `${path} is no longer planned: update this self-check`);
  }
  const offenders = [];
  for (const { url, html } of BUILT) {
    for (const href of new Set(hrefsIn(html))) {
      if (isExternal(href)) continue;
      const path = decodeURIComponent(new URL(href, `http://site${url}`).pathname);
      if (inPlanned(path)) offenders.push(`${url} → ${href}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("the sweep reads Phase D's pages: the Demos hub, the five demo pages, the checker and the evaluation method", () => {
  const urls = new Set(BUILT.map((p) => p.url));
  const phaseD = [
    "/demos/", "/demos/document-registers/", "/demos/knowledge-assistant/", "/demos/draft-for-approval/",
    "/demos/ai-evaluation/", "/demos/ai-switch-on/", "/resources/what-you-already-pay-for/", "/resources/evaluation-method/",
  ];
  assert.deepEqual(phaseD.filter((url) => !urls.has(url)), [], "production doesn't build these Phase D pages");
});

test("every page names one canonical URL: its own, except the ⑤ demo page, whose canonical is the checker's page (spec §8.8)", () => {
  const CANONICAL = { "/demos/ai-switch-on/": "/resources/what-you-already-pay-for/" };
  for (const { url, html } of BUILT) {
    const hrefs = startTags(headOf(html)).filter((t) => t.name === "link" && t.attrs.rel === "canonical").map((t) => t.attrs.href);
    assert.equal(hrefs.length, 1, `${url} has ${hrefs.length} canonical links`);
    // The 404 is noindex, and Astro names /404/ as its canonical: it has no URL of its own to claim.
    if (url === "/404.html") continue;
    assert.equal(hrefs[0], `https://techsider.com.au${CANONICAL[url] ?? url}`, `${url}: its canonical URL`);
  }
});
