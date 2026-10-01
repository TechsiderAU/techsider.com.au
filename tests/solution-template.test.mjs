// The solution template (spec §8.3) as the preview build renders it from the fixtures:
// /preview/templates/solution/ (①-like), solution-evaluation (④-like, the sample report in the
// hero) and solution-switch-on (⑤-like). The package markup is CI check 10's DOM contract.
// tests/e2e/solution-template.spec.mjs covers the tabs, no-JS, axe and 320px behaviour, and
// tests/solutions-pages.test.mjs covers the live solution pages in the production build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readPreviewDist, visibleText } from "./helpers.mjs";
import { elements, elementsWith, startTags } from "../scripts/ci/lib.mjs";
import { run as packageStatusCheck } from "../scripts/ci/checks/10-package-status.mjs";
import { PREVIEW_PAGES } from "../src/fixtures/preview-pages.ts";
import { fixtureSite, servicesFixture, solutionFixtures } from "../src/fixtures/index.ts";
import { solutionLink } from "../src/lib/site.ts";
import { ACCEPTANCE_TEST_LABEL, ONSHORE_PILLAR, PACKAGED_OFFER_DISCLAIMER, PROCESSING_NOTE } from "../src/lib/fixed-copy.ts";

const DIST_PREVIEW = fileURLToPath(new URL("../dist-preview/", import.meta.url));
const PAGES = {
  "fixture-solution": "preview/templates/solution/index.html",
  "fixture-solution-4": "preview/templates/solution-evaluation/index.html",
  "fixture-solution-5": "preview/templates/solution-switch-on/index.html",
};
const IDS = Object.keys(PAGES);
const SECTIONS = ["job", "who", "packages", "program", "testing", "where-it-runs", "independence", "limits", "faq", "contact"];
const TITLES = {
  job: "The job",
  who: "Who it's for",
  program: "The program",
  testing: "How we test it",
  "where-it-runs": "Where it runs",
  independence: "Independence policy",
  limits: "What we don't do",
  faq: "Questions",
};

const text = (s) => visibleText(s).trim();
const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>"));
const byId = (html, id) => elements(html, (t) => t.attrs.id === id);
const sectionOf = (html, id) => elements(html, (t) => t.name === "section" && t.attrs.id === id)[0];
const linkTo = (html, href) => startTags(html).find((t) => t.name === "a" && t.attrs.href === href);
const byStatus = (id, status) => solutionFixtures[id].packages.filter((p) => p.status === status);
const blocksIn = (html) => elementsWith(html, "data-package-tab");
function template(id) {
  const [root] = elementsWith(readPreviewDist(PAGES[id]), "data-template", "solution");
  assert.ok(root, `${PAGES[id]}: no [data-template="solution"]`);
  return root.outer;
}
function expectedSections(id) {
  const data = solutionFixtures[id];
  return SECTIONS.filter((s) => (s !== "program" || data.program) && (s !== "independence" || data.independencePolicy));
}

test("the three solution specimens are registered as template pages", () => {
  assert.deepEqual(
    PREVIEW_PAGES.filter((p) => ["solution", "solution-evaluation", "solution-switch-on"].includes(p.kind)),
    [
      { slug: "templates/solution", title: "Fixture solution page", kind: "solution", group: "templates" },
      { slug: "templates/solution-evaluation", title: "Fixture evaluation solution page", kind: "solution-evaluation", group: "templates" },
      { slug: "templates/solution-switch-on", title: "Fixture switch-on solution page", kind: "solution-switch-on", group: "templates" },
    ],
  );
});

test("each page renders the template once, with one h1 (the full name) and no skipped heading level", () => {
  for (const id of IDS) {
    const html = readPreviewDist(PAGES[id]);
    const main = mainOf(html);
    assert.equal(elementsWith(html, "data-template", "solution").length, 1, PAGES[id]);
    const h1 = elements(main, (t) => t.name === "h1");
    assert.equal(h1.length, 1, `${PAGES[id]}: ${h1.length} h1 elements`);
    assert.equal(text(h1[0].inner), solutionLink(fixtureSite, id).fullName);
    const levels = startTags(main).filter((t) => /^h[1-6]$/.test(t.name)).map((t) => Number(t.name[1]));
    assert.equal(levels[0], 1, `${PAGES[id]}: the first heading is not the h1`);
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] <= levels[i - 1] + 1, `${PAGES[id]}: h${levels[i - 1]} is followed by h${levels[i]}`);
    }
  }
});

