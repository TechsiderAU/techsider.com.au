// industryView() (spec §8.5 and §5): row anchors, jurisdiction sections, recommended packages,
// the site-context fallbacks and the build-failing data errors, over the fixtures. Pure data, so
// no build is needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { JURISDICTION_SECTION, SECTION_ORDER, SECTION_TITLE } from "../src/content/schemas.ts";
import { WORKS_METHOD_LABEL } from "../src/lib/fixed-copy.ts";
import { crumbs, industryLink, solutionLink } from "../src/lib/site.ts";
import { industryView } from "../src/lib/views/industry.ts";
import { fixtureSite, industryFixtures, regulatoryFixtures, solutionFixtures, traceFixtures } from "../src/fixtures/index.ts";

const INDUSTRY = "fixture-industry";
const GOVERNMENT = "fixture-government";
const input = (id, over = {}) => ({
  id,
  data: industryFixtures[id],
  rows: regulatoryFixtures[id].rows,
  solutions: solutionFixtures,
  traces: traceFixtures,
  insights: [],
  site: fixtureSite,
  ...over,
});
const chipOf = (site, id) => {
  const s = solutionLink(site, id);
  return { number: s.number, shortName: s.shortName, href: s.href };
};
const latest = (rows) => Math.max(...rows.map((r) => r.lastReviewed.getTime()));
const inSection = (section) => (item) => item.jurisdiction !== undefined && JURISDICTION_SECTION[item.jurisdiction] === section;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("single mode: every row gets a reg-<row> anchor, and each chip links to its row", () => {
  const data = industryFixtures[INDUSTRY];
  const rows = regulatoryFixtures[INDUSTRY].rows;
  const v = industryView(input(INDUSTRY));
  assert.equal(v.mode, "single");
  assert.deepEqual(v.sections, []);
  assert.deepEqual(v.single.rows, rows.map((r) => ({
    anchor: `reg-${r.id}`, obligation: r.obligation, meaning: r.meaning, design: r.design, evidence: r.evidence,
    source: r.source, asAt: r.asAt, lastReviewed: r.lastReviewed, appliesTo: null,
  })));
  assert.deepEqual(v.single.chips, data.obligationChips.map((c) => ({ label: c.label, href: `#reg-${c.row}` })));
  assert.equal(v.single.lastReviewed.getTime(), latest(rows));
});

test("Works alongside items carry their access method as a label", () => {
  const data = industryFixtures[INDUSTRY];
  assert.deepEqual(
    industryView(input(INDUSTRY)).single.works,
    data.worksAlongside.map((w) => ({ system: w.system, method: w.method, methodLabel: WORKS_METHOD_LABEL[w.method], verified: w.verified })),
  );
  assert.deepEqual(Object.values(WORKS_METHOD_LABEL), ["Read-only access", "File/CSV import", "Drafts a person actions"]);
});

test("recommended packages: launch ones link to their solution tab, on-request ones to contact", () => {
  const data = industryFixtures[INDUSTRY];
  const packages = industryView(input(INDUSTRY)).single.packages;
  assert.deepEqual(new Set(packages.map((p) => p.status)), new Set(["launch", "on-request"]));
  for (const p of packages) {
    const ref = data.packages.find((r) => r.package === p.id);
    const solution = solutionFixtures[ref.solution];
    const pkg = solution.genericPackage.id === p.id ? solution.genericPackage : solution.packages.find((x) => x.id === p.id);
    const chip = chipOf(fixtureSite, ref.solution);
    assert.equal(p.name, pkg.name);
    assert.deepEqual(p.solution, chip);
    if (p.status === "launch") {
      assert.equal(p.summary, pkg.scope);
      assert.equal(p.href, `${chip.href}#${p.id}`);
    } else {
      assert.equal(p.summary, pkg.oneLiner);
      assert.equal(p.href, fixtureSite.contact({ interest: ref.solution }));
    }
  }
});

