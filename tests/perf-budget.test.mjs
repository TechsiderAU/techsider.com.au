// Spec §11.4: the Home page ships under 40 KB of JavaScript, gzipped, "excluding the lazily loaded
// demo chunk", and demos load "on their own pages or when the Home demo band enters the viewport".
// The budget counts every module script the page names, everything those scripts import
// statically, and every inline script. A dynamic import() is the lazily loaded demo chunk: it is
// followed separately. The ② demo's renderer and data must sit behind one, never in the page's
// eager JavaScript; the data is recognised by its corpus URLs, which only the data file holds. The
// small engine that starts the band when it scrolls into view (src/scripts/demo-engine.ts, found by
// the createPlayback() getter it reuses from src/scripts/playback.ts, whose names survive
// minification) loads with the page and counts against the budget. No WebGL: the Three.js hero is
// gone (spec §6.5).
// Run `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { readDist, visibleText } from "./helpers.mjs";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const BUDGET = 40 * 1024;
const home = readDist("index.html");
/** A static import or re-export of a built chunk: `import"./x.js"`, `from"./x.js"`, or a root-relative `/_astro/x.js`. */
const STATIC_IMPORT = /(?:\bfrom|\bimport)\s*["']((?:\.{1,2}|\/_astro)\/[^"'`]+\.js)["']/g;
/** A dynamic import(), which Vite writes with a backtick string: import(`./x.js`). */
const DYNAMIC_IMPORT = /\bimport\(\s*["'`]((?:\.{1,2}|\/_astro)\/[^"'`]+\.js)["'`]\s*\)/g;
/** createPlayback()'s `cancelled` getter (src/scripts/playback.ts): present wherever the demo engine is. */
const ENGINE = /\bget cancelled\(\)/;
/** The ② demo's corpus URLs: only its data file holds them, so they mark the data's chunk. */
const DEMO_URLS = JSON.parse(readFileSync(new URL("../src/data/demos/knowledge-assistant.json", import.meta.url), "utf8"))
  .data.scenarios.map((scenario) => scenario.corpus.url);

/** The dist/ path an import names, resolved from the file that names it ("index.html" for an inline script). */
function resolveImport(spec, from) {
  if (spec.startsWith("/")) return spec.slice(1);
  const dir = from.split("/").slice(0, -1).join("/");
  return new URL(spec, dir ? `file:///${dir}/` : "file:///").pathname.slice(1);
}

/** The imports `code` names, split into the static ones and the dynamic ones, as dist/ paths. */
function importsOf(code, from) {
  return {
    eager: [...code.matchAll(STATIC_IMPORT)].map((m) => resolveImport(m[1], from)),
    lazy: [...code.matchAll(DYNAMIC_IMPORT)].map((m) => resolveImport(m[1], from)),
  };
}

/** Every module `entries` reach through static imports, and the dynamic import() targets on the way. */
function closure(entries) {
  const modules = new Set();
  const lazy = new Set();
  const queue = [...entries];
  while (queue.length) {
    const rel = queue.pop();
    if (modules.has(rel)) continue;
    modules.add(rel);
    const found = importsOf(readFileSync(DIST + rel, "utf8"), rel);
    queue.push(...found.eager);
    for (const target of found.lazy) lazy.add(target);
  }
  return { modules, lazy };
}

/** The page's JavaScript: its eager modules and inline scripts, and the modules it loads lazily. */
function pageScripts(html) {
  const tags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
  const isJs = (attrs) => {
    const type = attrs.match(/\btype="([^"]*)"/)?.[1];
    return type === undefined || type === "module" || type === "text/javascript";
  };
  const entries = tags.map(([, attrs]) => attrs.match(/\bsrc="\/([^"]+)"/)?.[1]).filter(Boolean);
  const inline = tags.filter(([, attrs]) => !/\bsrc=/.test(attrs) && isJs(attrs)).map(([, , code]) => code);
  const fromInline = inline.map((code) => importsOf(code, "index.html"));
  const eager = closure([...entries, ...fromInline.flatMap((f) => f.eager)]);
  const lazyRoots = [...eager.lazy, ...fromInline.flatMap((f) => f.lazy)].filter((rel) => !eager.modules.has(rel));
  const lazyModules = new Set();
  let pending = lazyRoots;
  while (pending.length) {
    const next = closure(pending);
    for (const rel of next.modules) if (!eager.modules.has(rel)) lazyModules.add(rel);
    pending = [...next.lazy].filter((rel) => !eager.modules.has(rel) && !lazyModules.has(rel));
  }
  return { eager: [...eager.modules], inline, lazy: [...lazyModules] };
}

const scripts = pageScripts(home);
const read = (rel) => readFileSync(DIST + rel, "utf8");

test("the import readers tell a static import from a dynamic one, in the forms Vite writes", () => {
  const code = 'import{a as e}from"./nav.Ab12.js";import"./side.Cd34.js";export*from"/_astro/re.Ef56.js";const t=()=>r(()=>import(`./demo-engine.Gh78.js`),[]);import("/_astro/assistant.Ij90.js");';
  const found = importsOf(code, "_astro/entry.Kl12.js");
  assert.deepEqual(found.eager, ["_astro/nav.Ab12.js", "_astro/side.Cd34.js", "_astro/re.Ef56.js"]);
  assert.deepEqual(found.lazy, ["_astro/demo-engine.Gh78.js", "_astro/assistant.Ij90.js"]);
  assert.deepEqual(importsOf('import("./x.Mn34.js")', "index.html").lazy, ["x.Mn34.js"]);
});

test("home page JS stays under 40 KB gzipped, excluding the lazily loaded demo chunk (spec §11.4)", () => {
  const bytes =
    scripts.eager.reduce((n, rel) => n + gzipSync(read(rel)).length, 0) +
    scripts.inline.reduce((n, code) => n + gzipSync(code).length, 0);
  assert.ok(scripts.eager.length + scripts.inline.length > 0, "the Home page loads no JavaScript at all");
  assert.ok(bytes < BUDGET, `home JS is ${bytes} bytes gzipped (budget ${BUDGET})`);
});

test("the Home demo band loads the ② demo lazily: its renderer and data sit behind a dynamic import(), never in the page's eager JS (spec §11.4)", () => {
  assert.ok(/\bdata-template="home"/.test(home), "dist/index.html is not the HomeTemplate page");
  const eager = [...scripts.eager.map(read), ...scripts.inline];
  const lazy = scripts.lazy.map(read);
  // The engine loads with the page and counts against the budget (see the header), so it must be in
  // the eager JavaScript, not only in a lazy chunk (final review D8-M1).
  assert.ok(eager.some((code) => ENGINE.test(code)), "the demo engine isn't in the Home page's eager JS, so the budget doesn't count it");
  assert.ok(DEMO_URLS.length > 0, "the ② demo has no scenario");
  for (const url of DEMO_URLS) {
    assert.ok(!eager.some((code) => code.includes(url)), `the ② demo's data (${url}) is in the Home page's eager JS`);
    assert.ok(lazy.some((code) => code.includes(url)), `no lazily loaded chunk holds the ② demo's data (${url}); lazy: ${scripts.lazy.join(", ")}`);
  }
});

test("no Three.js or WebGL hero ships", () => {
  const assets = readdirSync(DIST + "_astro");
  assert.ok(!assets.some((f) => /hero-three|HeroScene/i.test(f)), assets.join(", "));
  assert.doesNotMatch(home, /hero-canvas/);
  assert.doesNotMatch(visibleText(home), /Drag to orbit/);
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.dependencies?.three, undefined);
  assert.equal(pkg.devDependencies?.["@types/three"], undefined);
});
