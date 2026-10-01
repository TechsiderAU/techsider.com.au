import { test, expect } from "@playwright/test";

// Safari mouse-click anchors (Phase B2 carry-over NB-1). global.css scrolls smoothly only while
// focus is in the page (html:focus-within), and desktop Safari doesn't focus a link on a mouse
// click, so an in-page link clicked there used to jump. src/scripts/anchor-scroll.ts marks <html>
// with .anchor-scroll for the click's own scroll. Each test holds every engine to Safari's
// behaviour: a mousedown listener that prevents the default keeps focus off the link, so
// html:focus-within never matches and only the handler can make the scroll smooth. A window click
// listener runs after the handler's document listener and before the browser follows the link, so
// it reads the scroll-behavior the fragment navigation will use.
// The Government page's jump links (#designed-around) lead to its jurisdiction sections.
const PAGE = "/industries/government/";
const WIDE = { width: 1280, height: 800 };
const JUMP = '#designed-around a[href="#local"]';

/** Clicks `link` with the mouse without focusing it, as desktop Safari does; returns the root's scroll-behavior as the click is followed. */
async function clickLikeSafari(page, link) {
  await link.evaluate((a) => a.addEventListener("mousedown", (e) => e.preventDefault()));
  await page.evaluate(() => {
    window.addEventListener("click", () => {
      window.__clickBehaviour = getComputedStyle(document.documentElement).scrollBehavior;
    });
  });
  await link.click();
  return page.evaluate(() => window.__clickBehaviour);
}

test("a mouse click on an in-page link scrolls smoothly although the link takes no focus, as in Safari (NB-1)", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: WIDE, reducedMotion: "no-preference" });
  const page = await ctx.newPage();
  await page.goto(PAGE);
  const link = page.locator(JUMP);
  expect(await clickLikeSafari(page, link)).toBe("smooth");
  await expect(link).not.toBeFocused();
  await expect(page).toHaveURL(/#local$/);
  await expect(page.locator("#local")).toBeInViewport();
  // The mark lasts for the click's own scroll only, so a fragment in the URL on load still jumps.
  await expect(page.locator("html")).not.toHaveClass(/\banchor-scroll\b/, { timeout: 3_000 });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
  await ctx.close();
});

test("under prefers-reduced-motion the same click jumps", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: WIDE, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(PAGE);
  expect(await clickLikeSafari(page, page.locator(JUMP))).toBe("auto");
  await expect(page.locator("#local")).toBeInViewport();
  await ctx.close();
});

test("a modified click, and a click on a link to another page, leave the page unmarked", async ({ page }) => {
  await page.setViewportSize(WIDE);
  await page.goto(PAGE);
  // Record the mark as each click reaches the window, then cancel the click so the page stays.
  await page.evaluate(() => {
    window.__marks = [];
    window.addEventListener("click", (e) => {
      window.__marks.push(document.documentElement.classList.contains("anchor-scroll"));
      e.preventDefault();
    });
  });
  await page.locator(JUMP).click({ modifiers: ["Shift"] });
  await page.locator('main a[href="/industries/"]').first().click();
  expect(await page.evaluate(() => window.__marks)).toEqual([false, false]);
});