test("recommended packages: launch packages sort first, each group in its data order", () => {
  const data = industryFixtures[INDUSTRY];
  const packages = [
    { solution: "fixture-solution", package: "fixture-on-request-package" },
    { solution: "fixture-solution", package: "fixture-generic-package" },
    { solution: "fixture-solution", package: "fixture-launch-package" },
  ];
  const v = industryView(input(INDUSTRY, { data: { ...data, packages } }));
  assert.deepEqual(v.single.packages.map((p) => [p.id, p.status]), [
    ["fixture-generic-package", "launch"],
    ["fixture-launch-package", "launch"],
    ["fixture-on-request-package", "on-request"],
  ]);
});

test("jurisdiction mode: one section per jurisdiction group, in Commonwealth, State, Local order, each within the spec's counts", () => {
  const data = industryFixtures[GOVERNMENT];
  const rows = regulatoryFixtures[GOVERNMENT].rows;
  const v = industryView(input(GOVERNMENT));
  assert.equal(v.mode, "jurisdictions");
  assert.equal(v.single, null);
  assert.deepEqual(v.sections.map((s) => s.id), SECTION_ORDER.filter((s) => data.jurisdictions.some((j) => JURISDICTION_SECTION[j] === s)));
  assert.deepEqual(v.sections.map((s) => s.id), ["commonwealth", "state", "local"]);
  for (const s of v.sections) {
    const own = inSection(s.id);
    const sectionRows = rows.filter((r) => r.jurisdictions.some((j) => JURISDICTION_SECTION[j] === s.id));
    assert.equal(s.title, SECTION_TITLE[s.id]);
    assert.deepEqual(s.rows.map((r) => r.anchor), sectionRows.map((r) => `reg-${s.id}-${r.id}`));
    assert.deepEqual(s.chips.map((c) => c.label), data.obligationChips.filter(own).map((c) => c.label));
    for (const c of s.chips) assert.ok(s.rows.some((r) => `#${r.anchor}` === c.href), `${s.id}: ${c.href} names no row of its own section`);
    assert.deepEqual(s.works.map((w) => w.system), data.worksAlongside.filter(own).map((w) => w.system));
    assert.deepEqual(s.packages.map((p) => p.id).sort(), data.packages.filter(own).map((p) => p.package).sort());
    assert.equal(s.lastReviewed.getTime(), latest(sectionRows));
    assert.ok(s.chips.length >= 4 && s.chips.length <= 6, `${s.id}: ${s.chips.length} chips`);
    assert.ok(s.works.length >= 3 && s.works.length <= 5, `${s.id}: ${s.works.length} systems`);
    assert.ok(s.packages.length >= 3 && s.packages.length <= 4, `${s.id}: ${s.packages.length} packages`);
    assert.ok(s.rows.every((r) => (r.appliesTo !== null) === (s.id === "state")), `${s.id}: Applies to is set only in the state section`);
  }
});

test("a row in two sections gets two anchors, and every anchor on the page is unique", () => {
  const v = industryView(input(GOVERNMENT));
  const anchors = v.sections.flatMap((s) => s.rows.map((r) => r.anchor));
  assert.equal(new Set(anchors).size, anchors.length);
  const cth = v.sections.find((s) => s.id === "commonwealth").rows.find((r) => r.anchor === "reg-commonwealth-fixture-gov-row-5");
  const state = v.sections.find((s) => s.id === "state").rows.find((r) => r.anchor === "reg-state-fixture-gov-row-5");
  assert.ok(cth && state, "fixture-gov-row-5 (cth and nsw) is in both sections");
  assert.equal(cth.obligation, state.obligation);
  assert.equal(cth.appliesTo, null);
  assert.equal(state.appliesTo, "NSW");
});

test("Applies to lists a state row's states in NSW, Vic, Qld order", () => {
  const rows = regulatoryFixtures[GOVERNMENT].rows.map((r) => (r.id === "fixture-gov-row-6" ? { ...r, jurisdictions: ["qld", "cth", "vic", "nsw"] } : r));
  const state = industryView(input(GOVERNMENT, { rows })).sections.find((s) => s.id === "state");
  assert.equal(state.rows.find((r) => r.anchor === "reg-state-fixture-gov-row-6").appliesTo, "NSW, Vic, Qld");
});

