import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDist, allHtmlFiles } from "./helpers.mjs";
import { primaryFooterColumns } from "../src/data/nav.ts";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const pages = allHtmlFiles().filter((f) => f.endsWith("index.html"));
const home = readDist("index.html");
// The site header (the first <header>) or footer (the last <footer>); "" if the page has none.
const region = (html, tag) => {
  const start = tag === "footer" ? html.lastIndexOf(`<${tag}`) : html.indexOf(`<${tag}`);
  const end = start < 0 ? -1 : html.indexOf(`</${tag}>`, start);
  return end < 0 ? "" : html.slice(start, end + tag.length + 3);
};
// The dist file a root-relative path serves, as GitHub Pages resolves it: "/x/" and the
// extensionless "/x" both serve x/index.html. null unless that is an actual file.
const distFile = (path) => {
  let rel = decodeURIComponent(path).slice(1);
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  else if (!extname(rel)) rel += "/index.html";
  const file = join(DIST, rel);
  return existsSync(file) && statSync(file).isFile() ? file : null;
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasId = (html, id) => new RegExp(`<[a-z][^>]*\\sid="${escapeRe(id)}"[\\s/>]`, "i").test(html);
const basicRow = (header) => header.match(/<nav\b[^>]*aria-label="Main \(basic\)"[^>]*>[\s\S]*?<\/nav>/)?.[0] ?? "";
// True only for an attribute *name* on the tag. Quoted values are blanked first, so a `hidden` or
// `lg:hidden` class can't pass for the attribute, and `data-menu-open-panel` isn't `data-menu-open`.
const hasAttr = (tag, name) =>
  new RegExp(`\\s${name}(?=[\\s=/>])`).test(tag.replace(/"[^"]*"|'[^']*'/g, '""'));

test("every page has the skip link, header, main and footer in order", () => {
  for (const f of pages) {
    const html = readDist(f);
    const skip = html.search(/<a[^>]*href="#main"[^>]*class="[^"]*skip-link/);
    const header = html.indexOf("<header");
    const main = html.search(/<main[^>]*id="main"/);
    const footer = html.indexOf("<footer");
    assert.ok(skip > 0 && skip < header && header < main && main < footer, f);
  }
});

test("html starts as no-js and an inline script flips it to js", () => {
  assert.match(home, /<html[^>]*class="no-js"/);
  assert.match(home, /classList\.replace\(["']no-js["'],\s*["']js["']\)/);
});

test("head links the manifest, icons and theme colour", () => {
  assert.match(home, /<link[^>]*rel="manifest"[^>]*href="\/site\.webmanifest"/);
  assert.match(home, /<meta[^>]*name="theme-color"[^>]*content="#0B0B0C"/i);
  assert.match(home, /<link[^>]*rel="icon"[^>]*href="\/favicon\.svg"/);
  assert.match(home, /<link[^>]*rel="apple-touch-icon"[^>]*href="\/apple-touch-icon\.png"/);
});

test("the display font is preloaded and the stylesheet uses the same file", () => {
  const href = home.match(/<link[^>]*rel="preload"[^>]*as="font"[^>]*href="([^"]+)"/)?.[1]
    ?? home.match(/<link[^>]*href="([^"]+)"[^>]*rel="preload"[^>]*as="font"/)?.[1];
  assert.ok(href && /archivo-latin-wdth-normal/.test(href), `preload href: ${href}`);
  const css = readdirSync(DIST + "_astro").filter((f) => f.endsWith(".css")).map((f) => readFileSync(DIST + "_astro/" + f, "utf8")).join("");
  assert.ok(css.includes(href), "preloaded font URL not referenced by the CSS");
});

test("every header and footer link resolves to a built page", () => {
  for (const f of pages) {
    const html = readDist(f);
    const header = region(html, "header");
    const footer = region(html, "footer");
    assert.match(header, /href="/, `${f}: no site header with links found`);
    assert.match(footer, /href="/, `${f}: no site footer with links found`);
    for (const [, href] of (header + footer).matchAll(/href="([^"]+)"/g)) {
      if (href.startsWith("mailto:")) continue;
      assert.ok(/^\/(?!\/)|^#/.test(href), `${f}: external link in shell: ${href}`);
      const [path, fragment] = href.split("#");
      const file = path === "" ? join(DIST, f) : distFile(path);
      assert.ok(file, `${f}: ${href} is not a file in dist (extensionless paths resolve to index.html)`);
      if (fragment) assert.ok(hasId(readFileSync(file, "utf8"), decodeURIComponent(fragment)), `${f}: ${href}: no element with id="${fragment}" on the target page`);
    }
  }
});

test("the link resolver maps paths as GitHub Pages serves them", () => {
  assert.equal(distFile("/"), join(DIST, "index.html"));
  assert.equal(distFile("/insights/"), join(DIST, "insights/index.html"));
  assert.equal(distFile("/insights"), join(DIST, "insights/index.html"));
  assert.equal(distFile("/logo.svg"), join(DIST, "logo.svg"));
  assert.equal(distFile("/_astro"), null, "a directory without index.html is not a page");
  assert.equal(distFile("/_astro/"), null);
  assert.equal(distFile("/no-such-page/"), null);
  assert.ok(hasId('<section id="demo" class="x">', "demo"));
  assert.ok(!hasId('<section data-id="demo">', "demo"));
  assert.ok(!hasId('<section id="demo-2">', "demo"));
  assert.ok(!hasId('<a href="#demo">', "demo"));
});

test("production: the no-JS basic link row is in every header and reaches every live hub (Review Focus 1)", () => {
  // Every nav hub is live from Phase C Task 7, so the row holds the five hubs; Insights sits on /resources/.
  const hubs = ["/solutions/", "/services/", "/demos/", "/about/"];
  assert.equal(hubs.length, 4);
  for (const f of pages) {
    const row = basicRow(region(readDist(f), "header"));
    assert.ok(row, `${f}: no <nav aria-label="Main (basic)"> in the header`);
    assert.match(row.match(/^<nav\b[^>]*>/)[0], /class="[^"]*\bnojs-only\b/, `${f}: the basic row is not no-JS only`);
    for (const href of hubs) assert.match(row, new RegExp(`<a[^>]*href="${escapeRe(href)}"`), `${f}: the basic row has no link to ${href}`);
  }
});

test("disclosure toggles and the menu button ship hidden (JS reveals them)", () => {
  const header = region(home, "header");
  const buttons = [...header.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
  const toggles = buttons.filter((b) => hasAttr(b, "data-nav-toggle"));
  assert.ok(toggles.length > 0);
  for (const t of toggles) {
    assert.ok(hasAttr(t, "hidden"), `toggle ships without the hidden attribute: ${t}`);
    const id = t.match(/aria-controls="([^"]+)"/)[1];
    assert.match(header, new RegExp(`id="${id}"`));
  }
  const menuOpen = buttons.filter((b) => hasAttr(b, "data-menu-open"));
  assert.equal(menuOpen.length, 1, "expected exactly one data-menu-open button");
  assert.ok(hasAttr(menuOpen[0], "hidden"), `menu button ships without the hidden attribute: ${menuOpen[0]}`);
});

test("the attribute check ignores hidden classes and longer attribute names", () => {
  assert.ok(!hasAttr('<button class="menu-toggle lg:hidden" data-menu-open>', "hidden"));
  assert.ok(!hasAttr('<button class="nav-toggle hidden lg:inline-flex" data-nav-toggle>', "hidden"));
  assert.ok(!hasAttr('<button aria-label="hidden" data-nav-toggle>', "hidden"));
  assert.ok(hasAttr('<button class="menu-toggle lg:hidden" hidden data-menu-open>', "hidden"));
  assert.ok(hasAttr('<button hidden="" data-nav-toggle>', "hidden"));
  assert.ok(hasAttr('<button class="x" hidden>', "hidden"));
  assert.ok(!hasAttr('<button class="menu-row" data-menu-open-panel="resources">', "data-menu-open"));
  assert.ok(hasAttr('<button hidden data-menu-open data-astro-cid-x>', "data-menu-open"));
});

test("the header uses the new wordmark", () => {
  const header = region(home, "header");
  assert.match(header, /src="\/logo\.svg"/);
  assert.doesNotMatch(home, /logo-wordmark\.svg/);
});

test("the Insights link is marked current on the insights index", () => {
  const html = readDist("insights/index.html");
  assert.match(region(html, "header"), /<a[^>]*href="\/insights\/"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="\/insights\/"/);
});

test("the footer carries the slogan with its proof line and the email", () => {
  const footer = region(home, "footer");
  assert.match(footer, /AI automation for Australian businesses\./);

  assert.match(footer, /mailto:admin@techsider\.com\.au/);
});

test("the footer is one navigation landmark named Footer; its columns are headed lists, not navs (B6)", () => {
  for (const f of pages) {
    const footer = region(readDist(f), "footer");
    const navs = [...footer.matchAll(/<nav\b[^>]*>/g)].map((m) => m[0]);
    assert.equal(navs.length, 1, `${f}: expected exactly one <nav> in the footer, found ${navs.length}`);
    assert.match(navs[0], /aria-label="Footer"/, `${f}: the footer nav is not labelled "Footer": ${navs[0]}`);
    const nav = footer.slice(footer.indexOf(navs[0]), footer.indexOf("</nav>"));
    assert.equal([...nav.matchAll(/<h2\b/g)].length, primaryFooterColumns(false).length, `${f}: expected one <h2> per footer column`);
  }
});

test("the positioning line, email and 'Start with one workflow' CTA sit below the columns (spec §7.3)", () => {
  const footer = region(home, "footer");
  const navEnd = footer.indexOf("</nav>");
  assert.ok(navEnd > 0, "no footer nav");
  const [columns, after] = [footer.slice(0, navEnd), footer.slice(navEnd)];
  assert.match(after, /AI automation for Australian businesses\./);

  assert.match(after, /<a[^>]*href="mailto:admin@techsider\.com\.au"[^>]*>\s*admin@techsider\.com\.au\s*<\/a>/);
  assert.match(after, /<a[^>]*class="[^"]*\bbtn-primary\b[^"]*"[^>]*>\s*Start with one workflow\s*<\/a>/);
  assert.doesNotMatch(columns, /AI that ships|admin@techsider|Start with one workflow/, "sign-off content appears before the columns");
});
