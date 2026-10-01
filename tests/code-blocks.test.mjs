// Code blocks in Markdown (Phase B2 carry-over WB-8): Shiki's colours become classes that Prose
// colours with spec §6.1 tokens, so no code block carries an inline style, and the <pre> keeps
// Shiki's tabindex="0", so a block that scrolls sideways can be scrolled from the keyboard.
// Run `npm run build && npm run build:preview` first. tests/e2e/prod-code-blocks.spec.mjs checks the
// colours and the scrolling in a browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { elements, htmlFiles, readText, relPath } from "../scripts/ci/lib.mjs";
import { readDist } from "./helpers.mjs";
import { shikiClasses, tokenClasses } from "../src/lib/shiki-classes.ts";

const BUILDS = ["dist", "dist-preview"].map((d) => fileURLToPath(new URL(`../${d}/`, import.meta.url)));
/** Every class the transformer can give a token, and the line wrapper Shiki adds. */
const TOKEN_CLASS = /^(?:line|tok-(?:keyword|constant|string|string-expression|comment|function|parameter|punctuation|link|inserted|deleted|changed|italic|bold|underline))$/;

test("tokenClasses turns css-variables colours and font styles into classes, and drops layout styles", () => {
  assert.deepEqual(tokenClasses("color:var(--astro-code-token-keyword)"), ["tok-keyword"]);
  assert.deepEqual(tokenClasses("color:var(--astro-code-token-comment);font-style:italic"), ["tok-comment", "tok-italic"]);
  assert.deepEqual(tokenClasses("color:var(--astro-code-foreground)"), [], "the default colour needs no class");
  assert.deepEqual(tokenClasses("background-color:var(--astro-code-background);color:var(--astro-code-foreground); overflow-x: auto;"), []);
  assert.deepEqual(tokenClasses("user-select: none;"), []);
});

test("tokenClasses refuses a colour that isn't a css-variables token, so a changed theme fails the build", () => {
  assert.throws(() => tokenClasses("color:#E1E4E8"), /not a css-variables colour/);
  assert.throws(() => tokenClasses("background-color:#24292e"), /not a css-variables colour/);
  assert.throws(() => tokenClasses("text-shadow:0 0 1px red"), /unexpected style/);
});

test("the transformer strips every inline style in the tree it is given and keeps the tabindex", () => {
  const root = {
    type: "root",
    children: [{
      type: "element", tagName: "pre",
      properties: { class: "astro-code css-variables", style: "background-color:var(--astro-code-background);color:var(--astro-code-foreground); overflow-x: auto;", tabindex: "0" },
      children: [{ type: "element", tagName: "code", properties: {}, children: [
        { type: "element", tagName: "span", properties: { class: "line" }, children: [
          { type: "element", tagName: "span", properties: { style: "color:var(--astro-code-token-keyword)" }, children: [{ type: "text", value: "must_cite" }] },
          { type: "element", tagName: "span", properties: { style: "color:var(--astro-code-foreground)" }, children: [{ type: "text", value: ": " }] },
        ] },
      ] }],
    }],
  };
  shikiClasses().root.call({}, root);
  const pre = root.children[0];
  assert.deepEqual(pre.properties, { class: "astro-code css-variables", tabindex: "0" });
  const [keyword, plain] = pre.children[0].children[0].children;
  assert.deepEqual(keyword.properties, { class: "tok-keyword" });
  assert.deepEqual(plain.properties, {});
});

test("the built post's code block has no inline style, keeps tabindex=\"0\" and colours its tokens by class (WB-8)", () => {
  const html = readDist("insights/evals-before-vibes/index.html");
  const pres = elements(html, (t) => t.name === "pre");
  assert.equal(pres.length, 1);
  const [pre] = pres;
  assert.equal(pre.attrs.style, undefined, "the <pre> carries an inline style");
  assert.equal(pre.attrs.tabindex, "0");
  assert.equal(pre.attrs["data-language"], "yaml");
  const spans = elements(pre.inner, (t) => t.name === "span");
  assert.ok(spans.length > 10, "the block isn't highlighted");
  for (const span of spans) {
    assert.equal(span.attrs.style, undefined, `a token carries an inline style: ${span.outer.slice(0, 80)}`);
    for (const cls of (span.attrs.class ?? "").split(/\s+/).filter(Boolean)) assert.match(cls, TOKEN_CLASS);
  }
  assert.ok(spans.some((s) => s.attrs.class === "tok-keyword"), "no keyword token");
});

test("no <pre> in either build, nor anything inside one, carries an inline style", () => {
  let checked = 0;
  for (const build of BUILDS) {
    for (const file of htmlFiles(build)) {
      for (const pre of elements(readText(file), (t) => t.name === "pre")) {
        checked += 1;
        assert.doesNotMatch(pre.outer, /\sstyle=/, `${relPath(build, file)}: ${pre.outer.slice(0, 120)}`);
      }
    }
  }
  assert.ok(checked >= 2, `only ${checked} code blocks checked`);
});
