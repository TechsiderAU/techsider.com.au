import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The production build: dist/ on port 4323, run by the prod-chromium project only.
// From Phase C Task 2 production shows two nav groups: Services, whose hub and Evaluation Partner
// are live, and Resources, which has no hub page yet and lists only Insights. Both header CTAs
// still use their fallbacks, since /demos/ and /contact/ are planned (Phase A Review Focus 1 and 5).
// The preview projects can't see this configuration: TECHSIDER_NAV_PREVIEW=1 shows every page.
const DEMO_FALLBACK = "/#demo";
const TALK_FALLBACK = "mailto:admin@techsider.com.au";
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
// The Services panel: Evaluation Partner (its one-liner is part of the link's name), the phase
// anchors, then "How we work" to the hub.
const SERVICES_LINKS = [
  [/^Evaluation Partner\b/, "/services/evaluation-partner/"],
  ["Prove", "/services/#prove"],
  ["Build", "/services/#build"],
  ["Run", "/services/#run"],
  ["How we work", "/services/"],
];

async function expectServicesLinks(panel) {
  await expect(panel.getByRole("link")).toHaveCount(SERVICES_LINKS.length);
  for (const [name, href] of SERVICES_LINKS) {
    const link = typeof name === "string" ? panel.getByRole("link", { name, exact: true }) : panel.getByRole("link", { name });
    await expect(link).toHaveAttribute("href", href);
  }
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Services links its hub and Resources is a plain label: the two production groups", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main", exact: true });
    const groups = nav.locator("[data-nav-group]");
    await expect(groups).toHaveCount(2);
    await expect(groups.nth(0).getByRole("link", { name: "Services", exact: true })).toHaveAttribute("href", "/services/");
    await expect(groups.nth(1).getByText("Resources", { exact: true })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Resources" })).toHaveCount(0);
  });

  test("the Services panel lists Evaluation Partner, the Prove, Build and Run anchors, and the hub", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Services menu" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const panel = page.locator("#nav-panel-services");
    await expect(panel).toBeVisible();
    await expectServicesLinks(panel);
  });

  test("the Resources panel lists only Insights", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Resources menu" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const panel = page.locator("#nav-panel-resources");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link")).toHaveCount(1);
    await expect(panel.getByRole("link", { name: /^Insights\b/ })).toHaveAttribute("href", "/insights/");
  });

  test("the header CTAs fall back to the Home demo section and email, and the demo fallback lands", async ({ page }) => {
    for (const path of ["/", "/insights/", "/insights/evals-before-vibes/", "/services/", "/services/evaluation-partner/"]) {
      await page.goto(path);
      const header = page.locator("body > header");
      await expect(header.getByRole("link", { name: "See a demo" }), path).toHaveAttribute("href", DEMO_FALLBACK);
      await expect(header.getByRole("link", { name: "Talk to us" }), path).toHaveAttribute("href", TALK_FALLBACK);
    }
    await page.goto("/");
    await page.locator("body > header").getByRole("link", { name: "See a demo" }).click();
    await expect(page).toHaveURL(/\/#demo$/);
    await expect(page.locator("#demo")).toBeInViewport();
  });

  // Phase A carry-over B2: the production groups are the first two, so their panels keep left: 0.
  // Were one hung from the right like the 4th/5th preview groups, it would leave the viewport on
  // the left at 1024px. Leave room for a classic 17px scrollbar, as the preview test does.
  test("at 1024px the Services and Resources panels stay inside the viewport, with room for a classic scrollbar", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    for (const [label, id] of [["Services", "services"], ["Resources", "resources"]]) {
      await page.getByRole("button", { name: `${label} menu` }).click();
      const panel = page.locator(`#nav-panel-${id}`);
      await expect(panel).toBeVisible();
      const edges = await panel.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, innerWidth: window.innerWidth };
      });
      expect(edges.left, `${id}: left edge`).toBeGreaterThanOrEqual(0);
      expect(edges.right, `${id}: right edge, with a 17px classic scrollbar`).toBeLessThanOrEqual(edges.innerWidth - 17);
    }
  });

  test("the footer is one Footer landmark holding a services column and a resources column", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("contentinfo").getByRole("navigation");
    await expect(nav).toHaveCount(1);
    await expect(nav).toHaveAccessibleName("Footer");
    const headings = nav.getByRole("heading", { level: 2 });
    await expect(headings).toHaveCount(2);
    await expect(headings.nth(0)).toHaveAccessibleName("services");
    await expect(headings.nth(1)).toHaveAccessibleName("resources");
    await expect(nav.getByRole("link")).toHaveCount(3);
    await expect(nav.getByRole("link", { name: "Services", exact: true })).toHaveAttribute("href", "/services/");
    await expect(nav.getByRole("link", { name: "Evaluation Partner", exact: true })).toHaveAttribute("href", "/services/evaluation-partner/");
    await expect(nav.getByRole("link", { name: "Insights", exact: true })).toHaveAttribute("href", "/insights/");
  });

  test("the production shell, with each panel open, has no axe violations", async ({ page }) => {
    await page.goto("/");
    for (const [label, id] of [["Services", "services"], ["Resources", "resources"]]) {
      await page.getByRole("button", { name: `${label} menu` }).click();
      await expect(page.locator(`#nav-panel-${id}`)).toBeVisible();
      const results = await new AxeBuilder({ page }).include("header").include("footer").include(".skip-link").withTags(WCAG).analyze();
      expect(results.violations, id).toEqual([]);
    }
  });
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the menu has a Services row and a Resources row, each panel lists its live pages, and the CTAs fall back", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const menu = page.locator("#site-menu");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: "See a demo" })).toHaveAttribute("href", DEMO_FALLBACK);
    await expect(menu.getByRole("link", { name: "Talk to us" })).toHaveAttribute("href", TALK_FALLBACK);
    const rows = menu.locator("[data-menu-open-panel]");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAccessibleName("Services");
    await expect(rows.nth(1)).toHaveAccessibleName("Resources");
    await rows.nth(0).click();
    const services = menu.locator('[data-menu-panel="services"]');
    await expect(services).toBeVisible();
    await expectServicesLinks(services);
    await services.getByRole("button", { name: "Back to menu" }).click();
    await rows.nth(1).click();
    const resources = menu.locator('[data-menu-panel="resources"]');
    await expect(resources).toBeVisible();
    await expect(resources.getByRole("link")).toHaveCount(1);
    await expect(resources.getByRole("link", { name: /^Insights\b/ })).toHaveAttribute("href", "/insights/");
  });

  test("the production menu and both its panels have no axe violations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu", exact: true }).click();
    const menu = () => new AxeBuilder({ page }).include("#site-menu").withTags(WCAG);
    expect((await menu().analyze()).violations).toEqual([]);
    for (const id of ["services", "resources"]) {
      await page.locator(`[data-menu-open-panel="${id}"]`).click();
      await expect(page.locator(`[data-menu-panel="${id}"]`)).toBeVisible();
      expect((await menu().analyze()).violations, id).toEqual([]);
      await page.locator(`[data-menu-panel="${id}"]`).getByRole("button", { name: "Back to menu" }).click();
    }
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });

  test("the toggles stay hidden and the basic row lists the live destinations: Services and Insights", async ({ page }) => {
    await page.goto("/");
    const toggles = page.locator("[data-nav-toggle]");
    await expect(toggles).toHaveCount(2);
    for (const toggle of await toggles.all()) await expect(toggle).toBeHidden();
    const basic = page.getByRole("navigation", { name: "Main (basic)" });
    await expect(basic).toBeVisible();
    const links = basic.getByRole("link");
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAccessibleName("Services");
    await expect(links.nth(0)).toHaveAttribute("href", "/services/");
    await expect(links.nth(1)).toHaveAccessibleName("Insights");
    await expect(links.nth(1)).toHaveAttribute("href", "/insights/");
  });
});
