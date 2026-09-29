// The solution page's view builders (spec §8.3): packageViews() in src/lib/views/offer.ts and
// solutionView() in src/lib/views/solution.ts. They run on the five fixture solutions with the
// gallery's site context, and on the real site contexts, where a planned page has no link.
import { test } from "node:test";
import assert from "node:assert/strict";
import { packageViews } from "../src/lib/views/offer.ts";
import { solutionView } from "../src/lib/views/solution.ts";
import { crumbs, industryLink, siteContext, solutionLink } from "../src/lib/site.ts";
import { DELIVERY_LETTER } from "../src/lib/fixed-copy.ts";
import { fixtureSite, servicesFixture, solutionFixtures } from "../src/fixtures/index.ts";

const IDS = ["fixture-solution", "fixture-solution-2", "fixture-solution-3", "fixture-solution-4", "fixture-solution-5"];
// /contact/ is live (Phase C Task 7): a production contact link for ① carries its interest.
const TALK_REGISTERS = "/contact/?interest=document-registers";
const view = (id, data = solutionFixtures[id], site = fixtureSite) => solutionView({ id, data, shared: servicesFixture, site });
const byStatus = (data, status) => data.packages.filter((p) => p.status === status);

test("the fixture solutions exercise every package state the template handles", () => {
  assert.deepEqual(Object.keys(solutionFixtures).sort(), IDS);
  const one = solutionFixtures["fixture-solution"];
  assert.ok(byStatus(one, "launch").length >= 2, "① needs two launch packages (tabs)");
  assert.ok(byStatus(one, "on-request").length >= 1, "① needs an on-request package");
  assert.ok(byStatus(one, "internal").length >= 1, "① needs an internal package");
  const onshore = [one.genericPackage, ...byStatus(one, "launch")].map((p) => p.onshore);
  assert.ok(onshore.includes(true) && onshore.includes(false), "① needs onshore and non-onshore packages");
  assert.equal(byStatus(solutionFixtures["fixture-solution-3"], "launch").length, 0, "③ has no launch package beside its generic one");
  assert.ok(byStatus(solutionFixtures["fixture-solution-4"], "internal").length >= 1, "④ needs an internal package");
  assert.equal(solutionFixtures["fixture-solution-5"].program, undefined, "⑤ has no program");
});

test("packageViews keeps the generic package apart, keeps content order, and drops internal packages", () => {
  for (const id of IDS) {
    const data = solutionFixtures[id];
    const { generic, launch, onRequest } = packageViews(id, data, fixtureSite);
    assert.equal(generic.id, data.genericPackage.id, id);
    assert.deepEqual(launch.map((p) => p.id), byStatus(data, "launch").map((p) => p.id), id);
    assert.deepEqual(onRequest.map((p) => p.id), byStatus(data, "on-request").map((p) => p.id), id);
    for (const p of [generic, ...launch]) assert.equal(p.status, "launch");
    for (const p of onRequest) assert.equal(p.status, "on-request");
    const shownIds = [generic, ...launch, ...onRequest].map((p) => p.id);
    const shownNames = [generic, ...launch, ...onRequest].map((p) => p.name);
    for (const p of byStatus(data, "internal")) {
      assert.ok(!shownIds.includes(p.id), `${id}: internal package ${p.id} is in the view`);
      assert.ok(!shownNames.includes(p.name), `${id}: internal package "${p.name}" is in the view`);
    }
  }
});

test("a PackageView carries every §4.5 and §4.6 field, with a null precondition when there is none", () => {
  const data = solutionFixtures["fixture-solution"];
  const { generic, launch } = packageViews("fixture-solution", data, fixtureSite);
  const expected = (p) => ({
    id: p.id, name: p.name, status: "launch", buyers: p.buyers, forWhom: p.forWhom, scope: p.scope,
    inclusions: p.inclusions, clientTime: p.clientTime, timeline: p.timeline, outOfScope: p.outOfScope,
    gate: p.gate, onshoreNote: p.onshoreNote, precondition: p.precondition ?? null, onshore: p.onshore,
  });
  assert.deepEqual(generic, expected(data.genericPackage));
  assert.deepEqual(launch, byStatus(data, "launch").map(expected));
  const preconditions = [generic, ...launch].map((p) => p.precondition);
  assert.ok(preconditions.includes(null), "no fixture package without a precondition");
  assert.ok(preconditions.some((p) => typeof p === "string"), "no fixture package with a precondition");
});

