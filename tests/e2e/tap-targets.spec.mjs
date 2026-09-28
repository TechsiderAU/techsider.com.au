import { test, expect } from "@playwright/test";

// Spec §6.6: tap targets of at least 44px, and at least 48px in the mobile menu.
// axe's target-size rule only enforces WCAG 2.5.8 (24px), so this pins the stricter floor.
// Every visible <a> and <button> in the scope must meet it in both dimensions.
// This also covers every desktop disclosure toggle (formerly one "toggle buttons are at least 44px" test).
const measure = (page, selector) =>
  page.evaluate((sel) => {
    const nameOf = (el) => {
      if (el.hasAttribute("aria-label")) return el.getAttribute("aria-label");
      const copy = el.cloneNode(true);
      copy.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
      return copy.textContent.replace(/\s+/g, " ").trim();
    };
    const out = [];
    for (const root of document.querySelectorAll(sel)) {
      for (const el of root.querySelectorAll("a, button")) {
        if (!el.checkVisibility({ checkVisibilityCSS: true })) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        out.push({ name: nameOf(el), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 });
      }
    }
    return out;
  }, selector);

// Soft assertions so one run lists every undersized target in every scope.
const checker = (page, seen) => async (selector, min) => {
  const targets = await measure(page, selector);
  seen.push(...targets.map((t) => t.name));
  expect.soft(targets.filter((t) => t.w < min || t.h < min), `${selector} (min ${min}px)`).toEqual([]);
};

const SECTIONS = ["Solutions", "Industries", "Services", "Resources", "About"];

test("header, footer and desktop panel targets are at least 44px at 1280", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const seen = [];
  const check = checker(page, seen);
  await check("header, footer", 44);
  const toggles = page.locator("[data-nav-toggle]");
  await expect(toggles).toHaveCount(SECTIONS.length);
  for (let i = 0; i < SECTIONS.length; i++) {
    await toggles.nth(i).click();
    await expect(page.locator("[data-nav-panel]:not([hidden])")).toHaveCount(1);
    await check("[data-nav-panel]:not([hidden])", 44);
  }
  // Guard against a vacuous pass: the logo, every toggle, both CTAs, panel links and footer links were measured.
  for (const name of ["Techsider home", ...SECTIONS.map((s) => `${s} menu`), "See a demo", "Talk to us", "Prove", "All industries", "Trust", "Privacy"]) {
    expect(seen, name).toContain(name);
  }
});

test("header and footer targets are at least 44px at 390, and 48px inside the menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const seen = [];
  const check = checker(page, seen);
  await check("header, footer", 44);
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await check("#site-menu", 48);
  const rows = page.locator("[data-menu-open-panel]");
  await expect(rows).toHaveCount(SECTIONS.length);
  for (let i = 0; i < SECTIONS.length; i++) {
    const id = await rows.nth(i).getAttribute("data-menu-open-panel");
    await rows.nth(i).click();
    await expect(page.locator(`[data-menu-panel="${id}"]`)).toBeVisible();
    await check("#site-menu", 48);
    await page.locator(`[data-menu-back="${id}"]`).click();
  }
  for (const name of ["Techsider home", "Menu", "Close menu", "Talk to us", "See a demo", "Back to menu", "All solutions", "Prove", "Trust"]) {
    expect(seen, name).toContain(name);
  }
});
