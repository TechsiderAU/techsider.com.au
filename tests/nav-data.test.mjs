import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PAGES, NAV_GROUPS, EXEMPT_PATHS, CTAS, SITE,
  slugify, visibleGroups, noJsLinks, footerLabel, footerColumns, legalLinks, resolveCta,
} from "../src/data/nav.ts";

// Spec §7.1, every page that ships at launch.
const EXPECTED = [
  "/", "/404",
  "/solutions/", "/solutions/document-registers/", "/solutions/knowledge-assistant/",
  "/solutions/draft-for-approval/", "/solutions/ai-evaluation/", "/solutions/ai-switch-on/",
  "/industries/", "/industries/government/", "/industries/financial-services/", "/industries/accounting/",
  "/industries/education/", "/industries/manufacturing/", "/industries/real-estate/",
  "/industries/healthcare/", "/industries/resources-and-energy/", "/industries/legal-and-professional/",
  "/services/", "/services/evaluation-partner/",
  "/resources/", "/resources/safe-use-kits/", "/resources/what-you-already-pay-for/", "/resources/evaluation-method/",
  "/demos/", "/demos/document-registers/", "/demos/knowledge-assistant/", "/demos/draft-for-approval/",
  "/demos/ai-evaluation/", "/demos/ai-switch-on/",
  "/insights/", "/about/", "/trust/", "/legal/", "/legal/privacy/", "/legal/website-terms/",
  "/contact/", "/contact/sent/",
];

// Spec §7.2 `group`: the section a page belongs to (breadcrumbs, BreadcrumbList, CI check 1).
// Hubs carry their own group. Demos, Legal and Contact head their own sections even though the
// nav lists them under Resources and About; the demo pages, the legal children and Sent follow them.
const GROUP_OF = {
  "/": "home",
  "/404": "system",
  "/solutions/": "solutions",
  "/solutions/document-registers/": "solutions",
  "/solutions/knowledge-assistant/": "solutions",
  "/solutions/draft-for-approval/": "solutions",
  "/solutions/ai-evaluation/": "solutions",
  "/solutions/ai-switch-on/": "solutions",
  "/industries/": "industries",
  "/industries/government/": "industries",
  "/industries/financial-services/": "industries",
  "/industries/accounting/": "industries",
  "/industries/education/": "industries",
  "/industries/manufacturing/": "industries",
  "/industries/real-estate/": "industries",
  "/industries/healthcare/": "industries",
  "/industries/resources-and-energy/": "industries",
  "/industries/legal-and-professional/": "industries",
  "/services/": "services",
  "/services/evaluation-partner/": "services",
  "/resources/": "resources",
  "/resources/safe-use-kits/": "resources",
  "/resources/what-you-already-pay-for/": "resources",
  "/resources/evaluation-method/": "resources",
  "/insights/": "resources",
  "/demos/": "demos",
  "/demos/document-registers/": "demos",
  "/demos/knowledge-assistant/": "demos",
  "/demos/draft-for-approval/": "demos",
  "/demos/ai-evaluation/": "demos",
  "/demos/ai-switch-on/": "demos",
  "/about/": "about",
  "/trust/": "about",
  "/legal/": "legal",
  "/legal/privacy/": "legal",
  "/legal/website-terms/": "legal",
  "/contact/": "contact",
  "/contact/sent/": "contact",
};

test("slugify maps &, hyphens and punctuation per spec §7.2", () => {
  assert.equal(slugify("Legal & professional"), "legal-and-professional");
  assert.equal(slugify("Resources & energy"), "resources-and-energy");
  assert.equal(slugify("Draft-for-Approval"), "draft-for-approval");
  assert.equal(slugify("AI Switch-On"), "ai-switch-on");
  assert.equal(slugify("What you already pay for"), "what-you-already-pay-for");
  assert.equal(slugify("Safe-Use Kits"), "safe-use-kits");
});

test("every path equals base + slugify(shortName) + '/'", () => {
  for (const p of PAGES) {
    if (EXEMPT_PATHS.includes(p.path)) continue;
    assert.equal(p.path, `${p.base}${slugify(p.shortName)}/`, p.shortName);
  }
});

test("the registry covers exactly the spec §7.1 pages, each once", () => {
  const paths = PAGES.map((p) => p.path);
  assert.equal(new Set(paths).size, paths.length, "duplicate path");
  assert.deepEqual([...paths].sort(), [...EXPECTED].sort());
});

