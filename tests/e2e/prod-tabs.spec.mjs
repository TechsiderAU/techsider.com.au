import { test, expect } from "@playwright/test";
import { moved, tabsBeforeAndAfter, TABS_CHUNK } from "../support/first-paint.mjs";

// BR-4 (spec §11.4, CLS under 0.05) on the production build: every tab group paints in its
// enhanced layout before src/scripts/tabs.ts runs, so nothing moves when it does. ④ AI
// Evaluation's six package names and Real estate's workflow stages wrap onto several rows of tabs,
// which the first-paint tablist has to match; the Solutions hub's switcher fits on one.
const PAGES = ["/solutions/ai-evaluation/", "/industries/real-estate/", "/solutions/"];
const WIDTHS = [1280, 768, 390];

test("tabs parsed after the fallback deadline stay readable while their module is still loading", async ({ page }) => {
  let releaseBody = () => {};
  let releaseTabs = () => {};
  const bodyHeld = new Promise((resolve) => { releaseBody = resolve; });
  const tabsHeld = new Promise((resolve) => { releaseTabs = resolve; });
  await page.route(TABS_CHUNK, async (route) => {
    await tabsHeld;
    await route.continue();
  });
  await page.route("**/delayed-tabs-body.js", async (route) => {
    await bodyHeld;
    await route.fulfill({ contentType: "application/javascript", body: "" });
  });
  await page.route("**/solutions/ai-evaluation/", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    expect(html).toContain('<div class="tabs"');
    await route.fulfill({ response, body: html.replace('<div class="tabs"', '<script src="/delayed-tabs-body.js"></script><div class="tabs"') });
  });
  try {
    await page.goto("/solutions/ai-evaluation/", { waitUntil: "commit" });
    await expect(page.locator('script[src="/delayed-tabs-body.js"]')).toBeAttached();
    expect(await page.locator("[data-tabs]").count()).toBe(0);
    // The head fallback expires while the parser is held before the first group.
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 3200)));
    releaseBody();
    const group = page.locator("#ai-evaluation-packages");
    await expect(group).toHaveAttribute("data-tabs-static", "");
    expect(await group.getAttribute("data-tabs-mode")).toBeNull();
    await page.locator("#packages details > summary").first().click();
    const panels = group.locator(":scope > [data-tab-panel]");
    expect(await panels.count()).toBeGreaterThan(1);
    for (const panel of await panels.all()) await expect(panel).toBeVisible();
    expect(await page.evaluate(() => document.readyState)).not.toBe("complete");
    releaseTabs();
    await expect(group).toHaveAttribute("data-tabs-mode", "tabs");
    await expect(group.locator("[role=tablist]")).toBeVisible();
  } finally {
    releaseBody();
    releaseTabs();
  }
});

for (const path of PAGES) {
  for (const width of WIDTHS) {
    test(`${path} at ${width}px: nothing moves when tabs.ts runs (BR-4)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const { before, after } = await tabsBeforeAndAfter(page, path, async () => {
        for (const detail of await page.locator("#packages > div details, #browse > div details").all()) {
          if ((await detail.getAttribute("open")) === null) await detail.locator(":scope > summary").click();
        }
      });
      expect(before.length, `${path} has no tab group`).toBeGreaterThan(0);
      for (const group of before) expect(group.height, group.id).toBeGreaterThan(0);
      expect(before.filter((g) => g.enhanced).map((g) => g.id), "tabs.ts ran before its chunk was held").toEqual([]);
      expect(moved(before, after)).toEqual([]);
    });
  }
}

test("/solutions/ai-evaluation/ at 768px: the tabs wrap onto more than one row, the case the first-paint tablist must match", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/solutions/ai-evaluation/");
  await page.locator("#packages details > summary").first().click();
  const list = page.locator("#ai-evaluation-packages [role=tablist]");
  await expect(list).toBeVisible();
  // One row of tabs is 44px.
  expect((await list.boundingBox()).height).toBeGreaterThan(66);
});
