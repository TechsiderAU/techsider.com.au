// Safari mouse-click anchors (Phase B2 carry-over NB-1): src/scripts/anchor-scroll.ts marks <html>
// with .anchor-scroll while a clicked in-page link scrolls, and global.css scrolls smoothly under
// that class, as it does under html:focus-within. tests/e2e/anchor-scroll.spec.mjs clicks the links.
// Run `npm run build` first (the shipped stylesheet is read from dist/).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ANCHOR_SCROLL_CLASS, fragmentId } from "../src/scripts/anchor-scroll.ts";

const HERE = "https://techsider.com.au/industries/government/";

test("fragmentId names the element a link points at on this page, and nothing else", () => {
  assert.equal(fragmentId(`${HERE}#local`, HERE), "local");
  assert.equal(fragmentId(`${HERE}#state`, `${HERE}#local`), "state", "the current URL's own fragment doesn't matter");
  assert.equal(fragmentId(`${HERE}#part%20b`, HERE), "part b");
  assert.equal(fragmentId(`${HERE}#%E0%A4%A`, HERE), "%E0%A4%A", "a malformed escape is kept as it is");
  assert.equal(fragmentId(`${HERE}#`, HERE), null);
  assert.equal(fragmentId(HERE, HERE), null);
  assert.equal(fragmentId("https://techsider.com.au/#faq", HERE), null, "another page");
  assert.equal(fragmentId(`${HERE}?view=all#local`, HERE), null, "another query is another document");
  assert.equal(fragmentId("https://example.com/industries/government/#local", HERE), null, "another origin");
});

test("the shipped stylesheet scrolls smoothly under .anchor-scroll only without a reduced-motion preference", () => {
  const dir = fileURLToPath(new URL("../dist/_astro/", import.meta.url));
  const css = readdirSync(dir).filter((f) => f.endsWith(".css")).map((f) => readFileSync(dir + f, "utf8")).join("\n");
  const rule = new RegExp(`html\\.${ANCHOR_SCROLL_CLASS}\\s*\\{\\s*scroll-behavior:\\s*smooth;?\\s*\\}`);
  const at = css.search(rule);
  assert.ok(at >= 0, "no html.anchor-scroll { scroll-behavior: smooth } rule");
  const media = css.lastIndexOf("@media", at);
  assert.match(css.slice(media, at), /^@media\s*\(prefers-reduced-motion:\s*no-preference\)/, "the rule isn't inside the no-preference media query");
});
