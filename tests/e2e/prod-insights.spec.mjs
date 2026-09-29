import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The restyled Insights pages in the production build (dist/, prod-chromium only). From Phase C,
// /contact/ is live (Task 7) and every post names a solution or an industry (Task 8), so a post's
// §10.1 closing prompt names its first solution and leads to /contact/ with that interest. The
// breadcrumb leads back through the pages that are live: Home and Insights.
const POST = "/insights/evals-before-vibes/";
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
  test(`the production index and a post have no axe violations at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    for (const path of ["/insights/", POST]) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations, path).toEqual([]);
    }
  });
}

test("a post's closing prompt names its first solution and leads to /contact/, and its breadcrumb leads back to the index", async ({ page }) => {
  await page.goto(POST);
  const cta = page.locator("[data-post-closing]").getByRole("link");
  await expect(cta).toHaveCount(1);
  await expect(cta).toHaveAccessibleName("Talk to us about AI Evaluation");
  await expect(cta).toHaveAttribute("href", "/contact/?interest=ai-evaluation");
  const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(crumbs.getByRole("link")).toHaveText(["Home", "Insights"]);
  await expect(crumbs.locator('[aria-current="page"]')).toHaveText(await page.locator("h1").innerText());
  await crumbs.getByRole("link", { name: "Insights" }).click();
  await expect(page).toHaveURL(/\/insights\/$/);
  await expect(page.locator("h1")).toHaveText("Insights.");
});