test("the sections follow spec §8.3 in order, with their fixed titles; program and independence only when set", () => {
  for (const id of IDS) {
    const t = template(id);
    const found = startTags(t).filter((tag) => tag.name === "section" && SECTIONS.includes(tag.attrs.id)).map((tag) => tag.attrs.id);
    assert.deepEqual(found, expectedSections(id), PAGES[id]);
    for (const sid of found.filter((s) => s !== "contact")) {
      const [heading] = byId(t, `${sid}-heading`);
      assert.ok(heading, `${PAGES[id]}: no #${sid}-heading`);
      assert.equal(heading.name, "h2", `${PAGES[id]}: #${sid}-heading is an ${heading.name}`);
      assert.equal(text(heading.inner), TITLES[sid] ?? solutionFixtures[id].packagesHeading, `${PAGES[id]} #${sid}`);
    }
  }
});

test("the hero: breadcrumb, eyebrow, H1 and one-liner, then the demo slot, then the CTAs", () => {
  for (const id of IDS) {
    const t = template(id);
    const [hero] = elementsWith(t, "data-page-hero");
    assert.ok(hero, `${PAGES[id]}: no [data-page-hero]`);
    const h = hero.outer;
    const link = solutionLink(fixtureSite, id);
    const nav = elements(h, (tag) => tag.name === "nav" && tag.attrs["aria-label"] === "Breadcrumb");
    assert.equal(nav.length, 1, `${PAGES[id]}: the hero has no breadcrumb`);
    const current = elements(nav[0].inner, (tag) => tag.attrs["aria-current"] === "page");
    assert.equal(text(current[0].inner), link.shortName);
    assert.match(text(h), new RegExp(`solution ${link.number}`));
    assert.ok(text(h).includes(link.oneLiner), `${PAGES[id]}: no one-liner in the hero`);
    const primary = linkTo(h, fixtureSite.contact({ interest: id }));
    assert.ok(primary, `${PAGES[id]}: no primary CTA`);
    const demo = fixtureSite.demo(id);
    const secondary = demo ? linkTo(h, demo) : undefined;
    if (demo) assert.ok(secondary && secondary.start > primary.start, `${PAGES[id]}: "Try the demo" doesn't follow the primary CTA`);
    const slot = startTags(t).find((tag) => "data-solution-demo" in tag.attrs);
    if (id === "fixture-solution-5") {
      assert.equal(slot, undefined, "the ⑤ specimen fills no demo slot, so the hero has no demo wrapper");
    } else {
      assert.ok(slot && slot.start >= t.indexOf(hero.outer) + hero.outer.length, `${PAGES[id]}: the example should follow the concise hero`);
    }
  }
  assert.ok(template("fixture-solution").includes("data-demo-placeholder"));
  assert.equal(elementsWith(template("fixture-solution-4"), "data-sample-report").length, 1, "the ④ hero holds the sample report");
});

