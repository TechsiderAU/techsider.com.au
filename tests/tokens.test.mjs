import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "tailwindcss";

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

// Compile global.css with Tailwind's own compiler for the given class candidates.
// The @fontsource imports only add @font-face rules, so they load as empty sheets.
const require = createRequire(import.meta.url);
async function buildCss(candidates) {
  const compiler = await compile(css, {
    base: fileURLToPath(new URL("../src/styles/", import.meta.url)),
    async loadStylesheet(id, base) {
      if (id.startsWith("@fontsource")) return { path: id, base, content: "" };
      const path = id.startsWith(".") ? join(base, id) : require.resolve(id === "tailwindcss" ? "tailwindcss/index.css" : id);
      return { path, base: dirname(path), content: readFileSync(path, "utf8") };
    },
  });
  return compiler.build(candidates);
}

// Every block in a stylesheet, in source order, with the preludes enclosing it and its own declarations.
function blocks(source) {
  const out = [];
  const stack = [];
  let buf = "";
  const flush = () => {
    const d = buf.trim().replace(/\s+/g, " ").replace(/^([\w-]+)\s*:\s*/, "$1:");
    if (d && stack.length) stack.at(-1).decls.push(d);
    buf = "";
  };
  for (const ch of source.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (ch === "{") {
      const b = { prelude: buf.trim().replace(/\s+/g, " "), within: stack.map((s) => s.prelude), decls: [] };
      out.push(b);
      stack.push(b);
      buf = "";
    } else if (ch === "}") {
      flush();
      stack.pop();
    } else if (ch === ";") flush();
    else buf += ch;
  }
  return out;
}
const layerOf = (b) => b.within.find((p) => p.startsWith("@layer"));

test("base rules sit in @layer base, so a utility can still restyle the focus ring", async () => {
  const out = blocks(await buildCss(["focus-visible:outline-carbon", "focus-visible:outline-offset-[-2px]"]));
  // [selector, one of its declarations, enclosing @media or null]
  const base = [
    ["html", "background:var(--color-carbon)", null],
    ["html", "scroll-behavior:smooth", "@media (prefers-reduced-motion: no-preference)"],
    ["body", "font-family:var(--font-sans)", null],
    ["::selection", "background:var(--color-acid)", null],
    [":focus-visible", "outline:2px solid var(--color-acid)", null],
    ["*, *::before, *::after", "animation-duration:0.01ms !important", "@media (prefers-reduced-motion: reduce)"],
  ];
  for (const [sel, decl, media] of base) {
    const found = out.filter((b) => b.prelude.replace(/\s/g, "") === sel.replace(/\s/g, "") && b.decls.includes(decl));
    assert.ok(found.length > 0, `${sel} { ${decl} } exists`);
    for (const b of found) {
      assert.equal(layerOf(b), "@layer base", `${sel} { ${decl} } is in @layer base, not unlayered`);
      if (media) assert.ok(b.within.includes(media), `${sel} { ${decl} } is inside ${media}`);
    }
  }
  const ring = out.find((b) => b.prelude === ":focus-visible" && layerOf(b) === "@layer base");
  assert.deepEqual(ring.decls, ["outline:2px solid var(--color-acid)", "outline-offset:2px"]);
  for (const sel of [".focus-visible\\:outline-carbon:focus-visible", ".focus-visible\\:outline-offset-\\[-2px\\]:focus-visible"]) {
    const u = out.find((b) => b.prelude === sel);
    assert.ok(u, `${sel} is generated`);
    assert.equal(layerOf(u), "@layer utilities", `${sel} is in @layer utilities, which beats @layer base`);
  }

  // The shipped stylesheet keeps the layer too.
  const dir = fileURLToPath(new URL("../dist/_astro/", import.meta.url));
  const built = blocks(readdirSync(dir).filter((f) => f.endsWith(".css")).map((f) => readFileSync(dir + f, "utf8")).join("\n"));
  const shipped = built.filter((b) => b.prelude === ":focus-visible" && b.decls.includes("outline:2px solid var(--color-acid)"));
  assert.ok(shipped.length > 0, "built CSS has the :focus-visible ring");
  for (const b of shipped) assert.equal(layerOf(b), "@layer base", "built :focus-visible is in @layer base");
});

test("surface-bone is a layered utility: variants reach it and single-purpose utilities override it", async () => {
  assert.ok(blocks(css).some((b) => b.prelude === "@utility surface-bone" && b.within.length === 0), "@utility surface-bone");
  const out = blocks(await buildCss(["surface-bone", "md:surface-bone", "bg-bone-line", "text-muted-dark", "scanlines"]));
  const at = (sel) => out.findIndex((b) => b.prelude === sel);
  for (const sel of [".surface-bone", ".md\\:surface-bone", ".bg-bone-line", ".text-muted-dark", ".scanlines"]) {
    assert.ok(at(sel) >= 0, `${sel} is generated`);
    assert.equal(layerOf(out[at(sel)]), "@layer utilities", `${sel} is in @layer utilities`);
  }
  for (const b of out.filter((b) => b.prelude === ".surface-bone")) {
    assert.equal(layerOf(b), "@layer utilities", "no unlayered .surface-bone rule");
  }
  const bone = out[at(".surface-bone")];
  assert.ok(bone.decls.includes("background-color:var(--color-bone)"), "bone background");
  assert.ok(bone.decls.includes("color:var(--color-carbon)"), "carbon text");
  const ring = out.find((b) => b.prelude === "& :focus-visible" && b.within.at(-1) === ".surface-bone");
  assert.deepEqual(ring?.decls, ["outline-color:var(--color-carbon)"], "carbon focus ring on bone");
  // Same specificity, so source order decides: these must come after surface-bone to win on the same element.
  for (const sel of [".bg-bone-line", ".text-muted-dark", ".scanlines"]) {
    assert.ok(at(".surface-bone") < at(sel), `${sel} comes after .surface-bone`);
  }
});
