// The Solutions and Industries hub templates (spec §8.2, §8.4) as the preview build renders them
// from every fixture set: /preview/templates/solutions-hub/ and /preview/templates/industries-hub/.
// Run `npm run build:preview` first. The builders are covered by tests/views-hubs.test.mjs.
import { AUTOMATION } from "../src/lib/marketing.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readPreviewDist, visibleText } from "./helpers.mjs";
import { decodeEntities, elements, elementsWith, idsIn, startTags } from "../scripts/ci/lib.mjs";
import { industriesHubView, solutionsHubView } from "../src/lib/views/hubs.ts";
import { fixtureSite, industryFixtures, solutionFixtures } from "../src/fixtures/index.ts";

const SOLUTIONS_HUB = "preview/templates/solutions-hub/index.html";
const INDUSTRIES_HUB = "preview/templates/industries-hub/index.html";
const solutionsView = solutionsHubView({ solutions: solutionFixtures, site: fixtureSite });
const industriesView = industriesHubView({ industries: industryFixtures, solutions: solutionFixtures, site: fixtureSite });

const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>") + "</main>".length);
const text = (html) => visibleText(html).trim();
// Text as a browser shows it inline: tags dropped without adding spaces ("<span>Solutions</span>." → "Solutions.").
const inlineText = (html) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const tagged = (html, name) => elements(html, (t) => t.name === name);
const withClass = (html, cls) => elements(html, (t) => new RegExp(`(^|\\s)${cls}(\\s|$)`).test(t.attrs.class ?? ""));
function one(html, attr, value) {
  const found = elementsWith(html, attr, value);
  assert.equal(found.length, 1, `expected one [${attr}${value === undefined ? "" : `="${value}"`}], found ${found.length}`);
  return found[0];
}
const launchIds = (id) => [solutionFixtures[id].genericPackage, ...solutionFixtures[id].packages.filter((p) => p.status === "launch")].map((p) => p.id);

for (const [file, name, h1] of [
  [SOLUTIONS_HUB, "solutions-hub", "AI solutions for the work that matters."],
  [INDUSTRIES_HUB, "industries-hub", "Your industry. Your workflows."],
]) {
  test(`${name}: one h1 with its highlight, a data-template root, headings in order, unique ids`, () => {
    const html = readPreviewDist(file);
    const main = mainOf(html);
    const h1s = tagged(main, "h1");
    assert.equal(h1s.length, 1, "exactly one <h1>");
    assert.equal(inlineText(h1s[0].inner), h1);
    assert.deepEqual(withClass(h1s[0].inner, "hl").map((s) => text(s.inner)), []);
    one(main, "data-template", name);
    // Headings never skip a level on the way down.
    const levels = startTags(main).filter((t) => /^h[1-6]$/.test(t.name)).map((t) => Number(t.name[1]));
    levels.forEach((level, i) => {
      if (i > 0) assert.ok(level <= levels[i - 1] + 1, `h${levels[i - 1]} is followed by h${level}`);
    });
    const ids = startTags(html).map((t) => t.attrs.id).filter(Boolean);
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], "duplicate ids");
    // Every aria-labelledby names an id on the page.
    const known = idsIn(html);
    for (const t of startTags(html).filter((t) => "aria-labelledby" in t.attrs)) {
      for (const id of t.attrs["aria-labelledby"].split(/\s+/)) assert.ok(known.has(id), `aria-labelledby="${id}" names no element`);
    }
  });

  test(`${name}: the closing prompt is the template's last block, with its talk_to_us line and contact link`, () => {
    const main = mainOf(readPreviewDist(file));
    const template = one(main, "data-template", name);
    const contact = one(template.inner, "id", "contact");
    assert.ok(template.inner.trimEnd().endsWith(contact.outer), "#contact is not the last block");
    const prompt = one(contact.inner, "data-prompt-block");
    assert.ok(text(prompt.inner).includes(name === "solutions-hub" ? "Start with one workflow." : "Find a useful first step."));
    const link = tagged(prompt.inner, "a");
    assert.equal(link.length, 1);
    assert.equal(link[0].attrs.href, "/preview/templates/contact/");
    assert.equal(text(link[0].inner), "Talk to us");
  });
}

