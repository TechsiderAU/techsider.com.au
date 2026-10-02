// The company page templates (spec §8.10, §8.11, §10.2) as the preview build renders them from
// the page-data fixtures: About, Trust (with and without a confirmed Part B term), the Legal hub, a
// legal document, Contact (with and without a form endpoint), the message-sent page and the 404
// body, at /preview/templates/<kind>/.
// Run `npm run build:preview` first. tests/e2e/template-company.spec.mjs covers the behaviour in
// a browser (the copy button, native validation, the POST, keyboard order, axe, 320px).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readPreviewDist, visibleText } from "./helpers.mjs";
import { decodeEntities, elements, elementsWith, idsIn, startTags } from "../scripts/ci/lib.mjs";
import { CONTACT_H1, EXTRA_INTERESTS, MESSAGE_PLACEHOLDER, ORG_SIZES } from "../src/lib/fixed-copy.ts";
import { insightCards } from "../src/lib/views/insights.ts";
import { trustView } from "../src/lib/views/company.ts";
import {
  aboutFixture, contactFixture, contactNoEndpointFixture, documentFixtures, fixtureSite, insightFixtures,
  positioningFixture, servicesFixture, trustFixture, trustNoTermsFixture,
} from "../src/fixtures/index.ts";
import { renderAstro } from "./support/render-astro.mjs";
import { MOCK_FORM } from "../src/preview/mock-form.ts";

const PAGES = {
  about: { template: "about", h1: "About.", highlight: "About" },
  trust: { template: "trust", h1: "Trust.", highlight: "Trust" },
  "trust-no-terms": { template: "trust", h1: "Trust.", highlight: "Trust" },
  "legal-hub": { template: "legal-hub", h1: "Legal.", highlight: "Legal" },
  "legal-document": { template: "document", h1: documentFixtures[0].data.title, highlight: null },
  contact: { template: "contact", h1: CONTACT_H1, highlight: undefined },
  "contact-no-endpoint": { template: "contact", h1: CONTACT_H1, highlight: undefined },
  sent: { template: "sent", h1: "Message sent.", highlight: "sent" },
  "not-found": { template: "not-found", h1: "Page not found.", highlight: "found" },
};
// The hubs the 404 offers, in order; only the ones the SiteContext shows are listed.
const NOT_FOUND_HUBS = ["home", "solutions", "industries", "services", "resources", "insights", "demos", "about"];
const TEMPLATES_DIR = fileURLToPath(new URL("../dist-preview/preview/templates/", import.meta.url));

const page = (kind) => readPreviewDist(`preview/templates/${kind}/index.html`);
const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>") + "</main>".length);
const text = (html) => visibleText(html).trim();
// Text as a browser shows it inline: tags dropped without adding spaces ("<span>About</span>." → "About.").
const inlineText = (html) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const tagged = (html, name) => elements(html, (t) => t.name === name);
const withClass = (html, cls) => elements(html, (t) => new RegExp(`(^|\\s)${cls}(\\s|$)`).test(t.attrs.class ?? ""));
function one(html, attr, value) {
  const found = elementsWith(html, attr, value);
  assert.equal(found.length, 1, `expected one [${attr}${value === undefined ? "" : `="${value}"`}], found ${found.length}`);
  return found[0];
}
const formatDate = (d) => d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const isoDate = (d) => d.toISOString().slice(0, 10);
const jsonLd = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
// The ids of the template's top-level blocks, in order: each element directly inside the
// data-template root that carries an id (script and style bodies are skipped).
function blockIds(main) {
  const root = one(main, "data-template").inner.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/g, "");
  const ids = [];
  let depth = 0;
  for (const [, close, name, attrs] of root.matchAll(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/g)) {
    if (close) depth--;
    else {
      if (depth === 0) {
        const id = attrs.match(/\sid="([^"]+)"/)?.[1];
        if (id) ids.push(id);
      }
      if (!VOID.has(name) && !attrs.endsWith("/")) depth++;
    }
  }
  return ids;
}

