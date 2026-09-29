import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { CTAS, footerColumns, noJsLinks, resolveCta, visibleGroups } from "../../src/data/nav.ts";

// The production build: dist/ on port 4323, run by the prod-chromium project only. Phase C puts
// pages live task by task, so every expectation here is read from nav.ts as a production build
// reads it (isPreview() false): which nav groups show, whether each hub is a link or a plain label,
// which pages and anchors each panel lists, the footer columns, the no-JS row and the header CTAs.
// The preview projects can't see this configuration: TECHSIDER_NAV_PREVIEW=1 shows every page.
const GROUPS = visibleGroups(false);
const BASIC = noJsLinks(false);
const COLUMNS = footerColumns(false);
const DEMO = resolveCta(CTAS.demo, false);
const TALK = resolveCta(CTAS.talk, false);
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
// Pages to check the header on: Home, Insights and a post, and the first live solution page.
const PAGES = ["/", "/insights/", "/insights/evals-before-vibes/", "/solutions/", "/solutions/document-registers/"];
/** The hrefs a group's panel lists, in DOM order: its live pages, its anchors, then "All …" when its hub is live. */
const panelHrefs = (g) => [...g.items.map((i) => i.path), ...g.anchors.map((a) => a.href), ...(g.hubHref ? [g.hubHref] : [])];
const hrefsOf = (locator) => locator.evaluateAll((links) => links.map((a) => a.getAttribute("href")));

test("Phase C Task 3: the Solutions hub leads the production nav", () => {
  expect(GROUPS[0].id).toBe("solutions");
  expect(GROUPS[0].hubHref).toBe("/solutions/");
});

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("each group is its hub link, or a plain label while the hub is planned, and its panel lists only live pages", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main", exact: true });
    await expect(nav.locator("[data-nav-group]")).toHaveCount(GROUPS.length);
    for (const g of GROUPS) {
      const label = nav.getByRole("link", { name: g.label, exact: true });
      if (g.hubHref) {
        await expect(label).toHaveAttribute("href", g.hubHref);
      } else {
        await expect(nav.getByText(g.label, { exact: true })).toBeVisible();
        await expect(label).toHaveCount(0);
      }
      const toggle = nav.getByRole("button", { name: `${g.label} menu` });
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "true");
      const panel = page.locator(`#nav-panel-${g.id}`);
      await expect(panel).toBeVisible();
      expect(await hrefsOf(panel.getByRole("link")), g.id).toEqual(panelHrefs(g));
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
    }
  });

  test("the header CTAs link to their production targets on every kind of live page", async ({ page }) => {
    for (const path of PAGES) {
      await page.goto(path);
      const header = page.locator("body > header");
      await expect(header.getByRole("link", { name: DEMO.label }), path).toHaveAttribute("href", DEMO.href);
      await expect(header.getByRole("link", { name: TALK.label }), path).toHaveAttribute("href", TALK.href);
    }
  });

  test("while the Demos hub is planned, 'See a demo' lands on the Home demo section", async ({ page }) => {
    expect(DEMO.href).toBe("/#demo");
    await page.goto("/insights/");
    await page.locator("body > header").getByRole("link", { name: "See a demo" }).click();
    await expect(page).toHaveURL(/\/#demo$/);
    await expect(page.locator("#demo")).toBeInViewport();
  });

  // Headless browsers draw overlay scrollbars, so leave room for a classic one (17px on Windows),
  // as the preview's desktop-nav spec does.
  test("at 1024px every production panel stays inside the viewport, with room for a classic scrollbar", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    for (const g of GROUPS) {
      await page.getByRole("button", { name: `${g.label} menu` }).click();
      const panel = page.locator(`#nav-panel-${g.id}`);
      await expect(panel).toBeVisible();
      const edges = await panel.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, innerWidth: window.innerWidth };
      });
      expect(edges.left, `${g.id} left edge`).toBeGreaterThanOrEqual(0);
      expect(edges.right, `${g.id} right edge, with a 17px classic scrollbar`).toBeLessThanOrEqual(edges.innerWidth - 17);
    }
  });

  test("the footer is one Footer landmark with one headed column per production footer column", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("contentinfo").getByRole("navigation");
    await expect(nav).toHaveCount(1);
    await expect(nav).toHaveAccessibleName("Footer");
    // The brackets around each heading are aria-hidden, so the accessible name is the bare title.
    const headings = nav.getByRole("heading", { level: 2 });
    await expect(headings).toHaveCount(COLUMNS.length);
    for (const [i, c] of COLUMNS.entries()) await expect(headings.nth(i)).toHaveAccessibleName(c.title.toLowerCase());
    expect(await hrefsOf(nav.getByRole("link"))).toEqual(COLUMNS.flatMap((c) => c.links.map((l) => l.href)));
  });

  test("the production shell, with each panel open, has no axe violations", async ({ page }) => {
    await page.goto("/");
    for (const g of GROUPS) {
      await page.getByRole("button", { name: `${g.label} menu` }).click();
      await expect(page.locator(`#nav-panel-${g.id}`)).toBeVisible();
      const results = await new AxeBuilder({ page }).include("header").include("footer").include(".skip-link").withTags(WCAG).analyze();
      expect(results.violations, g.id).toEqual([]);
    }
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the menu has one row per production group, each panel lists only live pages, and its CTAs match the header's", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const menu = page.locator("#site-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: DEMO.label })).toHaveAttribute("href", DEMO.href);
    await expect(menu.getByRole("link", { name: TALK.label })).toHaveAttribute("href", TALK.href);
    const rows = menu.locator("[data-menu-open-panel]");
    await expect(rows).toHaveText(GROUPS.map((g) => new RegExp(`^\\s*${g.label}\\s*›?\\s*$`)));
    for (const g of GROUPS) {
      await menu.locator(`[data-menu-open-panel="${g.id}"]`).click();
      const panel = menu.locator(`[data-menu-panel="${g.id}"]`);
      await expect(panel).toBeVisible();
      expect(await hrefsOf(panel.getByRole("link")), g.id).toEqual(panelHrefs(g));
      await panel.locator(`[data-menu-back="${g.id}"]`).click();
      await expect(panel).toBeHidden();
    }
  });

  test("the production menu and each of its panels have no axe violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const menu = () => new AxeBuilder({ page }).include("#site-menu").withTags(WCAG);
    expect((await menu().analyze()).violations).toEqual([]);
    for (const g of GROUPS) {
      await page.locator(`[data-menu-open-panel="${g.id}"]`).click();
      await expect(page.locator(`[data-menu-panel="${g.id}"]`)).toBeVisible();
      expect((await menu().analyze()).violations, g.id).toEqual([]);
      await page.locator(`[data-menu-back="${g.id}"]`).click();
    }
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });

  test("the toggles stay hidden and the basic row lists every live hub, or a group's live pages when its hub is planned", async ({ page }) => {
    await page.goto("/");
    const toggles = page.locator("[data-nav-toggle]");
    await expect(toggles).toHaveCount(GROUPS.length);
    for (const toggle of await toggles.all()) await expect(toggle).toBeHidden();
    const basic = page.getByRole("navigation", { name: "Main (basic)" });
    await expect(basic).toBeVisible();
    const links = basic.getByRole("link");
    await expect(links).toHaveText(BASIC.map((l) => l.label));
    expect(await hrefsOf(links)).toEqual(BASIC.map((l) => l.href));
  });
});