test("solutions-hub: the hero has no CTA or link, and #browse holds the switcher with its three views in order", () => {
  const main = mainOf(readPreviewDist(SOLUTIONS_HUB));
  const hero = one(main, "data-page-hero");
  assert.equal(tagged(hero.inner, "a").length, 0, "the hero renders a link");
  assert.equal(withClass(hero.outer, "btn").length, 0, "the hero renders a CTA");
  const browse = one(main, "id", "browse");
  assert.equal(browse.name, "section");
  assert.equal(text(one(browse.inner, "id", "browse-heading").inner), "Browse solutions");
  const switcher = one(browse.inner, "id", "solutions-switcher");
  assert.ok("data-tabs" in switcher.attrs, "#solutions-switcher is not a Tabs group");
  const panels = elementsWith(switcher.inner, "data-tab-panel");
  assert.deepEqual(panels.map((p) => p.attrs.id), ["by-job", "by-industry", "by-buyer"]);
  assert.deepEqual(panels.map((p) => p.attrs["data-tab-label"]), ["By job", "By industry", "By buyer"]);
});

test("solutions-hub: By job is one card per solution, headed by its number and short name, with its job and link", () => {
  const panel = one(mainOf(readPreviewDist(SOLUTIONS_HUB)), "id", "by-job");
  const cards = withClass(panel.inner, "link-card");
  assert.equal(cards.length, 5);
  solutionsView.jobs.forEach((job, i) => {
    const heading = tagged(cards[i].inner, "h4");
    assert.equal(heading.length, 1, `${job.shortName}: the card heading is not an h4`);
    assert.equal(text(heading[0].inner), `${job.number} ${job.shortName}`);
    assert.ok(text(cards[i].inner).includes(job.oneLiner), `${job.shortName}: no job line`);
    assert.deepEqual(tagged(cards[i].inner, "a").map((a) => a.attrs.href), [job.href]);
  });
});

test("solutions-hub: By industry is the matrix: an anchored row per industry, link cells, — for no entry", () => {
  const panel = one(mainOf(readPreviewDist(SOLUTIONS_HUB)), "id", "by-industry");
  const { matrix } = solutionsView;
  const table = tagged(panel.inner, "table");
  assert.equal(table.length, 1);
  assert.equal(text(tagged(table[0].inner, "caption")[0].inner), matrix.caption);
  const rows = elementsWith(table[0].inner, "data-matrix-row");
  assert.deepEqual(rows.map((r) => r.attrs.id), matrix.rowIds);
  rows.forEach((row, r) => {
    const cells = elements(row.inner, (t) => t.name === "th" || t.name === "td");
    assert.equal(cells.length, matrix.columns.length);
    assert.equal(cells[0].name, "th", `${matrix.rowIds[r]}: the industry cell is not the row header`);
    matrix.columns.forEach((col, c) => {
      const cell = matrix.rows[r][col.key];
      const links = tagged(cells[c].inner, "a");
      const where = `${matrix.rowIds[r]} × ${col.key}`;
      if (typeof cell === "string") {
        assert.equal(links.length, 0, where);
        assert.ok(text(cells[c].inner).includes(cell), where);
      } else if (cell.href === null) {
        assert.equal(links.length, 0, `${where}: a cell for an unshown page renders a link`);
        assert.ok(text(cells[c].inner).includes(cell.text), where);
      } else {
        assert.deepEqual(links.map((a) => [a.attrs.href, text(a.inner)]), [[cell.href, cell.text]], where);
      }
    });
  });
  const unshown = rows[matrix.rowIds.indexOf("matrix-fixture-industry-9")];
  assert.equal(tagged(elements(unshown.inner, (t) => t.name === "th")[0].inner, "a").length, 0, "fixture-industry-9's row header is a link");
});

