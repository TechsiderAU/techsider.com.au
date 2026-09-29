import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { platformAiFile } from "../../src/content/schemas.ts";
import { siteContext } from "../../src/lib/site.ts";
import { checkerView } from "../../src/lib/views/checker.ts";
import { EMPTY_STATUS } from "../../src/scripts/checker.ts";

// The checker's live page in the production build (dist/, prod-chromium only; spec §8.7): axe at
// 390px and 1280px and 320px with every vendor ticked, ①–③ landing on their live pages, no kit link
// while the Safe-Use Kits page is planned, and no request while it runs. tests/e2e/checker.spec.mjs
// covers the rest on the preview build; tests/e2e/prod-site-sweep.spec.mjs sweeps the page as loaded.
const PATH = "/resources/what-you-already-pay-for/";
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const FILE = platformAiFile.parse(JSON.parse(readFileSync(new URL("../../src/data/platform-ai.json", import.meta.url), "utf8")));
const VIEW = checkerView(FILE, siteContext(false));
const VENDORS = VIEW.vendors;
const box = (page, g) => page.locator(`[data-checker-vendor="${g.id}"]`);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test("with every vendor ticked: no axe violations at 390px and 1280px, and no sideways scroll at 320px", async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect((await page.goto(PATH)).status()).toBe(200);
    for (const g of VENDORS) await box(page, g).check();
    await expect(page.locator('[data-checker-section="processing"]')).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(WCAG).analyze()).violations, `${width}px`).toEqual([]);
  }
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(PATH);
  for (const g of VENDORS) await box(page, g).check();
  await expect(page.locator('[data-checker-section="processing"]')).toBeVisible();
  expect(await overflow(page), "320px").toBeLessThanOrEqual(0);
});

test("①–③ lead to their live solution pages, and a kit link shows only once the Safe-Use Kits page is live", async ({ page, request }) => {
  expect(VIEW.builds.every((b) => b.href !== null), "a solution page is planned").toBe(true);
  await page.goto(PATH);
  for (const g of VENDORS) await box(page, g).check();
  // view.kits is empty while /resources/safe-use-kits/ is planned, and the Safe-Use Kits block isn't rendered.
  await expect(page.locator('[data-checker-section="kits"]')).toHaveCount(VIEW.kits.length > 0 ? 1 : 0);
  await expect(page.locator("[data-checker-kit]")).toHaveCount(VIEW.kits.length);
  const links = page.locator('[data-checker-section="build"]').getByRole("link");
  await expect(links).toHaveText(VIEW.builds.map((b) => `${b.number} ${b.name}`));
  for (const b of VIEW.builds) expect((await request.get(b.href)).status(), b.href).toBe(200);
  await links.first().click();
  await expect(page).toHaveURL(new RegExp(`${escapeRe(VIEW.builds[0].href)}$`));
});

test("nothing leaves the page while the checker runs: no request but the site's own fonts", async ({ page }) => {
  await page.goto(PATH);
  await page.waitForLoadState("networkidle");
  const origin = new URL(page.url()).origin;
  const requests = [];
  page.on("request", (r) => requests.push({ url: r.url(), type: r.resourceType() }));
  for (const g of VENDORS) await box(page, g).check();
  for (const g of VENDORS) await box(page, g).uncheck();
  await expect(page.locator("[data-checker-status]")).toHaveText(EMPTY_STATUS);
  expect(requests.filter((r) => r.type !== "font" || new URL(r.url).origin !== origin)).toEqual([]);
});
