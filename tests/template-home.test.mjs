// The Home template (spec §8.1) as the preview build renders it from every fixture set:
// /preview/templates/home/ (built at FIXTURE_NOW: the latest insights show as cards) and
// /preview/templates/home-stale-insights/ (FIXTURE_STALE_NOW: only the "All insights" link).
// Run `npm run build:preview` first. The builder is covered by tests/views-home.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readPreviewDist, visibleText } from "./helpers.mjs";
import { decodeEntities, elements, elementsWith, idsIn, startTags } from "../scripts/ci/lib.mjs";
import { traceProvenanceLabel } from "../src/lib/provenance.ts";
import { HOME_ANCHORS } from "../scripts/ci/checks/03-anchors.mjs";
import { homeView } from "../src/lib/views/home.ts";
import { insightCards } from "../src/lib/views/insights.ts";
import { HOME_TRUST_QUESTION } from "../src/lib/fixed-copy.ts";
import {
  FIXTURE_NOW, FIXTURE_STALE_NOW, fixtureSite, homeFixture, industryFixtures, insightFixtures, positioningFixture,
  servicesFixture, solutionFixtures, traceFixtures,
} from "../src/fixtures/index.ts";

const HOME = "preview/templates/home/index.html";
const STALE = "preview/templates/home-stale-insights/index.html";
const viewAt = (now) => homeView({
  positioning: positioningFixture, services: servicesFixture, home: homeFixture, solutions: solutionFixtures,
  industries: industryFixtures, traces: traceFixtures, insights: insightCards(insightFixtures, fixtureSite), now, site: fixtureSite,
});
const view = viewAt(FIXTURE_NOW);
// The template's blocks after the hero, in spec §8.1 order, with the surface each one sits on.
const SECTIONS = [
  ["switcher", "Find your industry", "carbon"],
  ["services", "Five solutions", "bone"],
  ["demo", "See it work", "carbon"],
  ["approach", "Two ways in", "bone"],
  ["pillars", "The four rules we build by", "carbon"],
  ["where-it-runs", "Where it runs", "bone"],
  ["industries", "Built for your industry", "carbon"],
  ["insights", "Latest insights", "bone"],
  ["faq", "Questions", "bone"],
];

const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>") + "</main>".length);
const text = (html) => visibleText(html).trim();
// Text as a browser shows it inline: tags dropped without adding spaces ("<span>ships</span>." → "ships.").
const inlineText = (html) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const tagged = (html, name) => elements(html, (t) => t.name === name);
const withClass = (html, cls) => elements(html, (t) => new RegExp(`(^|\\s)${cls}(\\s|$)`).test(t.attrs.class ?? ""));
function one(html, attr, value) {
  const found = elementsWith(html, attr, value);
  assert.equal(found.length, 1, `expected one [${attr}${value === undefined ? "" : `="${value}"`}], found ${found.length}`);
  return found[0];
}
const lineText = (l) => [l.t, l.op, l.detail, l.metric ? `${l.metric.value}${l.metric.unit ?? ""}` : ""].filter(Boolean).join(" ");

