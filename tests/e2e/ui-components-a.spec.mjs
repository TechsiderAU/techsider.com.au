import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// The static components A on /preview/components/, rendered once on carbon and once inside .surface-bone.
const PAGE = "/preview/components/";
const GALLERY = '[data-gallery="static-a"]';
const on = (surface) => `${GALLERY}[data-gallery-surface="${surface}"]`;
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const ACID = "rgb(200, 255, 46)";
const ACID_DEEP = "rgb(74, 98, 0)";
const CARBON = "rgb(11, 11, 12)";
const BONE = "rgb(242, 241, 236)";
const axe = (page) => new AxeBuilder({ page }).include(GALLERY).withTags(TAGS);

for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`static components have no axe violations at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto(PAGE);
    expect((await axe(page).analyze()).violations).toEqual([]);
  });
}

test("FAQ items open from the keyboard, swap + for −, and stay axe-clean when open", async ({ page }) => {
  await page.goto(PAGE);
  for (const surface of ["carbon", "bone"]) {
    const item = page.locator(`${on(surface)} .faq details`).first();
    await expect(item.locator(".faq-answer")).toBeHidden();
    await expect(item.locator(".faq-plus")).toBeVisible();
    await expect(item.locator(".faq-minus")).toBeHidden();
    await item.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(item).toHaveAttribute("open", "");
    await expect(item.locator(".faq-answer")).toBeVisible();
    await expect(item.locator(".faq-minus")).toBeVisible();
    await expect(item.locator(".faq-plus")).toBeHidden();
  }
  expect((await axe(page).analyze()).violations).toEqual([]);
});

test("acid is never text on bone; brackets, carets and indicators follow the surface", async ({ page }) => {
  await page.goto(PAGE);
  // Every text node in the bone gallery, outside dark islands (.bg-carbon / .bg-graphite).
  const acidOnBone = await page.evaluate(
    ({ selector, acid }) => {
      const hits = [];
      const walk = document.createTreeWalker(document.querySelector(selector), NodeFilter.SHOW_TEXT);
      while (walk.nextNode()) {
        const node = walk.currentNode;
        const el = node.parentElement;
        if (!node.textContent.trim() || el.closest(".bg-carbon, .bg-graphite")) continue;
        if (getComputedStyle(el).color === acid) hits.push(node.textContent.trim());
      }
      return hits;
    },
    { selector: on("bone"), acid: ACID },
  );
  expect(acidOnBone).toEqual([]);

  const colour = (selector) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).color);
  for (const [surface, expected] of [["carbon", ACID], ["bone", ACID_DEEP]]) {
    expect(await colour(`${on(surface)} [data-bracket-chip] > span[aria-hidden="true"]`), surface).toBe(expected);
    expect(await colour(`${on(surface)} .section-prompt-caret`), surface).toBe(expected);
    expect(await colour(`${on(surface)} .faq-indicator`), surface).toBe(expected);
    // Dark islands are carbon-coloured again on either surface: PromptBlock (bg-carbon) and a
    // chip inside a bg-graphite box keep acid accents and bone text.
    expect(await colour(`${on(surface)} .prompt-caret`), surface).toBe(ACID);
    expect(await colour(`${on(surface)} .bg-graphite [data-bracket-chip] > span[aria-hidden="true"]`), surface).toBe(ACID);
    expect(await colour(`${on(surface)} .bg-graphite [data-bracket-chip]`), surface).toBe(BONE);
  }
});

test("focus rings follow the surface: lime on carbon, carbon on bone, lime in the PromptBlock island", async ({ page }) => {
  await page.goto(PAGE);
  await page.keyboard.press("Tab"); // keyboard modality, so programmatic focus shows :focus-visible
  const ring = async (selector) => {
    const el = page.locator(selector).first();
    await el.focus();
    return el.evaluate((e) => ({ visible: e.matches(":focus-visible"), color: getComputedStyle(e).outlineColor }));
  };
  expect(await ring(`${on("carbon")} a.bracket-chip`)).toEqual({ visible: true, color: ACID });
  expect(await ring(`${on("carbon")} .faq summary`)).toEqual({ visible: true, color: ACID });
  expect(await ring(`${on("bone")} a.bracket-chip`)).toEqual({ visible: true, color: CARBON });
  expect(await ring(`${on("bone")} nav[aria-label="Breadcrumb"] a`)).toEqual({ visible: true, color: CARBON });
  expect(await ring(`${on("bone")} .faq summary`)).toEqual({ visible: true, color: CARBON });
  expect(await ring(`${on("bone")} [data-prompt-block] a`)).toEqual({ visible: true, color: ACID });
});

test("every link and FAQ summary in the gallery is at least 44px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  const targets = await page.evaluate(
    (selector) =>
      [...document.querySelectorAll(`${selector} :is(a, summary)`)].map((el) => {
        const r = el.getBoundingClientRect();
        return { name: el.textContent.replace(/\s+/g, " ").trim(), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
      }),
    GALLERY,
  );
  // Per surface: 1 link chip, 2 breadcrumb links, 1 prompt link and at least 3 FAQ summaries.
  expect(targets.length).toBeGreaterThanOrEqual(2 * (1 + 2 + 1 + 3));
  expect(targets.filter((t) => t.w < 44 || t.h < 44)).toEqual([]);
});

test("PromptBlock is centred inside the content width, never full-bleed", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(PAGE);
  for (const surface of ["carbon", "bone"]) {
    const box = await page.locator(`${on(surface)} [data-prompt-block]`).evaluate((el) => {
      const r = el.getBoundingClientRect();
      const p = el.parentElement.getBoundingClientRect();
      return { width: r.width, left: r.left - p.left, right: p.right - r.right };
    });
    expect(box.width, surface).toBeLessThanOrEqual(768); // max-width 48rem
    expect(Math.abs(box.left - box.right), surface).toBeLessThanOrEqual(1);
  }
});

test("neither gallery overflows at 320px, and the page doesn't scroll sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(PAGE);
  for (const surface of ["carbon", "bone"]) {
    const overflow = await page.locator(on(surface)).evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow, surface).toBeLessThanOrEqual(0);
  }
  const page320 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(page320).toBeLessThanOrEqual(0);
});