test("nav groups are the five spec groups in order, with 5 solutions and 9 industries", () => {
  assert.deepEqual(NAV_GROUPS.map((g) => g.id), ["solutions", "industries", "services", "resources", "about"]);
  assert.equal(NAV_GROUPS[0].items.length, 5);
  assert.equal(NAV_GROUPS[1].items.length, 9);
  assert.equal(NAV_GROUPS[1].layout, "columns");
});

test("'All …' labels are plain text; the header draws the arrow as decoration", () => {
  assert.deepEqual(NAV_GROUPS.map((g) => g.allLabel), ["All solutions", "All industries", "How we work", "All resources", "About Techsider"]);
  for (const g of NAV_GROUPS) assert.doesNotMatch(g.allLabel, /[→›»]|->/, `${g.id}: a screen reader would read the arrow`);
});

test("every page declares its group (spec §7.2)", () => {
  assert.deepEqual(Object.fromEntries(PAGES.map((p) => [p.path, p.group])), GROUP_OF);
});

test("each nav group's hub page carries that group's id", () => {
  for (const g of NAV_GROUPS) assert.equal(g.hub.group, g.id, g.id);
});

test("industry footer labels read 'AI for {short name}'", () => {
  const legal = NAV_GROUPS[1].items.find((i) => i.path === "/industries/legal-and-professional/");
  assert.equal(footerLabel(legal), "AI for legal & professional");
});

// Phase C puts pages live task by task; each task that flips a status adds its paths here.
test("the live pages: Home, the 404, Services, Evaluation Partner and Insights", () => {
  assert.deepEqual(
    PAGES.filter((p) => p.status === "live").map((p) => p.path).sort(),
    ["/", "/404", "/insights/", "/services/", "/services/evaluation-partner/"],
  );
});

test("production nav shows only live pages; preview shows every group", () => {
  const prod = visibleGroups(false);
  assert.deepEqual(prod.map((g) => g.id), ["services", "resources"]);
  // Services is live with its hub, so its panel carries Evaluation Partner and the phase anchors.
  assert.equal(prod[0].hubHref, "/services/");
  assert.deepEqual(prod[0].items.map((i) => i.path), ["/services/evaluation-partner/"]);
  assert.deepEqual(prod[0].anchors.map((a) => a.href), ["/services/#prove", "/services/#build", "/services/#run"]);
  // Resources has no hub page yet: a plain label whose panel lists Insights.
  assert.equal(prod[1].hubHref, null);
  assert.deepEqual(prod[1].items.map((i) => i.path), ["/insights/"]);
  assert.deepEqual(prod[1].anchors, []);
  const pre = visibleGroups(true);
  assert.deepEqual(pre.map((g) => g.id), ["solutions", "industries", "services", "resources", "about"]);
  assert.equal(pre[0].hubHref, "/solutions/");
  assert.equal(pre[2].anchors.length, 3);
});

test("CTAs fall back while their target page is unbuilt", () => {
  assert.deepEqual(resolveCta(CTAS.talk, false), { label: "Talk to us", href: `mailto:${SITE.email}` });
  assert.deepEqual(resolveCta(CTAS.talk, true), { label: "Talk to us", href: "/contact/" });
  assert.deepEqual(resolveCta(CTAS.demo, false), { label: "See a demo", href: "/#demo" });
});

test("no-JS links, footer and legal row only point at shown pages", () => {
  assert.deepEqual(noJsLinks(false), [{ label: "Services", href: "/services/" }, { label: "Insights", href: "/insights/" }]);
  assert.deepEqual(footerColumns(false), [
    { title: "Services", links: [{ label: "Services", href: "/services/" }, { label: "Evaluation Partner", href: "/services/evaluation-partner/" }] },
    { title: "Resources", links: [{ label: "Insights", href: "/insights/" }] },
  ]);
  assert.deepEqual(legalLinks(false), []);
  assert.equal(footerColumns(true).length, 5);
});

test("one-liners carry no banned implied-proof or hype phrases (spec §3.5)", () => {
  const banned = /trusted by|our clients|clients include|case study|world-class|cutting-edge|seamless|frontier|revolutioni[sz]e|certified|accredited|fixed[- ]price/i;
  for (const p of PAGES) if (p.oneLiner) assert.doesNotMatch(p.oneLiner, banned, p.shortName);
});