for (const [kind, expected] of Object.entries(PAGES)) {
  test(`${kind}: one h1 (with its highlight), a data-template root, headings in order, ids and references intact`, () => {
    const html = page(kind);
    const main = mainOf(html);
    const h1s = tagged(main, "h1");
    assert.equal(h1s.length, 1, "exactly one <h1>");
    assert.equal(inlineText(h1s[0].inner), expected.h1);
    assert.deepEqual(withClass(h1s[0].inner, "hl").map((s) => text(s.inner)), expected.highlight ? [expected.highlight] : []);
    one(main, "data-template", expected.template);
    const levels = startTags(main).filter((t) => /^h[1-6]$/.test(t.name)).map((t) => Number(t.name[1]));
    levels.forEach((level, i) => {
      if (i > 0) assert.ok(level <= levels[i - 1] + 1, `h${levels[i - 1]} is followed by h${level}`);
    });
    const ids = startTags(html).map((t) => t.attrs.id).filter(Boolean);
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], "duplicate ids");
    const known = idsIn(html);
    for (const t of startTags(html)) {
      for (const attr of ["aria-labelledby", "aria-describedby", "aria-controls"]) {
        for (const id of (t.attrs[attr] ?? "").split(/\s+/).filter(Boolean)) assert.ok(known.has(id), `${attr}="${id}" names no element`);
      }
      if (t.name === "label" && t.attrs.for) assert.ok(known.has(t.attrs.for), `<label for="${t.attrs.for}"> names no element`);
    }
  });
}

test("about: the mission under the H1, then who, origin, principles, how we work, build log, insights and the closing prompt", () => {
  const main = mainOf(page("about"));
  assert.equal(text(withClass(one(main, "data-page-hero").inner, "page-hero-sub")[0].inner), aboutFixture.mission);
  assert.deepEqual(blockIds(main), ["who", "origin", "principles", "how-we-work", "build-log", "insights", "contact"]);
  const who = one(main, "id", "who");
  assert.equal(text(one(who.inner, "id", "who-heading").inner), "Who we serve");
  assert.ok(text(who.inner).includes(aboutFixture.whoWeServe), "no who-we-serve paragraph");
  assert.ok(text(who.inner).includes(aboutFixture.whyControl), "no why-control paragraph");
  assert.equal(text(one(main, "id", "origin").inner), positioningFixture.originLine);
  for (const [id, title, items] of [["principles", "Principles", aboutFixture.principles], ["how-we-work", "How we work", aboutFixture.howWeWork]]) {
    const section = one(main, "id", id);
    assert.equal(text(one(section.inner, "id", `${id}-heading`).inner), title);
    assert.deepEqual(tagged(section.inner, "h3").map((h) => text(h.inner)), items.map((p) => p.title));
    for (const item of items) assert.ok(text(section.inner).includes(item.body), `${id}: no "${item.body}"`);
  }
});

test("about: the build log is a dated list, newest first, each date a <time datetime>", () => {
  const log = one(mainOf(page("about")), "id", "build-log");
  assert.equal(text(one(log.inner, "id", "build-log-heading").inner), "Our development log");
  const list = tagged(log.inner, "ol");
  assert.equal(list.length, 1, "the build log is one <ol>");
  const entries = tagged(list[0].inner, "li");
  const expected = [...aboutFixture.buildLog].sort((a, b) => b.date - a.date);
  assert.equal(entries.length, expected.length);
  entries.forEach((li, i) => {
    const time = tagged(li.inner, "time");
    assert.equal(time.length, 1);
    assert.equal(time[0].attrs.datetime, isoDate(expected[i].date));
    assert.equal(text(time[0].inner), formatDate(expected[i].date));
    assert.ok(text(li.inner).includes(expected[i].event));
  });
});

test("about: at most three insight cards, newest first, then All insights; the prompt closes the page", () => {
  const main = mainOf(page("about"));
  const cards = insightCards(insightFixtures, fixtureSite);
  assert.ok(cards.length > 3, "the fixtures have more than three published posts, so the limit shows");
  const section = one(main, "id", "insights");
  assert.equal(text(one(section.inner, "id", "insights-heading").inner), "Latest insights");
  const rendered = elementsWith(section.inner, "data-insight-card");
  assert.deepEqual(rendered.map((c) => tagged(c.inner, "a").find((a) => a.attrs.href.startsWith("/insights/")).attrs.href), cards.slice(0, 3).map((c) => c.href));
  const more = tagged(section.inner, "a").filter((a) => text(a.inner).startsWith("All insights"));
  assert.deepEqual(more.map((a) => a.attrs.href), ["/insights/"]);
  const contact = one(main, "id", "contact");
  const prompt = one(contact.inner, "data-prompt-block");
  assert.doesNotMatch(text(prompt.inner), /talk_to_us/);
  assert.deepEqual(tagged(prompt.inner, "a").map((a) => [a.attrs.href, text(a.inner)]), [["/preview/templates/contact/", "Start with one workflow"]]);
});