test("on-request entries link to the contact page with the solution preselected", () => {
  const data = solutionFixtures["fixture-solution"];
  const gallery = packageViews("fixture-solution", data, fixtureSite).onRequest;
  assert.ok(gallery.length > 0);
  for (const p of gallery) {
    assert.equal(p.href, fixtureSite.contact({ interest: "fixture-solution" }));
    assert.equal(p.oneLiner, byStatus(data, "on-request").find((q) => q.id === p.id).oneLiner);
  }
  assert.equal(packageViews("document-registers", data, siteContext(true)).onRequest[0].href, "/contact/?interest=document-registers");
  assert.equal(packageViews("document-registers", data, siteContext(false)).onRequest[0].href, TALK_REGISTERS);
});

test("packageViews refuses a package id used twice, because package ids are page anchors", () => {
  const data = solutionFixtures["fixture-solution"];
  const [first] = byStatus(data, "launch");
  const twice = { ...data, packages: [...data.packages, { ...first }] };
  assert.throws(() => packageViews("fixture-solution", twice, fixtureSite), new RegExp(`"${first.id}" appears twice`));
  const asGeneric = { ...data, genericPackage: { ...data.genericPackage, id: first.id } };
  assert.throws(() => packageViews("fixture-solution", asGeneric, fixtureSite), new RegExp(`"${first.id}" appears twice`));
});

test("solutionView names the solution from the site context and links the hero, breadcrumb and closing prompt", () => {
  for (const id of IDS) {
    const v = view(id);
    const link = solutionLink(fixtureSite, id);
    assert.deepEqual([v.id, v.number, v.shortName, v.fullName, v.oneLiner], [id, link.number, link.shortName, link.fullName, link.oneLiner]);
    assert.deepEqual(v.breadcrumb, crumbs(fixtureSite, ["solutions", { label: link.shortName, path: link.path }]));
    assert.deepEqual(v.breadcrumb.at(-1), { label: link.shortName, href: link.path });
    const talk = { label: `Talk to us about ${link.shortName}`, href: fixtureSite.contact({ interest: id }) };
    const demo = fixtureSite.demo(id);
    assert.deepEqual(v.ctas, { primary: talk, secondary: demo ? { label: "Try the demo", href: demo } : null });
    assert.deepEqual(v.closing, { command: "talk_to_us", args: `--about=${id}`, ...talk });
  }
  assert.deepEqual(IDS.map((id) => view(id).number), ["①", "②", "③", "④", "⑤"]);
});

test("on the production site context every planned page is plain text and contact links reach /contact/; on the preview context, every page is a link", () => {
  const data = { ...solutionFixtures["fixture-solution"], byIndustry: ["accounting", "government"] };
  const live = view("document-registers", data, siteContext(false));
  // The Solutions hub is live from Phase C Task 3, so the production trail keeps it.
  assert.deepEqual(live.breadcrumb, [
    { label: "Home", href: "/" },
    { label: "Solutions", href: "/solutions/" },
    { label: "Document Registers", href: "/solutions/document-registers/" },
  ]);
  // The demo pages are live from Phase D Task 7, so the hero's second CTA leads to ①'s.
  assert.deepEqual(live.ctas, {
    primary: { label: "Talk to us about Document Registers", href: TALK_REGISTERS },
    secondary: { label: "Try the demo", href: "/demos/document-registers/" },
  });
  assert.equal(live.closing.href, TALK_REGISTERS);
  // The evaluation method is live from Phase D Task 5, so the production method link reaches it.
  assert.equal(live.howWeTest.methodHref, "/resources/evaluation-method/");
  // Accounting and Government are live from Phase C Task 4, so their By industry chips link.
  assert.deepEqual(live.byIndustry, [{ label: "Accounting", href: "/industries/accounting/" }, { label: "Government", href: "/industries/government/" }]);
  for (const p of live.onRequest) assert.equal(p.href, TALK_REGISTERS);

  const preview = view("document-registers", data, siteContext(true));
  assert.deepEqual(preview.breadcrumb.map((c) => c.href), ["/", "/solutions/", "/solutions/document-registers/"]);
  assert.deepEqual(preview.ctas.secondary, { label: "Try the demo", href: "/demos/document-registers/" });
  assert.equal(preview.ctas.primary.href, "/contact/?interest=document-registers");
  assert.equal(preview.howWeTest.methodHref, "/resources/evaluation-method/");
  assert.deepEqual(preview.byIndustry, [
    { label: "Accounting", href: "/industries/accounting/" },
    { label: "Government", href: "/industries/government/" },
  ]);
});

