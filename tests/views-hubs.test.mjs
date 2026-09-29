// View builders for the Solutions hub (spec §8.2), the Industries hub (§8.4) and the solution ×
// industry matrix they share: src/lib/views/hubs.ts, run on every fixture set with the gallery's
// SiteContext. tests/template-hubs.test.mjs checks the rendered markup and
// tests/e2e/template-hubs.spec.mjs the behaviour in a browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { industriesHubView, matrixView, solutionsHubView } from "../src/lib/views/hubs.ts";
import { industryView } from "../src/lib/views/industry.ts";
import { JURISDICTION_SECTION } from "../src/content/schemas.ts";
import { fixtureSite, industryFixtures, regulatoryFixtures, solutionFixtures, traceFixtures } from "../src/fixtures/index.ts";

const site = fixtureSite;
const solutions = solutionFixtures;
const industries = industryFixtures;
const launchOf = (data) => [data.genericPackage, ...data.packages.filter((p) => p.status === "launch")];
const fragment = (href) => href.slice(href.indexOf("#") + 1);
// The gallery's SiteContext with no solution or industry page shown, as in a production build
// before Phase C makes them live.
const unshown = {
  ...site,
  solutions: site.solutions.map((s) => ({ ...s, href: null })),
  industries: site.industries.map((i) => ({ ...i, href: null })),
};

test("hubs.ts is a pure builder: it never imports astro:content", () => {
  const src = readFileSync(new URL("../src/lib/views/hubs.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /["']astro:content["']/);
});

test("matrixView: one anchored row per industry and one column per solution, in site order", () => {
  const m = matrixView(solutions, site);
  assert.equal(m.rowHeader, "industry");
  assert.ok(m.caption.length > 0, "the matrix has no caption");
  assert.deepEqual(m.columns, [
    { key: "industry", label: "Industry" },
    ...site.solutions.map((s) => ({ key: s.id, label: `${s.number} ${s.shortName}` })),
  ]);
  assert.deepEqual(m.columns.slice(1).map((c) => c.label.slice(0, 1)), ["①", "②", "③", "④", "⑤"]);
  assert.equal(m.rows.length, 9);
  assert.deepEqual(m.rowIds, site.industries.map((i) => `matrix-${i.id}`));
  assert.deepEqual(m.rows.map((r) => r.industry), site.industries.map((i) => ({ text: i.shortName, href: i.href })));
  for (const row of m.rows) assert.deepEqual(Object.keys(row), m.columns.map((c) => c.key));
  // fixture-industry-9's page isn't shown: its row header is a text cell, not a dead link.
  assert.deepEqual(m.rows[m.rowIds.indexOf("matrix-fixture-industry-9")].industry, { text: "Fixture Industry Nine", href: null });
});

test("matrixView: a cell is the solution's example linking to its page, or — when it has none", () => {
  const m = matrixView(solutions, site);
  let filled = 0;
  let empty = 0;
  site.industries.forEach((industry, r) => {
    for (const s of site.solutions) {
      const example = solutions[s.id].matrix[industry.id];
      const cell = m.rows[r][s.id];
      if (example === undefined) {
        assert.equal(cell, "—", `${industry.id} × ${s.id}`);
        empty++;
      } else {
        assert.deepEqual(cell, { text: example, href: s.href }, `${industry.id} × ${s.id}`);
        filled++;
      }
    }
  });
  assert.ok(filled > 0 && empty > 0, "the fixtures exercise both a filled and an empty cell");
});

test("matrixView: cells are text while no solution page is shown; a solution with no data throws", () => {
  const m = matrixView(solutions, unshown);
  for (const row of m.rows) {
    for (const cell of Object.values(row)) if (typeof cell !== "string") assert.equal(cell.href, null);
  }
  const { "fixture-solution-3": _dropped, ...four } = solutions;
  assert.throws(() => matrixView(four, site), /fixture-solution-3/);
});

test("solutionsHubView: five jobs in §4.1 order, the matrix, the services link and the closing prompt", () => {
  const v = solutionsHubView({ solutions, site });
  assert.deepEqual(
    v.jobs,
    site.solutions.map((s) => ({ number: s.number, shortName: s.shortName, fullName: s.fullName, oneLiner: s.oneLiner, job: solutions[s.id].job, href: s.href })),
  );
  assert.deepEqual(v.matrix, matrixView(solutions, site));
  assert.equal(v.servicesHref, "/preview/templates/services/");
  assert.deepEqual(v.closing, { command: "talk_to_us", args: "--about=<solution>", label: "Talk to us", href: site.contact() });
  assert.equal(v.closing.href, "/preview/templates/contact/");
});

test("solutionsHubView: byBuyer lists every launch package under each buyer it names, generic first, and nothing else", () => {
  const v = solutionsHubView({ solutions, site });
  const expected = (buyer) =>
    site.solutions.flatMap((s) =>
      launchOf(solutions[s.id])
        .filter((p) => p.buyers.includes(buyer))
        .map((p) => ({ name: p.name, solution: { number: s.number, shortName: s.shortName }, href: `${s.href}#${p.id}` })),
    );
  assert.deepEqual(v.byBuyer.midMarket, expected("mid-market"));
  assert.deepEqual(v.byBuyer.enterprise, expected("enterprise-government"));
  assert.ok(v.byBuyer.midMarket.length > 0 && v.byBuyer.enterprise.length > 0, "the fixtures fill both lists");
  const listed = new Set([...v.byBuyer.midMarket, ...v.byBuyer.enterprise].map((item) => fragment(item.href)));
  for (const s of site.solutions) {
    for (const p of launchOf(solutions[s.id])) assert.ok(listed.has(p.id), `launch package ${p.id} is in neither list`);
    for (const p of solutions[s.id].packages.filter((p) => p.status !== "launch")) {
      assert.ok(!listed.has(p.id), `${p.status} package ${p.id} is listed`);
    }
  }
});

