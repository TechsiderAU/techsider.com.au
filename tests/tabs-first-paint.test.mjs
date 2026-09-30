// BR-4 (spec §11.4, CLS under 0.05): a tab group paints its tablist before src/scripts/tabs.ts
// runs. In both builds, every [data-tabs] group opens with its first-paint tablist
// ([data-tab-skeleton]): hidden from assistive technology, holding nothing focusable, and one
// span.tab per panel with that panel's label, in order, so it wraps as the real tablist will.
// In production, every page carries the way out when tabs.ts never runs (controller ruling 2): an
// inline script that marks a group tabs.ts hasn't set up, at the load event or 3 s in, as
// data-tabs-static, for which the first-paint rules stand down. And the first-paint accordion's
// "+" and "−" have empty alternative text, so no heading is read with them.
// The layout itself is held in a browser by tests/e2e/tabs.spec.mjs and tests/e2e/prod-tabs.spec.mjs.
// Run `npm run build && npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { decodeEntities, elements, htmlFiles, listFiles, pageUrl, readText, startTags } from "../scripts/ci/lib.mjs";

const FOCUSABLE = new Set(["a", "button", "input", "select", "textarea", "summary"]);

for (const build of ["dist", "dist-preview"]) {
  test(`${build}: every tab group opens with a first-paint tablist naming its panels in order (BR-4)`, () => {
    const dir = fileURLToPath(new URL(`../${build}/`, import.meta.url));
    let groups = 0;
    for (const file of htmlFiles(dir)) {
      const html = readText(file);
      for (const group of elements(html, (t) => "data-tabs" in t.attrs)) {
        groups++;
        const where = `${pageUrl(dir, file)} #${group.attrs.id}`;
        const [first] = startTags(group.inner);
        assert.ok(first && "data-tab-skeleton" in first.attrs, `${where}: the group doesn't open with its first-paint tablist`);
        const [skeleton] = elements(group.inner, (t) => "data-tab-skeleton" in t.attrs);
        assert.equal(skeleton.attrs["aria-hidden"], "true", `${where}: the first-paint tablist is exposed to assistive technology`);
        const focusable = startTags(skeleton.inner).filter((t) => FOCUSABLE.has(t.name) || "tabindex" in t.attrs);
        assert.deepEqual(focusable.map((t) => t.name), [], `${where}: the first-paint tablist holds something focusable`);
        const tabs = elements(skeleton.inner, (t) => t.name === "span" && (t.attrs.class ?? "").split(/\s+/).includes("tab"));
        const panels = startTags(group.inner).filter((t) => "data-tab-panel" in t.attrs);
        assert.ok(panels.length > 0, `${where}: no panel`);
        assert.deepEqual(tabs.map((t) => decodeEntities(t.inner)), panels.map((t) => t.attrs["data-tab-label"]), where);
      }
    }
    assert.ok(groups > 0, `${build} has no tab group: run npm run build && npm run build:preview`);
  });
}

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
/** The production build's Tabs stylesheet: the one that styles the first-paint tablist. */
const tabsCss = () =>
  listFiles(`${DIST}_astro`, (rel) => rel.endsWith(".css")).map(readText).filter((css) => css.includes("tab-list-skeleton")).join("\n");

test("BR-4's way out (controller ruling 2): every page marks a tab group tabs.ts hasn't set up, at the load event or 3 s in, and the first-paint rules stand down for it", () => {
  for (const file of htmlFiles(DIST)) {
    const head = readText(file).split("</head>")[0];
    const fallback = elements(head, (t) => t.name === "script").filter((s) => s.inner.includes("data-tabs-static"));
    assert.equal(fallback.length, 1, `${pageUrl(DIST, file)}: ${fallback.length} fallback scripts in <head>`);
    for (const part of ['querySelectorAll("[data-tabs]:not([data-tabs-mode])")', 'addEventListener("load"', "setTimeout("]) {
      assert.ok(fallback[0].inner.includes(part), `${pageUrl(DIST, file)}: the fallback has no ${part}`);
    }
  }
  const css = tabsCss();
  const firstPaint = css.match(/:not\(\[data-tabs-mode\]\)/g) ?? [];
  assert.ok(firstPaint.length > 0, "no first-paint rule in the built Tabs CSS");
  assert.equal((css.match(/:not\(\[data-tabs-mode\]\):not\(\[data-tabs-static\]\)/g) ?? []).length, firstPaint.length, "a first-paint rule doesn't stand down for data-tabs-static");
});

test("before tabs.ts runs, the accordion's + and − are silent: their generated content has empty alternative text", () => {
  const rules = [...tabsCss().matchAll(/tab-panel-heading:{1,2}after\{([^}]*)\}/g)].map((m) => m[1]);
  assert.equal(rules.length, 2, "the first-paint accordion draws + on every heading and − on the first");
  for (const body of rules) assert.match(body, /content:"[+−]" \/ ""/, body);
});