test("hero, CTAs, breadcrumb, lead solutions, demo and closing come from the site context", () => {
  const data = industryFixtures[INDUSTRY];
  const link = industryLink(fixtureSite, INDUSTRY);
  const lower = link.shortName.toLowerCase();
  const talk = { label: `Talk to us about AI for ${lower}`, href: fixtureSite.contact({ industry: INDUSTRY }) };
  const v = industryView(input(INDUSTRY));
  assert.deepEqual([v.id, v.shortName, v.fullName, v.promise, v.constraintSet], [INDUSTRY, link.shortName, link.fullName, data.promise, data.constraintSet]);
  assert.deepEqual(v.breadcrumb, crumbs(fixtureSite, ["industries", { label: link.shortName, path: link.path }]));
  assert.deepEqual(v.ctas, { primary: talk, secondary: { label: `See the ${lower} scenario`, href: "#scenario" } });
  assert.deepEqual(v.closing, { command: "talk_to_us", args: `--about=${INDUSTRY}`, label: talk.label, href: talk.href });
  assert.deepEqual(v.leadSolutions, data.leadSolutions.map((id) => chipOf(fixtureSite, id)));
  assert.equal(v.demoHref, fixtureSite.demo(data.leadSolutions[0]));
});

test("workflow stages keep their ids; each use case carries its solution, its on-request flag and its note", () => {
  const data = industryFixtures[INDUSTRY];
  const v = industryView(input(INDUSTRY));
  assert.deepEqual(v.workflow, data.workflow.map((stage) => ({
    id: stage.id,
    stage: stage.stage,
    useCases: stage.useCases.map((u) => ({ name: u.name, solution: chipOf(fixtureSite, u.solution), onRequest: u.status === "on-request", note: u.note ?? null })),
  })));
  assert.ok(v.workflow.some((s) => s.useCases.some((u) => u.onRequest)), "the fixture has an on-request use case");
});

test("the scenario resolves its trace; problem, mock panel, limits, first engagement and FAQ pass through", () => {
  const data = industryFixtures[INDUSTRY];
  const v = industryView(input(INDUSTRY));
  const { trace, ...scenario } = data.scenario;
  assert.deepEqual(v.scenario, { ...scenario, trace: traceFixtures[trace] });
  assert.deepEqual(v.problem, data.problem);
  assert.deepEqual(v.mockPanel, data.mockPanel);
  assert.equal(v.platformFirst, data.platformFirst ?? null);
  assert.deepEqual(v.dontDo, data.dontDo);
  assert.deepEqual(v.firstEngagement, data.firstEngagement);
  assert.deepEqual(v.faq, data.faq);
});

test("related insights: cards naming this industry, newest first, at most three", () => {
  const own = industryLink(fixtureSite, INDUSTRY).shortName;
  const other = industryLink(fixtureSite, GOVERNMENT).shortName;
  const card = (id, date, labels) => ({
    id, href: `/insights/${id}/`, title: `Fixture insight ${id}`, description: "Fixture description", typeLabel: "Article",
    date: new Date(date), minutes: 3, industries: labels.map((label) => ({ label, href: null })),
  });
  const cards = [
    card("fixture-a", "2026-06-01", [own]),
    card("fixture-b", "2026-09-20", [other]),
    card("fixture-c", "2026-08-30", [other, own]),
    card("fixture-d", "2026-07-15", [own]),
    card("fixture-e", "2026-09-01", [own]),
  ];
  assert.deepEqual(industryView(input(INDUSTRY, { insights: cards })).insights.map((c) => c.id), ["fixture-e", "fixture-c", "fixture-d"]);
  assert.deepEqual(industryView(input(INDUSTRY, { insights: [cards[1]] })).insights, []);
  assert.deepEqual(cards.map((c) => c.id), ["fixture-a", "fixture-b", "fixture-c", "fixture-d", "fixture-e"], "the input list is not reordered");
});

