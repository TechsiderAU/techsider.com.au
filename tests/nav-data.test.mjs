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

// Phases C and D put pages live task by task, and each task that flips pages extends this pin.
// After Phase D Task 5: Phase C's live set (every hub, every solution and industry page, Services,
// Evaluation Partner, Insights, About and Contact) and the evaluation method.
test("the live pages after Phase D Task 5", () => {
  const [solutions, industries] = NAV_GROUPS.map((g) => g.items.map((p) => p.path));
  assert.deepEqual(
    PAGES.filter((p) => p.status === "live").map((p) => p.path).sort(),
    [
      "/", "/404",
      "/solutions/", ...solutions,
      "/industries/", ...industries,
      "/services/", "/services/evaluation-partner/",
      "/resources/", "/insights/", "/resources/evaluation-method/",
      "/about/", "/contact/",
    ].sort(),
  );
});

test("production nav shows only live pages; preview shows every group", () => {
  const prod = visibleGroups(false);
  // A group shows when its hub or one of its items is live; a hub that isn't live gives a plain
  // label, and its anchors go with it.
  const expected = NAV_GROUPS.map((g) => {
    const hubLive = g.hub.status === "live";
    return {
      id: g.id,
      hubHref: hubLive ? g.hub.path : null,
      items: g.items.filter((i) => i.status === "live").map((i) => i.path),
      anchors: hubLive ? g.anchors : [],
    };
  }).filter((g) => g.hubHref !== null || g.items.length > 0);
  assert.deepEqual(prod.map((g) => ({ id: g.id, hubHref: g.hubHref, items: g.items.map((i) => i.path), anchors: g.anchors })), expected);
  // Phase C Task 3: the Solutions hub and its five pages are live, so Solutions leads the nav.
  assert.equal(prod[0].id, "solutions");
  assert.equal(prod[0].hubHref, "/solutions/");
  assert.deepEqual(prod[0].items.map((i) => i.path), NAV_GROUPS[0].items.map((i) => i.path));
  // Phase C Task 6: the Industries hub is live, so its group links to it and lists all nine pages.
  const industries = prod.find((g) => g.id === "industries");
  assert.equal(industries.hubHref, "/industries/");
  assert.deepEqual(industries.items.map((i) => i.path), NAV_GROUPS[1].items.map((i) => i.path));
  // Phase C Task 7: every hub is live, and About lists only Contact. Resources lists Insights and,
  // from Phase D Task 5, the evaluation method.
  assert.deepEqual(prod.map((g) => g.hubHref), ["/solutions/", "/industries/", "/services/", "/resources/", "/about/"]);
  const byId = Object.fromEntries(prod.map((g) => [g.id, g]));
  assert.deepEqual(byId.resources.items.map((i) => i.path), ["/insights/", "/resources/evaluation-method/"]);
  assert.deepEqual(byId.about.items.map((i) => i.path), ["/contact/"], "Trust and Legal wait for the owner (spec §12)");
  assert.deepEqual(byId.resources.anchors, []);
  assert.equal(byId.services.anchors.length, 3);
  const pre = visibleGroups(true);
  assert.deepEqual(pre.map((g) => g.id), ["solutions", "industries", "services", "resources", "about"]);
  assert.equal(pre[0].hubHref, "/solutions/");
  assert.equal(pre[2].anchors.length, 3);
});

test("CTAs fall back while their target page is unbuilt: Talk to us reaches the live /contact/, See a demo falls back", () => {
  assert.deepEqual(resolveCta(CTAS.talk, false), { label: "Talk to us", href: "/contact/" });
  assert.deepEqual(resolveCta(CTAS.talk, true), { label: "Talk to us", href: "/contact/" });
  assert.deepEqual(resolveCta(CTAS.demo, false), { label: "See a demo", href: "/#demo" });
  assert.deepEqual(resolveCta(CTAS.demo, true), { label: "See a demo", href: "/demos/" });
  assert.equal(CTAS.talk.fallbackHref, `mailto:${SITE.email}`, "the fallback a planned /contact/ would use");
});

test("no-JS links, footer and legal row only point at shown pages", () => {
  const live = (href) => PAGES.find((p) => p.path === href)?.status === "live";
  for (const l of noJsLinks(false)) assert.ok(live(l.href), `no-JS row: ${l.href}`);
  for (const c of footerColumns(false)) for (const l of c.links) assert.ok(live(l.href), `footer ${c.title}: ${l.href}`);
  // Phase C Task 7: every nav hub is live, so the no-JS row is the five hubs (Insights is reached
  // through /resources/), and the footer has all five columns.
  assert.deepEqual(noJsLinks(false), [
    { label: "Solutions", href: "/solutions/" },
    { label: "Industries", href: "/industries/" },
    { label: "Services", href: "/services/" },
    { label: "Resources", href: "/resources/" },
    { label: "About", href: "/about/" },
  ]);
  const prod = footerColumns(false);
  assert.deepEqual(prod.map((c) => c.title), ["Solutions", "Industries", "Services", "Resources", "Company"]);
  assert.deepEqual(prod[0].links, NAV_GROUPS[0].items.map((i) => ({ label: i.shortName, href: i.path })));
  assert.deepEqual(prod[1].links, NAV_GROUPS[1].items.map((i) => ({ label: footerLabel(i), href: i.path })));
  assert.deepEqual(prod.find((c) => c.title === "Resources").links, [
    { label: "Insights", href: "/insights/" },
    { label: "Evaluation method", href: "/resources/evaluation-method/" },
  ]);
  assert.deepEqual(prod.find((c) => c.title === "Company").links, [
    { label: "About", href: "/about/" },
    { label: "Contact", href: "/contact/" },
  ]);
  assert.deepEqual(legalLinks(false), [], "the legal documents are drafts until reviewed (spec §12 item 5)");
  assert.equal(footerColumns(true).length, 5);
});

test("one-liners carry no banned implied-proof or hype phrases (spec §3.5)", () => {
  const banned = /trusted by|our clients|clients include|case study|world-class|cutting-edge|seamless|frontier|revolutioni[sz]e|certified|accredited|fixed[- ]price/i;
  for (const p of PAGES) if (p.oneLiner) assert.doesNotMatch(p.oneLiner, banned, p.shortName);
});
