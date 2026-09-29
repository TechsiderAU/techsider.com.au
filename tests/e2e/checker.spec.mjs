import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { focusKeys } from "../support/keys.mjs";
import { platformAiFile } from "../../src/content/schemas.ts";
import { siteContext } from "../../src/lib/site.ts";
import { NOT_PUBLISHED, checkerView } from "../../src/lib/views/checker.ts";
import { EMPTY_STATUS, statusText } from "../../src/scripts/checker.ts";

// The "What you already pay for" checker in a browser (spec §8.7), on the preview build, where the
// Safe-Use Kits page is shown, so the kit links render: ticking and unticking a vendor (one checkbox
// each, whose results hold every feature listed under it), one status change per tick, Review Focus 4
// with every vendor ticked, the kit links, the keyboard, axe at 390px and 1280px with the results open,
// no request while it runs, and the full table without JavaScript.
// tests/e2e/prod-checker.spec.mjs covers the production page; tests/checker.test.mjs the markup.
const PATH = "/resources/what-you-already-pay-for/";
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const FILE = platformAiFile.parse(JSON.parse(readFileSync(new URL("../../src/data/platform-ai.json", import.meta.url), "utf8")));
const VIEW = checkerView(FILE, siteContext(true));
const VENDORS = VIEW.vendors;
const box = (page, g) => page.locator(`[data-checker-vendor="${g.id}"]`);
/** A vendor's features, product by product, as its one tick shows them. */
const featuresOf = (g) => g.products.flatMap((p) => p.features);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** [included, add-on] feature counts over `vendors`, as statusText() takes them. */
function tally(vendors) {
  const features = vendors.flatMap(featuresOf);
  const included = features.filter((f) => f.included === "included").length;
  return [included, features.length - included];
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
// Two vendors the walk-through ticks: one that sells features both ways, included and add-on, under
// several product names (Microsoft, as at the facts' date), and another.
const MIXED = VENDORS.find((g) => g.products.length > 1 && new Set(featuresOf(g).map((f) => f.included)).size === 2);
const OTHER = VENDORS.find((g) => g !== MIXED);

test("ticking a vendor shows every feature listed under it, included and add-on, where each product's AI is processed and what's left for a build; unticking hides them", async ({ page }) => {
  expect(MIXED, "no vendor in platform-ai.json sells AI both included and as an add-on").toBeTruthy();
  await page.goto(PATH);
  const checker = page.locator("[data-checker]");
  await expect(checker.locator("[data-checker-nojs]")).toBeHidden();
  await expect(checker.locator("[data-checker-form]")).toBeVisible();
  const status = checker.locator("[data-checker-status]");
  await expect(status).toHaveText(EMPTY_STATUS);
  const sections = checker.locator("[data-checker-section]");
  for (const section of await sections.all()) await expect(section).toBeHidden();

  await box(page, MIXED).check();
  const features = checker.locator(`[data-checker-features][data-vendor="${MIXED.id}"]`);
  await expect(features).toBeVisible();
  // One tick: every product and feature listed under the vendor, each tagged Included or Add-on.
  await expect(features.locator(".checker-product-name")).toHaveText(MIXED.products.map((p) => p.name));
  await expect(features.locator(".checker-feature-text")).toHaveText(featuresOf(MIXED).map((f) => f.text));
  await expect(features.locator("[data-inclusion]")).toHaveText(featuresOf(MIXED).map((f) => f.inclusion));
  await expect(features.locator('[data-inclusion="included"]')).not.toHaveCount(0);
  await expect(features.locator('[data-inclusion="add-on"]')).not.toHaveCount(0);
  const where = checker.locator(`[data-checker-where][data-vendor="${MIXED.id}"]`);
  await expect(where.locator("dt")).toHaveText(MIXED.products.map((p) => p.name));
  await expect(where.locator("dd")).toHaveText(MIXED.products.flatMap((p) => p.processing.map((w) => w.text)));
  const builds = checker.locator('[data-checker-section="build"]').getByRole("link");
  await expect(builds).toHaveText(VIEW.builds.map((b) => `${b.number} ${b.name}`));
  for (const [i, b] of VIEW.builds.entries()) await expect(builds.nth(i)).toHaveAttribute("href", b.href);
  await expect(status).toHaveText(statusText(1, ...tally([MIXED])));
  await expect(checker.locator(`[data-checker-features][data-vendor="${OTHER.id}"]`)).toBeHidden();

  await box(page, OTHER).check();
  await expect(checker.locator(`[data-checker-features][data-vendor="${OTHER.id}"]`)).toBeVisible();
  await expect(status).toHaveText(statusText(2, ...tally([MIXED, OTHER])));
  await box(page, MIXED).uncheck();
  await expect(features).toBeHidden();
  await expect(where).toBeHidden();
  await expect(status).toHaveText(statusText(1, ...tally([OTHER])));
  await box(page, OTHER).uncheck();
  await expect(status).toHaveText(EMPTY_STATUS);
  for (const section of await sections.all()) await expect(section).toBeHidden();
});

test("the status line is the one live region, and it changes once per tick", async ({ page }) => {
  await page.goto(PATH);
  await expect(page.locator("[data-checker-results] [aria-live]")).toHaveCount(1);
  await expect(page.locator("[data-checker-results] [aria-live]")).toHaveAttribute("data-checker-status", "");
  await expect(page.locator("[data-checker-results]")).not.toHaveAttribute("aria-live", /./);
  await page.evaluate(() => {
    const status = document.querySelector("[data-checker-status]");
    window.__statusChanges = [];
    new MutationObserver((records) => {
      for (const _ of records) window.__statusChanges.push(status.textContent);
    }).observe(status, { childList: true, characterData: true, subtree: true });
  });
  await box(page, MIXED).check();
  await box(page, OTHER).check();
  await box(page, OTHER).uncheck();
  await expect.poll(() => page.evaluate(() => window.__statusChanges)).toEqual([
    statusText(1, ...tally([MIXED])),
    statusText(2, ...tally([MIXED, OTHER])),
    statusText(1, ...tally([MIXED])),
  ]);
});

test("Review Focus 4: with every vendor ticked, each location reads 'Not published' or its recorded statement", async ({ page }) => {
  await page.goto(PATH);
  for (const g of VENDORS) await box(page, g).check();
  await expect(page.locator("[data-checker-status]")).toHaveText(statusText(VENDORS.length, ...tally(VENDORS)));
  for (const g of VENDORS) {
    const where = page.locator(`[data-checker-where][data-vendor="${g.id}"]`);
    await expect(where).toBeVisible();
    await expect(where.locator(".checker-vendor-name")).toHaveText(g.vendor);
    await expect(where.locator("dt")).toHaveText(g.products.map((p) => p.name));
    await expect(where.locator("dd")).toHaveText(g.products.flatMap((p) => p.processing.map((w) => w.text)));
  }
  const unpublished = VENDORS.flatMap((g) => g.products.flatMap((p) => p.processing)).filter((w) => w.status === "not-published");
  await expect(page.locator('[data-checker-where] dd[data-processing="not-published"]')).toHaveText(unpublished.map(() => NOT_PUBLISHED));
});

test("each kit link follows the ticked vendors' industries, and lands on its kit", async ({ page }) => {
  expect(VIEW.kits.map((k) => k.category)).toEqual(["accounting", "legal", "property"]);
  for (const kit of VIEW.kits) {
    const vendor = VENDORS.find((g) => g.categories.includes(kit.category));
    await page.goto(PATH);
    await box(page, vendor).check();
    await expect(page.locator('[data-checker-section="kits"]')).toBeVisible();
    const link = page.locator(`[data-checker-kit="${kit.category}"]`).getByRole("link", { name: kit.title, exact: true });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", kit.href);
    for (const other of VIEW.kits.filter((k) => !vendor.categories.includes(k.category))) {
      await expect(page.locator(`[data-checker-kit="${other.category}"]`), `${vendor.id} shows the ${other.category} kit`).toBeHidden();
    }
  }
  const general = VENDORS.find((g) => g.categories.length === 0);
  expect(general, "platform-ai.json has no general vendor").toBeTruthy();
  await page.goto(PATH);
  await box(page, general).check();
  await expect(page.locator('[data-checker-section="build"]')).toBeVisible();
  await expect(page.locator('[data-checker-section="kits"]')).toBeHidden();

  const [kit] = VIEW.kits;
  await page.goto(PATH);
  await box(page, VENDORS.find((g) => g.categories.includes(kit.category))).check();
  await page.locator(`[data-checker-kit="${kit.category}"]`).getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`${escapeRe(kit.href)}$`));
  await expect(page.locator(`#kit-${kit.category}`)).toBeInViewport();
});

