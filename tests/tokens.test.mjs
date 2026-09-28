import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const css = readFileSync(new URL("../src/styles/global.css", import.meta.url), "utf8");
const theme = css.match(/@theme\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
const token = (name) => theme.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1]?.toLowerCase();

const EXPECTED = {
  carbon: "#0b0b0c", bone: "#f2f1ec", acid: "#c8ff2e", "acid-deep": "#4a6200",
  graphite: "#2a2b2e", muted: "#9a9a94", "muted-dark": "#5c5b55", "bone-line": "#d6d4cc",
  ok: "#c8ff2e", review: "#ffc247", blocked: "#ff7a7a",
  "ok-deep": "#3f5400", "review-deep": "#7a4e00", "blocked-deep": "#a3261c",
};

function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test("Acid Signal tokens have the exact spec values", () => {
  for (const [name, hex] of Object.entries(EXPECTED)) assert.equal(token(name), hex, `--color-${name}`);
});

test("every allowed text/surface pair meets WCAG AA (4.5:1)", () => {
  const pairs = [
    ["bone", "carbon"], ["bone", "graphite"], ["carbon", "bone"], ["carbon", "acid"],
    ["acid", "carbon"], ["acid", "graphite"], ["acid-deep", "bone"],
    ["muted", "carbon"], ["muted", "graphite"], ["muted-dark", "bone"],
    ["ok", "carbon"], ["review", "carbon"], ["blocked", "carbon"],
    ["ok", "graphite"], ["review", "graphite"], ["blocked", "graphite"],
    ["ok-deep", "bone"], ["review-deep", "bone"], ["blocked-deep", "bone"],
  ];
  for (const [fg, bg] of pairs) {
    const r = ratio(token(fg), token(bg));
    assert.ok(r >= 4.5, `${fg} on ${bg} is ${r.toFixed(2)}:1`);
  }
});

test("acid on bone is documented as unusable (it is ~1:1)", () => {
  assert.ok(ratio(token("acid"), token("bone")) < 1.5);
});

test("legacy aliases map onto the new palette", () => {
  const alias = { bg: "carbon", "bg-elev": "graphite", "bg-deep": "carbon", text: "bone", "text-mute": "muted", "text-dim": "muted", accent: "acid", "accent-ink": "carbon", border: "graphite", "border-soft": "graphite" };
  for (const [a, t] of Object.entries(alias)) assert.equal(token(a), EXPECTED[t], `--color-${a}`);
});

test("the built CSS ships Archivo (width axis) and JetBrains Mono, and no Garamond/Inter", () => {
  const dir = fileURLToPath(new URL("../dist/_astro/", import.meta.url));
  const built = readdirSync(dir).filter((f) => f.endsWith(".css")).map((f) => readFileSync(dir + f, "utf8")).join("\n");
  assert.match(built, /Archivo Variable/);
  assert.match(built, /font-stretch:\s*62% 125%/);
  assert.match(built, /JetBrains Mono Variable/);
  assert.doesNotMatch(built, /EB Garamond|Inter Variable/);
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.dependencies["@fontsource/eb-garamond"], undefined);
  assert.equal(pkg.dependencies["@fontsource-variable/inter"], undefined);
});
