import { test, expect } from "@playwright/test";
import { moved, tabsBeforeAndAfter } from "../support/first-paint.mjs";

// BR-4 (spec §11.4, CLS under 0.05) on the production build: every tab group paints in its
// enhanced layout before src/scripts/tabs.ts runs, so nothing moves when it does. ④ AI
// Evaluation's six package names and Real estate's workflow stages wrap onto several rows of tabs,
// which the first-paint tablist has to match; the Solutions hub's switcher fits on one.
const PAGES = ["/solutions/ai-evaluation/", "/industries/real-estate/", "/solutions/"];
const WIDTHS = [1280, 768, 390];

for (const path of PAGES) {
  for (const width of WIDTHS) {
    test(`${path} at ${width}px: nothing moves when tabs.ts runs (BR-4)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const { before, after } = await tabsBeforeAndAfter(page, path);
      expect(before.length, `${path} has no tab group`).toBeGreaterThan(0);
      expect(before.filter((g) => g.enhanced).map((g) => g.id), "tabs.ts ran before its chunk was held").toEqual([]);
      expect(moved(before, after)).toEqual([]);
    });
  }
}

test("/solutions/ai-evaluation/ at 768px: the tabs wrap onto more than one row, the case the first-paint tablist must match", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/solutions/ai-evaluation/");
  const list = page.locator("#ai-evaluation-packages [role=tablist]");
  await expect(list).toBeVisible();
  // One row of tabs is 44px.
  expect((await list.boundingBox()).height).toBeGreaterThan(66);
});
