import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { focusKeys } from "../support/keys.mjs";
import { NOT_LEGAL_ADVICE, SCENARIO_LABEL } from "../../src/lib/fixed-copy.ts";
import { fixtureIndustryView } from "../../src/preview/specimens/industry-view.ts";

// The industry template (spec §8.5) on /preview/templates/industry/ (single mode) and
// /preview/templates/industry-government/ (jurisdiction mode): chip → row anchors at 390px and
// 1280px, the workflow tabs with and without JavaScript, the fixed labels, the keyboard path into
// the chips, 320px reflow and axe. Expected values come from the view the specimens render.
const SINGLE = "/preview/templates/industry/";
const GOV = "/preview/templates/industry-government/";
const single = fixtureIndustryView("fixture-industry");
const gov = fixtureIndustryView("fixture-government");

const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
const CARBON = "rgb(11, 11, 12)";
const axe = (page) => new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
const PAGES = [[SINGLE, single], [GOV, gov]];
// A Designed around chip and the row it names: on the single page the second chip, on the
// Government page the first State chip (whose row the Commonwealth section may share).
const CHIP_CASES = [
  [SINGLE, "#designed-around", single.single.chips[1].href],
  [GOV, "#state-designed-around", gov.sections.find((s) => s.id === "state").chips[0].href],
];

// The row's top edge minus the sticky header's bottom edge: >= 0 when the header hides none of it.
const clearOfHeader = (row) =>
  row.evaluate((el) => Math.round(el.getBoundingClientRect().top - document.querySelector("body > header").getBoundingClientRect().bottom));

// Reduced motion makes the anchor scroll instant (global.css turns smooth scrolling off).
test.describe(() => {
  test.use({ reducedMotion: "reduce" });

  for (const vp of [WIDE, NARROW]) {
    for (const [path, scope, href] of CHIP_CASES) {
      test(`a Designed around chip lands on its regulatory-map row at ${vp.width}px (${path})`, async ({ page }) => {
        await page.setViewportSize(vp);
        await page.goto(path);
        await page.locator(`${scope} a[href="${href}"]`).first().click();
        await expect(page).toHaveURL(new RegExp(`${href}$`));
        const row = page.locator(`${href}[data-regulatory-row]`);
        await expect(row).toHaveCount(1);
        await expect(row).toBeInViewport();
        expect(await clearOfHeader(row)).toBeGreaterThanOrEqual(0);
      });
    }
  }
});

for (const vp of [WIDE, NARROW]) {
  test(`without JavaScript every workflow stage is a stacked section, and stage and row hashes land at ${vp.width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: vp, reducedMotion: "reduce" });
    const stagePage = await ctx.newPage();
    const stage = single.workflow[2];
    await stagePage.goto(`${SINGLE}#${stage.id}`);
    await expect(stagePage.getByRole("tablist")).toHaveCount(0);
    for (const s of single.workflow) {
      const panel = stagePage.locator(`#workflow section#${s.id}[data-tab-panel]`);
      await expect(panel).toBeVisible();
      await expect(panel.getByRole("heading", { level: 3 })).toHaveText(s.stage);
    }
    await expect(stagePage.locator(`#${stage.id}`)).toBeInViewport();
    const rowPage = await ctx.newPage();
    const href = single.single.chips[0].href;
    await rowPage.goto(`${SINGLE}${href}`);
    await expect(rowPage.locator(href)).toBeInViewport();
    await ctx.close();
  });
}

test("at 1280px the workflow is a tablist named How the work flows, and a stage hash selects its tab", async ({ page }) => {
  await page.setViewportSize(WIDE);
  const stage = single.workflow[2];
  await page.goto(`${SINGLE}#${stage.id}`);
  const group = page.locator(`#${single.id}-workflow[data-tabs]`);
  await expect(group.getByRole("tablist", { name: "How the work flows", exact: true })).toHaveCount(1);
  await expect(group.getByRole("tab")).toHaveText(single.workflow.map((s) => s.stage));
  await expect(group.getByRole("tab").nth(2)).toHaveAttribute("aria-selected", "true");
  for (const s of single.workflow) await expect(page.locator(`#${s.id}`)).toBeVisible({ visible: s.id === stage.id });
  await group.getByRole("tab").nth(0).click();
  await expect(page).toHaveURL(new RegExp(`#${single.workflow[0].id}$`));
  await expect(page.locator(`#${single.workflow[0].id}`)).toBeVisible();
  await expect(page.locator("#workflow [data-mock-panel] figcaption")).toBeVisible();
});

test("below 768px the workflow is an accordion, and a stage hash opens its item", async ({ page }) => {
  await page.setViewportSize(NARROW);
  const stage = single.workflow[1];
  await page.goto(`${SINGLE}#${stage.id}`);
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await expect(page.locator(`#${single.id}-workflow .tab-panel-heading > button`)).toHaveCount(single.workflow.length);
  await expect(page.locator(`#${stage.id}-heading > button`)).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(`#${stage.id}-body`)).toBeVisible();
});

test("the scenario label and every not-legal-advice line are visible", async ({ page }) => {
  await page.setViewportSize(NARROW);
  for (const [path, view] of PAGES) {
    await page.goto(path);
    const label = page.locator("#scenario > p").first();
    await expect(label).toHaveText(SCENARIO_LABEL);
    await expect(label).toBeVisible();
    const notices = page.locator("[data-notice]", { hasText: NOT_LEGAL_ADVICE });
    await expect(notices).toHaveCount(view.single ? 1 : view.sections.length);
    for (const n of await notices.all()) await expect(n).toBeVisible();
  }
});

test("keyboard: after the hero CTAs, Tab reaches the first Designed around chip with a carbon focus ring, and Enter follows it", async ({ page, browserName }) => {
  const keys = focusKeys(browserName);
  await page.setViewportSize(WIDE);
  await page.goto(SINGLE);
  await page.locator("[data-page-hero]").getByRole("link", { name: single.ctas.secondary.label, exact: true }).focus();
  await page.keyboard.press(keys.next);
  const chip = page.locator("#designed-around").getByRole("link", { name: single.single.chips[0].label, exact: true });
  await expect(chip).toBeFocused();
  const ring = await chip.evaluate((el) => {
    const s = getComputedStyle(el);
    return { visible: el.matches(":focus-visible"), style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor };
  });
  expect(ring).toEqual({ visible: true, style: "solid", width: "2px", color: CARBON });
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${single.single.chips[0].href}$`));
});

for (const [path] of PAGES) {
  test(`no horizontal scroll at 320px (${path})`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  for (const vp of [WIDE, NARROW]) {
    test(`no axe violations at ${vp.width}px (${path})`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto(path);
      expect((await axe(page).analyze()).violations).toEqual([]);
    });
  }
}
