// The Services and Evaluation Partner templates (spec §8.6, §4.2–§4.4, §10.1) as the preview build
// renders them from servicesFixture and fixtureSite: /preview/templates/services/ and
// /preview/templates/evaluation-partner/. The pages are parsed with the CI checks' own scanner
// (scripts/ci/lib.mjs), and every expectation comes from the fixtures, never from copied literals.
// tests/e2e/services-templates.spec.mjs covers layout, keyboard, axe and 320px.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readPreviewDist, visibleText } from "./helpers.mjs";
import { elements, elementsWith, idsIn, startTags } from "../scripts/ci/lib.mjs";
import { NAV_GROUPS } from "../src/data/nav.ts";
import { servicesData, titled } from "../src/content/page-schemas.ts";
import { DELIVERY_LETTER, ONSHORE_PILLAR, PROCESSING_NOTE, SERVICES_H1 } from "../src/lib/fixed-copy.ts";
import { PREVIEW_PAGES } from "../src/fixtures/preview-pages.ts";
import { fixtureSite, servicesFixture } from "../src/fixtures/index.ts";

const SERVICES = "preview/templates/services/index.html";
const PARTNER = "preview/templates/evaluation-partner/index.html";
const SERVICES_SECTIONS = [
  ["method", "Assess, implement and support"],
  ["services-list", "Specialist support"],
  ["entry", "Where to start"],
  ["team", "Who you work with"],
  ["where-it-runs", "Where it runs"],
  ["independence", "Independence policy"],
  ["de-risk", "How we de-risk"],
  ["faq", "Questions"],
];
const PARTNER_SECTIONS = [
  ["who", "Who it's for"],
  ["delivers", "What the workstream delivers"],
  ["fit", "How it fits under your contract"],
  ["independence", "Independence policy"],
  ["method", "Method and harness"],
  ["faq", "Questions"],
];
// Spec §4.2's "Entry?" column, as the service cards label it. A service that isn't an entry shows none.
const ENTRY_LABEL = {
  entry: "Entry point",
  "after-audit-or-trial": "After an Audit or Trial",
  secondary: "Secondary",
  "not-entry": null,
};
// A headcount or a team size: "12 engineers", "a team of five", "three-person team", "50+ staff".
const HEADCOUNT = /\b(?:\d+\+?|one|two|three|four|five|six|seven|eight|nine|ten|dozens?|hundreds?)[\s-]+(?:\w+[\s-]+)?(?:people|persons?|engineers?|evaluators?|staff|consultants?|specialists?|experts?|employees|FTEs?|strong)\b|\bteam of\b|\bheadcount\b/i;