test("solutions-hub: By buyer lists each buyer's launch packages with their solution, then How engagements run", () => {
  const main = mainOf(readPreviewDist(SOLUTIONS_HUB));
  const panel = one(main, "id", "by-buyer");
  for (const [id, title, items] of [
    ["buyer-mid-market", "Mid-market packages", solutionsView.byBuyer.midMarket],
    ["buyer-enterprise", "Enterprise and government", solutionsView.byBuyer.enterprise],
  ]) {
    const heading = one(panel.inner, "id", `${id}-heading`);
    assert.equal(heading.name, "h4");
    assert.equal(text(heading.inner), title);
    const list = one(panel.inner, "aria-labelledby", `${id}-heading`);
    assert.equal(list.name, "ul");
    const lis = elementsWith(list.inner, "data-package-status");
    assert.deepEqual(lis.map((li) => li.attrs["data-package-status"]), items.map(() => "launch"));
    items.forEach((item, i) => {
      const links = tagged(lis[i].inner, "a");
      assert.deepEqual(links.map((a) => [a.attrs.href, text(a.inner)]), item.href ? [[item.href, item.name]] : []);
      assert.ok(text(lis[i].inner).includes(`${item.solution.number} ${item.solution.shortName}`), `${item.name}: no solution label`);
    });
  }
  const more = tagged(panel.inner, "a").filter((a) => text(a.inner).startsWith("How engagements run"));
  assert.deepEqual(more.map((a) => a.attrs.href), ["/preview/templates/services/"]);
  // No on-request or internal package, and no package tab or block, renders on the hub.
  assert.equal(elementsWith(main, "data-package-tab").length, 0);
  assert.equal(elementsWith(main, "data-package-status").filter((e) => e.attrs["data-package-status"] !== "launch").length, 0);
  const listed = text(panel.inner);
  for (const data of Object.values(solutionFixtures)) {
    for (const p of data.packages.filter((p) => p.status !== "launch")) assert.ok(!listed.includes(p.name), `${p.status} package "${p.name}" is listed`);
  }
});

test("solutions-hub: By buyer links into the solution specimens land on the package's block or tab", () => {
  const panel = one(mainOf(readPreviewDist(SOLUTIONS_HUB)), "id", "by-buyer");
  // Each solution specimen renders one fixture solution. Solutions 2 and 3 share
  // /preview/templates/solution/ with fixture-solution, so only its packages are on that page.
  const renderedOn = {
    "/preview/templates/solution/": "fixture-solution",
    "/preview/templates/solution-evaluation/": "fixture-solution-4",
    "/preview/templates/solution-switch-on/": "fixture-solution-5",
  };
  let checked = 0;
  for (const a of tagged(panel.inner, "a")) {
    const [path, id] = a.attrs.href.split("#");
    const solution = renderedOn[path];
    if (!id || !solution || !launchIds(solution).includes(id)) continue;
    assert.ok(idsIn(readPreviewDist(`${path.slice(1)}index.html`)).has(id), `${a.attrs.href} lands on nothing`);
    checked++;
  }
  assert.ok(checked >= 3, `only ${checked} package links checked`);
});

