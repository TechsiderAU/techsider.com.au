import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readDist, allHtmlFiles } from "./helpers.mjs";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const pages = allHtmlFiles().filter((f) => f.endsWith("index.html"));
const home = readDist("index.html");
const region = (html, tag) => html.slice(html.indexOf(`<${tag}`), html.indexOf(`</${tag}>`) + tag.length + 3);

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
    const shell = region(html, "header") + region(html, "footer");
    for (const [, href] of shell.matchAll(/href="([^"]+)"/g)) {
      if (href.startsWith("mailto:") || href.startsWith("#")) continue;
      assert.ok(href.startsWith("/"), `${f}: external link in shell: ${href}`);
      const path = href.split("#")[0];
      const file = path.endsWith("/") ? `${path}index.html` : path;
      assert.ok(existsSync(DIST + file.slice(1)), `${f}: ${href} does not exist in dist`);
    }
  }
});

test("disclosure toggles and the menu button ship hidden (JS reveals them)", () => {
  const header = region(home, "header");
  const toggles = [...header.matchAll(/<button[^>]*data-nav-toggle[^>]*>/g)].map((m) => m[0]);
  assert.ok(toggles.length > 0);
  for (const t of toggles) {
    assert.match(t, /\bhidden\b/);
    const id = t.match(/aria-controls="([^"]+)"/)[1];
    assert.match(header, new RegExp(`id="${id}"`));
  }
  assert.match(header.match(/<button[^>]*data-menu-open[^>]*>/)[0], /\bhidden\b/);
});

test("the header uses the new wordmark and the no-JS row lists Insights", () => {
  const header = region(home, "header");
  assert.match(header, /src="\/logo\.svg"/);
  assert.doesNotMatch(home, /logo-wordmark\.svg/);
  const basic = header.slice(header.indexOf("nojs-only"));
  assert.match(basic, /href="\/insights\/"/);
});

test("the Insights link is marked current on the insights index", () => {
  const html = readDist("insights/index.html");
  assert.match(region(html, "header"), /<a[^>]*href="\/insights\/"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="\/insights\/"/);
});

test("the footer carries the slogan with its proof line and the email", () => {
  const footer = region(home, "footer");
  assert.match(footer, /AI that ships\./);
  assert.match(footer, /Measured before it ships\./);
  assert.match(footer, /mailto:admin@techsider\.com\.au/);
});
