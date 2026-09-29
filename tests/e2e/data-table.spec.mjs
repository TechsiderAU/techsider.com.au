import { test, expect } from "@playwright/test";
import { regulatoryFixture } from "../../src/fixtures/index.ts";
import { focusKeys } from "../support/keys.mjs";

// DataTable row anchors and link cells (spec §8.12 tables; B1 review finding BR-7a), on the
// components gallery, where GalleryStaticB renders the specimen table on carbon and on bone.
// It is one <table> at every width: below 768px CSS stacks its rows as cards. So each row id
// exists once, and a #row link reaches its row at every width, without JavaScript.
const PAGE = "/preview/components/";
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
const ROWS = regulatoryFixture.rows;
const LABELS = ["Obligation", "What it means", "How we design for it", "Evidence you get", "Source"];
const ACID = "rgb(200, 255, 46)";
const CARBON = "rgb(11, 11, 12)";
const rowId = (row, surface = "") => `row-${row.id}${surface}`;
const specimen = (page, surface = "") => page.locator(`#gallery-data-table${surface} [data-data-table]`);

test("at 390px without JavaScript a #row link lands on its row, on carbon and on bone", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: NARROW, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const id of [rowId(ROWS.at(-1)), rowId(ROWS[0], "-bone")]) {
    await page.goto(PAGE);
    const row = page.locator(`#${id}`);
    await expect(row).toHaveCount(1);
    await expect(row).toHaveAttribute("data-specimen-row", "");
    expect(await row.evaluate((el) => el.tagName)).toBe("TR");
    await expect(row).not.toBeInViewport(); // below the fold until the hash is followed
    await page.goto(`${PAGE}#${id}`);
    await expect(row).toBeInViewport();
  }
  await ctx.close();
});

test.describe("with JavaScript", () => {
  test.use({ reducedMotion: "reduce" });
  for (const vp of [NARROW, WIDE]) {
    test(`at ${vp.width}px a #row link lands on its row, clear of the sticky header`, async ({ page }) => {
      await page.setViewportSize(vp);
      const id = rowId(ROWS[1]);
      await page.goto(`${PAGE}#${id}`);
      const row = page.locator(`#${id}`);
      await expect(row).toBeInViewport();
      const header = await page.locator("body > header").boundingBox();
      expect((await row.boundingBox()).y).toBeGreaterThanOrEqual(header.y + header.height);
    });
  }
});

test("at 390px the stacked table still exposes its rows, headers and cells by role", async ({ page }) => {
  await page.setViewportSize(NARROW);
  await page.goto(PAGE);
  for (const surface of ["", "-bone"]) {
    const table = specimen(page, surface).getByRole("table", { name: "Fixture obligations register", exact: true });
    await expect(table).toBeVisible();
    expect(await table.evaluate((el) => getComputedStyle(el).display)).toBe("block");
    await expect(table.getByRole("row")).toHaveCount(ROWS.length + 1); // the header row stays, out of sight
    await expect(table.getByRole("columnheader")).toHaveText(LABELS);
    await expect(table.getByRole("rowheader")).toHaveText(ROWS.map((r) => r.obligation));
    // A cell's name is its value alone: the in-cell label is aria-hidden, because the column
    // header already names the cell.
    const cells = table.getByRole("row").nth(1).getByRole("cell");
    await expect(cells).toHaveCount(LABELS.length - 1);
    await expect(cells.first()).toHaveAccessibleName(ROWS[0].meaning);
  }
});

test("every id on the page is unique, and each row id appears once", async ({ page }) => {
  await page.goto(PAGE);
  const ids = await page.locator("[id]").evaluateAll((els) => els.map((el) => el.id));
  expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  for (const surface of ["", "-bone"]) {
    for (const row of ROWS) expect(ids).toContain(rowId(row, surface));
  }
});

for (const vp of [WIDE, NARROW]) {
  test(`at ${vp.width}px link cells are links with a 44px target, and a null href is plain text`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto(PAGE);
    for (const surface of ["", "-bone"]) {
      const sources = specimen(page, surface).locator("tbody td:last-child");
      await expect(sources).toHaveCount(ROWS.length);
      for (const [i, row] of ROWS.entries()) {
        const link = sources.nth(i).getByRole("link");
        if (i === ROWS.length - 1) {
          await expect(link).toHaveCount(0);
          await expect(sources.nth(i)).toHaveAccessibleName(`Fixture source ${i + 1}`);
          continue;
        }
        await expect(link).toHaveAccessibleName(`Fixture source ${i + 1}`);
        await expect(link).toHaveAttribute("href", row.source);
        const box = await link.boundingBox();
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
}

test("keyboard focus moves between link cells with the surface's focus ring", async ({ page, browserName }) => {
  const { next } = focusKeys(browserName);
  await page.setViewportSize(WIDE);
  await page.goto(PAGE);
  for (const [surface, color] of [["", ACID], ["-bone", CARBON]]) {
    const links = specimen(page, surface).getByRole("link");
    await links.nth(0).focus();
    await page.keyboard.press(next);
    await expect(links.nth(1)).toBeFocused();
    const ring = await links.nth(1).evaluate((el) => {
      const s = getComputedStyle(el);
      return { visible: el.matches(":focus-visible"), style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor };
    });
    expect(ring).toEqual({ visible: true, style: "solid", width: "2px", color });
  }
});
