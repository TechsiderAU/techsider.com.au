import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SERVICES } from "../../src/data/services.ts";
import { siteContext } from "../../src/lib/site.ts";

// The Services and Evaluation Partner pages in the production build (dist/, prod-chromium only),
// live from Phase C Task 2 while most pages are still planned. Their links follow the production
// site context: contact links fall back to email until /contact/ is live, the evaluation method
// link waits for its page, and the Services breadcrumb and the Evaluation Partner card link the
// two pages to each other.
const site = siteContext(false);
const PAGES = ["/services/", "/services/evaluation-partner/"];
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`the production Services pages have no axe violations at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    for (const path of PAGES) {
      expect((await page.goto(path)).status(), path).toBe(200);
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations, path).toEqual([]);
    }
  });
}

test("/services/: the Fit Call CTA and closing prompt follow the production site context, and the method link waits for its page", async ({ page }) => {
  await page.goto("/services/");
  const hero = page.locator("[data-page-hero]");
  await expect(hero.getByRole("link", { name: "Talk to us about a Fit Call" })).toHaveAttribute("href", site.contact({ interest: "not-sure" }));
  await expect(hero.getByRole("link", { name: "Read the evaluation method" })).toHaveCount(site.page("evaluationMethod").href === null ? 0 : 1);
  await expect(page.locator("#contact").getByRole("link")).toHaveAttribute("href", site.contact({ interest: "not-sure" }));
});

test("/services/evaluation-partner/: the workstream CTA follows the production site context, and the breadcrumb leads to Services", async ({ page }) => {
  await page.goto("/services/evaluation-partner/");
  const hero = page.locator("[data-page-hero]");
  await expect(hero.getByRole("link", { name: "Discuss an evaluation workstream" })).toHaveAttribute("href", site.contact({ interest: "evaluation-partner" }));
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.getByRole("link")).toHaveText(["Home", "Services"]);
  await crumbs.getByRole("link", { name: "Services" }).click();
  await expect(page).toHaveURL(/\/services\/$/);
  await page.locator('[data-service="evaluation-partner"]').getByRole("link", { name: "Evaluation Partner" }).click();
  await expect(page).toHaveURL(/\/services\/evaluation-partner\/$/);
  await expect(page.locator("main h1")).toHaveText(SERVICES.evaluationPartner.promise);
});
