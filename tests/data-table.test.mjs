// DataTable (spec §8.12 tables; B1 review finding BR-7a): one <table> at every width, row ids and a
// row marker for hash links and CI checks, and link cells. The guards are plain TypeScript in
// src/lib/data-table.ts. The markup is read from the preview build's /preview/components/, where
// GalleryStaticB renders the specimen table on carbon and on bone, and each SampleReport holds one.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readPreviewDist } from "./helpers.mjs";
import { elements, startTags, visibleText } from "../scripts/ci/lib.mjs";
import { cellHref, cellText, checkTable } from "../src/lib/data-table.ts";
import { regulatoryFixture } from "../src/fixtures/index.ts";

const COLUMNS = [
  { key: "name", label: "Name" },
  { key: "note", label: "Note" },
];
const ROWS = [
  { name: "Fixture row one", note: "Fixture note one" },
  { name: { text: "Fixture row two", href: "https://example.com/fixture/two" }, note: { text: "Fixture note two", href: null } },
];
const spec = (over = {}) => ({ caption: "Fixture table", columns: COLUMNS, rows: ROWS, rowHeader: "name", ...over });

test("cellText and cellHref read a text cell and a link cell", () => {
  assert.equal(cellText("Fixture text"), "Fixture text");
  assert.equal(cellHref("Fixture text"), null);
  assert.equal(cellText(ROWS[1].name), "Fixture row two");
  assert.equal(cellHref(ROWS[1].name), "https://example.com/fixture/two");
  // A null href is how a view model says "that page isn't shown": the cell renders as text.
  assert.equal(cellText(ROWS[1].note), "Fixture note two");
  assert.equal(cellHref(ROWS[1].note), null);
});

test("checkTable accepts a well-formed table, with or without row ids and a row marker", () => {
  assert.doesNotThrow(() => checkTable(spec()));
  assert.doesNotThrow(() => checkTable(spec({ rowIds: ["reg-fixture-1", "reg-state-fixture-2"], rowMarker: "data-regulatory-row" })));
});

test("checkTable throws at build time, naming the table, when the table can't render as asked", () => {
  const cases = [
    [{ rowHeader: "missing" }, 'DataTable "Fixture table": rowHeader "missing" is not a column key'],
    [{ rows: [ROWS[0], { name: "Fixture row two" }] }, 'DataTable "Fixture table": row 2 has no "note" cell'],
    [{ rowIds: ["reg-fixture-1"] }, 'DataTable "Fixture table": 1 rowIds for 2 rows'],
    [{ rowIds: ["reg-fixture-1", "reg-fixture-1"] }, 'DataTable "Fixture table": rowId "reg-fixture-1" repeats'],
    [
      { rowIds: ["reg-fixture-1", "Reg fixture 2"] },
      'DataTable "Fixture table": rowId "Reg fixture 2" is not a lower-case id (a-z, 0-9 and "-", starting with a letter)',
    ],
    [{ rowMarker: "regulatory-row" }, 'DataTable "Fixture table": rowMarker "regulatory-row" is not a data-* attribute name'],
  ];
  for (const [over, message] of cases) assert.throws(() => checkTable(spec(over)), { message }, JSON.stringify(over));
});

test("DataTable runs checkTable on its props and renders its rows once", () => {
  const src = readFileSync(new URL("../src/components/ui/DataTable.astro", import.meta.url), "utf8");
  assert.match(src, /checkTable\(\{ caption, columns, rows, rowHeader, rowIds, rowMarker \}\);/);
  // B1 rendered every row twice (a table and a <dl> card list), so a row id would have repeated.
  assert.doesNotMatch(src, /<dl|<ul|data-cards|pageUniqueId/);
  assert.equal(src.match(/<table\b/g).length, 1);
});

const html = readPreviewDist("preview/components/index.html");
const tables = elements(html, (t) => "data-data-table" in t.attrs);
const within = (src, name) => elements(src, (t) => t.name === name);
const text = (s) => visibleText(s).trim();

