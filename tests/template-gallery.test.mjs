// The template gallery, swept page by page (spec §6.6, §7.4; B2 Review Focus 1 and 2). Every
// preview page in dist-preview/ has unique ids, and its <main> never links to a planned page of the
// real site: fixtureSite keeps every link a template renders inside the gallery. Every template in
// src/templates/ has a gallery page, each template page renders exactly one template, and its
// headings start at its one h1 and never skip a level. tests/e2e/template-gallery.spec.mjs checks
// the same pages in a browser (axe, one visible h1, 320px, every link landing) with the link logic
// in tests/support/gallery-links.mjs, which is unit-tested at the end of this file.
// Run `npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readPreviewDist, visibleText } from "./helpers.mjs";
import { elements, hrefsIn, startTags } from "../scripts/ci/lib.mjs";
import { PAGES } from "../src/data/nav.ts";
import {
  PREVIEW_PAGES, demoFixture, fixtureSite, industryFixtures, insightFixtures, kitFixture, pendingKitFixture, previewPath,
  regulatoryFixtures, solutionFixtures,
} from "../src/fixtures/index.ts";
import { downloadsOf } from "../src/lib/register.ts";
import {
  GALLERY_ONLY, SPECIMEN_ENTITY, galleryOnlyDestinations, internalLinks, linkProblems, packageIds, rowAnchors,
} from "./support/gallery-links.mjs";

const TEMPLATES_DIR = fileURLToPath(new URL("../src/templates/", import.meta.url));
const TEMPLATE_PAGES = PREVIEW_PAGES.filter((p) => p.group === "templates");
const fileOf = (page) => `${previewPath(page).slice(1)}index.html`;
const mainOf = (html) => elements(html, (t) => t.name === "main")[0]?.inner ?? "";
const PLANNED = PAGES.filter((p) => p.status === "planned").map((p) => p.path);
/** A planned page of the real site, or a path inside one (/solutions/ holds /solutions/x/). */
const inPlanned = (path) => PLANNED.some((p) => path === p || (p.endsWith("/") && path.startsWith(p)));
/** "SafeUseKitsTemplate.astro" → "safe-use-kits", the value of its root's data-template. */
const templateName = (file) => file.replace(/Template\.astro$/, "").replace(/(?<!^)([A-Z])/g, "-$1").toLowerCase();

test("every template in src/templates/ has a gallery page, and each template page renders exactly one template", () => {
  const files = readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".astro")).sort();
  assert.ok(files.length > 0, "src/templates/ holds no template");
  for (const f of files) assert.match(f, /^[A-Z][A-Za-z]*Template\.astro$/, `${f}: a template is named <Name>Template.astro`);
  const names = files.map(templateName);
  for (const [i, f] of files.entries()) {
    const source = readFileSync(join(TEMPLATES_DIR, f), "utf8");
    assert.ok(source.includes(`data-template="${names[i]}"`), `${f} has no data-template="${names[i]}" root`);
  }
  const rendered = new Set();
  for (const page of TEMPLATE_PAGES) {
    const roots = startTags(mainOf(readPreviewDist(fileOf(page)))).filter((t) => "data-template" in t.attrs);
    assert.equal(roots.length, 1, `${previewPath(page)} renders ${roots.length} templates`);
    rendered.add(roots[0].attrs["data-template"]);
  }
  assert.deepEqual([...rendered].sort(), [...names].sort(), "a template has no gallery page, or a page renders an unknown one");
});

test("ids are unique on every preview page", () => {
  for (const page of PREVIEW_PAGES) {
    const ids = startTags(readPreviewDist(fileOf(page))).map((t) => t.attrs.id).filter(Boolean);
    const repeated = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    assert.deepEqual(repeated, [], `${previewPath(page)} repeats these ids`);
  }
});