test("the keyboard reaches the first checkbox with a visible ring, Space ticks it, and the next key moves to the next checkbox", async ({ page, browserName }) => {
  const { next } = focusKeys(browserName);
  await page.goto(PATH);
  const [first, second] = VENDORS;
  let reached = false;
  for (let i = 0; i < 80 && !reached; i++) {
    await page.keyboard.press(next);
    reached = await box(page, first).evaluate((el) => el === document.activeElement);
  }
  expect(reached, "the keyboard never reached the first checkbox").toBe(true);
  // #checker is a bone section: the ring is carbon (spec §6.6).
  expect(await box(page, first).evaluate((el) => [getComputedStyle(el).outlineStyle, getComputedStyle(el).outlineColor])).toEqual(["solid", "rgb(11, 11, 12)"]);
  await page.keyboard.press("Space");
  await expect(box(page, first)).toBeChecked();
  await expect(page.locator("[data-checker-status]")).toHaveText(statusText(1, ...tally([first])));
  await page.keyboard.press(next);
  await expect(box(page, second)).toBeFocused();
});

for (const width of [390, 1280]) {
  test(`no axe violations at ${width}px, with nothing ticked and with every vendor ticked`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PATH);
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations, "nothing ticked").toEqual([]);
    for (const g of VENDORS) await box(page, g).check();
    await expect(page.locator('[data-checker-section="kits"]')).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations, "every vendor ticked").toEqual([]);
  });
}

