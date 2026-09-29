import { test, expect } from "@playwright/test";

// /resources/evaluation-method/ in the production build (dist/, prod-chromium only), live from
// Phase D Task 5: the published method, then the ④ sample report. The report is illustrative
// until a committed harness run replaces it (spec §9.1, §12 item 13), so its fixed caption and its
// illustrative label must be seen at every width, above the figures they qualify. The pages that
// offer the method now reach it. tests/e2e/prod-site-sweep.spec.mjs holds the page to axe at 390px
// and 1280px, to 320px with and without JavaScript, and to landing links;
// tests/evaluation-method.test.mjs checks its markup against the data.
const PATH = "/resources/evaluation-method/";
const CAPTION = "Sample report: Techsider testing its own demo system, so not independent.";
const LABEL = "Illustrative sample: not a real test run";

test("the Resources hub's Evaluation method card opens the page", async ({ page }) => {
  await page.goto("/resources/");
  await page.locator('[data-resource="evaluationMethod"]').getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`${PATH}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("How we test AI before you rely on it.");
});

test("the ④ solution page's method link lands on the page", async ({ page }) => {
  await page.goto("/solutions/ai-evaluation/");
  await page.locator("main").getByRole("link", { name: "Read the evaluation method" }).click();
  await expect(page).toHaveURL(new RegExp(`${PATH}$`));
  await expect(page.locator("#sample-report [data-sample-report]")).toHaveCount(1);
});

for (const width of [390, 1280]) {
  test(`at ${width}px the report's caption and illustrative label are visible, above its thresholds`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PATH);
    const report = page.locator("#sample-report [data-sample-report]");
    const caption = report.locator("[data-sample-caption]");
    const label = report.locator("[data-provenance-label]");
    await expect(caption).toHaveText(CAPTION);
    await expect(caption).toBeVisible();
    await expect(label).toHaveText(LABEL);
    await expect(label).toBeVisible();
    const thresholds = report.getByRole("table", { name: "Each threshold, its target and the result" });
    await expect(thresholds).toBeVisible();
    const labelBox = await label.boundingBox();
    const tableBox = await thresholds.boundingBox();
    expect(labelBox.y + labelBox.height).toBeLessThanOrEqual(tableBox.y);
  });
}
