import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { focusKeys } from "../support/keys.mjs";
import { TABS_CHUNK, moved, tabsBeforeAndAfter } from "../support/first-paint.mjs";

// Tabs (spec §8.12) on /preview/tabs/: two independent groups built from the fixtures.
// "fixture-workflow" (on carbon) has the industry fixture's four workflow stages;
// "fixture-packages" (on bone) has the solution fixture's two launch packages, between its
// generic package and its on-request list (spec §8.3 block 4).
const PAGE = "/preview/tabs/";
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
const WORKFLOW = ["fixture-intake", "fixture-review", "fixture-approval", "fixture-reporting"];
const PACKAGES = ["fixture-launch-package", "fixture-second-launch-package"];
const PANELS = WORKFLOW.length + PACKAGES.length;
const ACID = "rgb(200, 255, 46)";
const CARBON = "rgb(11, 11, 12)";

const group = (page, id) => page.locator(`#${id}[data-tabs]`);
const tabsIn = (page, id) => group(page, id).getByRole("tab");
const togglesIn = (page, id) => group(page, id).locator(".tab-panel-heading > button");
const axe = (page) => new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);

// Exactly the named panel of a tab group is visible.
async function expectOnlyVisible(page, ids, visibleId) {
  for (const id of ids) await expect(page.locator(`#${id}`)).toBeVisible({ visible: id === visibleId });
}

// The focused element matches :focus-visible and draws a solid 2px ring in the given colour.
async function expectFocusRing(page, color) {
  const ring = await page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return { visible: el.matches(":focus-visible"), style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor };
  });
  expect(ring).toEqual({ visible: true, style: "solid", width: "2px", color });
}

for (const vp of [WIDE, NARROW]) {
  test(`without JavaScript the panels are stacked sections with readable ids and headings at ${vp.width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: vp });
    const page = await ctx.newPage();
    await page.goto(PAGE);
    await expect(page.locator("[data-tabs]")).toHaveCount(2);
    await expect(page.locator("[data-tab-panel]")).toHaveCount(PANELS);
    await expect(page.getByRole("tablist")).toHaveCount(0);
    for (const id of [...WORKFLOW, ...PACKAGES]) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
      const panel = page.locator(`section#${id}[data-tab-panel]`);
      await expect(panel).toBeVisible();
      const heading = panel.getByRole("heading", { level: 3 });
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText(await panel.getAttribute("data-tab-label"));
      await expect(page.getByRole("region", { name: await heading.textContent(), exact: true })).toHaveAttribute("id", id);
    }
    await ctx.close();
  });
}

// axe runs as page JavaScript, so it can't run with JavaScript disabled. Instead, serve the
// page with every script stripped (the no-js → js flip included): the same no-JS rendering.
test("the no-JavaScript rendering has no axe violations", async ({ page }) => {
  await page.route(`**${PAGE}`, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, "");
    await route.fulfill({ response, body });
  });
  for (const vp of [WIDE, NARROW]) {
    await page.setViewportSize(vp);
    await page.goto(PAGE);
    await expect(page.locator("html")).toHaveClass(/\bno-js\b/);
    await expect(page.locator("[data-tab-panel]")).toHaveCount(PANELS);
    await expect(page.getByRole("tablist")).toHaveCount(0);
    await expect(page.locator(".tab-panel-heading > button")).toHaveCount(0);
    expect((await axe(page).analyze()).violations).toEqual([]);
  }
});

// BR-4 (spec §11.4, CLS under 0.05): with JavaScript on, the page can paint before tabs.ts runs.
// The first paint already has the enhanced layout (from 768px the tablist over the first panel,
// below it the accordion with its first item open), so nothing moves when the script runs. 768px
// is tab mode at its narrowest.
for (const vp of [WIDE, { width: 768, height: 800 }, NARROW]) {
  test(`the first paint already has the enhanced layout, so nothing moves when tabs.ts runs, at ${vp.width}px (BR-4)`, async ({ page }) => {
    await page.setViewportSize(vp);
    const { before, after } = await tabsBeforeAndAfter(page, PAGE);
    expect(before.map((g) => [g.id, g.enhanced])).toEqual([["fixture-workflow", false], ["fixture-packages", false]]);
    expect(after.map((g) => g.enhanced)).toEqual([true, true]);
    expect(moved(before, after)).toEqual([]);
  });
}

