// SiteContext (Phase B2 scope ruling 4: links never dangle). A production build gives every
// planned page a null href, and would send contact links to the email address while /contact/ is
// planned (it is live from Phase C Task 7); a preview build gives every page its path.
// fixtureSite is the gallery's context: fictional ids and names, hrefs into
// the gallery, and two deliberately hidden links. Review Focus 2 is pinned here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PAGES, SITE } from "../src/data/nav.ts";
import {
  CIRCLED, contactQuery, crumbs, industryLink, refId, siteContext, solutionLink,
} from "../src/lib/site.ts";
import * as fixtures from "../src/fixtures/index.ts";

const { fixtureSite, solutionFixtures, industryFixtures } = fixtures;

const SOLUTION_IDS = ["document-registers", "knowledge-assistant", "draft-for-approval", "ai-evaluation", "ai-switch-on"];
const INDUSTRY_IDS = [
  "government", "financial-services", "accounting", "education", "manufacturing",
  "real-estate", "healthcare", "resources-and-energy", "legal-and-professional",
];
// Every page key and the nav path it names (spec §7.1).
const PAGE_PATHS = {
  home: "/", solutions: "/solutions/", industries: "/industries/", services: "/services/",
  evaluationPartner: "/services/evaluation-partner/", resources: "/resources/", insights: "/insights/",
  demos: "/demos/", safeUseKits: "/resources/safe-use-kits/", payFor: "/resources/what-you-already-pay-for/",
  evaluationMethod: "/resources/evaluation-method/", about: "/about/", trust: "/trust/", legal: "/legal/",
  privacy: "/legal/privacy/", websiteTerms: "/legal/website-terms/", contact: "/contact/",
};
const RESOURCE_KEYS = ["insights", "demos", "safeUseKits", "payFor", "evaluationMethod"];
const navAt = (path) => PAGES.find((p) => p.path === path);

test("both contexts list the 5 solutions and 9 industries in nav order, numbered ①–⑤", () => {
  assert.deepEqual(CIRCLED, ["①", "②", "③", "④", "⑤"]);
  for (const preview of [false, true]) {
    const site = siteContext(preview);
    assert.deepEqual(site.solutions.map((s) => s.id), SOLUTION_IDS);
    assert.deepEqual(site.solutions.map((s) => s.number), [...CIRCLED]);
    for (const s of site.solutions) {
      const entry = navAt(s.path);
      assert.equal(s.path, `/solutions/${s.id}/`);
      assert.deepEqual([s.shortName, s.fullName, s.oneLiner], [entry.shortName, entry.fullName, entry.oneLiner]);
    }
    assert.deepEqual(site.industries.map((i) => i.id), INDUSTRY_IDS);
    for (const i of site.industries) {
      const entry = navAt(i.path);
      assert.equal(i.path, `/industries/${i.id}/`);
      assert.deepEqual([i.shortName, i.fullName], [entry.shortName, entry.fullName]);
      assert.equal(i.footerLabel, `AI for ${entry.shortName.toLowerCase()}`);
    }
    assert.deepEqual(site.resources.map((r) => r.key), RESOURCE_KEYS);
    assert.equal(site.email, SITE.email);
  }
});

test("every page key names its nav page, with the nav label and one-liner", () => {
  const site = siteContext(true);
  for (const [key, path] of Object.entries(PAGE_PATHS)) {
    const entry = navAt(path);
    assert.ok(entry, `nav.ts has no page at ${path}`);
    const link = site.page(key);
    assert.equal(link.key, key);
    assert.equal(link.path, path);
    assert.equal(link.label, entry.shortName);
    assert.equal(link.oneLiner, entry.oneLiner, key);
  }
  assert.throws(() => site.page("pricing"), /Unknown page key "pricing"/);
});