for (const file of [HOME, STALE]) {
  test(`${file}: one h1, the spec §7.1 anchors, the blocks in order, headings in order, unique ids`, () => {
    const html = readPreviewDist(file);
    const main = mainOf(html);
    const template = one(main, "data-template", "home");
    const h1s = tagged(main, "h1");
    assert.equal(h1s.length, 1, "exactly one <h1>");
    // Display caps come from CSS: the text stays "AI that ships." for assistive technology.
    assert.equal(inlineText(h1s[0].inner), "AI that ships.");
    assert.deepEqual(withClass(h1s[0].inner, "hl").map((s) => text(s.inner)), ["ships"]);
    // CI check 03 requires these ids on the built Home page (Phase D points / at this template).
    const ids = idsIn(template.outer);
    for (const id of HOME_ANCHORS) assert.ok(ids.has(id), `no id="${id}"`);
    // The hero, then each block in order, then the closing prompt last.
    const order = startTags(template.inner).filter((t) => t.attrs.id && [...SECTIONS.map(([id]) => id), "contact"].includes(t.attrs.id)).map((t) => t.attrs.id);
    assert.deepEqual(order, [...SECTIONS.map(([id]) => id), "contact"]);
    assert.ok(template.inner.indexOf("data-page-hero") < template.inner.indexOf('id="switcher"'), "the hero comes first");
    const contact = one(template.inner, "id", "contact");
    assert.ok(template.inner.trimEnd().endsWith(contact.outer), "#contact is not the last block");
    for (const [id, title, surface] of SECTIONS) {
      const section = one(template.inner, "id", id);
      assert.equal(section.name, "section", `#${id} is a <section>`);
      assert.equal(section.attrs["aria-labelledby"], `${id}-heading`);
      assert.equal(section.attrs["data-surface"], surface, `#${id} sits on ${surface}`);
      assert.equal(/(^|\s)surface-bone(\s|$)/.test(section.attrs.class), surface === "bone", `#${id} surface-bone class`);
      assert.equal(text(one(section.inner, "id", `${id}-heading`).inner), title);
    }
    // Headings never skip a level on the way down.
    const levels = startTags(main).filter((t) => /^h[1-6]$/.test(t.name)).map((t) => Number(t.name[1]));
    levels.forEach((level, i) => {
      if (i > 0) assert.ok(level <= levels[i - 1] + 1, `h${levels[i - 1]} is followed by h${level}`);
    });
    const all = startTags(html).map((t) => t.attrs.id).filter(Boolean);
    assert.deepEqual(all.filter((id, i) => all.indexOf(id) !== i), [], "duplicate ids");
    const known = idsIn(html);
    for (const t of startTags(html).filter((t) => "aria-labelledby" in t.attrs)) {
      for (const id of t.attrs["aria-labelledby"].split(/\s+/)) assert.ok(known.has(id), `aria-labelledby="${id}" names no element`);
    }
  });
}

test("home: the hero holds the prompt, the H1, the proof line, the sub-promise, both CTAs, then the trace", () => {
  const hero = one(mainOf(readPreviewDist(HOME)), "data-page-hero");
  // The prompt line is decorative: an aria-hidden paragraph ahead of the H1.
  const prompt = elements(hero.inner, (t) => t.name === "p" && t.attrs["aria-hidden"] === "true").filter((p) => text(p.inner).includes("applied_ai"));
  assert.equal(prompt.length, 1);
  assert.equal(text(prompt[0].inner), "> applied_ai --region=au");
  assert.ok(hero.inner.indexOf(prompt[0].outer) < hero.inner.indexOf("<h1"), "the prompt line comes before the H1");
  // The proof line sits directly under the H1 (spec §6.3: never the slogan without it).
  assert.match(hero.inner, /<\/h1>\s*<p\b[^>]*>Measured before it ships\.<\/p>/);
  assert.ok(text(hero.inner).includes(positioningFixture.subPromise));
  const links = tagged(hero.inner, "a").map((a) => [text(a.inner), a.attrs.href]);
  assert.deepEqual(links, [["Talk to us", "/preview/templates/contact/"], ["See a demo", "/preview/templates/demos-hub/"]]);
  // The trace sits inside the hero, after the CTAs (no split layout).
  const trace = one(hero.inner, "data-hero-trace");
  assert.ok(hero.inner.indexOf("See a demo") < hero.inner.indexOf("data-hero-trace"), "the trace comes after the CTAs");
  assert.equal(elementsWith(trace.inner, "data-trace-panel").length, 1);
});