// BR-4's way out (controller ruling 2): if the tabs chunk never loads, BaseLayout's inline fallback
// marks each group data-tabs-static at the load event, the first-paint rules stand down, and every
// panel reads in full as a stacked section, as it does without JavaScript.
for (const vp of [WIDE, { width: 768, height: 800 }, NARROW]) {
  test(`if the tabs chunk never loads, every panel and its content still show, at ${vp.width}px (BR-4 fallback)`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.route(TABS_CHUNK, (route) => route.abort());
    await page.goto(PAGE);
    await expect(page.locator("html")).toHaveClass(/\bjs\b/);
    await expect(page.locator("[data-tabs][data-tabs-static]")).toHaveCount(2);
    await expect(page.locator("[data-tabs][data-tabs-mode]")).toHaveCount(0);
    for (const skeleton of await page.locator("[data-tab-skeleton]").all()) await expect(skeleton).toBeHidden();
    const panels = page.locator("[data-tabs] > [data-tab-panel]");
    expect(await panels.count()).toBeGreaterThan(2);
    for (const panel of await panels.all()) {
      await expect(panel.locator(":scope > .tab-panel-heading")).toBeVisible();
      await expect(panel.locator(":scope > :not(.tab-panel-heading)").first()).toBeVisible();
    }
  });
}

// Spec §8.3 block 4, in the server-rendered markup that CI check 10 reads: the generic package
// first as a full block, then only the launch packages as tabs, then the on-request packages as
// one-line "On request" entries. The internal package never renders.
test("the packages specimen: generic package first, launch packages as tabs, on-request listed, internal never", async ({ page }) => {
  await page.goto(PAGE);
  const specimen = page.locator("[data-package-specimen]");
  const blocks = specimen.locator("[data-package-tab]");
  await expect(blocks).toHaveCount(1 + PACKAGES.length);
  for (const block of await blocks.all()) await expect(block).toHaveAttribute("data-package-status", "launch");
  await expect(blocks.first().getByRole("heading", { level: 3 })).toHaveText("Fixture Generic Package");
  const order = await specimen.evaluate((el) =>
    [...el.querySelectorAll(":scope > [data-package-tab], :scope > [data-tabs], :scope [data-package-status]:not([data-package-tab])")]
      .map((n) => (n.matches("[data-tabs]") ? "tabs" : n.getAttribute("data-package-status"))),
  );
  expect(order).toEqual(["launch", "tabs", "on-request"]);
  await expect(group(page, "fixture-packages").locator("[data-tab-panel]")).toHaveCount(PACKAGES.length);
  for (const id of PACKAGES) await expect(page.locator(`#${id} [data-package-tab]`)).toHaveCount(1);
  const onRequest = specimen.locator('[data-package-status="on-request"]');
  await expect(onRequest).toHaveCount(1);
  await expect(onRequest).toContainText("On request");
  await expect(onRequest.getByRole("link", { name: "Fixture On-Request Package" })).toHaveAttribute("href", "/preview/templates/contact/?interest=fixture-solution");
  await expect(page.locator('[data-package-status="internal"]')).toHaveCount(0);
  await expect(page.getByText("Fixture Internal Package")).toHaveCount(0);
});