test("trust: the blocks in order, and Part A dated with the sub-processor table from the contact data", () => {
  const main = mainOf(page("trust"));
  assert.deepEqual(blockIds(main), ["part-a", "part-b", "independence", "questions", "ai-transparency", "changes"]);
  const partA = one(main, "id", "part-a");
  assert.equal(text(one(partA.inner, "id", "part-a-heading").inner), "Our website and email today");
  const asAt = one(partA.inner, "data-as-at");
  assert.equal(text(asAt.inner), `As at ${formatDate(trustFixture.asAt)}`);
  assert.equal(tagged(asAt.inner, "time")[0].attrs.datetime, isoDate(trustFixture.asAt));
  const table = tagged(partA.inner, "table");
  assert.equal(table.length, 1);
  assert.deepEqual(tagged(tagged(table[0].inner, "thead")[0].inner, "th").map((th) => text(th.inner)), ["Entity", "Purpose", "Storage country", "Data touched"]);
  const rows = tagged(tagged(table[0].inner, "tbody")[0].inner, "tr");
  assert.equal(rows.length, contactFixture.subProcessors.length);
  rows.forEach((row, i) => {
    const s = contactFixture.subProcessors[i];
    const cells = elements(row.inner, (t) => t.name === "th" || t.name === "td");
    assert.equal(cells[0].name, "th");
    assert.equal(text(cells[0].inner), s.entity);
    [s.purpose, s.country, s.data].forEach((value, c) => assert.ok(text(cells[c + 1].inner).includes(value), `${s.entity}: no "${value}"`));
  });
});

test("trust: Part A states cookies, analytics and enquiries; security.txt is code text, not a link", () => {
  const partA = one(mainOf(page("trust")), "id", "part-a");
  const facts = Object.fromEntries(
    elements(partA.inner, (t) => t.name === "div" && /\btrust-fact\b/.test(t.attrs.class ?? "")).map((d) => [
      text(tagged(d.inner, "dt")[0].inner),
      tagged(d.inner, "dd")[0].inner,
    ]),
  );
  assert.deepEqual(Object.keys(facts), ["Cookies", "Analytics", "Enquiries", "Security contact"]);
  assert.equal(text(facts.Cookies), trustFixture.partA.cookies);
  assert.equal(text(facts.Analytics), trustFixture.partA.analytics);
  assert.equal(text(facts.Enquiries), trustFixture.partA.enquiries);
  const security = facts["Security contact"];
  assert.deepEqual(tagged(security, "a").map((a) => [a.attrs.href, text(a.inner)]), [[`mailto:${trustFixture.partA.securityContact}`, trustFixture.partA.securityContact]]);
  assert.deepEqual(tagged(security, "code").map((c) => text(c.inner)), ["/.well-known/security.txt"]);
  assert.ok(!startTags(page("trust")).some((t) => (t.attrs.href ?? "").includes("security.txt")), "security.txt is linked before Phase E publishes it");
});

test("trust: Part B shows only confirmed commitments, each tagged Contract term; an unconfirmed one never renders", () => {
  const html = page("trust");
  const partB = one(mainOf(html), "id", "part-b");
  assert.equal(text(one(partB.inner, "id", "part-b-heading").inner), "Default commitments in every engagement contract");
  const confirmed = trustFixture.partB.filter((t) => t.confirmed);
  const unconfirmed = trustFixture.partB.filter((t) => !t.confirmed);
  assert.ok(confirmed.length > 0 && unconfirmed.length > 0, "the fixture has confirmed and unconfirmed terms");
  const terms = elementsWith(partB.inner, "data-contract-term");
  assert.deepEqual(terms.map((t) => t.attrs["data-contract-term"]), confirmed.map((t) => t.id));
  terms.forEach((term, i) => {
    assert.equal(inlineText(one(term.inner, "data-bracket-chip").inner), "[Contract term]");
    assert.equal(text(tagged(term.inner, "h3")[0].inner), confirmed[i].title);
    assert.ok(text(term.inner).includes(confirmed[i].body));
  });
  for (const term of unconfirmed) {
    assert.ok(!visibleText(html).includes(term.title), `unconfirmed "${term.title}" renders`);
    assert.ok(!visibleText(html).includes(term.body), `unconfirmed "${term.body}" renders`);
    assert.ok(!html.includes(term.id), `unconfirmed ${term.id} is in the markup`);
  }
});