test("packages: the generic package is the first full block, launch packages are tabs, on-request ones are listed, internal ones never render", () => {
  for (const id of IDS) {
    const data = solutionFixtures[id];
    const launch = byStatus(id, "launch");
    const onRequest = byStatus(id, "on-request");
    const s = sectionOf(template(id), "packages").outer;
    const tags = startTags(s);
    const blocks = blocksIn(s);
    assert.deepEqual(blocks.map((b) => b.attrs.id), [data.genericPackage.id, ...launch.map((p) => `${p.id}-block`)], PAGES[id]);
    for (const b of blocks) assert.equal(b.attrs["data-package-status"], "launch");

    const tabs = elements(s, (tag) => "data-tabs" in tag.attrs);
    if (launch.length === 0) {
      assert.equal(tabs.length, 0, `${PAGES[id]}: a tab group with no launch package`);
    } else {
      assert.equal(tabs.length, 1, PAGES[id]);
      assert.equal(tabs[0].attrs.id, `${id}-packages`);
      const panels = elementsWith(tabs[0].inner, "data-tab-panel");
      assert.deepEqual(panels.map((p) => p.attrs.id), launch.map((p) => p.id));
      assert.deepEqual(panels.map((p) => p.attrs["data-tab-label"]), launch.map((p) => p.name));
      for (const panel of panels) assert.deepEqual(blocksIn(panel.inner).map((b) => b.attrs.id), [`${panel.attrs.id}-block`]);
      assert.equal(byId(tabs[0].inner, data.genericPackage.id).length, 0, "the generic package is inside the tabs");
      const genericAt = tags.find((tag) => tag.attrs.id === data.genericPackage.id).start;
      const tabsAt = tags.find((tag) => "data-tabs" in tag.attrs).start;
      assert.ok(genericAt < tabsAt, `${PAGES[id]}: the generic package doesn't come first`);
    }

    const listed = elementsWith(s, "data-package-status", "on-request");
    assert.deepEqual(listed.map((li) => li.name), onRequest.map(() => "li"), PAGES[id]);
    for (const [i, p] of onRequest.entries()) {
      const li = listed[i];
      assert.ok(!("data-package-tab" in li.attrs));
      assert.match(text(li.inner), /^\[ ?On request ?\]/);
      assert.ok(text(li.inner).includes(p.oneLiner), `${PAGES[id]}: no one-liner for ${p.id}`);
      const a = elements(li.inner, (tag) => tag.name === "a");
      assert.equal(a.length, 1);
      assert.equal(a[0].attrs.href, fixtureSite.contact({ interest: id }));
      assert.equal(text(a[0].inner), p.name);
      assert.ok(li.inner.includes("</a>: "), `${PAGES[id]}: no colon between the name and the one-liner`);
      const lastBlock = tags.filter((tag) => "data-package-tab" in tag.attrs).at(-1).start;
      assert.ok(s.indexOf(li.outer) > lastBlock, `${PAGES[id]}: ${p.id} is listed before the tabs`);
    }

    const page = readPreviewDist(PAGES[id]);
    assert.equal(elementsWith(page, "data-package-status", "internal").length, 0);
    for (const p of byStatus(id, "internal")) {
      assert.ok(!page.includes(p.id), `${PAGES[id]}: internal package id ${p.id} is in the page`);
      assert.ok(!visibleText(page).includes(p.name), `${PAGES[id]}: internal package "${p.name}" renders`);
    }
  }
});

test("every package block shows the §4.5 facts, its onshore note, the pillar or the processing note, and the disclaimer", () => {
  for (const id of IDS) {
    const data = solutionFixtures[id];
    const t = template(id);
    const packages = [data.genericPackage, ...byStatus(id, "launch")];
    const blocks = blocksIn(sectionOf(t, "packages").outer);
    assert.equal(blocks.length, packages.length);
    for (const [i, p] of packages.entries()) {
      const block = blocks[i];
      const blockId = block.attrs.id;
      const body = text(block.inner);
      assert.equal(block.name, "section");
      assert.equal(block.attrs["aria-labelledby"], `${blockId}-heading`);
      const [heading] = byId(block.inner, `${blockId}-heading`);
      assert.equal(heading.name, i === 0 ? "h3" : "h4", `${blockId}: heading level`);
      assert.equal(text(heading.inner), p.name);
      const facts = [p.forWhom, p.scope, ...p.inclusions, ...servicesFixture.standardInclusions, p.clientTime, p.timeline, ...p.outOfScope, p.gate];
      for (const fact of [...facts, ...(p.precondition ? [p.precondition] : [])]) {
        assert.ok(body.includes(fact), `${blockId}: missing "${fact}"`);
      }
      assert.ok(body.includes("Every package includes"), `${blockId}: no "Every package includes"`);
      const note = byId(block.inner, `${blockId}-onshore-note`);
      assert.equal(note.length, 1, `${blockId}: no #${blockId}-onshore-note`);
      assert.ok(text(note[0].inner).includes(p.onshoreNote));
      const pillars = elementsWith(block.inner, "data-onshore-pillar");
      const processing = elementsWith(block.inner, "data-processing-note");
      if (p.onshore) {
        assert.equal(pillars.length, 1, `${blockId}: onshore, but no pillar`);
        assert.equal(pillars[0].attrs["data-onshore"], "true");
        assert.equal(text(pillars[0].inner), ONSHORE_PILLAR);
        assert.equal(processing.length, 0);
      } else {
        assert.equal(pillars.length, 0, `${blockId}: not onshore, but the pillar renders`);
        assert.equal(processing.length, 1, `${blockId}: no processing note`);
        const links = elements(processing[0].inner, (tag) => tag.name === "a");
        assert.equal(links.length, 1);
        assert.equal(links[0].attrs.href, `#${blockId}-onshore-note`);
        assert.equal(text(links[0].inner), PROCESSING_NOTE);
      }
      const notices = elementsWith(block.inner, "data-notice");
      assert.equal(notices.length, 1, `${blockId}: no packaged-offer disclaimer`);
      assert.equal(text(notices[0].inner), PACKAGED_OFFER_DISCLAIMER);
    }
    // The pillar renders nowhere else on the page.
    assert.equal(elementsWith(t, "data-onshore-pillar").length, packages.filter((p) => p.onshore).length, PAGES[id]);
  }
  assert.equal(elementsWith(template("fixture-solution-5"), "data-onshore-pillar").length, 0, "⑤ shows the onshore pillar");
});