test("industries-hub: nine deep cards: heading link, hook, three numbered use cases and a three-chip row", () => {
  const section = one(mainOf(readPreviewDist(INDUSTRIES_HUB)), "id", "industries");
  assert.equal(text(one(section.inner, "id", "industries-heading").inner), "Find your industry");
  const cards = elementsWith(section.inner, "data-industry-card");
  assert.deepEqual(cards.map((c) => c.attrs["data-industry-card"]), industriesView.cards.map((c) => c.id));
  industriesView.cards.forEach((card, i) => {
    const el = cards[i];
    const heading = tagged(el.inner, "h3");
    assert.equal(heading.length, 1);
    assert.equal(text(heading[0].inner), card.shortName);
    assert.deepEqual(tagged(heading[0].inner, "a").map((a) => a.attrs.href), card.href ? [card.href] : []);
    assert.ok(text(el.inner).includes(AUTOMATION.industries[card.shortName] ?? card.hook), `${card.id}: no hook`);
    const uses = elements(withClass(el.inner, "industry-card-uses")[0].inner, (t) => t.name === "li");
    // inlineText, not text: the number, name and label must be separated by real spaces in the markup.
    assert.deepEqual(
      uses.map((li) => inlineText(li.inner)),
      card.useCases.map((u) => (u.onRequest ? `${u.number} ${u.name} On request` : `${u.number} ${u.name}`)),
    );
    // "On request" is a text label, never a colour alone (spec §5, §6.6).
    uses.forEach((li, k) => {
      const labels = withClass(li.inner, "industry-card-on-request").map((s) => text(s.inner));
      assert.deepEqual(labels, card.useCases[k].onRequest ? ["On request"] : [], `${card.id}: use case ${k + 1}`);
    });
    const row = one(el.inner, "id", `industry-${card.id}-chips`);
    assert.ok(text(row.inner).startsWith("Designed around"), `${card.id}: the chip row isn't labelled "Designed around"`);
    const chips = elementsWith(row.inner, "data-bracket-chip");
    assert.equal(chips.length, 3);
    card.chips.forEach((chip, k) => {
      assert.equal(chips[k].name, chip.href ? "a" : "span", `${card.id}: chip ${k + 1}`);
      if (chip.href) assert.equal(chips[k].attrs.href, chip.href);
      assert.ok(text(chips[k].inner).includes(chip.label));
    });
  });
  // fixture-industry-9's page isn't shown: its card has no link at all.
  assert.equal(tagged(cards[industriesView.cards.findIndex((c) => c.id === "fixture-industry-9")].inner, "a").length, 0);
  // fixture-industry's third flagship use case is on request, and its card says so in words.
  assert.equal(industryFixtures["fixture-industry"].flagshipUseCases[2].status, "on-request");
  const third = elements(withClass(one(section.inner, "data-industry-card", "fixture-industry").inner, "industry-card-uses")[0].inner, (t) => t.name === "li")[2];
  assert.deepEqual(withClass(third.inner, "industry-card-on-request").map((s) => text(s.inner)), ["On request"]);
});

test("industries-hub: the chips of the rendered industry specimens land on their regulatory rows", () => {
  const main = mainOf(readPreviewDist(INDUSTRIES_HUB));
  for (const id of ["fixture-industry", "fixture-government"]) {
    const chips = elementsWith(one(main, "data-industry-card", id).inner, "data-bracket-chip");
    assert.equal(chips.length, 3);
    for (const chip of chips) {
      const href = chip.attrs.href;
      assert.ok(href, `${id}: a chip of a shown industry is not a link`);
      const target = elementsWith(readPreviewDist(`${href.slice(1, href.indexOf("#"))}index.html`), "id", href.slice(href.indexOf("#") + 1));
      assert.equal(target.length, 1, `${href} lands on nothing`);
      assert.ok("data-regulatory-row" in target[0].attrs, `${href} lands on something other than a regulatory row`);
    }
  }
});

test("industries-hub: #matrix is the solution × industry matrix with one anchored row per industry", () => {
  const section = one(mainOf(readPreviewDist(INDUSTRIES_HUB)), "id", "matrix");
  assert.equal(text(one(section.inner, "id", "matrix-heading").inner), "Solutions by industry");
  const rows = elementsWith(section.inner, "data-matrix-row");
  assert.deepEqual(rows.map((r) => r.attrs.id), industriesView.matrix.rowIds);
  const links = rows.flatMap((r) => tagged(r.inner, "a").map((a) => a.attrs.href));
  const expected = industriesView.matrix.rows.flatMap((row) =>
    industriesView.matrix.columns.flatMap((c) => (typeof row[c.key] === "object" && row[c.key].href ? [row[c.key].href] : [])),
  );
  assert.deepEqual(links, expected);
});