test("trust: the independence policy is the Services data's, word for word", () => {
  const section = one(mainOf(page("trust")), "id", "independence");
  assert.equal(text(one(section.inner, "id", "independence-heading").inner), "Independence policy");
  assert.deepEqual(tagged(section.inner, "li").map((li) => text(li.inner)), servicesFixture.independence);
});

test("trust: each FAQ answer ends with its Part and date, and the FAQPage JSON-LD carries the answer alone", () => {
  const html = page("trust");
  const section = one(mainOf(html), "id", "questions");
  assert.equal(text(one(section.inner, "id", "questions-heading").inner), "Security and data questions");
  const shown = trustView(trustFixture).faq;
  const answers = withClass(section.inner, "faq-answer");
  assert.equal(answers.length, shown.length);
  answers.forEach((answer, i) => {
    const f = shown[i];
    const meta = withClass(answer.inner, "faq-meta");
    assert.equal(meta.length, 1, `answer ${i + 1} has no meta line`);
    assert.equal(meta[0].name, "p");
    assert.equal(text(meta[0].inner), `Part ${f.part} · as at ${formatDate(f.asAt)}`);
    assert.ok(answer.inner.trimEnd().endsWith(meta[0].outer), `answer ${i + 1}: the meta line isn't last`);
    assert.equal(text(answer.inner.replace(meta[0].outer, "")), f.a);
  });
  assert.ok(shown.some((f) => f.part === "A") && shown.some((f) => f.part === "B"));
  const pages = jsonLd(html).filter((d) => d["@type"] === "FAQPage");
  assert.equal(pages.length, 1);
  assert.deepEqual(
    pages[0].mainEntity,
    shown.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  );
  assert.doesNotMatch(JSON.stringify(jsonLd(html)), /as at|Part [AB] ·/, "a meta line reached the JSON-LD");
});

test("trust: a Part B answer resting on an unconfirmed term never renders, on the page or in the JSON-LD (spec §8.11, §12 item 2)", () => {
  const html = page("trust");
  const confirmed = new Set(trustFixture.partB.filter((t) => t.confirmed).map((t) => t.id));
  const hidden = trustFixture.faq.filter((f) => f.part === "B" && !confirmed.has(f.term));
  assert.ok(hidden.length > 0, "no fixture answer rests on an unconfirmed term");
  for (const f of hidden) {
    assert.ok(!visibleText(html).includes(f.q), `"${f.q}" renders`);
    assert.ok(!html.includes(f.a), `the answer to "${f.q}" is in the markup`);
  }
});

test("trust-no-terms: with no confirmed term, #part-b and every Part B answer are absent; Part A stays", () => {
  assert.ok(trustNoTermsFixture.partB.every((t) => !t.confirmed), "the fixture confirms a term");
  const html = page("trust-no-terms");
  const main = mainOf(html);
  assert.deepEqual(blockIds(main), ["part-a", "independence", "questions", "ai-transparency", "changes"]);
  assert.equal(elementsWith(main, "data-contract-term").length, 0);
  assert.doesNotMatch(visibleText(main), /Default commitments in every engagement contract|Contract term/);
  const partA = trustNoTermsFixture.faq.filter((f) => f.part === "A");
  const partB = trustNoTermsFixture.faq.filter((f) => f.part === "B");
  assert.ok(partA.length > 0 && partB.length > 0, "the fixture has answers in both parts");
  const section = one(main, "id", "questions");
  const metas = withClass(section.inner, "faq-meta").map((m) => text(m.inner));
  assert.deepEqual(metas, partA.map((f) => `Part A · as at ${formatDate(f.asAt)}`));
  for (const f of partB) {
    assert.ok(!visibleText(html).includes(f.q), `Part B "${f.q}" renders`);
    assert.ok(!html.includes(f.a), `the Part B answer to "${f.q}" is in the markup`);
  }
  for (const term of trustNoTermsFixture.partB) assert.ok(!visibleText(html).includes(term.title), `"${term.title}" renders`);
  const [faqPage] = jsonLd(html).filter((d) => d["@type"] === "FAQPage");
  assert.deepEqual(faqPage.mainEntity.map((q) => q.name), partA.map((f) => f.q));
});

