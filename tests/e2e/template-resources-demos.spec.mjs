import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { focusKeys } from "../support/keys.mjs";
import { demoFixture, kitFixture, pendingKitFixture } from "../../src/fixtures/index.ts";
import { CHECKER_BADGE, DEMO_BADGE, KIT_PENDING_NOTE, REPORT_BADGE } from "../../src/lib/fixed-copy.ts";

// The resources and demos templates (spec §8.7, §8.8) on the preview gallery: axe at 390px and
// 1280px, no horizontal scroll at 320px, 44px targets, visible focus, the badges, the kit review
// states, and the static transcripts and the checker's fallback without JavaScript.
// tests/template-resources-demos.test.mjs checks the markup contract.
const KINDS = ["resources-hub", "safe-use-kits", "pay-for", "evaluation-method", "demos-hub", "demo", "demo-report"];
const path = (kind) => `/preview/templates/${kind}/`;
const WCAG = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const SAMPLE_CAPTION = "Sample report: Techsider testing its own demo system, so not independent.";
const ACID = "rgb(200, 255, 46)";
const CARBON = "rgb(11, 11, 12)";

for (const kind of KINDS) {
  test(`${kind}: no axe violations at 390px and 1280px`, async ({ page }) => {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect((await page.goto(path(kind))).status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
      expect(violations, `${kind} at ${width}px`).toEqual([]);
    }
  });
}

test("no page scrolls sideways at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  for (const kind of KINDS) {
    expect((await page.goto(path(kind))).status(), kind).toBe(200);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, kind).toBeLessThanOrEqual(0);
  }
});

test("every link and button in the templates is at least 44px in both dimensions, at 390px and 1280px", async ({ page }) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const kind of KINDS) {
      await page.goto(path(kind));
      const { measured, small } = await page.evaluate(() => {
        const out = { measured: 0, small: [] };
        for (const el of document.querySelectorAll("[data-template] a, [data-template] button")) {
          if (!el.checkVisibility({ checkVisibilityCSS: true })) continue;
          const r = el.getBoundingClientRect();
          out.measured++;
          if (r.width < 44 || r.height < 44) out.small.push(`${el.textContent.trim()} (${Math.round(r.width)}×${Math.round(r.height)})`);
        }
        return out;
      });
      // Every page has at least its breadcrumb and its contact link, so a pass is never vacuous.
      expect(measured, `${kind} at ${width}px`).toBeGreaterThanOrEqual(2);
      expect.soft(small, `${kind} at ${width}px`).toEqual([]);
    }
  }
});

for (const width of [390, 1280]) {
  test(`the demo badge and the Illustrative data label are visible above the static transcript on both demo pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const kind of ["demo", "demo-report"]) {
      await page.goto(path(kind));
      const frame = page.locator("[data-demo-frame]");
      await expect(frame).toHaveCount(1);
      const badge = frame.locator("[data-demo-badge]");
      await expect(badge).toBeVisible();
      // Ledger ruling R4: the ④-like demo is a sample report, not a replay.
      await expect(badge).toHaveText(kind === "demo" ? DEMO_BADGE : REPORT_BADGE);
      // Both fixture demos are illustrative (spec §9.3): the frame's own label, not the ④ trace's.
      await expect(frame).toHaveAttribute("data-provenance", "illustrative");
      const label = frame.locator(":scope > [data-provenance-label]");
      await expect(label).toHaveText("Illustrative data");
      await expect(label).toBeVisible();
      // With JavaScript the register demo's replay can hold the transcript's place (Phase D Task 3), so
      // the engine slot is what shows under the badge there; the ④-like demo is static.
      const body = frame.locator(kind === "demo" ? "[data-demo-engine]" : "[data-demo-transcript]");
      await expect(body).toBeVisible();
      expect((await badge.boundingBox()).y, kind).toBeLessThan((await body.boundingBox()).y);
    }
  });

  test(`without JavaScript the static transcripts and the checker's fallback read in full at ${width}px`, async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(path("demo"));
    const frame = page.getByRole("figure", { name: demoFixture.title });
    await expect(frame.locator("[data-demo-badge]")).toBeVisible();
    // Each register is a table of its documents; tests/e2e/register-demo.spec.mjs checks its links, pages and downloads.
    for (const register of demoFixture.data.registers) {
      const table = frame.locator("[data-demo-transcript]").getByRole("table", { name: register.title });
      await expect(table).toBeVisible();
      await expect(table.getByRole("row")).toHaveCount(register.rows.length + 1);
    }
    await page.goto(path("demo-report"));
    await expect(page.locator("[data-demo-transcript] [data-trace-panel]")).toBeVisible();
    await expect(page.locator("#sample-report [data-sample-caption]")).toHaveText(SAMPLE_CAPTION);
    await expect(page.locator("#sample-report [data-sample-caption]")).toBeVisible();
    // The checker page's static view is its fallback slot, in #how-it-works.
    await page.goto(path("pay-for"));
    await expect(page.locator("#how-it-works").getByRole("table")).toBeVisible();
    await ctx.close();
  });
}