test("home: the hero trace is aria-hidden and its lines are present once more as static text", () => {
  const html = readPreviewDist(HOME);
  const trace = one(html, "data-hero-trace");
  assert.equal(trace.name, "div");
  assert.equal(trace.attrs["aria-hidden"], "true");
  assert.equal(tagged(trace.inner, "a").length + tagged(trace.inner, "button").length, 0, "nothing focusable inside aria-hidden");
  const hero = traceFixtures["fixture-hero-trace"];
  const staticText = one(html, "data-hero-trace-text");
  assert.match(staticText.attrs.class, /(^|\s)sr-only(\s|$)/);
  assert.ok(!("aria-hidden" in staticText.attrs));
  assert.equal(text(tagged(staticText.inner, "p")[0].inner), `${hero.title} (${traceProvenanceLabel(hero)})`);
  // The same label the TracePanel caption shows, from the one helper both use.
  assert.equal(text(one(trace.inner, "data-provenance-label").inner), traceProvenanceLabel(hero));
  assert.deepEqual(tagged(staticText.inner, "li").map((li) => text(li.inner)), hero.lines.map(lineText));
  // Exactly one static copy: outside the aria-hidden wrapper, each line appears once.
  const outsideHidden = html.replace(trace.outer, "");
  for (const line of hero.lines) {
    assert.equal(text(outsideHidden).split(lineText(line)).length - 1, 1, `"${lineText(line)}" is not present exactly once`);
  }
});

// Review finding T9-F2: the Home template re-derived TracePanel's provenance label for its static
// copy, so the two honesty labels could drift apart. Both now call traceProvenanceLabel().
test("home: the hero's static copy and TracePanel take the provenance label from one helper", () => {
  for (const file of ["components/ui/TracePanel.astro", "templates/HomeTemplate.astro"]) {
    const src = readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
    assert.match(src, /import \{ traceProvenanceLabel \} from "[./]+lib\/provenance";/, `${file} doesn't import traceProvenanceLabel`);
    assert.match(src, /traceProvenanceLabel\((?:hero\.)?trace\)/, `${file} doesn't call traceProvenanceLabel`);
    assert.doesNotMatch(src, /Illustrative trace|Measured run:/, `${file} spells out a trace provenance label itself`);
  }
});

test("traceProvenanceLabel: an illustrative trace says so, a measured one names its run, and a measured one without a run fails", () => {
  const base = { title: "Fixture trace", lines: [] };
  assert.equal(traceProvenanceLabel({ ...base, provenance: "illustrative" }), "Illustrative trace");
  assert.equal(traceProvenanceLabel({ ...base, provenance: "measured", run: "src/data/runs/fixture-run/" }), "Measured run: src/data/runs/fixture-run/");
  assert.throws(() => traceProvenanceLabel({ ...base, provenance: "measured" }), {
    message: 'trace "Fixture trace": provenance is "measured", but no run path is given',
  });
});

test("home: the industry switcher is a 9-chip row, linking every shown industry", () => {
  const switcher = one(mainOf(readPreviewDist(HOME)), "id", "switcher");
  const chips = elementsWith(switcher.inner, "data-bracket-chip");
  assert.equal(chips.length, 9);
  assert.deepEqual(chips.map((c) => inlineText(c.inner)), view.industrySwitcher.map((i) => `[${i.label}]`));
  assert.deepEqual(chips.map((c) => (c.name === "a" ? c.attrs.href : null)), view.industrySwitcher.map((i) => i.href));
});

test("home: #services lists the five solutions as numbered rows with one-liner, for line and link", () => {
  const services = one(mainOf(readPreviewDist(HOME)), "id", "services");
  const list = tagged(services.inner, "ol");
  assert.equal(list.length, 1);
  const rows = elementsWith(list[0].inner, "data-solution-row");
  assert.equal(rows.length, 5);
  rows.forEach((row, i) => {
    const s = view.solutions[i];
    assert.equal(row.name, "li");
    assert.equal(text(withClass(row.inner, "home-solution-number")[0].inner), s.number);
    const heading = tagged(row.inner, "h3");
    assert.equal(heading.length, 1);
    assert.deepEqual(tagged(heading[0].inner, "a").map((a) => [text(a.inner), a.attrs.href]), [[s.shortName, s.href]]);
    assert.ok(text(row.inner).includes(s.oneLiner));
    assert.ok(text(row.inner).includes(`For: ${s.forLine}`));
  });
});

