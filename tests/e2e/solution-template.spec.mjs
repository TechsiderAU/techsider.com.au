import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { focusKeys } from "../support/keys.mjs";
import { fixtureSite, solutionFixtures } from "../../src/fixtures/index.ts";

// The solution template (spec §8.3) on its three gallery specimens. The package tabs are the B1
// Tabs component; this spec pins what the template adds: each tab panel's id is its package id, so
// a #<package-id> link lands on that package at every width, with or without JavaScript.
const PAGES = {
  "fixture-solution": "/preview/templates/solution/",
  "fixture-solution-4": "/preview/templates/solution-evaluation/",
  "fixture-solution-5": "/preview/templates/solution-switch-on/",
};
const ONE = "fixture-solution";
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
const launchOf = (id) => solutionFixtures[id].packages.filter((p) => p.status === "launch");
const LAUNCH = launchOf(ONE).map((p) => p.id);
const GENERIC = solutionFixtures[ONE].genericPackage.id;
const SHORT_NAME = fixtureSite.solutions.find((s) => s.id === ONE).shortName;
const group = (page) => page.locator(`#${ONE}-packages[data-tabs]`);
const axe = (page) => new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);

async function open(page, path) {
  const response = await page.goto(path);
    for (const detail of await page.locator("#browse > div details, #packages > div details").all()) { if ((await detail.getAttribute("open")) === null) await detail.locator(":scope > summary").click(); }
  expect(response.status(), path).toBe(200);
}

test("at 1280px the launch packages are tabs named after them, and the generic package stays a full block above", async ({ page, browserName }) => {
  await page.setViewportSize(WIDE);
  await open(page, PAGES[ONE]);
  await expect(group(page).getByRole("tablist", { name: `${SHORT_NAME} packages`, exact: true })).toHaveCount(1);
  const tabs = group(page).getByRole("tab");
  await expect(tabs).toHaveText(launchOf(ONE).map((p) => p.name));
  await expect(page.locator(`#${GENERIC}`)).toBeVisible();
  await expect(page.locator(`#${GENERIC}-heading`)).toBeVisible();
  await expect(group(page).locator(`#${GENERIC}`)).toHaveCount(0);
  // Inside a tab the package name is the tab itself: the block's h4 stays for screen readers only.
  expect((await page.locator(`#${LAUNCH[0]}-block-heading`).boundingBox()).width).toBeLessThanOrEqual(1);

  await tabs.nth(1).click();
  await expect(page).toHaveURL(new RegExp(`#${LAUNCH[1]}$`));
  await expect(page.locator(`#${LAUNCH[1]}-block`)).toBeVisible();
  await expect(page.locator(`#${LAUNCH[0]}-block`)).toBeHidden();

  await tabs.nth(1).focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Enter");
  await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(`#${LAUNCH[0]}-block`)).toBeVisible();
  // The selected tab is the only tab in the Tab order; the next stop is its panel.
  await page.keyboard.press(focusKeys(browserName).next);
  await expect(page.locator(`#${LAUNCH[0]}`)).toBeFocused();
});

for (const vp of [WIDE, NARROW]) {
  test(`a #package-id link on load shows that package at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    await open(page, `${PAGES[ONE]}#${LAUNCH[1]}`);
    if (vp === WIDE) {
      await expect(page.locator(`#${LAUNCH[1]}-tab`)).toHaveAttribute("aria-selected", "true");
      await expect(page.locator(`#${LAUNCH[0]}`)).toBeHidden();
    } else {
      await expect(page.locator(`#${LAUNCH[1]}-heading > button`)).toHaveAttribute("aria-expanded", "true");
    }
    await expect(page.locator(`#${LAUNCH[1]}-block`)).toBeVisible();
    await expect(page.locator(`#${LAUNCH[1]}-block`)).toBeInViewport();
  });
}