test("where it runs: the solution's delivery choices lettered (a) (b) (c) in that order, with the shared copy", () => {
  const data = {
    ...solutionFixtures["fixture-solution"],
    whereItRuns: { choices: ["platform-you-license", "your-account", "platform-you-license"], note: "Fixture note: two choices." },
  };
  const copy = (id) => servicesFixture.deliveryChoices.find((c) => c.id === id);
  assert.deepEqual(view("fixture-solution", data).whereItRuns, {
    choices: [
      { id: "your-account", letter: "a", title: copy("your-account").title, body: copy("your-account").body },
      { id: "platform-you-license", letter: "c", title: copy("platform-you-license").title, body: copy("platform-you-license").body },
    ],
    note: "Fixture note: two choices.",
    onshoreNote: servicesFixture.onshoreNote,
  });
  assert.deepEqual(DELIVERY_LETTER, { "your-account": "a", managed: "b", "platform-you-license": "c" });
});

test("the ④ and ⑤ adaptations: Engagements and the independence policy on ④, no program on ⑤", () => {
  const one = view("fixture-solution");
  assert.equal(one.packagesHeading, "Packages");
  assert.equal(one.independence, null);
  assert.deepEqual(one.program, solutionFixtures["fixture-solution"].program);
  const four = view("fixture-solution-4");
  assert.equal(four.packagesHeading, "Engagements");
  assert.deepEqual(four.independence, servicesFixture.independence);
  assert.equal(four.launch.length, 3);
  for (const p of four.launch) assert.ok(p.buyers.includes("enterprise-government"), `${p.id} is not for enterprise and government buyers`);
  const five = view("fixture-solution-5");
  assert.equal(five.program, null);
  assert.equal(five.launch.length, 1);
  for (const p of [five.generic, ...five.launch]) assert.equal(p.onshore, false, `${p.id} is onshore on ⑤`);
});

test("the other blocks come straight from the content and the shared services copy", () => {
  const data = solutionFixtures["fixture-solution"];
  const v = view("fixture-solution");
  assert.equal(v.job, data.job);
  assert.equal(v.artefact, data.artefact);
  assert.deepEqual(v.needProfiles, data.needProfiles);
  assert.deepEqual(
    v.byIndustry,
    data.byIndustry.map((ref) => {
      const industry = industryLink(fixtureSite, ref);
      return { label: industry.shortName, href: industry.href };
    }),
  );
  assert.deepEqual(v.standardInclusions, servicesFixture.standardInclusions);
  assert.deepEqual(v.howWeTest, { ...data.howWeTest, methodHref: fixtureSite.page("evaluationMethod").href });
  assert.equal(v.platformFirst, data.platformFirst);
  assert.deepEqual(v.dontDo, data.dontDo);
  assert.deepEqual(v.faq, data.faq);
  const { platformFirst, ...withoutPlatformFirst } = data;
  assert.ok(platformFirst, "the ① fixture has a platform-first line");
  assert.equal(view("fixture-solution", withoutPlatformFirst).platformFirst, null);
});

test("solutionView throws on an unknown solution and on a package id that is also a section id", () => {
  assert.throws(() => view("fixture-unknown-solution", solutionFixtures["fixture-solution"]));
  const data = solutionFixtures["fixture-solution"];
  const clash = { ...data, genericPackage: { ...data.genericPackage, id: "faq" } };
  assert.throws(() => view("fixture-solution", clash), /package id "faq" is also a section id/);
});
