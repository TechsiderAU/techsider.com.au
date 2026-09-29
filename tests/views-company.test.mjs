// The company-page view builders (spec §8.11): what the Trust page and the Legal hub may show.
// Pure TypeScript, run here on the page fixtures, with no SiteContext. The built pages are checked
// in tests/template-company.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { legalHubDocs, trustView } from "../src/lib/views/company.ts";
import { trustFixture, trustNoTermsFixture } from "../src/fixtures/index.ts";

const DOC = { title: "Fixture document", summary: "Fixture summary.", href: "/fixture/document/", lastUpdated: new Date("2026-09-01") };

test("trustView: Part B shows only the confirmed terms, in order", () => {
  const view = trustView(trustFixture);
  assert.deepEqual(view.terms, trustFixture.partB.filter((t) => t.confirmed));
  assert.ok(view.terms.length > 0 && view.terms.length < trustFixture.partB.length, "the fixture has confirmed and unconfirmed terms");
});

test("trustView: a Part B answer shows only while the term it rests on is confirmed; Part A answers always show", () => {
  const confirmed = new Set(trustFixture.partB.filter((t) => t.confirmed).map((t) => t.id));
  const hidden = trustFixture.faq.filter((f) => f.part === "B" && !confirmed.has(f.term));
  assert.ok(hidden.length > 0, "no fixture answer rests on an unconfirmed term");
  const view = trustView(trustFixture);
  assert.deepEqual(view.faq, trustFixture.faq.filter((f) => !hidden.includes(f)));
  assert.ok(view.faq.some((f) => f.part === "B"), "no Part B answer shows");
  for (const f of view.faq.filter((x) => x.part === "B")) assert.ok(confirmed.has(f.term), `"${f.q}" rests on an unconfirmed term`);
});

test("trustView: with no confirmed term there is no Part B and no Part B answer", () => {
  assert.ok(trustNoTermsFixture.partB.length > 0 && trustNoTermsFixture.partB.every((t) => !t.confirmed));
  const view = trustView(trustNoTermsFixture);
  assert.deepEqual(view.terms, []);
  assert.deepEqual(view.faq, trustNoTermsFixture.faq.filter((f) => f.part === "A"));
  assert.ok(view.faq.length > 0, "the Part A answers still show");
});

test("legalHubDocs: only documents whose page is shown, in order", () => {
  const docs = [DOC, { ...DOC, title: "Fixture unshown document", href: null }, { ...DOC, title: "Fixture second document", href: "/fixture/second/" }];
  assert.deepEqual(legalHubDocs(docs).map((d) => d.title), ["Fixture document", "Fixture second document"]);
});

test("legalHubDocs: a hub with no shown document fails the build rather than render an empty list (spec §8.11, §7.1)", () => {
  const message = "LegalHubTemplate: no legal document's page is shown, so the hub has nothing to list. Show /legal/ only once a document's page is shown.";
  assert.throws(() => legalHubDocs([{ ...DOC, href: null }, { ...DOC, title: "Fixture other document", href: null }]), { message });
  assert.throws(() => legalHubDocs([]), { message });
});