test("while planned pages aren't shown, solution links and the demo are text and contact falls back to email", () => {
  const hidden = {
    ...fixtureSite,
    solutions: fixtureSite.solutions.map((s) => ({ ...s, href: null })),
    page: (key) => ({ ...fixtureSite.page(key), href: null }),
    demo: () => null,
    contact: () => `mailto:${fixtureSite.email}`,
  };
  const v = industryView(input(INDUSTRY, { site: hidden }));
  const mail = `mailto:${fixtureSite.email}`;
  for (const p of v.single.packages) assert.equal(p.href, p.status === "launch" ? null : mail, p.id);
  assert.ok(v.single.packages.every((p) => p.solution.href === null));
  assert.ok(v.workflow.every((s) => s.useCases.every((u) => u.solution.href === null)));
  assert.ok(v.leadSolutions.every((s) => s.href === null));
  assert.equal(v.demoHref, null);
  assert.equal(v.ctas.primary.href, mail);
  assert.equal(v.closing.href, mail);
  assert.ok(!v.breadcrumb.some((c) => c.label === fixtureSite.page("industries").label), "a hidden hub stays out of the breadcrumb");
});

test("broken data fails the build: an unknown chip row, package or solution, an internal package, a missing trace, a repeated row id, a repeated or clashing stage id", () => {
  const data = industryFixtures[INDUSTRY];
  const rows = regulatoryFixtures[INDUSTRY].rows;
  const chip = data.obligationChips[0];
  const withPackage = (ref) => ({ data: { ...data, packages: [...data.packages, ref] } });
  const stage = (i, sid) => ({ data: { ...data, workflow: data.workflow.map((s, j) => (j === i ? { ...s, id: sid } : s)) } });
  assert.throws(
    () => industryView(input(INDUSTRY, { rows: rows.filter((r) => r.id !== chip.row) })),
    new RegExp(`chip "${escapeRe(chip.label)}" links to row "${chip.row}", which isn't in the regulatory map`),
  );
  assert.throws(() => industryView(input(INDUSTRY, withPackage({ solution: "fixture-solution", package: "fixture-no-such-package" }))), /solution "fixture-solution" has no package "fixture-no-such-package"/);
  assert.throws(() => industryView(input(INDUSTRY, withPackage({ solution: "fixture-solution", package: "fixture-internal-package" }))), /package "fixture-internal-package" of solution "fixture-solution" is internal/);
  assert.throws(() => industryView(input(INDUSTRY, withPackage({ solution: "fixture-no-such-solution", package: "fixture-generic-package" }))), /names solution "fixture-no-such-solution", which isn't in solutions/);
  assert.throws(() => industryView(input(INDUSTRY, { traces: {} })), new RegExp(`scenario trace "${data.scenario.trace}" isn't in traces`));
  // Review Focus 1: a row id is a page anchor (reg-<row>), so a copy-pasted row may not repeat it.
  assert.throws(() => industryView(input(INDUSTRY, { rows: [...rows, { ...rows[0] }] })), new RegExp(`row "${rows[0].id}" appears twice; row ids are page anchors`));
  // Review Focus 1: a stage id is a page anchor, so it may not repeat or reuse an id the page writes.
  assert.throws(() => industryView(input(INDUSTRY, stage(1, data.workflow[0].id))), /appears twice/);
  assert.throws(() => industryView(input(INDUSTRY, stage(1, "problem"))), /stage id "problem" is also a section id/);
  assert.throws(() => industryView(input(INDUSTRY, stage(2, "state-packages"))), /stage id "state-packages" is also a section id/);
  assert.throws(() => industryView(input(INDUSTRY, stage(3, `reg-${rows[0].id}`))), /is also a section id or row anchor/);
});

test("jurisdiction mode fails on a chip whose row sits in another section, and on a row with no jurisdiction", () => {
  const data = industryFixtures[GOVERNMENT];
  const rows = regulatoryFixtures[GOVERNMENT].rows;
  const chip = data.obligationChips.find((c) => c.jurisdiction === "local");
  const moved = rows.map((r) => (r.id === chip.row ? { ...r, jurisdictions: ["cth"] } : r));
  assert.throws(() => industryView(input(GOVERNMENT, { rows: moved })), new RegExp(`chip "${escapeRe(chip.label)}" links to row "${chip.row}", which isn't in the local section's regulatory map`));
  const bare = rows.map((r, i) => (i === 0 ? { ...r, jurisdictions: undefined } : r));
  assert.throws(() => industryView(input(GOVERNMENT, { rows: bare })), new RegExp(`row "${rows[0].id}" names no jurisdiction`));
});
