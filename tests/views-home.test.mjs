// The Home view builder (spec §8.1) on the fixture sets. The template is markup over this view;
// tests/template-home.test.mjs checks the rendered pages. Review Focus 5 (the latest-insights
// 45-day boundary) is pinned here through homeView() as well as in tests/insight-cards.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { homeView } from "../src/lib/views/home.ts";
import { insightCards } from "../src/lib/views/insights.ts";
import { siteContext } from "../src/lib/site.ts";
import { CTAS, SITE } from "../src/data/nav.ts";
import { HOME_CLOSING, HOME_PROMPT, HOME_TRUST_QUESTION } from "../src/lib/fixed-copy.ts";
import {
  FIXTURE_NOW, FIXTURE_STALE_NOW, fixtureSite, homeFixture, industryFixtures, insightFixtures, positioningFixture,
  servicesFixture, solutionFixtures, traceFixtures,
} from "../src/fixtures/index.ts";

const DAY = 24 * 60 * 60 * 1000;
const cards = insightCards(insightFixtures, fixtureSite);
const input = (overrides = {}) => ({
  positioning: positioningFixture,
  services: servicesFixture,
  home: homeFixture,
  solutions: solutionFixtures,
  industries: industryFixtures,
  traces: traceFixtures,
  insights: cards,
  now: FIXTURE_NOW,
  site: fixtureSite,
  ...overrides,
});
const view = homeView(input());

test("homeView: the hero is the slogan lock-up, the sub-promise, both CTAs and the hero trace", () => {
  assert.deepEqual(view.hero.prompt, HOME_PROMPT);
  assert.equal(view.hero.slogan, SITE.slogan);
  assert.equal(view.hero.slogan, "AI that ships.");
  assert.equal(view.hero.highlight, "ships");
  assert.match(view.hero.slogan, /\bships\b/, "the highlight is a whole word of the slogan");
  assert.equal(view.hero.proofLine, "Measured before it ships.");
  assert.equal(view.hero.subPromise, positioningFixture.subPromise);
  assert.deepEqual(view.hero.ctas, {
    primary: { label: "Talk to us", href: "/preview/templates/contact/" },
    secondary: { label: "See a demo", href: "/preview/templates/demos-hub/" },
  });
  assert.equal(view.hero.trace, traceFixtures[homeFixture.heroTrace]);
  assert.equal(homeFixture.heroTrace, "fixture-hero-trace");
});

test("homeView: nine industry chips and nine industry cards, in site order, with hooks and shown-only links", () => {
  assert.deepEqual(view.industrySwitcher, fixtureSite.industries.map((i) => ({ label: i.shortName, href: i.href })));
  assert.equal(view.industrySwitcher.length, 9);
  assert.deepEqual(view.industries, fixtureSite.industries.map((i) => ({
    shortName: i.shortName, hook: industryFixtures[i.id].constraintHook, href: i.href,
  })));
  // fixture-industry-9 isn't shown in the gallery: its chip and card get no link.
  assert.deepEqual(view.industrySwitcher.at(-1), { label: "Fixture Industry Nine", href: null });
  assert.equal(view.industries.at(-1).href, null);
});

test("homeView: five solution rows ①–⑤ with the site's one-liner and the solution's for line", () => {
  assert.deepEqual(view.solutions, fixtureSite.solutions.map((s) => ({
    number: s.number, shortName: s.shortName, oneLiner: s.oneLiner, forLine: solutionFixtures[s.id].forLine, href: s.href,
  })));
  assert.deepEqual(view.solutions.map((s) => s.number), ["①", "②", "③", "④", "⑤"]);
});

test("homeView: the demo band, the two routes in, the pillars, the FAQ and the closing prompt", () => {
  assert.deepEqual(view.demo, { allHref: "/preview/templates/demos-hub/" });
  assert.deepEqual(view.routes, { ...servicesFixture.routes, evaluationPartnerHref: "/preview/templates/evaluation-partner/" });
  assert.deepEqual(view.pillars.map((p) => p.id), ["cited", "measured", "onshore", "ownership"]);
  assert.deepEqual(view.pillars, positioningFixture.pillars);
  assert.deepEqual(view.faq, homeFixture.faq);
  assert.equal(view.faq.filter((f) => f.q === HOME_TRUST_QUESTION).length, 1);
  assert.deepEqual(view.closing, {
    command: HOME_CLOSING.command, args: "--about=<industry>", label: CTAS.talk.label, href: "/preview/templates/contact/",
  });
});