test("production: planned pages get a null href, and contact links reach the live /contact/", () => {
  const site = siteContext(false);
  const expected = (path) => (navAt(path).status === "live" ? path : null);
  for (const s of site.solutions) assert.equal(s.href, expected(s.path), s.id);
  for (const i of site.industries) assert.equal(i.href, expected(i.path), i.id);
  for (const [key, path] of Object.entries(PAGE_PATHS)) assert.equal(site.page(key).href, expected(path), key);
  for (const id of SOLUTION_IDS) assert.equal(site.demo(id), expected(`/demos/${id}/`), id);
  // After Phase D Task 7: every hub, every solution and industry page, Services, Evaluation Partner,
  // Insights, About and Contact (Phase C); the evaluation method (Task 5), the checker (Task 6), and
  // the Demos hub and every demo page (Task 7). The Safe-Use Kits wait for a lawyer's review (spec §12
  // item 6); Trust and Legal wait for the owner (spec §12).
  assert.deepEqual(
    Object.keys(PAGE_PATHS).filter((key) => site.page(key).href !== null),
    ["home", "solutions", "industries", "services", "evaluationPartner", "resources", "insights", "demos", "payFor", "evaluationMethod", "about", "contact"],
  );
  assert.ok(site.solutions.every((s) => s.href !== null), "a solution page is hidden");
  assert.ok(site.industries.every((i) => i.href !== null), "an industry page is hidden");
  assert.deepEqual(SOLUTION_IDS.map((id) => site.demo(id)), SOLUTION_IDS.map((id) => `/demos/${id}/`), "a demo page is hidden");
  assert.equal(site.contact(), "/contact/");
  assert.equal(site.contact({ interest: "ai-evaluation" }), "/contact/?interest=ai-evaluation");
  assert.equal(site.contact({ industry: "government" }), "/contact/?industry=government");
});

test("preview: every page, demo and contact link is its real path", () => {
  const site = siteContext(true);
  for (const s of site.solutions) assert.equal(s.href, s.path);
  for (const i of site.industries) assert.equal(i.href, i.path);
  for (const [key, path] of Object.entries(PAGE_PATHS)) assert.equal(site.page(key).href, path, key);
  assert.deepEqual(SOLUTION_IDS.map((id) => site.demo(id)), SOLUTION_IDS.map((id) => `/demos/${id}/`));
  assert.throws(() => site.demo("fixture-solution"), /unknown solution "fixture-solution"/);
  assert.equal(site.contact(), "/contact/");
  assert.equal(site.contact({}), "/contact/");
});

test("a contact link carries one key: interest wins over industry, and unknown values throw", () => {
  const site = siteContext(true);
  assert.equal(site.contact({ interest: "document-registers" }), "/contact/?interest=document-registers");
  assert.equal(site.contact({ industry: "real-estate" }), "/contact/?industry=real-estate");
  assert.equal(site.contact({ interest: "ai-evaluation", industry: "government" }), "/contact/?interest=ai-evaluation");
  assert.equal(site.contact({ interest: "evaluation-partner" }), "/contact/?interest=evaluation-partner");
  assert.equal(site.contact({ interest: "not-sure" }), "/contact/?interest=not-sure");
  assert.throws(() => site.contact({ interest: "fit-call" }), /unknown interest "fit-call"/);
  assert.throws(() => site.contact({ industry: "document-registers" }), /unknown industry "document-registers"/);
  assert.throws(() => site.contact({ interest: "not-sure", industry: "nowhere" }), /unknown industry "nowhere"/);
  // Production validates too, so a typo fails the build.
  assert.throws(() => siteContext(false).contact({ interest: "typo" }), /unknown interest "typo"/);
  assert.equal(contactQuery(site), "");
  assert.equal(contactQuery(site, { industry: "healthcare" }), "?industry=healthcare");
});

test("solutionLink and industryLink find by id and throw on an unknown one", () => {
  const site = siteContext(false);
  assert.equal(solutionLink(site, "ai-evaluation").number, "④");
  assert.equal(solutionLink(site, "ai-evaluation").fullName, "Independent AI Evaluation");
  assert.equal(industryLink(site, "legal-and-professional").footerLabel, "AI for legal & professional");
  assert.throws(() => solutionLink(site, "fixture-solution"), /Unknown solution id "fixture-solution"/);
  assert.throws(() => industryLink(site, "mining"), /Unknown industry id "mining"/);
});

test("refId reads a plain id and Astro's { id, collection } reference", () => {
  assert.equal(refId("government"), "government");
  assert.equal(refId({ id: "government", collection: "industries" }), "government");
});

