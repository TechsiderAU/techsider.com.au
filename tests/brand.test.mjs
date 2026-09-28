import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const pub = (f) => new URL(`../public/${f}`, import.meta.url);
const read = (f) => readFileSync(pub(f));

function pngSize(buf) {
  assert.equal(buf.toString("ascii", 1, 4), "PNG");
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

test("wordmark SVGs are outlined paths in the right colours", () => {
  const dark = read("logo.svg").toString();
  const light = read("logo-on-bone.svg").toString();
  for (const svg of [dark, light]) {
    assert.doesNotMatch(svg, /<text/);
    assert.match(svg, /<path /);
    assert.match(svg, /aria-label="Techsider"/);
  }
  assert.match(dark, /fill="#C8FF2E"/);
  assert.match(dark, /fill="#F2F1EC"/);
  assert.doesNotMatch(light, /#C8FF2E|#F2F1EC/);
  assert.match(light, /fill="#0B0B0C"/);
});

test("favicon SVG is the bracketed-t mark on the 32-unit grid", () => {
  const svg = read("favicon.svg").toString();
  assert.match(svg, /viewBox="0 0 32 32"/);
  assert.match(svg, /fill="#0B0B0C"/);
  assert.match(svg, /fill="#C8FF2E"/);
  assert.match(svg, /fill="#F2F1EC"/);
});

test("favicon.ico holds 16, 32 and 48 px images", () => {
  const ico = read("favicon.ico");
  assert.equal(ico.readUInt16LE(2), 1);
  const count = ico.readUInt16LE(4);
  const sizes = new Set();
  for (let i = 0; i < count; i++) sizes.add(ico[6 + i * 16] || 256);
  assert.deepEqual([...sizes].sort((a, b) => a - b), [16, 32, 48]);
});

test("PNG icons have the expected sizes", () => {
  assert.deepEqual(pngSize(read("apple-touch-icon.png")), [180, 180]);
  assert.deepEqual(pngSize(read("icon-192.png")), [192, 192]);
  assert.deepEqual(pngSize(read("icon-512.png")), [512, 512]);
  assert.deepEqual(pngSize(read("icon-maskable-512.png")), [512, 512]);
});

test("web manifest names the site and lists the icons", () => {
  const m = JSON.parse(read("site.webmanifest"));
  assert.equal(m.name, "Techsider");
  assert.equal(m.theme_color, "#0B0B0C");
  assert.equal(m.background_color, "#0B0B0C");
  assert.ok(m.icons.some((i) => i.purpose === "maskable" && i.sizes === "512x512"));
});

test("the retired cloud wordmark is gone", () => {
  assert.equal(existsSync(pub("logo-wordmark.svg")), false);
});
