import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { readDist, visibleText } from "./helpers.mjs";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const home = readDist("index.html");

// Module scripts the home page loads: entry chunks plus their static imports.
function moduleClosure(entries) {
  const seen = new Set();
  const queue = [...entries];
  while (queue.length) {
    const rel = queue.pop();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const code = readFileSync(DIST + rel, "utf8");
    for (const m of code.matchAll(/(?:from|import)\s*["'](\.{1,2}\/[^"']+\.js)["']/g)) {
      const dir = rel.split("/").slice(0, -1).join("/");
      queue.push(new URL(m[1], `file:///${dir}/`).pathname.slice(1));
    }
  }
  return [...seen];
}

test("home page JS stays under 40 KB gzipped (excluding the demo)", () => {
  const entries = [...home.matchAll(/<script[^>]*type="module"[^>]*src="\/([^"]+)"/g)]
    .map((m) => m[1])
    .filter((src) => !/Demo/.test(src));
  const inline = [...home.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const bytes =
    moduleClosure(entries).reduce((n, rel) => n + gzipSync(readFileSync(DIST + rel)).length, 0) +
    inline.reduce((n, code) => n + gzipSync(code).length, 0);
  assert.ok(bytes < 40 * 1024, `home JS is ${bytes} bytes gzipped`);
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
