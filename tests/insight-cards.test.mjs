// Insight cards and Home's 45-day latest-insights rule (spec §8.1 block 9). Review Focus 5 is
// pinned here: exactly 45 days, 46 days, no posts, and drafts only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { insightCards, latestInsights } from "../src/lib/views/insights.ts";
import { siteContext } from "../src/lib/site.ts";
import { fixtureSite, insightFixtures, FIXTURE_NOW, FIXTURE_STALE_NOW } from "../src/fixtures/index.ts";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-09-29T00:00:00Z");
const daysAgo = (n, from = NOW) => new Date(from.getTime() - n * DAY);
const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
const post = (id, publishDate, extra = {}) => ({
  id,
  body: words(200),
  data: {
    title: `Test title ${id}`, description: `Test description ${id}`, publishDate, type: "article",
    industries: [], solutions: [], illustrative: false, draft: false, ...extra,
  },
});
const cardsAt = (...ages) => insightCards(ages.map((age, i) => post(`p${i}`, daysAgo(age))), fixtureSite);

test("insightCards: drafts dropped, newest first, and each card carries its link, type, date and reading time", () => {
  const cards = insightCards([
    post("older", daysAgo(10), { type: "platform-guide" }),
    post("draft", daysAgo(0), { draft: true }),
    { ...post("newer", daysAgo(2), { type: "reference-scenario", illustrative: true }), body: words(600) },
    { ...post("no-body", daysAgo(5)), body: undefined },
  ], fixtureSite);
  assert.deepEqual(cards.map((c) => c.id), ["newer", "no-body", "older"]);
  assert.deepEqual(cards[0], {
    id: "newer", href: "/insights/newer/", title: "Test title newer", description: "Test description newer",
    typeLabel: "Reference scenario", date: daysAgo(2), minutes: 3, industries: [],
  });
  assert.equal(cards[1].minutes, 1);
  assert.equal(cards[2].typeLabel, "Platform guide");
  // Same date: ordered by id, so every build lists them the same way.
  assert.deepEqual(insightCards([post("b", NOW), post("a", NOW)], fixtureSite).map((c) => c.id), ["a", "b"]);
});

test("insightCards: industry references become chips, as links only when the page is shown", () => {
  const [card] = insightCards([post("p", NOW, {
    industries: ["fixture-government", { id: "fixture-industry-9", collection: "industries" }],
  })], fixtureSite);
  assert.deepEqual(card.industries, [
    { id: "fixture-government", label: "Fixture Government", href: "/preview/templates/industry-government/" },
    { id: "fixture-industry-9", label: "Fixture Industry Nine", href: null },
  ]);
  // Production links an industry chip once the page is live (Government from Phase C Task 4).
  const [prod] = insightCards([post("p", NOW, { industries: ["government", "healthcare"] })], siteContext(false));
  assert.deepEqual(prod.industries, [
    { id: "government", label: "Government", href: "/industries/government/" },
    { id: "healthcare", label: "Healthcare", href: siteContext(false).industries.find((i) => i.id === "healthcare").href },
  ]);
  assert.throws(() => insightCards([post("p", NOW, { industries: ["mining"] })], siteContext(true)), /Unknown industry id "mining"/);
});

test("latestInsights: the newest post exactly 45 days old still shows the newest 3 cards", () => {
  const cards = cardsAt(45, 50, 60, 70);
  assert.deepEqual(latestInsights(cards, NOW).map((c) => c.id), ["p0", "p1", "p2"]);
  // Whole days: 45 days and 23:59:59 is still 45 days old.
  assert.equal(latestInsights(cards, new Date(NOW.getTime() + DAY - 1000)).length, 3);
});

test("latestInsights: at 46 days the section falls back to its link", () => {
  assert.deepEqual(latestInsights(cardsAt(46, 50), NOW), []);
  assert.deepEqual(latestInsights(cardsAt(45, 50), new Date(NOW.getTime() + DAY)), []);
});

test("latestInsights: no posts, or drafts only, gives no cards", () => {
  assert.deepEqual(latestInsights([], NOW), []);
  const draftsOnly = insightCards([post("d1", NOW, { draft: true }), post("d2", daysAgo(1), { draft: true })], fixtureSite);
  assert.deepEqual(draftsOnly, []);
  assert.deepEqual(latestInsights(draftsOnly, NOW), []);
});

test("latestInsights: a fresh draft doesn't make stale posts count as recent", () => {
  const cards = insightCards([post("draft", NOW, { draft: true }), post("stale", daysAgo(46))], fixtureSite);
  assert.deepEqual(latestInsights(cards, NOW), []);
});

test("latestInsights: fewer than 3 posts show as they are; order and input are safe", () => {
  assert.deepEqual(latestInsights(cardsAt(1), NOW).map((c) => c.id), ["p0"]);
  // Input in any order, even frozen: the result is the newest 3, and the input is untouched.
  const shuffled = Object.freeze([...cardsAt(3, 1, 9, 2)].reverse());
  assert.deepEqual(latestInsights(shuffled, NOW).map((c) => c.id), ["p1", "p3", "p0"]);
  assert.equal(latestInsights(cardsAt(10), NOW, 9).length, 0);
  assert.equal(latestInsights(cardsAt(10), NOW, 10).length, 1);
});

test("the gallery's insight fixtures give 4 cards: 3 at FIXTURE_NOW, none at FIXTURE_STALE_NOW", () => {
  const cards = insightCards(insightFixtures, fixtureSite);
  assert.deepEqual(cards.map((c) => c.date.toISOString().slice(0, 10)), ["2026-09-20", "2026-08-30", "2026-07-15", "2026-06-01"]);
  assert.equal(latestInsights(cards, FIXTURE_NOW).length, 3);
  assert.deepEqual(latestInsights(cards, FIXTURE_STALE_NOW), []);
});