test("every DataTable in the gallery is one <table> with explicit table roles", () => {
  // The specimen on each surface, plus at least one table in each of the four SampleReports.
  assert.ok(tables.length >= 6, `${tables.length} DataTables on /preview/components/`);
  for (const t of tables) {
    const tags = startTags(t.inner);
    const named = (name) => tags.filter((x) => x.name === name);
    assert.deepEqual(named("table").map((x) => x.attrs.role), ["table"]);
    assert.equal(named("caption").length, 1);
    for (const name of ["dl", "ul", "li", "p"]) assert.equal(named(name).length, 0, `a DataTable renders a <${name}>`);
    for (const g of [...named("thead"), ...named("tbody")]) assert.equal(g.attrs.role, "rowgroup", g.name);
    for (const tr of named("tr")) {
      assert.equal(tr.attrs.role, "row");
      // Astro adds its scope class to a spread; a shared spread object would repeat it per row.
      const classes = (tr.attrs.class ?? "").split(/\s+/).filter(Boolean);
      assert.equal(new Set(classes).size, classes.length, `a class repeats on a row: "${tr.attrs.class}"`);
    }
    for (const th of named("th")) assert.equal(th.attrs.role, th.attrs.scope === "col" ? "columnheader" : "rowheader", `th scope=${th.attrs.scope}`);
    for (const td of named("td")) assert.equal(td.attrs.role, "cell");
  }
});

test("every data cell opens with its column label, hidden from screen readers", () => {
  for (const t of tables) {
    const labels = within(t.inner, "th").filter((th) => th.attrs.scope === "col").map((th) => text(th.inner));
    const rows = within(within(t.inner, "tbody")[0].inner, "tr");
    assert.ok(rows.length > 0, "a DataTable with no body rows");
    for (const row of rows) {
      const cells = elements(row.inner, (x) => x.name === "th" || x.name === "td");
      assert.equal(cells.length, labels.length);
      cells.forEach((cell, i) => {
        const spans = elements(cell.inner, (x) => x.name === "span" && x.attrs.class === "dt-label");
        if (cell.name === "th") {
          assert.equal(spans.length, 0, "the row header takes no label: it heads the card");
          return;
        }
        assert.equal(spans.length, 1, `cell ${i + 1} has no .dt-label`);
        assert.equal(spans[0].attrs["aria-hidden"], "true");
        assert.equal(text(spans[0].inner), labels[i]);
        assert.ok(cell.inner.startsWith(spans[0].outer), "the label comes first in its cell");
      });
    }
  }
});

test("the specimen's rows carry their ids and marker; link cells link, and a null href renders text", () => {
  const n = regulatoryFixture.rows.length;
  for (const suffix of ["", "-bone"]) {
    const [section] = elements(html, (x) => x.name === "section" && x.attrs.id === `gallery-data-table${suffix}`);
    assert.ok(section, `no section#gallery-data-table${suffix}`);
    const [head, ...rows] = within(section.inner, "tr");
    assert.ok(!("id" in head.attrs) && !("data-specimen-row" in head.attrs), "the header row takes no id or marker");
    assert.deepEqual(rows.map((r) => r.attrs.id), regulatoryFixture.rows.map((r) => `row-${r.id}${suffix}`));
    for (const r of rows) assert.equal(r.attrs["data-specimen-row"], "", "the row marker is a bare attribute");
    rows.forEach((row, i) => {
      const source = within(row.inner, "td").at(-1);
      const links = within(source.inner, "a");
      if (i === n - 1) {
        assert.equal(links.length, 0, "a null href must not render a link");
        assert.equal(text(source.inner), `Source Fixture source ${n}`);
        return;
      }
      assert.equal(links.length, 1, `row ${i + 1}: no link in the Source cell`);
      assert.equal(links[0].attrs.href, regulatoryFixture.rows[i].source);
      assert.equal(links[0].attrs.class, "dt-link");
      assert.equal(text(links[0].inner), `Fixture source ${i + 1}`);
    });
  }
});

test("no id repeats on the components page", () => {
  const ids = startTags(html).map((t) => t.attrs.id).filter(Boolean);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
});
