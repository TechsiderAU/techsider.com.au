import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { focusKeys } from "../support/keys.mjs";

// The Solutions and Industries hubs (spec §8.2, §8.4) on the preview gallery, built from every
// fixture set. The Solutions hub's switcher is a Tabs group ("solutions-switcher") with three
// views; both hubs show the solution × industry matrix, a DataTable that turns into stacked
// cards below 768px.
const SOLUTIONS = "/preview/templates/solutions-hub/";
const INDUSTRIES = "/preview/templates/industries-hub/";
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
const VIEWS = ["by-job", "by-industry", "by-buyer"];
const LABELS = ["By job", "By industry", "By buyer"];
const INDUSTRY_ROWS = 9;

const switcher = (page) => page.locator("#solutions-switcher[data-tabs]");
const tabs = (page) => switcher(page).getByRole("tab");
const toggles = (page) => switcher(page).locator(".tab-panel-heading > button");
const matrixRows = (page, scope) => page.locator(`${scope} [data-matrix-row]`);
const axe = (page) => new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function expectOnlyVisible(page, visibleId) {
  for (const id of VIEWS) await expect(page.locator(`#${id}`)).toBeVisible({ visible: id === visibleId });
}

// Each matrix row is a card: its cells stack top to bottom and stay inside the viewport.
async function expectStackedCards(page, scope, width) {
  const rows = matrixRows(page, scope);
  await expect(rows).toHaveCount(INDUSTRY_ROWS);
  for (const row of await rows.all()) {
    await expect(row).toHaveRole("row");
    const boxes = await row.locator(":scope > th, :scope > td").evaluateAll((cells) =>
      cells.map((c) => {
        const r = c.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
      }),
    );
    expect(boxes.length).toBe(6); // the industry and one cell per solution
    for (const [i, b] of boxes.entries()) {
      expect(b.left).toBeGreaterThanOrEqual(0);
      expect(b.right).toBeLessThanOrEqual(width);
      if (i > 0) expect(b.top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 1);
    }
  }
}

for (const vp of [WIDE, NARROW]) {
  test(`without JavaScript the switcher's three views are stacked, readable sections at ${vp.width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: vp });
    const page = await ctx.newPage();
    await page.goto(SOLUTIONS);
    await expect(page.getByRole("tablist")).toHaveCount(0);
    for (const [i, id] of VIEWS.entries()) {
      const view = page.locator(`section#${id}[data-tab-panel]`);
      await expect(view).toBeVisible();
      await expect(view.getByRole("heading", { level: 3 })).toHaveText(LABELS[i]);
    }
    await expect(matrixRows(page, "#by-industry")).toHaveCount(INDUSTRY_ROWS);
    for (const row of await matrixRows(page, "#by-industry").all()) await expect(row).toBeVisible();
    await expect(page.locator("#by-job .link-card")).toHaveCount(5);
    await ctx.close();
  });

  test(`without JavaScript a hash lands on its view and on a matrix row at ${vp.width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: vp });
    for (const hash of ["by-buyer", "matrix-fixture-government"]) {
      const page = await ctx.newPage();
      await page.goto(`${SOLUTIONS}#${hash}`);
      await expect(page.locator(`#${hash}`)).toBeInViewport();
      await page.close();
    }
    await ctx.close();
  });
}

// axe runs as page JavaScript, so it can't run with JavaScript disabled. Instead, serve the page
// with every script stripped (the no-js → js flip included): the same no-JS rendering, all three
// views on show.
test("the no-JavaScript Solutions hub has no axe violations", async ({ page }) => {
  await page.route(`**${SOLUTIONS}`, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, "");
    await route.fulfill({ response, body });
  });
  for (const vp of [WIDE, NARROW]) {
    await page.setViewportSize(vp);
    await page.goto(SOLUTIONS);
    await expect(page.locator("html")).toHaveClass(/\bno-js\b/);
    await expect(page.getByRole("tablist")).toHaveCount(0);
    expect((await axe(page).analyze()).violations).toEqual([]);
  }
});