test("CI check 10 passes on dist-preview, where every solution page gives it blocks to check", async () => {
  const { errors } = await packageStatusCheck({ dist: DIST_PREVIEW });
  assert.deepEqual(errors, []);
  for (const id of IDS) assert.ok(blocksIn(template(id)).length >= 2, `${PAGES[id]}: fewer than two package blocks`);
});

test("the ④ and ⑤ adaptations: Engagements and the independence policy on ④, no program on ⑤, the acceptance-test label everywhere but ④", () => {
  const four = template("fixture-solution-4");
  assert.equal(text(byId(four, "packages-heading")[0].inner), "Engagements");
  const independence = sectionOf(four, "independence");
  assert.ok(independence, "④ has no #independence");
  assert.deepEqual(elements(independence.inner, (t) => t.name === "li").map((li) => text(li.inner)), servicesFixture.independence);
  assert.equal(text(byId(template("fixture-solution"), "packages-heading")[0].inner), "Packages");
  assert.equal(sectionOf(template("fixture-solution"), "independence"), undefined);
  assert.equal(sectionOf(template("fixture-solution-5"), "program"), undefined);
  const program = sectionOf(template("fixture-solution"), "program");
  const p = solutionFixtures["fixture-solution"].program;
  for (const s of [p.title, p.summary, p.duration, ...p.bullets]) assert.ok(text(program.inner).includes(s), `#program: missing "${s}"`);
  // Spec §4.4: an acceptance test on a system Techsider builds is labelled as not independent, so
  // #testing opens with the label on ①–③ and ⑤. ④ is the independent evaluation: no label.
  for (const id of ["fixture-solution", "fixture-solution-5"]) {
    const testing = sectionOf(template(id), "testing").inner;
    const labels = elementsWith(testing, "data-acceptance-label");
    assert.equal(labels.length, 1, `${PAGES[id]}: #testing has ${labels.length} acceptance-test labels`);
    assert.match(text(labels[0].inner), /^\[ ?Acceptance test \(not independent\) ?\]$/);
    assert.equal(text(labels[0].inner).replace(/^\[ ?| ?\]$/g, ""), ACCEPTANCE_TEST_LABEL);
    const body = text(testing);
    assert.ok(body.indexOf(ACCEPTANCE_TEST_LABEL) < body.indexOf(solutionFixtures[id].howWeTest.summary), `${PAGES[id]}: the label doesn't open #testing`);
  }
  assert.equal(elementsWith(sectionOf(four, "testing").inner, "data-acceptance-label").length, 0, "④ is the independent evaluation, so its #testing has no acceptance-test label");
});

test("where it runs: lettered choices with the shared copy, the solution's note, then the onshore note", () => {
  for (const id of IDS) {
    const data = solutionFixtures[id];
    const s = sectionOf(template(id), "where-it-runs");
    const LETTER = { "your-account": "a", managed: "b", "platform-you-license": "c" };
    const ids = [...new Set(data.whereItRuns.choices)].sort((a, b) => LETTER[a].localeCompare(LETTER[b]));
    const items = elementsWith(s.inner, "data-delivery-choice");
    assert.deepEqual(items.map((li) => li.attrs["data-delivery-choice"]), ids, PAGES[id]);
    for (const [i, choice] of ids.entries()) {
      const copy = servicesFixture.deliveryChoices.find((c) => c.id === choice);
      const [h3] = elements(items[i].inner, (t) => t.name === "h3");
      assert.equal(text(h3.inner), `(${LETTER[choice]}) ${copy.title}`);
      assert.ok(text(items[i].inner).includes(copy.body));
    }
    const body = text(s.inner);
    assert.ok(body.includes(data.whereItRuns.note));
    assert.ok(body.indexOf("The onshore note") > body.indexOf(data.whereItRuns.note));
    for (const line of servicesFixture.onshoreNote) assert.ok(body.includes(line), `${PAGES[id]}: missing "${line}"`);
  }
});

