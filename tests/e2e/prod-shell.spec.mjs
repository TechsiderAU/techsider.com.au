import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The production build: dist/ on port 4323, run by the prod-chromium project only.
// Until Phase C every page except Home and Insights is "planned", so Resources is the only nav
// group, it has no hub page, and both CTAs use their fallbacks (Phase A Review Focus 1 and 5).
// The preview projects can't see this configuration: TECHSIDER_NAV_PREVIEW=1 shows every page.
const DEMO_FALLBACK = "/#demo";
const TALK_FALLBACK = "mailto:admin@techsider.com.au";
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Resources is a plain label with a toggle, and its panel lists only Insights", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main", exact: true });
    await expect(nav.locator("[data-nav-group]")).toHaveCount(1);
    await expect(nav.getByText("Resources", { exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Resources" })).toHaveCount(0);
    const toggle = nav.getByRole("button", { name: "Resources menu" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const panel = page.locator("#nav-panel-resources");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link")).toHaveCount(1);
    await expect(panel.getByRole("link", { name: /^Insights\b/ })).toHaveAttribute("href", "/insights/");
  });

  test("the header CTAs fall back to the Home demo section and email, and the demo fallback lands", async ({ page }) => {
    for (const path of ["/", "/insights/", "/insights/evals-before-vibes/"]) {
      await page.goto(path);
      const header = page.locator("body > header");
      await expect(header.getByRole("link", { name: "See a demo" }), path).toHaveAttribute("href", DEMO_FALLBACK);
      await expect(header.getByRole("link", { name: "Talk to us" }), path).toHaveAttribute("href", TALK_FALLBACK);
    }
    await page.locator("body > header").getByRole("link", { name: "See a demo" }).click();
    await expect(page).toHaveURL(/\/#demo$/);
    await expect(page.locator("#demo")).toBeInViewport();
  });

  // Phase A carry-over B2: the one production group is also the first, so its panel keeps
  // left: 0. Were it hung from the right like the 4th/5th preview groups, it would leave the
  // viewport on the left at 1024px. Leave room for a classic 17px scrollbar, as the preview test does.
  test("at 1024px the Resources panel stays inside the viewport, with room for a classic scrollbar", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    await page.getByRole("button", { name: "Resources menu" }).click();
    const panel = page.locator("#nav-panel-resources");
    await expect(panel).toBeVisible();
    const edges = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, innerWidth: window.innerWidth };
    });
    expect(edges.left, "left edge").toBeGreaterThanOrEqual(0);
    expect(edges.right, "right edge, with a 17px classic scrollbar").toBeLessThanOrEqual(edges.innerWidth - 17);
  });

  test("the footer is one Footer landmark holding a single resources column", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("contentinfo").getByRole("navigation");
    await expect(nav).toHaveCount(1);
    await expect(nav).toHaveAccessibleName("Footer");
    const headings = nav.getByRole("heading", { level: 2 });
    await expect(headings).toHaveCount(1);
    await expect(headings.first()).toHaveAccessibleName("resources");
    await expect(nav.getByRole("link")).toHaveCount(1);
    await expect(nav.getByRole("link", { name: "Insights" })).toHaveAttribute("href", "/insights/");
  });

  test("the production shell, with the Resources panel open, has no axe violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Resources menu" }).click();
    await expect(page.locator("#nav-panel-resources")).toBeVisible();
    const results = await new AxeBuilder({ page }).include("header").include("footer").include(".skip-link").withTags(WCAG).analyze();
    expect(results.violations).toEqual([]);
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the menu has one Resources row whose panel lists only Insights, and its CTAs fall back", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const menu = page.locator("#site-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "See a demo" })).toHaveAttribute("href", DEMO_FALLBACK);
    await expect(menu.getByRole("link", { name: "Talk to us" })).toHaveAttribute("href", TALK_FALLBACK);
    const rows = menu.locator("[data-menu-open-panel]");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toHaveAccessibleName("Resources");
    await rows.first().click();
    const panel = menu.locator('[data-menu-panel="resources"]');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link")).toHaveCount(1);
    await expect(panel.getByRole("link", { name: /^Insights\b/ })).toHaveAttribute("href", "/insights/");
  });

  test("the production menu and its Resources panel have no axe violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const menu = () => new AxeBuilder({ page }).include("#site-menu").withTags(WCAG);
    expect((await menu().analyze()).violations).toEqual([]);
    await page.locator('[data-menu-open-panel="resources"]').click();
    await expect(page.locator('[data-menu-panel="resources"]')).toBeVisible();
    expect((await menu().analyze()).violations).toEqual([]);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });

  test("the toggles stay hidden and the basic row lists Insights, the one live destination", async ({ page }) => {
    await page.goto("/");
    const toggles = page.locator("[data-nav-toggle]");
    await expect(toggles).toHaveCount(1);
    await expect(toggles).toBeHidden();
    const basic = page.getByRole("navigation", { name: "Main (basic)" });
    await expect(basic).toBeVisible();
    const links = basic.getByRole("link");
    await expect(links).toHaveCount(1);
    await expect(links.first()).toHaveAccessibleName("Insights");
    await expect(links.first()).toHaveAttribute("href", "/insights/");
  });
});
