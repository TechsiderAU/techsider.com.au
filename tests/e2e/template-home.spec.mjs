import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { focusKeys } from "../support/keys.mjs";
import { homeFixture, traceFixtures } from "../../src/fixtures/index.ts";

// The Home template (spec §8.1) on the preview gallery, built from every fixture set.
// /preview/templates/home/ is built at FIXTURE_NOW (latest insights as cards);
// /preview/templates/home-stale-insights/ at FIXTURE_STALE_NOW (only the "All insights" link).
const HOME = "/preview/templates/home/";
const STALE = "/preview/templates/home-stale-insights/";
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
// The spec §7.1 Home anchors, which the header CTA (/#demo) and older inbound links rely on.
const ANCHORS = ["services", "approach", "industries", "demo", "insights", "faq", "contact"];
const ACID = "rgb(200, 255, 46)";
// The secondary-text tokens of the spec §6.1 pairs: muted on carbon, muted-dark on bone.
const MUTED = "rgb(154, 154, 148)";
const MUTED_DARK = "rgb(92, 91, 85)";

const axe = (page) => new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const heroTrace = traceFixtures[homeFixture.heroTrace];
const lineText = (l) => [l.t, l.op, l.detail, l.metric ? `${l.metric.value}${l.metric.unit ?? ""}` : ""].filter(Boolean).join(" ");

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

for (const path of [HOME, STALE]) {
  test(`${path} has no horizontal scroll at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(path);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });
}

test("the H1 reads 'AI that ships.', shows in display caps, and highlights 'ships' in lime", async ({ page }) => {
  await page.goto(HOME);
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveAccessibleName("AI that ships.");
  expect(await h1.evaluate((el) => getComputedStyle(el).textTransform)).toBe("uppercase");
  const hl = h1.locator(".hl");
  await expect(hl).toHaveText("ships");
  expect(await hl.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(ACID);
  // The proof line sits directly under the H1 (spec §6.3).
  await expect(page.locator("[data-page-hero] h1 + p")).toHaveText("Measured before it ships.");
});

test("the hero trace shows, is hidden from assistive technology, and its lines are exposed once as static text", async ({ page }) => {
  await page.goto(HOME);
  const hero = page.locator("[data-page-hero]");
  await expect(hero.locator("[data-hero-trace] [data-trace-panel]")).toBeVisible();
  const tree = await hero.ariaSnapshot();
  expect(tree).not.toContain("figure");
  expect(tree).toContain(`${heroTrace.title} (Illustrative trace)`);
  for (const line of heroTrace.lines) {
    expect(tree.split(lineText(line)).length - 1, lineText(line)).toBe(1);
  }
});

test("keyboard: from the last hero CTA, the next Tab skips the decorative trace and reaches the first industry chip", async ({ page, browserName }) => {
  const keys = focusKeys(browserName);
  await page.setViewportSize(WIDE);
  await page.goto(HOME);
  await page.locator("[data-page-hero]").getByRole("link", { name: "See a demo" }).focus();
  await page.keyboard.press(keys.next);
  await expect(page.locator("#switcher a").first()).toBeFocused();
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

test("every link the Home template draws itself is a 44px tap target at 390px, underlined in its surface's token pair", async ({ page }) => {
  await page.setViewportSize(NARROW);
  await page.goto(HOME);
  const links = page.locator(
    "#switcher a, .home-solution-link, [data-all-demos], [data-partner-line] a, [data-all-insights]",
  );
  // 8 shown industry chips (fixture-industry-9 is plain text), 5 solution rows, All demos, the partner line, All insights.
  await expect(links).toHaveCount(16);
  for (const link of await links.all()) {
    const box = await link.boundingBox();
    expect(box.height, await link.textContent()).toBeGreaterThanOrEqual(44);
  }
  // "All demos" sits on the carbon demo band, so its underline is muted (7.0:1), never the
  // bone-only muted-dark (2.9:1 on carbon); "All insights" on bone keeps muted-dark. Hover
  // still turns the underline to the link's own colour.
  const underline = (link) => link.evaluate((el) => getComputedStyle(el).textDecorationColor);
  const allDemos = page.locator("#demo [data-all-demos]");
  expect(await underline(allDemos)).toBe(MUTED);
  expect(await underline(page.locator("#insights [data-all-insights]"))).toBe(MUTED_DARK);
  await allDemos.hover();
  expect(await underline(allDemos)).toBe(await allDemos.evaluate((el) => getComputedStyle(el).color));
});