test("homeView: where it runs lists (a), (b), (c) in order whatever order the data lists them in", () => {
  const letters = { "your-account": "a", managed: "b", "platform-you-license": "c" };
  const expected = [...servicesFixture.deliveryChoices]
    .sort((x, y) => letters[x.id].localeCompare(letters[y.id]))
    .map((c) => ({ letter: letters[c.id], title: c.title, body: c.body }));
  assert.deepEqual(view.whereItRuns, { choices: expected, onshoreNote: servicesFixture.onshoreNote });
  const reversed = { ...servicesFixture, deliveryChoices: [...servicesFixture.deliveryChoices].reverse() };
  assert.deepEqual(homeView(input({ services: reversed })).whereItRuns.choices.map((c) => c.letter), ["a", "b", "c"]);
});

test("homeView: latest insights show the newest 3 cards at FIXTURE_NOW and only the link at FIXTURE_STALE_NOW", () => {
  assert.equal(view.insights.mode, "cards");
  assert.deepEqual(view.insights.cards.map((c) => c.id), cards.slice(0, 3).map((c) => c.id));
  assert.equal(view.insights.allHref, "/insights/");
  const stale = homeView(input({ now: FIXTURE_STALE_NOW })).insights;
  assert.deepEqual(stale, { mode: "link", cards: [], allHref: "/insights/" });
  assert.deepEqual(homeView(input({ insights: [] })).insights, { mode: "link", cards: [], allHref: "/insights/" });
});

test("homeView: the 45-day boundary, decided at the build time it is given", () => {
  const newest = cards[0].date.getTime();
  assert.equal(homeView(input({ now: new Date(newest + 45 * DAY) })).insights.mode, "cards");
  assert.equal(homeView(input({ now: new Date(newest + 46 * DAY) })).insights.mode, "link");
  // Drafts never count: a draft-only list gives no cards, however recent the draft.
  const drafts = insightCards(insightFixtures.filter((p) => p.data.draft), fixtureSite);
  assert.deepEqual(drafts, []);
  assert.equal(homeView(input({ insights: drafts })).insights.mode, "link");
});

test("homeView: in a production build, planned pages fall back to mailto, #demo and plain text", () => {
  // Re-key the fixture sets onto the real nav ids: siteContext(false) shows only the live pages.
  const prod = siteContext(false);
  const solutions = Object.fromEntries(prod.solutions.map((s, i) => [s.id, Object.values(solutionFixtures)[i]]));
  const industries = Object.fromEntries(prod.industries.map((s, i) => [s.id, Object.values(industryFixtures)[i]]));
  const live = homeView(input({ solutions, industries, site: prod }));
  assert.deepEqual(live.hero.ctas, {
    primary: { label: "Talk to us", href: `mailto:${SITE.email}` },
    secondary: { label: "See a demo", href: "#demo" },
  });
  assert.equal(live.closing.href, `mailto:${SITE.email}`);
  assert.equal(live.demo.allHref, null);
  // Evaluation Partner is live (Phase C Task 2), so the enterprise route's partner line links to it.
  assert.equal(live.routes.evaluationPartnerHref, "/services/evaluation-partner/");
  // The solution pages are live from Phase C Task 3, so their rows link.
  assert.deepEqual(live.solutions.map((s) => s.href), prod.solutions.map((s) => s.path));
  // An industry links once its page is live: Government, Financial services and Accounting from
  // Phase C Task 4. The switcher and the grid follow the site context, page by page.
  const industryHrefs = prod.industries.map((i) => i.href);
  assert.deepEqual(live.industrySwitcher.map((i) => i.href), industryHrefs);
  assert.deepEqual(live.industries.map((i) => i.href), industryHrefs);
  for (const id of ["government", "financial-services", "accounting"]) assert.equal(industryHrefs[prod.industries.findIndex((i) => i.id === id)], `/industries/${id}/`, id);
  // Insights is live, so its link stays.
  assert.equal(live.insights.allHref, "/insights/");
});

test("homeView: throws on a missing hero trace, solution or industry", () => {
  assert.throws(() => homeView(input({ traces: {} })), /no trace "fixture-hero-trace"/);
  const { "fixture-solution-3": _s, ...fourSolutions } = solutionFixtures;
  assert.throws(() => homeView(input({ solutions: fourSolutions })), /no solution data for "fixture-solution-3"/);
  const { "fixture-government": _i, ...eightIndustries } = industryFixtures;
  assert.throws(() => homeView(input({ industries: eightIndustries })), /no industry data for "fixture-government"/);
});