const text = (s) => visibleText(s).trim();
const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>"));
const byId = (html, id) => elements(html, (t) => t.attrs.id === id)[0];
const links = (html) => elements(html, (t) => t.name === "a").map((a) => [text(a.inner), a.attrs.href]);
function template(file, name) {
  const roots = elementsWith(readPreviewDist(file), "data-template", name);
  assert.equal(roots.length, 1, `${file}: expected one [data-template="${name}"]`);
  return roots[0].outer;
}
function expectOneH1AndNoSkippedLevel(file, h1Text) {
  const main = mainOf(readPreviewDist(file));
  const h1 = elements(main, (t) => t.name === "h1");
  assert.equal(h1.length, 1, `${file}: ${h1.length} h1 elements`);
  assert.equal(text(h1[0].inner), h1Text);
  const levels = startTags(main).filter((t) => /^h[1-6]$/.test(t.name)).map((t) => Number(t.name[1]));
  assert.equal(levels[0], 1, `${file}: the first heading is not the h1`);
  for (let i = 1; i < levels.length; i++) {
    assert.ok(levels[i] <= levels[i - 1] + 1, `${file}: h${levels[i - 1]} is followed by h${levels[i]}`);
  }
}
// The top-level sections: PageSections (they carry data-surface), then the closing #contact.
function expectSections(file, name, expected) {
  const t = template(file, name);
  const found = startTags(t).filter((tag) => tag.name === "section" && "data-surface" in tag.attrs).map((tag) => tag.attrs.id);
  assert.deepEqual(found, expected.map(([id]) => id), `${file}: sections`);
  for (const [id, title] of expected) {
    const heading = byId(t, `${id}-heading`);
    assert.ok(heading, `${file}: no #${id}-heading`);
    assert.equal(heading.name, "h2", `${file}: #${id}-heading is an ${heading.name}`);
    assert.equal(text(heading.inner), title, `${file}: #${id}`);
  }
  const contact = byId(t, "contact");
  assert.ok(contact, `${file}: no #contact`);
  assert.ok(t.indexOf('id="contact"') > t.indexOf(`id="${expected.at(-1)[0]}"`), `${file}: #contact is not last`);
  return t;
}
function expectPrompt(t, args, label, href) {
  const [prompt] = elementsWith(byId(t, "contact").outer, "data-prompt-block");
  assert.ok(prompt, "#contact holds no PromptBlock");
  assert.equal(text(prompt.inner.match(/<p\b[\s\S]*?<\/p>/)[0]), args === "--about=fit-call" ? "Bring us one manual process." : "Start with one workflow.");
  assert.deepEqual(links(prompt.inner), [[label, href]]);
}
function expectUniqueIdsAndLabelTargets(file) {
  const html = readPreviewDist(file);
  const ids = startTags(html).map((t) => t.attrs.id).filter(Boolean);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], `${file}: duplicate ids`);
  const known = idsIn(html);
  for (const t of startTags(html)) {
    for (const attr of ["aria-labelledby", "aria-controls", "aria-describedby"]) {
      for (const target of (t.attrs[attr] ?? "").split(/\s+/).filter(Boolean)) {
        assert.ok(known.has(target), `${file}: ${attr}="${target}" names no element`);
      }
    }
  }
}
function faqQuestions(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const faqs = blocks.filter((b) => b["@type"] === "FAQPage");
  assert.equal(faqs.length, 1, "expected exactly one FAQPage");
  return faqs[0].mainEntity.map((q) => q.name);
}

test("the Services and Evaluation Partner specimens are registered as template pages", () => {
  assert.deepEqual(
    PREVIEW_PAGES.filter((p) => ["services", "evaluation-partner"].includes(p.kind)),
    [
      { slug: "templates/services", title: "Fixture services page", kind: "services", group: "templates" },
      { slug: "templates/evaluation-partner", title: "Fixture Evaluation Partner page", kind: "evaluation-partner", group: "templates" },
    ],
  );
});

test("services: one h1, SERVICES_H1, and no skipped heading level", () => {
  expectOneH1AndNoSkippedLevel(SERVICES, SERVICES_H1);
});

test("services: the hero leads to a Fit Call, then to the evaluation method", () => {
  const [hero] = elementsWith(template(SERVICES, "services"), "data-page-hero");
  assert.ok(hero, "no [data-page-hero]");
  assert.deepEqual(links(hero.inner), [
    ["Start with one workflow", fixtureSite.contact({ interest: "not-sure" })],
    ["Read the evaluation method", fixtureSite.page("evaluationMethod").href],
  ]);
  assert.equal(fixtureSite.contact({ interest: "not-sure" }), "/preview/templates/contact/?interest=not-sure");
});

test("services: the sections follow spec §8.6 in order, with their fixed titles, then #contact", () => {
  expectSections(SERVICES, "services", SERVICES_SECTIONS);
});

test("services: #prove, #build and #run are the phase sections in #method, where the nav's Services anchors land", () => {
  const t = template(SERVICES, "services");
  const method = byId(t, "method").outer;
  const phases = startTags(method).filter((tag) => tag.name === "section" && "data-phase" in tag.attrs).map((tag) => tag.attrs.id);
  assert.deepEqual(phases, ["prove", "build", "run"]);
  assert.deepEqual(servicesFixture.phases.map((p) => p.id), phases);
  const anchors = NAV_GROUPS.find((g) => g.id === "services").anchors.map((a) => new URL(a.href, "https://techsider.com.au"));
  assert.deepEqual(anchors.map((u) => u.pathname), ["/services/", "/services/", "/services/"]);
  assert.deepEqual(anchors.map((u) => u.hash.slice(1)), phases, "a nav anchor names no phase section");
  for (const phase of servicesFixture.phases) {
    const s = byId(method, phase.id);
    assert.equal(s.attrs["aria-labelledby"], `${phase.id}-heading`);
    const heading = byId(s.outer, `${phase.id}-heading`);
    assert.equal(heading.name, "h3");
    assert.equal(text(heading.inner), phase.name);
    const body = text(s.inner);
    for (const part of [phase.duration, phase.summary, ...phase.deliverables, ...phase.exitCriteria]) {
      assert.ok(body.includes(part), `#${phase.id} lacks "${part}"`);
    }
    assert.deepEqual(elements(s.inner, (tag) => tag.name === "h4").map((h) => text(h.inner)), ["Deliverables", "Exit criteria"]);
  }
});