test("trust: the AI transparency statement with one card per system, then the changes log newest first", () => {
  const main = mainOf(page("trust"));
  const ai = one(main, "id", "ai-transparency");
  assert.equal(text(one(ai.inner, "id", "ai-transparency-heading").inner), "How we use AI");
  assert.ok(text(ai.inner).includes(trustFixture.transparency.statement));
  const cards = elementsWith(ai.inner, "data-ai-system");
  assert.equal(cards.length, trustFixture.transparency.systems.length);
  cards.forEach((card, i) => {
    const s = trustFixture.transparency.systems[i];
    assert.equal(text(tagged(card.inner, "h3")[0].inner), s.name);
    const facts = Object.fromEntries(tagged(card.inner, "div").map((d) => [text(tagged(d.inner, "dt")[0].inner), text(tagged(d.inner, "dd")[0].inner)]));
    assert.deepEqual(facts, { Purpose: s.purpose, Data: s.data, "Human oversight": s.human });
  });
  const changes = one(main, "id", "changes");
  assert.equal(text(one(changes.inner, "id", "changes-heading").inner), "Changes to this page");
  const expected = [...trustFixture.changes].sort((a, b) => b.date - a.date);
  const items = tagged(tagged(changes.inner, "ol")[0].inner, "li");
  assert.deepEqual(items.map((li) => tagged(li.inner, "time")[0].attrs.datetime), expected.map((c) => isoDate(c.date)));
  items.forEach((li, i) => assert.ok(text(li.inner).includes(expected[i].change)));
});

test("legal-hub: one card per document passed in, linked to its page, with its summary and last-updated date", () => {
  const main = mainOf(page("legal-hub"));
  const [legal] = documentFixtures;
  const section = one(main, "id", "documents");
  assert.equal(text(one(section.inner, "id", "documents-heading").inner), "Documents");
  const docs = elementsWith(section.inner, "data-legal-doc");
  // The specimen also passes a document whose page isn't shown (a null href): the hub lists only
  // documents whose page is shown, never a card for one that isn't (spec §8.11, §7.1).
  assert.equal(docs.length, 1);
  assert.ok(!visibleText(main).includes("Fixture unshown legal document"), "a document whose page isn't shown is listed");
  const card = one(docs[0].inner, "data-link-card");
  assert.equal(text(tagged(card.inner, "h3")[0].inner), legal.data.title);
  assert.deepEqual(tagged(card.inner, "a").map((a) => a.attrs.href), ["/preview/templates/legal-document/"]);
  assert.ok(text(card.inner).includes(legal.data.summary));
  assert.ok(text(card.inner).includes(`Last updated ${formatDate(legal.data.lastUpdated)}`));
});

test("legal-document: breadcrumb, a sentence H1, the summary, both dates, then the body in Prose on bone", () => {
  const main = mainOf(page("legal-document"));
  const [legal] = documentFixtures;
  const hero = one(main, "data-page-hero");
  const crumbs = tagged(one(hero.inner, "aria-label", "Breadcrumb").inner, "li").map((li) => text(li.inner).replace(/^\/\s*/, ""));
  assert.deepEqual(crumbs, ["Home", "Legal", legal.data.title]);
  const h1 = tagged(hero.inner, "h1")[0];
  assert.doesNotMatch(h1.attrs.class, /\btype-display\b/, "a document title is set as a sentence, not display caps");
  assert.equal(text(withClass(hero.inner, "page-hero-sub")[0].inner), legal.data.summary);
  const dates = one(hero.inner, "data-document-dates");
  assert.ok(legal.data.effective, "the fixture legal document has an effective date");
  assert.deepEqual(tagged(dates.inner, "time").map((t) => [t.attrs.datetime, text(t.inner)]), [
    [isoDate(legal.data.lastUpdated), formatDate(legal.data.lastUpdated)],
    [isoDate(legal.data.effective), formatDate(legal.data.effective)],
  ]);
  assert.equal(text(dates.inner), `Last updated ${formatDate(legal.data.lastUpdated)} Effective ${formatDate(legal.data.effective)}`);
  const body = one(main, "data-document-body");
  assert.match(body.attrs.class, /\bsurface-bone\b/);
  const prose = one(body.inner, "data-prose");
  assert.equal(text(prose.inner), text(legal.bodyHtml));
});