test.describe("768px and up: tabs", () => {
  test.use({ viewport: WIDE });

  test("each group becomes a labelled tablist wired to its panels, with one panel shown", async ({ page }) => {
    await page.goto(PAGE);
    const groups = [
      ["fixture-workflow", WORKFLOW, "Fixture workflow stages"],
      ["fixture-packages", PACKAGES, "Fixture launch packages"],
    ];
    for (const [id, ids, label] of groups) {
      await expect(group(page, id).getByRole("tablist", { name: label, exact: true })).toHaveCount(1);
      const tabs = tabsIn(page, id);
      await expect(tabs).toHaveCount(ids.length);
      for (const [i, panelId] of ids.entries()) {
        const tab = tabs.nth(i);
        const panel = page.locator(`#${panelId}`);
        await expect(tab).toHaveAttribute("id", `${panelId}-tab`);
        await expect(tab).toHaveAttribute("aria-controls", panelId);
        await expect(tab).toHaveAttribute("aria-selected", i === 0 ? "true" : "false");
        await expect(tab).toHaveAttribute("tabindex", i === 0 ? "0" : "-1");
        await expect(tab).toHaveText(await panel.getAttribute("data-tab-label"));
        await expect(panel).toHaveAttribute("role", "tabpanel");
        await expect(panel).toHaveAttribute("aria-labelledby", `${panelId}-tab`);
        await expect(panel).toHaveAttribute("tabindex", "0");
        // The in-panel heading stays for screen readers but is visually hidden.
        await expect(panel.locator("h3")).toHaveClass(/\bsr-only\b/);
      }
      await expectOnlyVisible(page, ids, ids[0]);
      const shown = page.getByRole("tabpanel", { name: await tabs.first().textContent(), exact: true });
      await expect(shown).toBeVisible();
      expect((await shown.locator("h3").boundingBox()).width).toBeLessThanOrEqual(1);
    }
  });

  test("arrow keys wrap and Home/End jump without selecting; Enter and Space select", async ({ page, browserName }) => {
    await page.goto(PAGE);
    const tabs = tabsIn(page, "fixture-workflow");
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true"); // manual activation
    await expectOnlyVisible(page, WORKFLOW, WORKFLOW[0]);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.nth(3)).toBeFocused(); // wrapped from the first to the last
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(0)).toBeFocused(); // wrapped from the last to the first
    await page.keyboard.press("End");
    await expect(tabs.nth(3)).toBeFocused();
    await expect(tabs.nth(3)).toHaveAttribute("aria-selected", "false"); // End moves focus only
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expectOnlyVisible(page, WORKFLOW, WORKFLOW[0]);
    await page.keyboard.press("ArrowLeft"); // off the first tab, so Home has somewhere to jump from
    await page.keyboard.press("Home");
    await expect(tabs.nth(0)).toBeFocused();
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "false"); // Home moves focus only
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "true");
    await expectOnlyVisible(page, WORKFLOW, WORKFLOW[0]);

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(1)).toHaveAttribute("tabindex", "0");
    await expect(tabs.nth(0)).toHaveAttribute("aria-selected", "false");
    await expect(tabs.nth(0)).toHaveAttribute("tabindex", "-1");
    await expectOnlyVisible(page, WORKFLOW, WORKFLOW[1]);

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Space");
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expectOnlyVisible(page, WORKFLOW, WORKFLOW[2]);

    // Only the selected tab is in the Tab order: Tab moves on to its panel, Shift+Tab comes back.
    await page.keyboard.press(focusKeys(browserName).next);
    await expect(page.locator(`#${WORKFLOW[2]}`)).toBeFocused();
    await page.keyboard.press(focusKeys(browserName).prev);
    await expect(tabs.nth(2)).toBeFocused();
  });

  test("a click selects, and the URL hash follows without adding history entries", async ({ page }) => {
    await page.goto(PAGE);
    const before = await page.evaluate(() => history.length);
    await tabsIn(page, "fixture-workflow").nth(2).click();
    await expect(page).toHaveURL(new RegExp(`#${WORKFLOW[2]}$`));
    await expectOnlyVisible(page, WORKFLOW, WORKFLOW[2]);
    await tabsIn(page, "fixture-packages").nth(1).click();
    await expect(page).toHaveURL(new RegExp(`#${PACKAGES[1]}$`));
    await expectOnlyVisible(page, PACKAGES, PACKAGES[1]);
    // The groups are independent: selecting in one leaves the other alone.
    await expectOnlyVisible(page, WORKFLOW, WORKFLOW[2]);
    expect(await page.evaluate(() => history.length)).toBe(before);
  });

  test("a hash on load selects its tab, in its own group only", async ({ page }) => {
    await page.goto(`${PAGE}#${PACKAGES[1]}`);
    await expect(tabsIn(page, "fixture-packages").nth(1)).toHaveAttribute("aria-selected", "true");
    await expectOnlyVisible(page, PACKAGES, PACKAGES[1]);
    await expectOnlyVisible(page, WORKFLOW, WORKFLOW[0]);
  });

  // The script collapses the stacked sections; the browser then scrolls to the hash itself, after
  // the load event, landing on the panel; the web fonts load after that; and the script reveals
  // the panel once the page has settled. The tablist above the panel must end up in view, clear
  // of the sticky header. Reduced motion makes every scroll instant, so once the fonts are in,
  // the final position is the one that stops changing.
  test.describe(() => {
    test.use({ reducedMotion: "reduce" });

    test("a hash on load scrolls its group's tablist into view, below the sticky header", async ({ page }) => {
      await page.goto(`${PAGE}#${PACKAGES[1]}`);
      await expect(tabsIn(page, "fixture-packages").nth(1)).toHaveAttribute("aria-selected", "true");
      // The tablist's top edge minus the sticky header's bottom edge.
      const gap = () =>
        page.evaluate(() => {
          const list = document.querySelector("#fixture-packages [role=tablist]").getBoundingClientRect();
          return Math.round(list.top - document.querySelector("body > header").getBoundingClientRect().bottom);
        });
      // NaN (so the poll retries) until two readings 150ms apart agree.
      const settled = async () => {
        const a = await gap();
        await page.waitForTimeout(150);
        const b = await gap();
        return a === b ? b : NaN;
      };
      await page.evaluate(() => document.fonts.ready);
      await expect.poll(settled).toBeGreaterThanOrEqual(0);
      await expect(group(page, "fixture-packages").getByRole("tablist")).toBeInViewport({ ratio: 1 });
    });
  });

  test("a hash naming an element inside a panel selects that panel", async ({ page }) => {
    await page.goto(`${PAGE}#${WORKFLOW[1]}-heading`);
    await expect(tabsIn(page, "fixture-workflow").nth(1)).toHaveAttribute("aria-selected", "true");
    await expectOnlyVisible(page, WORKFLOW, WORKFLOW[1]);
  });

  test("an in-page link to another panel selects it (hashchange)", async ({ page }) => {
    await page.goto(PAGE);
    await tabsIn(page, "fixture-workflow").nth(1).click();
    await page.locator(`#${WORKFLOW[1]}`).getByRole("link", { name: /^Next stage:/ }).click();
    await expect(page).toHaveURL(new RegExp(`#${WORKFLOW[2]}$`));
    await expect(tabsIn(page, "fixture-workflow").nth(2)).toHaveAttribute("aria-selected", "true");
    await expectOnlyVisible(page, WORKFLOW, WORKFLOW[2]);
  });

  test("activating an in-panel link from the keyboard hands focus to the panel it selects, not to <body>", async ({ page }) => {
    await page.goto(PAGE);
    await tabsIn(page, "fixture-workflow").nth(1).click();
    const next = page.locator(`#${WORKFLOW[1]}`).getByRole("link", { name: /^Next stage:/ });
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`#${WORKFLOW[2]}$`));
    await expectOnlyVisible(page, WORKFLOW, WORKFLOW[2]);
    // The link's own panel is hidden now, so focus moves into the panel the link selected.
    await expect(page.locator(`#${WORKFLOW[2]}`)).toBeFocused();
    expect(await page.evaluate(() => document.activeElement?.id)).toBe(WORKFLOW[2]);
  });

  test("tabs are at least 44px tall and show a visible focus ring on carbon and on bone", async ({ page, browserName }) => {
    await page.goto(PAGE);
    const heights = await page.getByRole("tab").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    expect(heights).toHaveLength(PANELS);
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
    await tabsIn(page, "fixture-workflow").first().focus();
    await page.keyboard.press("ArrowRight");
    await expectFocusRing(page, ACID);
    await page.keyboard.press(focusKeys(browserName).next); // on to the selected tab's panel (tabindex 0)
    await expect(page.locator(`#${WORKFLOW[0]}`)).toBeFocused();
    await expectFocusRing(page, ACID);
    await tabsIn(page, "fixture-packages").first().focus();
    await page.keyboard.press("ArrowRight");
    await expectFocusRing(page, CARBON);
  });

  test("tab mode has no axe violations", async ({ page }) => {
    await page.goto(PAGE);
    expect((await axe(page).analyze()).violations).toEqual([]);
    await tabsIn(page, "fixture-packages").nth(1).click();
    expect((await axe(page).analyze()).violations).toEqual([]);
  });
});