test("services: the phase connector is decorative SVG with no lettering in it", () => {
  const method = byId(template(SERVICES, "services"), "method").outer;
  const svgs = elements(method, (tag) => tag.name === "svg");
  assert.equal(svgs.length, servicesFixture.phases.length - 1, "one connector between each pair of phases");
  for (const svg of svgs) {
    assert.equal(svg.attrs["aria-hidden"], "true");
    assert.equal(svg.attrs.focusable, "false");
    assert.equal(elements(svg.inner, (tag) => ["text", "tspan", "textpath", "title", "desc"].includes(tag.name)).length, 0);
    assert.equal(text(svg.inner), "", "the connector carries text");
  }
});

test("services: every service card shows its name, what it is, who it's for and its entry label", () => {
  assert.deepEqual(
    [...new Set(servicesFixture.services.map((s) => s.entry))].sort(),
    Object.keys(ENTRY_LABEL).sort(),
    "the fixture doesn't exercise every entry value",
  );
  const list = byId(template(SERVICES, "services"), "services-list").outer;
  const cards = elementsWith(list, "data-service");
  assert.deepEqual(cards.map((c) => [c.attrs["data-service"], c.attrs["data-entry"]]), servicesFixture.services.map((s) => [s.id, s.entry]));
  const labels = Object.values(ENTRY_LABEL).filter(Boolean);
  for (const [i, s] of servicesFixture.services.entries()) {
    const card = text(cards[i].inner);
    const [heading] = elements(cards[i].inner, (tag) => tag.name === "h3");
    assert.equal(text(heading.inner), s.name);
    for (const part of [s.what, `For: ${s.forWhom}`]) assert.ok(card.includes(part), `${s.id} lacks "${part}"`);
    const label = ENTRY_LABEL[s.entry];
    assert.deepEqual(labels.filter((l) => card.includes(l)), label ? [label] : [], `${s.id}: entry label`);
  }
});

test("services: the Evaluation Partner card links to its page, and every other service card is plain", () => {
  const list = byId(template(SERVICES, "services"), "services-list").outer;
  const linked = elementsWith(list, "data-service").filter((c) => links(c.inner).length > 0);
  const partner = servicesFixture.services.find((s) => s.id === "evaluation-partner");
  assert.ok(partner, "servicesFixture has no evaluation-partner service");
  assert.deepEqual(
    linked.map((c) => [c.attrs["data-service"], links(c.inner)]),
    [["evaluation-partner", [[partner.name, fixtureSite.page("evaluationPartner").href]]]],
  );
});