test("inside <main>, no preview page links to a planned page of the real site, or to a path inside one", () => {
  // Pages still planned after Phase D Task 7, which put the demos live: they wait for owner or lawyer review.
  for (const path of ["/trust/", "/resources/safe-use-kits/", "/legal/", "/legal/privacy/"]) {
    assert.ok(inPlanned(path), `${path} counts as planned`);
  }
  for (const path of ["/", "/404", "/insights/", "/insights/a-post/", "/demos/", "/demos/document-registers/", "/preview/templates/contact/", "/downloads/a-kit.pdf"]) {
    assert.ok(!inPlanned(path), `${path} doesn't count as planned`);
  }
  const offenders = [];
  for (const page of PREVIEW_PAGES) {
    const path = previewPath(page);
    for (const link of internalLinks(hrefsIn(mainOf(readPreviewDist(fileOf(page)))), path)) {
      if (inPlanned(link.path)) offenders.push(`${path} → ${link.href}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("on every template page, the headings in <main> start at its one h1 and never skip a level", () => {
  for (const page of TEMPLATE_PAGES) {
    const path = previewPath(page);
    const levels = startTags(mainOf(readPreviewDist(fileOf(page)))).filter((t) => /^h[1-6]$/.test(t.name)).map((t) => Number(t.name[1]));
    assert.equal(levels[0], 1, `${path}: the first heading in <main> is not the h1`);
    assert.equal(levels.filter((level) => level === 1).length, 1, `${path}: more than one h1`);
    const skips = levels.flatMap((level, i) => (i > 0 && level > levels[i - 1] + 1 ? [`h${levels[i - 1]} → h${level}`] : []));
    assert.deepEqual(skips, [], `${path}: headings skip a level`);
  }
});

test("each solution and industry specimen renders the fixture entity SPECIMEN_ENTITY names", () => {
  for (const [path, { kind, id }] of Object.entries(SPECIMEN_ENTITY)) {
    const page = PREVIEW_PAGES.find((p) => previewPath(p) === path);
    assert.ok(page, `${path} is not a registered preview page`);
    const h1 = elements(mainOf(readPreviewDist(fileOf(page))), (t) => t.name === "h1")[0];
    const expected = kind === "solution" ? fixtureSite.solutions.find((s) => s.id === id).fullName : industryFixtures[id].promise;
    assert.equal(visibleText(h1?.inner ?? "").trim(), expected, `${path} doesn't render ${id}`);
  }
});

test("the gallery-only destinations: published fixture posts, the reviewed kit's download, the register fixture's downloads, and each stand-in page's guest ids", () => {
  const { paths, fragments } = GALLERY_ONLY;
  const published = insightFixtures.filter((post) => post.data.draft !== true);
  const drafts = insightFixtures.filter((post) => post.data.draft === true);
  assert.ok(published.length > 0 && drafts.length > 0, "the insight fixtures need a published post and a draft");
  const registerDownloads = Object.values(downloadsOf(demoFixture.data));
  assert.deepEqual([...paths].sort(), [...published.map((post) => `/insights/${post.id}/`), kitFixture.download, ...registerDownloads].sort());
  assert.ok(!paths.has(pendingKitFixture.download), "the pending kit has a download to allow");
  // An allowance never stands in for a page of the gallery or of the real site: those must be built.
  for (const path of paths) {
    assert.doesNotMatch(path, /^\/preview\//, `${path}: a gallery page is allowed instead of built`);
    assert.ok(!PAGES.some((p) => p.path === path), `${path}: a nav page is allowed instead of built`);
  }
  // fixtureSite points ② and ③ at the ① specimen, and industries 3–8 at the first industry's
  // (the ninth has no page, so nothing links to it).
  assert.deepEqual([...fragments.keys()].sort(), ["/preview/templates/industry/", "/preview/templates/solution/"]);
  const solutionGuests = ["fixture-solution-2", "fixture-solution-3"];
  const industryGuests = [3, 4, 5, 6, 7, 8].map((n) => `fixture-industry-${n}`);
  assert.deepEqual(
    [...fragments.get("/preview/templates/solution/")].sort(),
    [...new Set(solutionGuests.flatMap((id) => packageIds(solutionFixtures[id])))].sort(),
  );
  assert.deepEqual(
    [...fragments.get("/preview/templates/industry/")].sort(),
    [...new Set(industryGuests.flatMap((id) => rowAnchors(regulatoryFixtures[id])))].sort(),
  );
});

test("galleryOnlyDestinations() allows a guest's ids only: never the rendered entity's, an unshown one's or a jurisdiction-mode guest's", () => {
  const solution = (id) => ({
    genericPackage: { id: `${id}-generic` },
    packages: [
      { id: `${id}-launch`, status: "launch" }, { id: `${id}-asked`, status: "on-request" }, { id: `${id}-internal`, status: "internal" },
    ],
  });
  const input = {
    site: {
      solutions: [
        { id: "fixture-solution", href: "/preview/templates/solution/" },
        { id: "guest", href: "/preview/templates/solution/" },
        { id: "fixture-solution-4", href: "/preview/templates/solution-evaluation/" },
      ],
      industries: [
        { id: "fixture-industry", href: "/preview/templates/industry/" },
        { id: "unshown", href: null },
      ],
    },
    solutions: { "fixture-solution": solution("one"), guest: solution("guest"), "fixture-solution-4": solution("four") },
    industries: { "fixture-industry": {}, unshown: {} },
    regulatory: { "fixture-industry": { rows: [{ id: "row-1" }] }, unshown: { rows: [{ id: "row-9" }] } },
    insights: [{ id: "post", data: {} }, { id: "draft", data: { draft: true } }],
    kits: [
      { lawyerReviewedAt: new Date("2026-09-15"), download: "/downloads/reviewed.pdf" },
      { lawyerReviewedAt: null, download: "/downloads/pending.pdf" },
    ],
  };
  const { paths, fragments } = galleryOnlyDestinations(input);
  assert.deepEqual([...paths], ["/insights/post/", "/downloads/reviewed.pdf"]);
  assert.deepEqual([...fragments], [["/preview/templates/solution/", new Set(["guest-generic", "guest-launch"])]]);
  const jurisdictionGuest = {
    ...input,
    site: { ...input.site, industries: [...input.site.industries, { id: "sections", href: "/preview/templates/industry/" }] },
    industries: { ...input.industries, sections: { jurisdictions: ["cth"] } },
    regulatory: { ...input.regulatory, sections: { rows: [{ id: "row-2" }] } },
  };
  assert.throws(() => galleryOnlyDestinations(jurisdictionGuest), /sections: a jurisdiction-mode industry needs its own specimen page/);
});

test("internalLinks() resolves each href against its page, drops external and repeated ones, and splits off the fragment", () => {
  const hrefs = [
    "/a/b/", "../c/?q=1#part", "#here", "#", "mailto:fixture@example.com", "https://example.com/x", "//example.com/y",
    "/a/b/", "/p%20q/#r%20s",
  ];
  assert.deepEqual(internalLinks(hrefs, "/preview/templates/solution/"), [
    { href: "/a/b/", path: "/a/b/", fragment: null },
    { href: "../c/?q=1#part", path: "/preview/templates/c/", fragment: "part" },
    { href: "#here", path: "/preview/templates/solution/", fragment: "here" },
    { href: "#", path: "/preview/templates/solution/", fragment: "" },
    { href: "/p%20q/#r%20s", path: "/p q/", fragment: "r s" },
  ]);
});

test("linkProblems(): a link lands on a served page and an id there, or on a gallery-only destination", () => {
  const served = new Map([
    ["/page/", new Set(["row-1"])],
    ["/file.pdf", new Set()],
    ["/stand-in/", new Set(["own-id"])],
    ["/missing/", null],
  ]);
  const allowed = { paths: new Set(["/fixture-only/"]), fragments: new Map([["/stand-in/", new Set(["guest-id"])]]) };
  const link = (href) => internalLinks([href], "/page/")[0];
  const landing = ["/page/#row-1", "/page/#top", "/page/#", "/page/", "/file.pdf", "/fixture-only/", "/stand-in/#own-id", "/stand-in/#guest-id"];
  assert.deepEqual(linkProblems(landing.map(link), served, allowed), []);
  const broken = ["/page/#row-2", "/missing/", "/never-fetched/", "/stand-in/#stranger"];
  assert.deepEqual(linkProblems(broken.map(link), served, allowed), [
    '/page/#row-2: /page/ has no id="row-2"',
    "/missing/: nothing is built at /missing/",
    "/never-fetched/: nothing is built at /never-fetched/",
    '/stand-in/#stranger: /stand-in/ has no id="stranger"',
  ]);
});
