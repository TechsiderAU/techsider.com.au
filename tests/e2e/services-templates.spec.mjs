import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { focusKeys } from "../support/keys.mjs";
import { fixtureSite, servicesFixture } from "../../src/fixtures/index.ts";

// The Services and Evaluation Partner templates (spec §8.6) on the preview gallery, rendered from
// servicesFixture and fixtureSite. tests/services-templates.test.mjs pins the markup; this spec
// covers what needs a browser: the Prove → Build → Run layout, the phase anchors, keyboard focus,
// tap targets, axe at 390px and 1280px, and 320px reflow.
const SERVICES = "/preview/templates/services/";
const PARTNER = "/preview/templates/evaluation-partner/";
const PAGES = [SERVICES, PARTNER];
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
const PHASES = servicesFixture.phases.map((p) => p.id);
const ACID = "rgb(200, 255, 46)";
const CARBON = "rgb(11, 11, 12)";

const axe = (page) => new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
// Every test opens its page through open(), so a page that isn't built fails at once, not on a timeout.
async function open(page, url) {
  expect((await page.goto(url)).status(), url).toBe(200);
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// Presses the browser's focus key until `target` has focus (at most `max` presses).
async function tabTo(page, browserName, target, max = 60) {
  const { next } = focusKeys(browserName);
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press(next);
  }
  await expect(target).toBeFocused();
}
const ring = (page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return { visible: el.matches(":focus-visible"), style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor };
  });

for (const vp of [WIDE, NARROW]) {
  test(`services: a /services/#phase link lands on its phase, clear of the sticky header, at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    for (const id of PHASES) {
      await page.goto("about:blank"); // a fresh load each time: a same-page hash change returns no response
      await open(page, `${SERVICES}#${id}`);
      const heading = page.locator(`#${id}-heading`);
      await expect(heading).toBeInViewport();
      const header = await page.locator(".site-header").boundingBox();
      const box = await heading.boundingBox();
      expect(box.y, `#${id} sits under the header`).toBeGreaterThanOrEqual(header.y + header.height - 1);
    }
  });
}

test("services: at 1280px the phases form one row, left to right, with a connector in each gap", async ({ page }) => {
  await page.setViewportSize(WIDE);
  await open(page, SERVICES);
  const boxes = await Promise.all(PHASES.map((id) => page.locator(`#${id}`).boundingBox()));
  for (let i = 1; i < boxes.length; i++) {
    expect(Math.abs(boxes[i].y - boxes[0].y)).toBeLessThanOrEqual(1);
    expect(boxes[i].x).toBeGreaterThan(boxes[i - 1].x + boxes[i - 1].width);
  }
  const connectors = page.locator("[data-process-connector]");
  await expect(connectors).toHaveCount(PHASES.length - 1);
  for (let i = 0; i < PHASES.length - 1; i++) {
    const c = await connectors.nth(i).boundingBox();
    expect(c.x).toBeGreaterThanOrEqual(boxes[i].x + boxes[i].width - 1);
    expect(c.x + c.width).toBeLessThanOrEqual(boxes[i + 1].x + 1);
  }
});

test("services: at 390px the phases stack in order, with a connector between each pair", async ({ page }) => {
  await page.setViewportSize(NARROW);
  await open(page, SERVICES);
  const boxes = await Promise.all(PHASES.map((id) => page.locator(`#${id}`).boundingBox()));
  const connectors = page.locator("[data-process-connector]");
  for (let i = 1; i < boxes.length; i++) {
    const c = await connectors.nth(i - 1).boundingBox();
    expect(c.y).toBeGreaterThanOrEqual(boxes[i - 1].y + boxes[i - 1].height - 1);
    expect(c.y + c.height).toBeLessThanOrEqual(boxes[i].y + 1);
  }
});

test("services: the connectors are hidden from assistive technology, and the phases are named regions", async ({ page }) => {
  await open(page, SERVICES);
  for (const c of await page.locator("[data-process-connector]").all()) await expect(c).toHaveAttribute("aria-hidden", "true");
  for (const phase of servicesFixture.phases) {
    await expect(page.getByRole("region", { name: phase.name, exact: true })).toHaveAttribute("id", phase.id);
  }
});

test("services: the keyboard reaches the Fit Call CTA, then the method CTA, with a carbon ring on the light hero", async ({ page, browserName }) => {
  await open(page, SERVICES);
  const { next } = focusKeys(browserName);
  const hero = page.locator("[data-page-hero]");
  const fitCall = hero.getByRole("link", { name: "Talk to us about a Fit Call" });
  await tabTo(page, browserName, fitCall);
  expect(await ring(page)).toEqual({ visible: true, style: "solid", width: "2px", color: "rgb(11, 11, 12)" });
  await page.keyboard.press(next);
  await expect(hero.getByRole("link", { name: "Read the evaluation method" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`${fixtureSite.page("evaluationMethod").href}$`));
});

test("evaluation partner: the keyboard walks the breadcrumb to the one CTA, and a bone link shows a carbon ring", async ({ page, browserName }) => {
  await open(page, PARTNER);
  const { next } = focusKeys(browserName);
  const hero = page.locator("[data-page-hero]");
  const crumbs = hero.getByRole("navigation", { name: "Breadcrumb" });
  await tabTo(page, browserName, crumbs.getByRole("link", { name: "Home" }));
  await page.keyboard.press(next);
  await expect(crumbs.getByRole("link", { name: fixtureSite.page("services").label })).toBeFocused();
  await page.keyboard.press(next);
  await expect(hero.getByRole("link", { name: "Discuss an evaluation workstream" })).toBeFocused();
  expect(await ring(page)).toEqual({ visible: true, style: "solid", width: "2px", color: ACID });
  await tabTo(page, browserName, page.locator("#method").getByRole("link", { name: "Read the evaluation method" }));
  expect(await ring(page)).toEqual({ visible: true, style: "solid", width: "2px", color: CARBON });
});

for (const path of PAGES) {
  test(`${path}: every link and FAQ toggle in <main> is at least 44px square at 390px`, async ({ page }) => {
    await page.setViewportSize(NARROW);
    await open(page, path);
    const targets = page.locator("main a:visible, main summary:visible");
    expect(await targets.count()).toBeGreaterThan(0);
    for (const t of await targets.all()) {
      const box = await t.boundingBox();
      const name = (await t.textContent()).trim();
      expect(box.width, name).toBeGreaterThanOrEqual(44);
      expect(box.height, name).toBeGreaterThanOrEqual(44);
    }
  });

  test(`${path}: no horizontal scroll at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await open(page, path);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  for (const vp of [WIDE, NARROW]) {
    test(`${path}: no axe violations at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await open(page, path);
      expect((await axe(page).analyze()).violations).toEqual([]);
    });
  }
}