test("crumbs start at Home and leave out hubs that aren't shown", () => {
  const current = { label: "Document Registers", path: "/solutions/document-registers/" };
  // The Demos hub is live from Phase D Task 7, so a demo page's trail keeps it.
  assert.deepEqual(crumbs(siteContext(false), ["demos", { label: "Document Registers", path: "/demos/document-registers/" }]), [
    { label: "Home", href: "/" },
    { label: "Demos", href: "/demos/" },
    { label: "Document Registers", href: "/demos/document-registers/" },
  ]);
  // The Solutions hub is live from Phase C Task 3, so it stays.
  assert.deepEqual(crumbs(siteContext(false), ["solutions", current]), [
    { label: "Home", href: "/" },
    { label: "Solutions", href: "/solutions/" },
    { label: "Document Registers", href: "/solutions/document-registers/" },
  ]);
  assert.deepEqual(crumbs(siteContext(true), ["solutions", current]), [
    { label: "Home", href: "/" },
    { label: "Solutions", href: "/solutions/" },
    { label: "Document Registers", href: "/solutions/document-registers/" },
  ]);
  // A live hub stays in a production trail.
  assert.deepEqual(crumbs(siteContext(false), ["insights", { label: "A post", path: "/insights/a-post/" }]), [
    { label: "Home", href: "/" },
    { label: "Insights", href: "/insights/" },
    { label: "A post", href: "/insights/a-post/" },
  ]);
  // A live hub stays and a hidden page drops out; "home" never repeats Home.
  assert.deepEqual(crumbs(siteContext(false), ["home", "resources", "safeUseKits", { label: "X", path: "/resources/safe-use-kits/x/" }]), [
    { label: "Home", href: "/" },
    { label: "Resources", href: "/resources/" },
    { label: "X", href: "/resources/safe-use-kits/x/" },
  ]);
  // Two hidden hubs in a row both drop out.
  assert.deepEqual(crumbs(siteContext(false), ["trust", "legal", { label: "Y", path: "/y/" }]), [
    { label: "Home", href: "/" },
    { label: "Y", href: "/y/" },
  ]);
  // The last item is the current page, so it stays even when its key isn't shown.
  assert.deepEqual(crumbs(siteContext(false), ["legal", "privacy"]), [
    { label: "Home", href: "/" },
    { label: "Privacy", href: "/legal/privacy/" },
  ]);
  assert.deepEqual(crumbs(siteContext(false), []), [{ label: "Home", href: "/" }]);
});

test("fixtureSite: fixture solutions ①–⑤ link into the gallery's solution pages", () => {
  const ids = ["fixture-solution", "fixture-solution-2", "fixture-solution-3", "fixture-solution-4", "fixture-solution-5"];
  const names = ["One", "Two", "Three", "Four", "Five"].map((n) => `Fixture Solution ${n}`);
  assert.deepEqual(fixtureSite.solutions.map((s) => s.id), ids);
  assert.deepEqual(fixtureSite.solutions.map((s) => s.number), [...CIRCLED]);
  assert.deepEqual(fixtureSite.solutions.map((s) => s.shortName), names);
  assert.deepEqual(fixtureSite.solutions.map((s) => s.fullName), names.map((n) => `${n} Fixture Suite`));
  assert.deepEqual(fixtureSite.solutions.map((s) => s.href), [
    "/preview/templates/solution/", "/preview/templates/solution/", "/preview/templates/solution/",
    "/preview/templates/solution-evaluation/", "/preview/templates/solution-switch-on/",
  ]);
  for (const s of fixtureSite.solutions) assert.equal(s.path, s.href);
  assert.deepEqual(ids.map((id) => fixtureSite.demo(id)), [
    "/preview/templates/demo/", "/preview/templates/demo/", "/preview/templates/demo/",
    "/preview/templates/demo-report/", "/preview/templates/demo/",
  ]);
  assert.throws(() => fixtureSite.demo("document-registers"), /unknown solution/);
  // The fixture sets (Task 3) are keyed by exactly these ids.
  assert.deepEqual(Object.keys(solutionFixtures).sort(), [...ids].sort());
});

test("fixtureSite: nine fixture industries, and fixture-industry-9 is not shown", () => {
  const ids = ["fixture-industry", "fixture-government", ...[3, 4, 5, 6, 7, 8, 9].map((n) => `fixture-industry-${n}`)];
  assert.deepEqual(fixtureSite.industries.map((i) => i.id), ids);
  assert.deepEqual(fixtureSite.industries.map((i) => i.shortName), [
    "Fixture Industry One", "Fixture Government", "Fixture Industry Three", "Fixture Industry Four", "Fixture Industry Five",
    "Fixture Industry Six", "Fixture Industry Seven", "Fixture Industry Eight", "Fixture Industry Nine",
  ]);
  for (const i of fixtureSite.industries) assert.equal(i.footerLabel, `AI for ${i.shortName.toLowerCase()}`);
  assert.deepEqual(fixtureSite.industries.map((i) => i.href), [
    "/preview/templates/industry/", "/preview/templates/industry-government/",
    ...Array(6).fill("/preview/templates/industry/"), null,
  ]);
  assert.equal(industryLink(fixtureSite, "fixture-industry-9").path, "/preview/templates/industry/");
  assert.deepEqual(Object.keys(industryFixtures).sort(), [...ids].sort());
});

