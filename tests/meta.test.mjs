// Page titles (spec §11.3): `{fullName} | Techsider`, or `AI for {shortName} in Australia |
// Techsider` on industry pages, unique across the site and 60 characters or fewer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PAGES } from "../src/data/nav.ts";
import { pageTitle } from "../src/lib/meta.ts";

const at = (path) => PAGES.find((p) => p.path === path);

test("pageTitle: Home, industry pages and every other page follow spec §11.3", () => {
  assert.equal(pageTitle(at("/")), "Techsider: AI that ships. Measured before it ships.");
  assert.equal(pageTitle(at("/industries/government/")), "AI for Government in Australia | Techsider");
  assert.equal(pageTitle(at("/industries/legal-and-professional/")), "AI for Legal & professional in Australia | Techsider");
  assert.equal(pageTitle(at("/industries/")), "Industries | Techsider");
  assert.equal(pageTitle(at("/solutions/document-registers/")), "Document Registers & Evidence Packs | Techsider");
  assert.equal(pageTitle(at("/demos/ai-evaluation/")), "Independent AI Evaluation demo | Techsider");
  assert.equal(pageTitle(at("/insights/")), "Insights | Techsider");
  assert.equal(pageTitle(at("/legal/privacy/")), "Privacy policy | Techsider");
});

test("pageTitle: every nav page's title is unique and 60 characters or fewer", () => {
  const titles = PAGES.map(pageTitle);
  for (const [i, title] of titles.entries()) {
    assert.ok(title.length <= 60, `${PAGES[i].path}: "${title}" is ${title.length} characters`);
  }
  const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
  assert.deepEqual(dupes, []);
});