test("who, testing, limits and FAQ come from the content, with the By industry chips and the method link", () => {
  const id = "fixture-solution";
  const data = solutionFixtures[id];
  const t = template(id);
  const who = text(sectionOf(t, "who").inner);
  for (const n of data.needProfiles) assert.ok(who.includes(n.title) && who.includes(n.body), `#who: missing "${n.title}"`);
  assert.ok(who.includes("By industry"));
  // Review Focus 2: fixtureSite doesn't show fixture-industry-9, so its chip must be plain text.
  assert.ok(data.byIndustry.includes("fixture-industry-9"), "① lists no unshown industry: the null-href chip goes untested");
  const whoLinks = elements(sectionOf(t, "who").inner, (tag) => tag.name === "a").map((a) => text(a.inner));
  for (const ref of data.byIndustry) {
    const industry = fixtureSite.industries.find((i) => i.id === ref);
    assert.ok(who.includes(industry.shortName), `#who: no chip for ${ref}`);
    if (industry.href) assert.ok(linkTo(sectionOf(t, "who").inner, industry.href), `#who: ${ref} chip is not a link`);
    else assert.ok(!whoLinks.some((l) => l.includes(industry.shortName)), `#who: ${ref} isn't shown, so its chip must be text, not a link`);
  }
  const testing = sectionOf(t, "testing").inner;
  for (const s of [data.howWeTest.summary, ...data.howWeTest.bullets]) assert.ok(text(testing).includes(s));
  const method = linkTo(testing, fixtureSite.page("evaluationMethod").href);
  assert.ok(method, "#testing: no link to the evaluation method");
  const limits = sectionOf(t, "limits").inner;
  const [platformFirst] = elementsWith(limits, "data-platform-first");
  const [dontDo] = elementsWith(limits, "data-dont-do");
  assert.equal(text(platformFirst.inner), `Use your platform's AI first ${data.platformFirst}`);
  assert.deepEqual(elements(dontDo.inner, (tag) => tag.name === "li").map((li) => text(li.inner)), data.dontDo);
  assert.ok(limits.indexOf(platformFirst.outer) < limits.indexOf(dontDo.outer), "#limits: the platform-first line doesn't lead");
  const faq = sectionOf(t, "faq").inner;
  assert.equal(elements(faq, (tag) => tag.name === "details").length, data.faq.length);
  const page = readPreviewDist(PAGES[id]);
  assert.equal((page.match(/"@type":"FAQPage"/g) ?? []).length, 1, "one FAQPage per page");
  assert.equal((page.match(/"@type":"BreadcrumbList"/g) ?? []).length, 1, "one BreadcrumbList per page");
});

test("the closing prompt asks about this solution and links to the contact page with it preselected", () => {
  for (const id of IDS) {
    const s = sectionOf(template(id), "contact");
    assert.ok(s, `${PAGES[id]}: no #contact`);
    const [prompt] = elementsWith(s.inner, "data-prompt-block");
    assert.ok(text(prompt.inner).includes("Let’s put AI to work."));
    const [a] = elements(prompt.inner, (t) => t.name === "a");
    assert.equal(a.attrs.href, fixtureSite.contact({ interest: id }));
    assert.equal(text(a.inner), `Talk to us about ${solutionLink(fixtureSite, id).shortName}`);
  }
});

test("ids are unique in <main>, and every in-page reference (aria-labelledby, #fragment links) resolves", () => {
  for (const id of IDS) {
    const html = readPreviewDist(PAGES[id]);
    const ids = startTags(mainOf(html)).map((t) => t.attrs.id).filter(Boolean);
    assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), [], `${PAGES[id]}: duplicate ids`);
    const all = new Set(startTags(html).map((t) => t.attrs.id).filter(Boolean));
    for (const tag of startTags(mainOf(html))) {
      for (const ref of (tag.attrs["aria-labelledby"] ?? "").split(/\s+/).filter(Boolean)) {
        assert.ok(all.has(ref), `${PAGES[id]}: aria-labelledby="${ref}" has no target`);
      }
      if (tag.name === "a" && tag.attrs.href?.startsWith("#")) {
        assert.ok(all.has(tag.attrs.href.slice(1)), `${PAGES[id]}: href="${tag.attrs.href}" has no target`);
      }
    }
  }
});