test.describe("below 768px: accordion", () => {
  test.use({ viewport: NARROW });

  test("each heading gets a button; only the first item starts open, and several can be open", async ({ page }) => {
    await page.goto(PAGE);
    await expect(page.getByRole("tablist")).toHaveCount(0);
    for (const [id, ids] of [["fixture-workflow", WORKFLOW], ["fixture-packages", PACKAGES]]) {
      await expect(togglesIn(page, id)).toHaveCount(ids.length);
      for (const [i, panelId] of ids.entries()) {
        const toggle = page.locator(`#${panelId}-heading > button`);
        await expect(toggle).toHaveAttribute("aria-controls", `${panelId}-body`);
        await expect(toggle).toHaveAttribute("aria-expanded", i === 0 ? "true" : "false");
        await expect(page.locator(`#${panelId}-body`)).toBeVisible({ visible: i === 0 });
        await expect(page.locator(`#${panelId}`)).not.toHaveAttribute("role", "tabpanel");
      }
    }
    const toggles = togglesIn(page, "fixture-workflow");
    await toggles.nth(1).click();
    await expect(page).toHaveURL(new RegExp(`#${WORKFLOW[1]}$`));
    await expect(page.locator(`#${WORKFLOW[0]}-body`)).toBeVisible();
    await expect(page.locator(`#${WORKFLOW[1]}-body`)).toBeVisible();
    await toggles.nth(0).click();
    await expect(toggles.nth(0)).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(`#${WORKFLOW[0]}-body`)).toBeHidden();
    await expect(page.locator(`#${WORKFLOW[1]}-body`)).toBeVisible();
  });

  test("a hash on load opens its item instead of the first", async ({ page }) => {
    await page.goto(`${PAGE}#${WORKFLOW[2]}`);
    await expect(page.locator(`#${WORKFLOW[2]}-heading > button`)).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(`#${WORKFLOW[0]}-heading > button`)).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(`#${PACKAGES[0]}-heading > button`)).toHaveAttribute("aria-expanded", "true");
  });

  test("an in-page link to another item opens it (hashchange) and focus lands on that item's button", async ({ page }) => {
    await page.goto(PAGE);
    await page.locator(`#${WORKFLOW[0]}`).getByRole("link", { name: /^Next stage:/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`#${WORKFLOW[1]}$`));
    await expect(page.locator(`#${WORKFLOW[1]}-heading > button`)).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(`#${WORKFLOW[1]}-body`)).toBeVisible();
    await expect(page.locator(`#${WORKFLOW[0]}-body`)).toBeVisible(); // opening one never closes another
    // The target item's body was hidden, so the browser dropped focus; it goes to the item's button.
    await expect(page.locator(`#${WORKFLOW[1]}-heading > button`)).toBeFocused();
  });

  test("closing the current item moves the hash to the item that is still open, so its link works again", async ({ page }) => {
    await page.goto(PAGE);
    const toggles = togglesIn(page, "fixture-workflow");
    await toggles.nth(1).click(); // opens the second item: the hash names it
    await expect(page).toHaveURL(new RegExp(`#${WORKFLOW[1]}$`));
    await toggles.nth(1).click(); // closes it: the first item, still open, is current again
    await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(new RegExp(`#${WORKFLOW[0]}$`));
    // The first item's "Next stage" link points at the closed second item. With a stale hash
    // naming that item, the click changed nothing (no hashchange); now it opens the item again.
    await page.locator(`#${WORKFLOW[0]}`).getByRole("link", { name: /^Next stage:/ }).click();
    await expect(page).toHaveURL(new RegExp(`#${WORKFLOW[1]}$`));
    await expect(toggles.nth(1)).toHaveAttribute("aria-expanded", "true");
    // And a reload opens what the hash names: the current item, not a closed one.
    await toggles.nth(1).click();
    await page.reload();
    await expect(page.locator(`#${WORKFLOW[0]}-heading > button`)).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(`#${WORKFLOW[1]}-heading > button`)).toHaveAttribute("aria-expanded", "false");
  });

  test("accordion buttons are at least 44px tall and show a visible focus ring", async ({ page }) => {
    await page.goto(PAGE);
    const heights = await page.locator(".tab-panel-heading > button").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
    expect(heights).toHaveLength(PANELS);
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
    // Focused without a pointer, so :focus-visible applies (WebKit on macOS doesn't Tab to buttons by default).
    await togglesIn(page, "fixture-workflow").nth(1).focus();
    await expectFocusRing(page, ACID);
    await togglesIn(page, "fixture-packages").nth(1).focus();
    await expectFocusRing(page, CARBON);
  });

  test("accordion mode has no axe violations, collapsed or open", async ({ page }) => {
    await page.goto(PAGE);
    expect((await axe(page).analyze()).violations).toEqual([]);
    await togglesIn(page, "fixture-packages").nth(1).click();
    expect((await axe(page).analyze()).violations).toEqual([]);
  });

  test("no horizontal scroll at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(PAGE);
    await expect(page.locator(".tab-panel-heading > button")).toHaveCount(PANELS);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test("crossing 768px rebuilds the other mode without duplicates, keeping the selection and focus", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto(PAGE);
  await expect(page.getByRole("tablist")).toHaveCount(2); // 768px is already tab mode
  const tabs = tabsIn(page, "fixture-workflow");
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");

  for (let round = 0; round < 2; round++) {
    await page.setViewportSize({ width: 767, height: 800 });
    await expect(page.getByRole("tablist")).toHaveCount(0);
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.locator(".tab-panel-heading > button")).toHaveCount(PANELS);
    await expect(page.locator("[data-tab-body]")).toHaveCount(PANELS);
    await expect(page.locator("h3.sr-only")).toHaveCount(0);
    await expect(page.locator(`#${WORKFLOW[2]}-heading > button`)).toBeFocused();
    for (const id of WORKFLOW) {
      await expect(page.locator(`#${id}-heading > button`)).toHaveAttribute("aria-expanded", String(id === WORKFLOW[2]));
      await expect(page.locator(`#${id}`)).toHaveAttribute("aria-labelledby", `${id}-heading`);
    }

    await page.setViewportSize({ width: 768, height: 800 });
    await expect(page.getByRole("tablist")).toHaveCount(2);
    await expect(tabsIn(page, "fixture-workflow")).toHaveCount(WORKFLOW.length);
    await expect(tabsIn(page, "fixture-packages")).toHaveCount(PACKAGES.length);
    await expect(page.locator(".tab-panel-heading > button")).toHaveCount(0);
    await expect(page.locator("[data-tab-body]")).toHaveCount(PANELS);
    await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.nth(2)).toBeFocused();
    await expectOnlyVisible(page, WORKFLOW, WORKFLOW[2]);
  }
});