test("home: #demo holds the demo slot, then the All demos link", () => {
  const demo = one(mainOf(readPreviewDist(HOME)), "id", "demo");
  const slot = one(demo.inner, "data-demo-slot");
  assert.equal(text(one(slot.inner, "data-demo-placeholder").inner), "Fixture demo slot");
  const all = one(demo.inner, "data-all-demos");
  assert.equal(all.attrs.href, "/preview/templates/demos-hub/");
  assert.equal(text(all.inner), "All demos →");
  assert.ok(demo.inner.indexOf("data-demo-slot") < demo.inner.indexOf("data-all-demos"));
});

test("home: #approach shows the two routes with their steps, and the partner line links to Evaluation Partner", () => {
  const approach = one(mainOf(readPreviewDist(HOME)), "id", "approach");
  const routes = elementsWith(approach.inner, "data-route");
  assert.deepEqual(routes.map((r) => r.attrs["data-route"]), ["mid-market", "enterprise"]);
  for (const [route, data] of [[routes[0], servicesFixture.routes.midMarket], [routes[1], servicesFixture.routes.enterprise]]) {
    assert.equal(text(tagged(route.inner, "h3")[0].inner), data.title);
    const steps = tagged(tagged(route.inner, "ol")[0].inner, "li");
    assert.equal(steps.length, data.steps.length);
    steps.forEach((li, i) => {
      assert.ok(text(li.inner).includes(data.steps[i].name));
      assert.ok(text(li.inner).includes(data.steps[i].body));
    });
  }
  assert.equal(elementsWith(routes[0].inner, "data-partner-line").length, 0);
  const partner = one(routes[1].inner, "data-partner-line");
  assert.deepEqual(tagged(partner.inner, "a").map((a) => [text(a.inner), a.attrs.href]), [
    [servicesFixture.routes.enterprise.partnerLine, "/preview/templates/evaluation-partner/"],
  ]);
  assert.ok(routes[1].inner.trimEnd().endsWith(partner.outer), "the partner line ends the enterprise column");
});

test("home: #pillars shows each pillar's mechanism, then 'Put simply:' and its plain version (WB-6), and no element is an onshore pillar", () => {
  const html = readPreviewDist(HOME);
  const pillars = elementsWith(one(mainOf(html), "id", "pillars").inner, "data-pillar");
  assert.deepEqual(pillars.map((p) => p.attrs["data-pillar"]), ["cited", "measured", "onshore", "ownership"]);
  pillars.forEach((p, i) => {
    const pillar = positioningFixture.pillars[i];
    assert.equal(text(tagged(p.inner, "h3")[0].inner), pillar.title);
    const paragraphs = tagged(p.inner, "p");
    assert.deepEqual(paragraphs.map((x) => text(x.inner)), [pillar.mechanism, `Put simply: ${pillar.midMarket}`]);
    assert.equal(paragraphs[1].attrs["data-pillar-plain"], "", "the plain version isn't marked data-pillar-plain");
  });
  // data-onshore-pillar marks a package's pillar (CI check 10); Home's pillars never carry it.
  for (const file of [HOME, STALE]) {
    assert.equal(startTags(readPreviewDist(file)).filter((t) => "data-onshore-pillar" in t.attrs).length, 0, file);
  }
});