test("contact: a plain POST form to the endpoint, with native validation on required fields and optional discovery", () => {
  const form = one(mainOf(page("contact")), "data-contact-form");
  assert.equal(form.name, "form");
  assert.equal(form.attrs.method, "post");
  assert.equal(form.attrs.action, MOCK_FORM.formEndpoint);
  assert.ok(!("novalidate" in form.attrs), "the form turns native validation off");
  const controls = Object.fromEntries(
    elements(form.inner, (t) => ["input", "select", "textarea"].includes(t.name)).map((c) => [c.attrs.name, c]),
  );
  // The stand-in provider's hidden fields, the enquiry fields, then the honeypot under the provider's name.
  assert.deepEqual(Object.keys(controls), ["_redirect", "_append", "name", "email", "organisation", "industry", "size", "interest", "message", "discovery", "consent", "_gotcha"]);
  assert.equal(controls.discovery.name, "select");
  assert.ok(!("required" in controls.discovery.attrs));
  const expect = {
    name: { tag: "input", type: "text", autocomplete: "name" },
    email: { tag: "input", type: "email", autocomplete: "email" },
    organisation: { tag: "input", type: "text", autocomplete: "organization" },
    industry: { tag: "select" },
    size: { tag: "select" },
    interest: { tag: "select" },
    message: { tag: "textarea", maxlength: "1000", placeholder: MESSAGE_PLACEHOLDER },
    consent: { tag: "input", type: "checkbox" },
  };
  for (const [name, want] of Object.entries(expect)) {
    const c = controls[name];
    assert.equal(c.name, want.tag, name);
    assert.equal("required" in c.attrs, !["industry", "size", "interest"].includes(name), `${name}: qualification is optional, core answers required`);
    for (const attr of ["type", "autocomplete", "maxlength", "placeholder"]) {
      if (want[attr] !== undefined) assert.equal(c.attrs[attr], want[attr], `${name} ${attr}`);
    }
  }
});

test("contact: the selects offer the nine industries and Other, the organisation sizes, and the five solutions plus the extra interests", () => {
  const form = one(mainOf(page("contact")), "data-contact-form");
  const options = (name) => {
    const select = elements(form.inner, (t) => t.name === "select" && t.attrs.name === name)[0];
    return tagged(select.inner, "option").map((o) => [o.attrs.value, text(o.inner)]);
  };
  const placeholder = ["", "Choose one"];
  assert.deepEqual(options("industry"), [placeholder, ...fixtureSite.industries.map((i) => [i.id, i.shortName]), ["other", "Other"]]);
  assert.deepEqual(options("size"), [placeholder, ...ORG_SIZES.map((s) => [s, s])]);
  assert.deepEqual(options("interest"), [placeholder, ...fixtureSite.solutions.map((s) => [s.id, s.shortName]), ...EXTRA_INTERESTS.map((e) => [e.id, e.label])]);
});

test("contact: every visible control has a visible <label for>; the consent and the collection notice link to the privacy policy (WB-12)", () => {
  const form = one(mainOf(page("contact")), "data-contact-form");
  const labels = new Map(tagged(form.inner, "label").map((l) => [l.attrs.for, l]));
  const honeypot = one(form.inner, "data-honeypot");
  for (const c of elements(form.inner, (t) => ["input", "select", "textarea"].includes(t.name))) {
    if (c.attrs.type === "hidden" || honeypot.inner.includes(`id="${c.attrs.id}"`)) continue;
    const label = labels.get(c.attrs.id);
    assert.ok(label, `${c.attrs.name} has no <label for="${c.attrs.id}">`);
    assert.ok(text(label.inner).length > 0, `${c.attrs.name}'s label is empty`);
    assert.doesNotMatch(label.attrs.class ?? "", /sr-only|visually-hidden/, `${c.attrs.name}'s label is hidden`);
  }
  // The specimen shows the privacy page at its gallery page, because the form won't render without it.
  const privacy = fixtureSite.page("privacy").path;
  const links = (html) => tagged(html, "a").map((a) => [a.attrs.href, text(a.inner)]);
  const consent = labels.get("contact-consent");
  assert.match(text(consent.inner), /privacy policy/);
  assert.deepEqual(links(consent.inner), [[privacy, "privacy policy"]]);
  assert.deepEqual(links(one(form.inner, "data-collection-notice").inner), [[privacy, "privacy policy"]]);
});