test("the Demos hub badges the checker as a client-side tool, the sample report as a report, and every other demo as a canned replay", async ({ page }) => {
  await page.goto(path("demos-hub"));
  await expect(page.locator("[data-page-hero] [data-hero-badge]")).toHaveCount(0);
  const meta = page.locator("#demos [data-demo-kind] .link-card-meta");
  await expect(meta).toHaveText([DEMO_BADGE, DEMO_BADGE, DEMO_BADGE, REPORT_BADGE, CHECKER_BADGE]);
  for (const el of await meta.all()) await expect(el).toBeVisible();
  await page.goto(path("pay-for"));
  await expect(page.locator("[data-page-hero] [data-hero-badge]")).toHaveText(CHECKER_BADGE);
  await expect(page.locator("[data-page-hero] [data-hero-badge]")).toBeVisible();
});

test("a reviewed kit offers its download; a pending kit shows the pending note and offers none", async ({ page }) => {
  await page.goto(path("safe-use-kits"));
  const reviewed = page.locator('[data-kit][data-kit-status="reviewed"]');
  const pending = page.locator('[data-kit][data-kit-status="pending"]');
  await expect(reviewed.getByRole("heading", { level: 3 })).toHaveText(kitFixture.title);
  const download = reviewed.getByRole("link", { name: /^Download / });
  await expect(download).toBeVisible();
  await expect(download).toHaveAttribute("href", kitFixture.download);
  await expect(download).toHaveAttribute("download", "");
  await expect(pending.getByRole("heading", { level: 3 })).toHaveText(pendingKitFixture.title);
  await expect(pending.locator("[data-notice]")).toHaveText(KIT_PENDING_NOTE);
  await expect(pending.locator("[data-notice]")).toBeVisible();
  await expect(pending.getByRole("link", { name: /download/i })).toHaveCount(0);
  await expect(page.locator(`a[href="${pendingKitFixture.download}"]`)).toHaveCount(0);
});

test("keyboard focus reaches the kit download with a carbon ring on bone, and the demo CTA with a lime ring on carbon", async ({ page, browserName }) => {
  const { next } = focusKeys(browserName);
  const tabTo = async (locator) => {
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press(next);
      if (await locator.evaluate((el) => el === document.activeElement)) return;
    }
    throw new Error("Tab never reached the target");
  };
  const ring = () => page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return { visible: el.matches(":focus-visible"), style: s.outlineStyle, color: s.outlineColor };
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(path("safe-use-kits"));
  await expect(page.locator("[data-kit-download]")).toHaveCount(1);
  await tabTo(page.locator("[data-kit-download]"));
  expect(await ring()).toEqual({ visible: true, style: "solid", color: CARBON });
  await page.goto(path("demo"));
  await expect(page.locator("#next [data-prompt-block] a")).toHaveCount(1);
  await tabTo(page.locator("#next [data-prompt-block] a"));
  expect(await ring()).toEqual({ visible: true, style: "solid", color: ACID });
});