test("crossing 768px with focus on a tab panel keeps focus on that panel's control, both ways", async ({ page, browserName }) => {
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto(PAGE);
  const tabs = tabsIn(page, "fixture-workflow");
  await tabs.nth(1).click();
  await tabs.nth(1).focus();
  await page.keyboard.press(focusKeys(browserName).next); // on to the selected panel (tabindex 0)
  await expect(page.locator(`#${WORKFLOW[1]}`)).toBeFocused();
  await page.setViewportSize({ width: 767, height: 800 });
  await expect(page.locator(`#${WORKFLOW[1]}-heading > button`)).toBeFocused();
  await expect(page.locator(`#${WORKFLOW[1]}-heading > button`)).toHaveAttribute("aria-expanded", "true");
  await page.setViewportSize({ width: 768, height: 800 });
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
});

test("growing past 768px with focus inside an open item selects that item's tab and keeps focus", async ({ page }) => {
  await page.setViewportSize(NARROW);
  await page.goto(PAGE);
  await togglesIn(page, "fixture-workflow").nth(1).click(); // the second item opens; the first stays open
  const link = page.locator(`#${WORKFLOW[0]}`).getByRole("link");
  await link.focus();
  await page.setViewportSize(WIDE);
  await expect(tabsIn(page, "fixture-workflow").nth(0)).toHaveAttribute("aria-selected", "true");
  await expectOnlyVisible(page, WORKFLOW, WORKFLOW[0]);
  await expect(link).toBeFocused();
});

test("closing the current accordion item hands the selection to the open item before growing past 768px", async ({ page }) => {
  await page.setViewportSize(NARROW);
  await page.goto(PAGE);
  const toggles = togglesIn(page, "fixture-workflow");
  await toggles.nth(1).click(); // the second item opens; the first stays open
  await toggles.nth(2).click(); // the third opens and is now the current item
  await toggles.nth(2).click(); // ...and closes again
  await expect(toggles.nth(2)).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(tabsIn(page, "fixture-workflow").nth(1)).toHaveAttribute("aria-selected", "true");
  await expectOnlyVisible(page, WORKFLOW, WORKFLOW[1]);
});