test("contact: an unavailable privacy policy uses a visible enquiry notice without publishing the legal draft", async () => {
  assert.notEqual(contactFixture.formEndpoint, null, "the fixture must reach the privacy guard");
  assert.equal(fixtureSite.page("privacy").href, null, "the fixture's privacy page is unavailable");
  const component = new URL("../src/components/page/ContactForm.astro", import.meta.url);
  const unavailable = { ...fixtureSite, page: (id) => ({ ...fixtureSite.page(id), href: id === "sent" ? "/contact/sent/" : fixtureSite.page(id).href }) };
  const inline = await renderAstro(component, { contact: contactFixture, site: unavailable });
  assert.equal(tagged(inline, "a").filter((a) => a.attrs.href === "#enquiry-privacy").length, 2);
  const notice = one(inline, "id", "enquiry-privacy");
  assert.ok(text(notice.inner).includes(contactFixture.formProvider.name));
  assert.ok(text(notice.inner).includes(contactFixture.emailProvider.name));
  const shown = { ...unavailable, page: (id) => ({ ...unavailable.page(id), href: id === "privacy" ? "/privacy/" : unavailable.page(id).href }) };
  const html = await renderAstro(component, { contact: contactFixture, site: shown });
  assert.match(html, /data-contact-form/);
  assert.match(html, /href="\/privacy\/"/);
  assert.equal(elementsWith(html, "id", "enquiry-privacy").length, 0);
});

test("contact: the honeypot is hidden from everyone and never required", () => {
  const form = one(mainOf(page("contact")), "data-contact-form");
  const honeypot = one(form.inner, "data-honeypot");
  assert.equal(honeypot.name, "div");
  assert.match(honeypot.attrs.style, /^display:\s*none;?$/);
  const inputs = tagged(honeypot.inner, "input");
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0].attrs.name, MOCK_FORM.honeypotField);
  assert.equal(inputs[0].attrs.tabindex, "-1");
  assert.equal(inputs[0].attrs.autocomplete, "off");
  assert.ok(!("required" in inputs[0].attrs));
});

test("contact: the collection notice names both providers, directly above the Send enquiry button", () => {
  const form = one(mainOf(page("contact")), "data-contact-form");
  const notice = one(form.inner, "data-collection-notice");
  const { formProvider: f, emailProvider: e } = contactFixture;
  assert.equal(
    inlineText(notice.inner),
    `Your enquiry is sent via ${f.name} to our ${e.name} mailbox. See our privacy policy.`,
  );
  const button = tagged(form.inner, "button");
  assert.equal(button.length, 1);
  assert.equal(button[0].attrs.type, "submit");
  assert.equal(text(button[0].inner), "Send enquiry");
  const between = form.inner.slice(form.inner.indexOf(notice.outer) + notice.outer.length, form.inner.indexOf(button[0].outer));
  assert.equal(between.trim(), "", "something sits between the collection notice and the submit button");
  assert.ok(form.inner.trimEnd().endsWith(button[0].outer), "the submit button is not the form's last element");
});