test("the processing note in a tab links to that package's onshore note and keeps the tab selected", async ({ page }) => {
  const offshore = launchOf(ONE).find((p) => !p.onshore);
  expect(offshore, "the ① fixture has a launch package that isn't onshore").toBeTruthy();
  await page.setViewportSize(WIDE);
  await open(page, `${PAGES[ONE]}#${offshore.id}`);
  await page.locator(`#${offshore.id}-block [data-processing-note] a`).click();
  await expect(page).toHaveURL(new RegExp(`#${offshore.id}-block-onshore-note$`));
  await expect(page.locator(`#${offshore.id}-tab`)).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(`#${offshore.id}-block-onshore-note`)).toBeInViewport();
});

for (const vp of [WIDE, NARROW]) {
  test(`without JavaScript every package is a visible stacked block, and #package-id lands on it, at ${vp.width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: vp });
    const page = await ctx.newPage();
    for (const [id, path] of Object.entries(PAGES)) {
      await open(page, path);
      await expect(page.getByRole("tablist")).toHaveCount(0);
      const blocks = page.locator("[data-package-tab]");
      await expect(blocks).toHaveCount(1 + launchOf(id).length);
      for (const block of await blocks.all()) await expect(block).toBeVisible();
      for (const p of launchOf(id)) {
        await expect(page.locator(`section#${p.id}[data-tab-panel]`).getByRole("heading", { level: 3 })).toHaveText(p.name);
      }
    }
    await open(page, `${PAGES[ONE]}#${LAUNCH[1]}`);
    await expect(page.locator(`#${LAUNCH[1]}`)).toBeInViewport();
    await ctx.close();
  });
}

// axe runs as page JavaScript, so the no-JS rendering is checked by serving the page with every
// script stripped (the no-js → js flip included), as tests/e2e/tabs.spec.mjs does.
test("the no-JavaScript rendering has no axe violations", async ({ page }) => {
  await page.route(`**${PAGES[ONE]}`, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, "");
    await route.fulfill({ response, body });
  });
  for (const vp of [WIDE, NARROW]) {
    await page.setViewportSize(vp);
    await open(page, PAGES[ONE]);
    await expect(page.locator("html")).toHaveClass(/\bno-js\b/);
    await expect(page.getByRole("tablist")).toHaveCount(0);
    expect((await axe(page).analyze()).violations).toEqual([]);
  }
});

for (const [id, path] of Object.entries(PAGES)) {
  for (const vp of [NARROW, WIDE]) {
    test(`${path} has no axe violations at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, path);
      await expect(page.locator('[data-template="solution"]')).toHaveCount(1);
      expect((await axe(page).analyze()).violations).toEqual([]);
      // With more than one launch package, check a second state: the last tab selected (1280px)
      // or the last accordion item open too (390px).
      if (launchOf(id).length > 1) {
        const packages = page.locator(`#${id}-packages[data-tabs]`);
        const control = vp === WIDE ? packages.getByRole("tab").last() : packages.locator(".tab-panel-heading > button").last();
        await control.click();
        expect((await axe(page).analyze()).violations).toEqual([]);
      }
    });
  }
}

test("no horizontal scroll at 320px, with every package accordion item open", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const path of Object.values(PAGES)) {
    await open(page, path);
    const closed = page.locator('.tab-panel-heading > button[aria-expanded="false"]');
    while ((await closed.count()) > 0) await closed.first().click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("every link and button in the template is at least 44px tall at 390px", async ({ page }) => {
  await page.setViewportSize(NARROW);
  for (const path of Object.values(PAGES)) {
    await open(page, path);
    const short = await page.locator('[data-template="solution"]').evaluate((root) =>
      [...root.querySelectorAll("a[href], button")]
        .filter((el) => el.getClientRects().length > 0)
        .map((el) => ({ text: el.textContent.trim(), height: Math.round(el.getBoundingClientRect().height) }))
        .filter((t) => t.height < 44),
    );
    expect(short, path).toEqual([]);
  }
});
