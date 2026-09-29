import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PAGES } from "../../src/data/nav.ts";

// The live Solutions pages in the production build (Phase C Task 3; dist/ on port 4323, run by
// the prod-chromium project only). Spec §11.5 check 12 asks for axe on one solution page; this runs
// it on the hub and on all five, at both widths, plus 320px reflow and the package tabs on real
// content. tests/solutions-pages.test.mjs pins the markup.
const HUB = "/solutions/";
const SOLUTION_PAGES = PAGES.filter((p) => p.base === "/solutions/").map((p) => p.path);
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

async function open(page, path) {
  const response = await page.goto(path);
  expect(response.status(), path).toBe(200);
}

for (const vp of [NARROW, WIDE]) {
  test(`the Solutions hub and the five solution pages have no axe violations at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    for (const path of [HUB, ...SOLUTION_PAGES]) {
      await open(page, path);
      const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(results.violations, path).toEqual([]);
    }
  });
}

test("at 320px nothing on the Solutions pages scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of [HUB, ...SOLUTION_PAGES]) {
    await open(page, path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("② shows its two audience variants as the two package tabs, and a #package-id link selects one", async ({ page }) => {
  await page.setViewportSize(WIDE);
  await open(page, "/solutions/knowledge-assistant/#policy-procedure-assistant");
  const group = page.locator("#knowledge-assistant-packages[data-tabs]");
  await expect(group.getByRole("tab")).toHaveText(["SOP & Work-Instruction Assistant", "Policy & Procedure Assistant"]);
  await expect(page.locator("#policy-procedure-assistant-tab")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#policy-procedure-assistant-block")).toBeVisible();
  await expect(page.locator("#sop-work-instruction-assistant-block")).toBeHidden();
  // The generic package stays a full block above the tabs.
  await expect(page.locator("#one-manual-one-team")).toBeVisible();
});

test("④ titles its packages 'Engagements', lists six as tabs and publishes the independence policy", async ({ page }) => {
  await page.setViewportSize(WIDE);
  await open(page, "/solutions/ai-evaluation/");
  await expect(page.locator("#packages-heading")).toHaveText("Engagements");
  await expect(page.locator("#ai-evaluation-packages[data-tabs]").getByRole("tab")).toHaveCount(6);
  await expect(page.locator("#independence-heading")).toHaveText("Independence policy");
  await expect(page.locator("#independence li").first()).toBeVisible();
});

test("on the hub, a 'By buyer' package link lands on that package's tab", async ({ page }) => {
  await page.setViewportSize(WIDE);
  await open(page, HUB);
  await page.getByRole("tab", { name: "By buyer" }).click();
  await page.locator('[data-buyer-list="buyer-mid-market"]').getByRole("link", { name: "Management Agreement & Rent Roll Register" }).click();
  await expect(page).toHaveURL(/\/solutions\/document-registers\/#management-agreement-register$/);
  await expect(page.locator("#management-agreement-register-tab")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#management-agreement-register-block")).toBeInViewport();
});