test("contact: the email address is plain text with a hidden copy button and a polite status; then what next and the deflection column", () => {
  const main = mainOf(page("contact"));
  const order = ["form", "email", "next", "elsewhere"].map((id) => main.indexOf(`id="${id}"`));
  assert.ok(order.every((at, i) => at > 0 && (i === 0 || at > order[i - 1])), `blocks out of order: ${order}`);
  const email = one(main, "id", "email");
  assert.equal(text(one(email.inner, "id", "email-heading").inner), "Email us");
  const code = one(email.inner, "data-email");
  assert.equal(code.name, "code");
  assert.equal(text(code.inner), fixtureSite.email);
  assert.equal(tagged(email.inner, "a").length, 0, "the address is plain text");
  const button = one(email.inner, "data-copy-email");
  assert.equal(button.name, "button");
  assert.equal(button.attrs.type, "button");
  assert.ok("hidden" in button.attrs, "the copy button shows without JavaScript");
  const status = one(email.inner, "data-copy-status");
  assert.equal(status.attrs["aria-live"], "polite");
  assert.equal(status.attrs.role, "status");
  assert.equal(text(status.inner), "");

  const next = one(main, "id", "next");
  assert.equal(text(one(next.inner, "id", "next-heading").inner), "What happens next");
  assert.equal(elementsWith(next.inner, "data-reply-time").length, 0);
  assert.deepEqual(tagged(tagged(next.inner, "ol")[0].inner, "li").map((li) => text(li.inner)), contactFixture.whatNext);
  const elsewhere = one(main, "id", "elsewhere");
  assert.equal(text(one(elsewhere.inner, "id", "elsewhere-heading").inner), "Something else?");
  assert.deepEqual(tagged(elsewhere.inner, "h3").map((h) => text(h.inner)), contactFixture.deflection.map((d) => d.title));
  assert.deepEqual(tagged(elsewhere.inner, "a").map((a) => a.attrs.href), contactFixture.deflection.map((d) => `mailto:${d.email}`));
});

test("contact-no-endpoint: no form at all, and the email address leads", () => {
  assert.equal(contactNoEndpointFixture.formEndpoint, null);
  const main = mainOf(page("contact-no-endpoint"));
  assert.equal(tagged(main, "form").length, 0);
  assert.equal(elementsWith(main, "data-contact-form").length, 0);
  assert.ok(!idsIn(main).has("form"), "#form renders without an endpoint");
  const first = main.search(/<section\b/);
  assert.equal(main.indexOf('id="email"'), main.indexOf("id=", first), "#email is not the first block");
  for (const id of ["email", "next", "elsewhere"]) one(main, "id", id);
  assert.equal(text(one(main, "data-email").inner), fixtureSite.email);
});

test("sent: the reply-time sentence, what happens next and the email address as plain text", () => {
  const main = mainOf(page("sent"));
  assert.deepEqual(blockIds(main), ["next", "email"]);
  const next = one(main, "id", "next");
  assert.equal(text(one(next.inner, "id", "next-heading").inner), "What happens next");
  assert.equal(elementsWith(next.inner, "data-reply-time").length, 0);
  assert.deepEqual(tagged(tagged(next.inner, "ol")[0].inner, "li").map((li) => text(li.inner)), contactFixture.whatNext);
  const email = one(main, "id", "email");
  assert.equal(text(one(email.inner, "data-email").inner), fixtureSite.email);
  assert.equal(tagged(email.inner, "a").length, 0);
});

test("the reply time is stated on the contact and sent pages only", () => {
  const kinds = readdirSync(TEMPLATES_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const stating = kinds.filter((kind) => visibleText(mainOf(page(kind))).includes(contactFixture.replyTime));
  assert.deepEqual(stating, []);
});

test("not-found: a card for every shown hub, then Report this link with the address as plain text", () => {
  const main = mainOf(page("not-found"));
  const section = one(main, "id", "hubs");
  assert.equal(text(one(section.inner, "id", "hubs-heading").inner), "Where to next");
  const hubs = NOT_FOUND_HUBS.map((key) => fixtureSite.page(key)).filter((p) => p.href !== null);
  const cards = elementsWith(section.inner, "data-hub");
  assert.deepEqual(cards.map((c) => c.attrs["data-hub"]), hubs.map((p) => p.key));
  cards.forEach((card, i) => {
    assert.deepEqual(tagged(card.inner, "a").map((a) => [a.attrs.href, text(a.inner)]), [[hubs[i].href, hubs[i].label]]);
  });
  const report = one(section.inner, "data-report-link");
  assert.deepEqual(tagged(report.inner, "a").map((a) => [a.attrs.href, text(a.inner)]), [[`mailto:${fixtureSite.email}?subject=Broken%20link`, "Report this link"]]);
  assert.equal(text(one(report.inner, "data-email").inner), fixtureSite.email);
});