test("home: #where-it-runs lists (a) (b) (c), then the onshore note", () => {
  const section = one(mainOf(readPreviewDist(HOME)), "id", "where-it-runs");
  const choices = elementsWith(section.inner, "data-delivery-letter");
  assert.deepEqual(choices.map((c) => c.attrs["data-delivery-letter"]), ["a", "b", "c"]);
  choices.forEach((c, i) => {
    const choice = view.whereItRuns.choices[i];
    assert.equal(text(tagged(c.inner, "h3")[0].inner), `(${choice.letter}) ${choice.title}`);
    assert.ok(text(c.inner).includes(choice.body));
  });
  const note = one(section.inner, "data-onshore-note");
  assert.equal(text(tagged(note.inner, "h3")[0].inner), "The onshore note");
  assert.deepEqual(tagged(note.inner, "li").map((li) => text(li.inner)), servicesFixture.onshoreNote);
  assert.ok(section.inner.indexOf("data-delivery-letter") < section.inner.indexOf("data-onshore-note"));
});

test("home: #industries shows nine cards with their hooks, linked only when the industry page is shown", () => {
  const section = one(mainOf(readPreviewDist(HOME)), "id", "industries");
  const cards = withClass(section.inner, "link-card");
  assert.equal(cards.length, 9);
  cards.forEach((card, i) => {
    const industry = view.industries[i];
    assert.equal(text(tagged(card.inner, "h3")[0].inner), industry.shortName);
    assert.ok(text(card.inner).includes(industry.hook));
    assert.deepEqual(tagged(card.inner, "a").map((a) => a.attrs.href), industry.href === null ? [] : [industry.href]);
  });
});

test("home: #insights shows 3 cards and the All insights link while the newest post is recent", () => {
  const section = one(mainOf(readPreviewDist(HOME)), "id", "insights");
  const block = one(section.inner, "data-latest-insights");
  assert.equal(block.attrs["data-latest-insights"], "cards");
  const cards = elementsWith(block.inner, "data-insight-card");
  assert.deepEqual(cards.map((c) => tagged(c.inner, "a").find((a) => a.attrs.href.startsWith("/insights/")).attrs.href), view.insights.cards.map((c) => c.href));
  assert.equal(cards.length, 3);
  const all = one(block.inner, "data-all-insights");
  assert.deepEqual([all.attrs.href, text(all.inner)], ["/insights/", "All insights →"]);
});

test("home-stale-insights: #insights keeps its anchor and shows only the All insights link", () => {
  assert.equal(viewAt(FIXTURE_STALE_NOW).insights.mode, "link");
  const section = one(mainOf(readPreviewDist(STALE)), "id", "insights");
  const block = one(section.inner, "data-latest-insights");
  assert.equal(block.attrs["data-latest-insights"], "link");
  assert.equal(elementsWith(block.inner, "data-insight-card").length, 0);
  assert.deepEqual(tagged(block.inner, "a").map((a) => [a.attrs.href, text(a.inner)]), [["/insights/", "All insights →"]]);
});

test("home: the FAQ asks the trust question and carries one FAQPage; the closing prompt talks to us", () => {
  const html = readPreviewDist(HOME);
  const faq = one(mainOf(html), "id", "faq");
  const questions = elements(faq.inner, (t) => t.name === "summary").map((s) => text(s.inner).replace(/\s*\+\s*−$/, ""));
  assert.deepEqual(questions, homeFixture.faq.map((f) => f.q));
  assert.ok(questions.includes(HOME_TRUST_QUESTION));
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  assert.equal(ld.filter((d) => d["@type"] === "FAQPage").length, 1, "one FAQPage");
  const contact = one(mainOf(html), "id", "contact");
  const prompt = one(contact.inner, "data-prompt-block");
  assert.equal(text(withClass(prompt.inner, "prompt-line")[0].inner), "> talk_to_us --about=<industry>");
  assert.deepEqual(tagged(prompt.inner, "a").map((a) => [text(a.inner), a.attrs.href]), [["Talk to us", "/preview/templates/contact/"]]);
});
