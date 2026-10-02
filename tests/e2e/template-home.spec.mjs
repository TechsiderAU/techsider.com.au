import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { focusKeys } from "../support/keys.mjs";

// The Home template (spec §8.1) on the preview gallery, built from every fixture set.
// /preview/templates/home/ is built at FIXTURE_NOW (latest insights as cards);
// /preview/templates/home-stale-insights/ at FIXTURE_STALE_NOW (only the "All insights" link).
const HOME = "/preview/templates/home/";
const STALE = "/preview/templates/home-stale-insights/";
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
// The spec §7.1 Home anchors, which the header CTA (/#demo) and older inbound links rely on.
const ANCHORS = ["services", "approach", "industries", "demo", "insights", "faq", "contact"];
// The secondary-text tokens of the spec §6.1 pairs: muted on carbon, muted-dark on bone.

const axe = (page) => new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const vp of [WIDE, NARROW]) {
  for (const path of [HOME, STALE]) {
    test(`${path} has no axe violations at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto(path);
      expect((await axe(page).analyze()).violations).toEqual([]);
    });
  }

  test(`without JavaScript every Home anchor lands on its block at ${vp.width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: vp });
    for (const id of ANCHORS) {
      const page = await ctx.newPage();
      await page.goto(`${HOME}#${id}`);
      await expect(page.locator(`#${id}`)).toBeInViewport();
      await page.close();
    }
    await ctx.close();
  });
}

// WebKit smooth-scrolled to a load-time fragment and, when that scroll was interrupted, stayed at
// the top of the page (the anchor test above failed intermittently). global.css now turns smooth
// scrolling on only while focus is inside the page: a fragment in the URL jumps at once, and an
// in-page link someone activates still scrolls smoothly.
for (const javaScriptEnabled of [false, true]) {
  test(`smooth scrolling waits for focus in the page, so a Home fragment lands at once on load (JavaScript ${javaScriptEnabled ? "on" : "off"})`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled, viewport: WIDE, reducedMotion: "no-preference" });
    const page = await ctx.newPage();
    await page.goto(`${HOME}#faq`);
    const behaviour = () => page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
    expect(await behaviour()).toBe("auto");
    await expect(page.locator("#faq")).toBeInViewport();
    await page.locator("#contact a[href]").first().focus();
    expect(await behaviour()).toBe("smooth");
    await ctx.close();
  });
}

for (const path of [HOME, STALE]) {
  test(`${path} has no horizontal scroll at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(path);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
}

test("the business headline uses sentence case beside a labelled application concept",async({page})=>{
  await page.goto(HOME);
  await expect(page.getByRole("heading",{level:1})).toHaveAccessibleName("AI automation. Built for your business.");
  expect(await page.locator("h1").evaluate(el=>getComputedStyle(el).textTransform)).toBe("none");
  const hero=page.locator("[data-page-hero]");
  await expect(hero.locator("img")).toBeVisible();
  await expect(hero.getByText("Illustrative application concept")).toBeVisible();
});
test("keyboard reaches the hero animation pause control before the first capability",async({page,browserName})=>{
  await page.goto(HOME);
  await page.locator("[data-page-hero]").getByRole("link",{name:"Explore solutions"}).focus();
  await page.keyboard.press(focusKeys(browserName).next);
  await expect(page.locator("[data-workflow-toggle]").first()).toBeFocused();
  await page.keyboard.press(focusKeys(browserName).next);
  await expect(page.locator("#services [data-capability] a").first()).toBeFocused();
});

test("the latest insights show 3 cards while recent, and only the All insights link once stale", async ({ page }) => {
  await page.goto(HOME);
  await expect(page.locator('#insights [data-latest-insights="cards"] [data-insight-card]')).toHaveCount(3);
  await expect(page.locator("#insights").getByRole("link", { name: "All insights" })).toHaveAttribute("href", "/insights/");
  await page.goto(STALE);
  await expect(page.locator('#insights [data-latest-insights="link"]')).toBeVisible();
  await expect(page.locator("#insights [data-insight-card]")).toHaveCount(0);
  await expect(page.locator("#insights").getByRole("link", { name: "All insights" })).toBeVisible();
});

test("homepage calls to action are at least 44px high on mobile",async({page})=>{
  await page.setViewportSize(NARROW); await page.goto(HOME);
  const links=page.locator("[data-page-hero] a, #services a, #demo a, #contact a, [data-all-insights]");
  for(const link of await links.all()) expect((await link.boundingBox()).height,await link.textContent()).toBeGreaterThanOrEqual(44);
});