test("services: #entry is a table of entry offers: Buyer, Start with, Then", () => {
  const entry = byId(template(SERVICES, "services"), "entry").outer;
  const [table] = elements(entry, (tag) => tag.name === "table");
  assert.ok(table, "#entry holds no table");
  const heads = elements(table.inner, (tag) => tag.name === "th" && tag.attrs.scope === "col").map((th) => text(th.inner));
  assert.deepEqual(heads, ["Buyer", "Start with", "Then"]);
  // Drop DataTable's aria-hidden inline column labels, so each cell reads as its value alone.
  const cell = (s) => text(s.replace(/<span\b[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/g, " "));
  const [tbody] = elements(table.inner, (tag) => tag.name === "tbody");
  const rows = elements(tbody.inner, (tag) => tag.name === "tr").map((tr) => elements(tr.inner, (tag) => tag.name === "th" || tag.name === "td"));
  assert.deepEqual(
    rows.map((cells) => cells.map((c) => cell(c.inner))),
    servicesFixture.entryOffers.map((o) => [o.buyer, o.entry, o.then]),
  );
  for (const cells of rows) assert.equal(cells[0].attrs.scope, "row", "the buyer is not the row header");
});

test("services: #team names functions only, with no names, no numbers and no headcount", () => {
  // The schema can't carry a name or a size: the team is a summary plus titled functions, strictly.
  assert.deepEqual(Object.keys(servicesData.shape.team.shape), ["summary", "functions"]);
  assert.deepEqual(Object.keys(titled.shape), ["title", "body"]);
  for (const extra of [{ members: [{ name: "Fixture Person", role: "Fixture role" }] }, { size: 5 }]) {
    assert.equal(servicesData.shape.team.safeParse({ ...servicesFixture.team, ...extra }).success, false, Object.keys(extra)[0]);
  }
  const team = byId(template(SERVICES, "services"), "team");
  const body = text(team.inner);
  assert.equal(
    body,
    text([SERVICES_SECTIONS[3][1], "View team roles", servicesFixture.team.summary, ...servicesFixture.team.functions.flatMap((f) => [f.title, f.body])].join(" ")),
    "#team renders something besides its heading, summary and functions",
  );
  assert.doesNotMatch(body, /\d/, "#team contains a number");
  assert.equal(elements(team.inner, (tag) => ["img", "picture", "figure", "svg"].includes(tag.name)).length, 0, "#team shows a picture");
  assert.deepEqual(elements(team.inner, (tag) => tag.name === "h3").map((h) => text(h.inner)), servicesFixture.team.functions.map((f) => f.title));
  // Page-wide, except #entry: a buyer there may name its own size ("50–300 staff"), which is the
  // client's headcount, not ours.
  const services = mainOf(readPreviewDist(SERVICES));
  const withoutEntry = services.replace(byId(services, "entry").outer, " ");
  assert.doesNotMatch(text(withoutEntry), HEADCOUNT, `${SERVICES}: a headcount or team size`);
  assert.doesNotMatch(text(mainOf(readPreviewDist(PARTNER))), HEADCOUNT, `${PARTNER}: a headcount or team size`);
});

test("the headcount pattern catches team sizes and passes durations", () => {
  for (const s of ["12 engineers", "a team of five", "three-person team", "50+ staff", "two senior evaluators", "our headcount"]) {
    assert.match(s, HEADCOUNT, s);
  }
  for (const s of ["four to six weeks", "30 known documents", "Two-Week Trial on Your Own Files", "the engineers and evaluators who scope the work"]) {
    assert.doesNotMatch(s, HEADCOUNT, s);
  }
});

test("services: where it runs is lettered (a) (b) (c) with the onshore note, and never the onshore pillar", () => {
  const t = template(SERVICES, "services");
  const where = byId(t, "where-it-runs").outer;
  const choices = elementsWith(where, "data-delivery-choice");
  const expected = [...servicesFixture.deliveryChoices].sort((x, y) => DELIVERY_LETTER[x.id].localeCompare(DELIVERY_LETTER[y.id]));
  assert.deepEqual(choices.map((c) => c.attrs["data-delivery-choice"]), ["your-account", "managed", "platform-you-license"]);
  for (const [i, c] of expected.entries()) {
    const [heading] = elements(choices[i].inner, (tag) => tag.name === "h3");
    assert.equal(text(heading.inner), `(${DELIVERY_LETTER[c.id]}) ${c.title}`);
    assert.ok(text(choices[i].inner).includes(c.body));
  }
  const [note] = elementsWith(where, "data-onshore-note");
  assert.deepEqual(elements(note.inner, (tag) => tag.name === "li").map((li) => text(li.inner)), servicesFixture.onshoreNote);
  for (const file of [SERVICES, PARTNER]) {
    const main = mainOf(readPreviewDist(file));
    assert.equal(elementsWith(main, "data-onshore-pillar").length, 0, `${file}: the onshore pillar renders`);
    assert.ok(!text(main).includes(ONSHORE_PILLAR) && !text(main).includes(PROCESSING_NOTE), `${file}: a package pillar line renders`);
  }
});

test("services: the independence policy, the de-risk items and the FAQ come from the Services data", () => {
  const t = template(SERVICES, "services");
  const independence = byId(t, "independence");
  assert.deepEqual(elements(independence.inner, (tag) => tag.name === "li").map((li) => text(li.inner)), servicesFixture.independence);
  const deRisk = byId(t, "de-risk");
  assert.deepEqual(elements(deRisk.inner, (tag) => tag.name === "h3").map((h) => text(h.inner)), servicesFixture.deRisk.map((d) => d.title));
  for (const d of servicesFixture.deRisk) assert.ok(text(deRisk.inner).includes(d.body), `#de-risk lacks "${d.body}"`);
  assert.deepEqual(faqQuestions(readPreviewDist(SERVICES)), servicesFixture.faq.map((f) => f.q));
});

test("services: the closing prompt is talk_to_us --about=fit-call, to a Fit Call", () => {
  expectPrompt(template(SERVICES, "services"), "--about=fit-call", "Start with one workflow", fixtureSite.contact({ interest: "not-sure" }));
});

test("evaluation partner: one h1, the promise, and no skipped heading level", () => {
  expectOneH1AndNoSkippedLevel(PARTNER, servicesFixture.evaluationPartner.promise);
});

test("evaluation partner: the hero has the Services breadcrumb and one CTA, to discuss a workstream", () => {
  const [hero] = elementsWith(template(PARTNER, "evaluation-partner"), "data-page-hero");
  assert.ok(hero, "no [data-page-hero]");
  const [nav] = elements(hero.inner, (tag) => tag.name === "nav" && tag.attrs["aria-label"] === "Breadcrumb");
  assert.ok(nav, "the hero has no breadcrumb");
  assert.deepEqual(links(nav.inner), [["Home", "/"], [fixtureSite.page("services").label, fixtureSite.page("services").href]]);
  const [current] = elements(nav.inner, (tag) => tag.attrs["aria-current"] === "page");
  assert.equal(text(current.inner), fixtureSite.page("evaluationPartner").label);
  const [ctas] = elementsWith(hero.inner, "data-cta-links");
  assert.deepEqual(links(ctas.inner), [["Discuss an evaluation workstream", fixtureSite.contact({ interest: "evaluation-partner" })]]);
  assert.equal(fixtureSite.contact({ interest: "evaluation-partner" }), "/preview/templates/contact/?interest=evaluation-partner");
});

test("evaluation partner: the sections follow spec §8.6 in order, with their fixed titles, then #contact", () => {
  expectSections(PARTNER, "evaluation-partner", PARTNER_SECTIONS);
});

test("evaluation partner: audiences, deliverables, fit and independence come from the Services data", () => {
  const t = template(PARTNER, "evaluation-partner");
  const items = (id) => elements(byId(t, id).inner, (tag) => tag.name === "li").map((li) => text(li.inner));
  const partner = servicesFixture.evaluationPartner;
  assert.deepEqual(items("who"), partner.audiences);
  assert.deepEqual(items("delivers"), partner.delivers);
  assert.deepEqual(items("fit"), partner.fit);
  assert.deepEqual(items("independence"), servicesFixture.independence);
  assert.deepEqual(faqQuestions(readPreviewDist(PARTNER)), partner.faq.map((f) => f.q));
});

test("evaluation partner: #method is the method summary, then a link to the method page", () => {
  const method = byId(template(PARTNER, "evaluation-partner"), "method");
  assert.ok(text(method.inner).includes(servicesFixture.evaluationPartner.methodSummary));
  assert.deepEqual(links(method.inner), [["Read the evaluation method", fixtureSite.page("evaluationMethod").href]]);
});

test("evaluation partner: the closing prompt is talk_to_us --about=evaluation-partner", () => {
  expectPrompt(
    template(PARTNER, "evaluation-partner"),
    "--about=evaluation-partner",
    "Discuss an evaluation workstream",
    fixtureSite.contact({ interest: "evaluation-partner" }),
  );
});

test("both pages: ids are unique page-wide, and every aria-labelledby, aria-controls and aria-describedby target exists", () => {
  for (const file of [SERVICES, PARTNER]) expectUniqueIdsAndLabelTargets(file);
});