test.describe("768px and up: the switcher is a tablist", () => {
  test.use({ viewport: WIDE });

  test("By job is selected first; a click selects a view and the hash follows", async ({ page }) => {
    await page.goto(SOLUTIONS);
    await expect(switcher(page).getByRole("tablist", { name: "Browse solutions", exact: true })).toHaveCount(1);
    await expect(tabs(page)).toHaveText(LABELS);
    await expect(tabs(page).first()).toHaveAttribute("aria-selected", "true");
    await expectOnlyVisible(page, "by-job");
    await expect(page.locator("#by-job .link-card")).toHaveCount(5);
    await tabs(page).nth(1).click();
    await expect(page).toHaveURL(/#by-industry$/);
    await expectOnlyVisible(page, "by-industry");
    await expect(matrixRows(page, "#by-industry")).toHaveCount(INDUSTRY_ROWS);
    await tabs(page).nth(2).click();
    await expect(page).toHaveURL(/#by-buyer$/);
    await expectOnlyVisible(page, "by-buyer");
    await expect(page.locator("#by-buyer").getByRole("heading", { level: 4 })).toHaveText(["Mid-market packages", "Enterprise and government"]);
  });

  test("the arrow keys move between views; Enter selects; Tab then reaches the view", async ({ page, browserName }) => {
    await page.goto(SOLUTIONS);
    await tabs(page).first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs(page).nth(1)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(tabs(page).nth(1)).toHaveAttribute("aria-selected", "true");
    await expectOnlyVisible(page, "by-industry");
    await page.keyboard.press(focusKeys(browserName).next);
    await expect(page.locator("#by-industry")).toBeFocused();
  });

  test("a hash naming a matrix row selects By industry and shows the row", async ({ page }) => {
    await page.goto(`${SOLUTIONS}#matrix-fixture-government`);
    await expect(tabs(page).nth(1)).toHaveAttribute("aria-selected", "true");
    await expectOnlyVisible(page, "by-industry");
    await expect(page.locator("#matrix-fixture-government")).toBeVisible();
  });

  test("the matrix is a table: each row's cells sit side by side", async ({ page }) => {
    await page.goto(INDUSTRIES);
    const rows = matrixRows(page, "#matrix");
    await expect(rows).toHaveCount(INDUSTRY_ROWS);
    const tops = await rows.first().locator(":scope > th, :scope > td").evaluateAll((cells) => cells.map((c) => Math.round(c.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });
});

test.describe("below 768px: the switcher is an accordion and the matrix is cards", () => {
  test.use({ viewport: NARROW });

  test("By job starts open; opening By industry shows the matrix as stacked cards", async ({ page }) => {
    await page.goto(SOLUTIONS);
    await expect(toggles(page)).toHaveText(LABELS);
    await expect(toggles(page)).toHaveCount(3);
    await expect(toggles(page).nth(0)).toHaveAttribute("aria-expanded", "true");
    await expect(toggles(page).nth(1)).toHaveAttribute("aria-expanded", "false");
    await expect(toggles(page).nth(2)).toHaveAttribute("aria-expanded", "false");
    await toggles(page).nth(1).click();
    await expect(toggles(page).nth(1)).toHaveAttribute("aria-expanded", "true");
    await expectStackedCards(page, "#by-industry", NARROW.width);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  test("the Industries hub matrix is stacked cards too", async ({ page }) => {
    await page.goto(INDUSTRIES);
    await expectStackedCards(page, "#matrix", NARROW.width);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
});

test("the Industries hub shows nine cards; the unshown industry's card has no link", async ({ page }) => {
  await page.goto(INDUSTRIES);
  const cards = page.locator("[data-industry-card]");
  await expect(cards).toHaveCount(INDUSTRY_ROWS);
  for (const card of await cards.all()) {
    await expect(card.locator(".industry-card-uses > li")).toHaveCount(3);
    await expect(card.locator("[data-bracket-chip]")).toHaveCount(3);
  }
  // An on-request flagship use case carries a visible "On request" label (spec §5).
  await page.locator('[data-industry-card="fixture-industry"] summary').click();
  const onRequest = page.locator('[data-industry-card="fixture-industry"] .industry-card-uses > li').nth(2);
  await expect(onRequest.locator(".industry-card-on-request")).toBeVisible();
  await expect(onRequest.locator(".industry-card-on-request")).toHaveText("On request");
  const unshown = page.locator('[data-industry-card="fixture-industry-9"]');
  await expect(unshown.getByRole("heading", { level: 3 })).toHaveText("Fixture Industry Nine");
  await expect(unshown.getByRole("link")).toHaveCount(0);
});

for (const vp of [WIDE, NARROW]) {
  test(`an obligation chip on the Industries hub lands on its regulatory row at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    for (const id of ["fixture-industry", "fixture-government"]) {
      await page.goto(INDUSTRIES);
      await page.locator(`[data-industry-card="${id}"] summary`).click();
      const chip = page.locator(`[data-industry-card="${id}"] a[data-bracket-chip]`).first();
      const href = await chip.getAttribute("href");
      await chip.click();
      await expect(page).toHaveURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
      const row = page.locator(`#${href.split("#")[1]}`);
      await expect(row).toHaveAttribute("data-regulatory-row");
      await expect(row).toBeInViewport();
    }
  });
}

for (const url of [SOLUTIONS, INDUSTRIES]) {
  test(`${url} has no horizontal scroll at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(url);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  for (const vp of [WIDE, NARROW]) {
    test(`${url} has no axe violations at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto(url);
      expect((await axe(page).analyze()).violations).toEqual([]);
    });
  }
}