test("solutionsHubView: a package for both buyers is in both lists; unshown solution pages give text items", () => {
  const both = structuredClone(solutions);
  both["fixture-solution"].genericPackage.buyers = ["mid-market", "enterprise-government"];
  const v = solutionsHubView({ solutions: both, site });
  const href = `${site.solutions[0].href}#${both["fixture-solution"].genericPackage.id}`;
  assert.equal(v.byBuyer.midMarket.filter((item) => item.href === href).length, 1);
  assert.equal(v.byBuyer.enterprise.filter((item) => item.href === href).length, 1);

  const off = solutionsHubView({ solutions, site: unshown });
  for (const job of off.jobs) assert.equal(job.href, null);
  for (const item of [...off.byBuyer.midMarket, ...off.byBuyer.enterprise]) assert.equal(item.href, null);
});

test("industriesHubView: nine deep cards in §5 order: hook, three use cases with solution numbers, three chips", () => {
  const v = industriesHubView({ industries, solutions, site });
  assert.deepEqual(v.cards.map((c) => c.id), site.industries.map((i) => i.id));
  for (const [i, card] of v.cards.entries()) {
    const link = site.industries[i];
    const data = industries[link.id];
    assert.equal(card.shortName, link.shortName);
    assert.equal(card.fullName, link.fullName);
    assert.equal(card.href, link.href);
    assert.equal(card.hook, data.constraintHook);
    assert.equal(card.useCases.length, 3, `${card.id}: use cases`);
    assert.deepEqual(
      card.useCases,
      data.flagshipUseCases.slice(0, 3).map((u) => ({ name: u.name, number: site.solutions.find((s) => s.id === u.solution).number })),
    );
    assert.equal(card.chips.length, 3, `${card.id}: chips`);
    assert.deepEqual(card.chips.map((c) => c.label), data.obligationChips.slice(0, 3).map((c) => c.label));
  }
  assert.deepEqual(v.matrix, matrixView(solutions, site));
  assert.deepEqual(v.closing, { command: "talk_to_us", args: "--about=<industry>", label: "Talk to us", href: site.contact() });
});

test("industriesHubView: each chip links to its row anchor, per section in jurisdiction mode, or is text", () => {
  const v = industriesHubView({ industries, solutions, site });
  for (const card of v.cards) {
    const data = industries[card.id];
    card.chips.forEach((chip, k) => {
      const c = data.obligationChips[k];
      const anchor = data.jurisdictions ? `reg-${JURISDICTION_SECTION[c.jurisdiction]}-${c.row}` : `reg-${c.row}`;
      assert.equal(chip.href, card.href === null ? null : `${card.href}#${anchor}`, `${card.id}: ${c.label}`);
    });
  }
  const government = v.cards.find((c) => c.id === "fixture-government");
  for (const chip of government.chips) {
    assert.match(chip.href, /^\/preview\/templates\/industry-government\/#reg-(commonwealth|state|local)-[a-z0-9-]+$/);
  }
  assert.deepEqual(v.cards.find((c) => c.id === "fixture-industry-9").chips.map((c) => c.href), [null, null, null]);
});

test("industriesHubView: every chip anchor is a chip and a row of its industry page (industryView)", () => {
  const v = industriesHubView({ industries, solutions, site });
  for (const card of v.cards.filter((c) => c.href !== null)) {
    const page = industryView({
      id: card.id, data: industries[card.id], rows: regulatoryFixtures[card.id].rows,
      solutions, traces: traceFixtures, insights: [], site,
    });
    const blocks = page.mode === "single" ? [page.single] : page.sections;
    const chipHrefs = new Set(blocks.flatMap((b) => b.chips.map((c) => c.href)));
    const anchors = new Set(blocks.flatMap((b) => b.rows.map((r) => r.anchor)));
    for (const chip of card.chips) {
      assert.ok(chipHrefs.has(`#${fragment(chip.href)}`), `${card.id}: #${fragment(chip.href)} is no chip on its industry page`);
      assert.ok(anchors.has(fragment(chip.href)), `${card.id}: #${fragment(chip.href)} names no regulatory row`);
    }
  }
});

test("industriesHubView: a missing industry, an unknown use-case solution or an untagged jurisdiction chip throws", () => {
  const { "fixture-industry-4": _dropped, ...eight } = industries;
  assert.throws(() => industriesHubView({ industries: eight, solutions, site }), /fixture-industry-4/);
  const unknown = structuredClone(industries);
  unknown["fixture-industry"].flagshipUseCases[0].solution = "fixture-no-such-solution";
  assert.throws(() => industriesHubView({ industries: unknown, solutions, site }), /fixture-no-such-solution/);
  const untagged = structuredClone(industries);
  delete untagged["fixture-government"].obligationChips[0].jurisdiction;
  assert.throws(() => industriesHubView({ industries: untagged, solutions, site }), /no jurisdiction/);
});