test("fixtureSite: pages open their template page, privacy is not shown, and contact stays in the gallery", () => {
  const gallery = {
    home: "home", solutions: "solutions-hub", industries: "industries-hub", services: "services",
    evaluationPartner: "evaluation-partner", resources: "resources-hub", demos: "demos-hub",
    safeUseKits: "safe-use-kits", payFor: "pay-for", evaluationMethod: "evaluation-method", about: "about",
    trust: "trust", legal: "legal-hub", websiteTerms: "legal-document", contact: "contact",
  };
  for (const [key, kind] of Object.entries(gallery)) {
    assert.equal(fixtureSite.page(key).href, `/preview/templates/${kind}/`, key);
  }
  assert.equal(fixtureSite.page("insights").href, "/insights/");
  assert.equal(fixtureSite.page("privacy").href, null);
  assert.equal(fixtureSite.page("privacy").path, "/preview/templates/legal-document/");
  assert.equal(fixtureSite.page("services").label, "Services");
  assert.deepEqual(fixtureSite.resources.map((r) => r.key), RESOURCE_KEYS);
  assert.throws(() => fixtureSite.page("pricing"), /Unknown page key/);
  assert.equal(fixtureSite.contact(), "/preview/templates/contact/");
  assert.equal(fixtureSite.contact({ interest: "fixture-solution-4", industry: "fixture-government" }), "/preview/templates/contact/?interest=fixture-solution-4");
  assert.equal(fixtureSite.contact({ industry: "fixture-government" }), "/preview/templates/contact/?industry=fixture-government");
  assert.equal(fixtureSite.contact({ interest: "evaluation-partner" }), "/preview/templates/contact/?interest=evaluation-partner");
  assert.throws(() => fixtureSite.contact({ interest: "document-registers" }), /unknown interest/);
  assert.equal(fixtureSite.email, "fixture@example.com");
  assert.deepEqual(crumbs(fixtureSite, ["solutions", { label: "Fixture Solution One", path: "/preview/templates/solution/" }]), [
    { label: "Home", href: "/" },
    { label: "Solutions", href: "/preview/templates/solutions-hub/" },
    { label: "Fixture Solution One", href: "/preview/templates/solution/" },
  ]);
});

test("fixtureSite: its solution and industry copy is visibly fictional, and index.ts freezes it", () => {
  for (const link of [...fixtureSite.solutions, ...fixtureSite.industries]) {
    for (const key of ["shortName", "fullName", "oneLiner", "footerLabel"]) {
      if (key in link) assert.match(link[key], /\bfixture\b/i, `${link.id}.${key}: "${link[key]}"`);
    }
    assert.match(link.id, /^fixture-/);
  }
  assert.match(fixtureSite.email, /@example\.com$/);
  assert.ok(Object.isFrozen(fixtureSite) && Object.isFrozen(fixtureSite.solutions[0]) && Object.isFrozen(fixtureSite.industries));
  assert.throws(() => { fixtureSite.solutions[0].href = "/solutions/"; }, TypeError);
});

// Review finding T4-F5: the gallery's fixtureSite is deep-frozen (src/fixtures/index.ts), so a
// template that sorted a SiteContext list in place would throw in the gallery and silently reorder
// the nav's lists in a real build. siteContext() freezes its lists and links too.
test("siteContext() is frozen like fixtureSite, so an in-place change fails the same way on both surfaces", () => {
  for (const preview of [false, true]) {
    const site = siteContext(preview);
    assert.ok(Object.isFrozen(site), `preview=${preview}: the context`);
    for (const [name, list] of Object.entries({ solutions: site.solutions, industries: site.industries, resources: site.resources })) {
      assert.ok(Object.isFrozen(list), `preview=${preview}: ${name}`);
      for (const link of list) assert.ok(Object.isFrozen(link), `preview=${preview}: ${name} ${link.path}`);
    }
    for (const key of Object.keys(PAGE_PATHS)) assert.ok(Object.isFrozen(site.page(key)), `preview=${preview}: page("${key}")`);
    assert.throws(() => site.solutions.sort((a, b) => a.id.localeCompare(b.id)), TypeError);
    assert.throws(() => site.resources.splice(0, 1), TypeError);
    assert.throws(() => { site.industries[0].href = "/industries/"; }, TypeError);
    assert.throws(() => { site.page("contact").href = "/elsewhere/"; }, TypeError);
  }
  assert.throws(() => fixtureSite.solutions.sort((a, b) => a.id.localeCompare(b.id)), TypeError);
});