test("with every vendor ticked the page doesn't scroll sideways at 320px, and every link and checkbox label is a 44px target", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(PATH);
  for (const g of VENDORS) await box(page, g).check();
  await expect(page.locator('[data-checker-section="kits"]')).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  // Spec §6.6: a tap target is at least 44px in both dimensions.
  const targets = await page.locator("[data-checker]").evaluate((root) =>
    [...root.querySelectorAll("a, label")]
      .filter((el) => el.checkVisibility({ checkVisibilityCSS: true }))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { name: el.textContent.replace(/\s+/g, " ").trim(), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
      }));
  expect(targets.length, "no visible link or label in the checker").toBeGreaterThan(VENDORS.length);
  expect(targets.filter((t) => t.w < 44 || t.h < 44)).toEqual([]);
});

test("nothing leaves the page while the checker runs: no request but the site's own fonts", async ({ page }) => {
  await page.goto(PATH);
  await page.waitForLoadState("networkidle");
  const origin = new URL(page.url()).origin;
  const requests = [];
  page.on("request", (r) => requests.push({ url: r.url(), type: r.resourceType() }));
  for (const g of VENDORS) await box(page, g).check();
  for (const g of VENDORS) await box(page, g).uncheck();
  await expect(page.locator("[data-checker-status]")).toHaveText(EMPTY_STATUS);
  expect(requests.filter((r) => r.type !== "font" || new URL(r.url).origin !== origin)).toEqual([]);
});

for (const width of [390, 1280]) {
  test(`without JavaScript every vendor's table reads in full at ${width}px, and the form and the results stay hidden`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(PATH);
    await expect(page.locator("[data-checker-nojs]")).toBeVisible();
    await expect(page.locator("[data-checker-form]")).toBeHidden();
    await expect(page.locator("[data-checker-results]")).toBeHidden();
    const facts = page.locator("#how-it-works [data-platform-facts]");
    await expect(facts.locator("[data-facts-as-at]")).toHaveText(`Vendor facts as at ${VIEW.asAt.text}`);
    for (const g of VIEW.vendors) {
      const table = facts.getByRole("table", { name: g.vendor, exact: true });
      await expect(table).toBeVisible();
      const rows = table.getByRole("row");
      await expect(rows).toHaveCount(g.rows.length + 1);
      for (const [i, r] of g.rows.entries()) {
        const row = rows.nth(i + 1);
        await expect(row).toBeVisible();
        await expect(row).toContainText(r.feature);
        await expect(row).toContainText(r.processed);
        await expect(row.getByRole("link", { name: r.source.text, exact: true })).toHaveAttribute("href", r.source.href);
      }
    }
    await ctx.close();
  });
}
