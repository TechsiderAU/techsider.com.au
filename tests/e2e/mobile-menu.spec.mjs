import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

const menuButton = (page) => page.getByRole("button", { name: "Menu", exact: true });
const inDialog = (page) => page.evaluate(() => document.getElementById("site-menu").contains(document.activeElement));

test("the menu opens as a modal dialog, locks scroll and traps focus", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-site-nav]")).toBeHidden();
  await menuButton(page).click();
  const dialog = page.locator("#site-menu");
  await expect(dialog).toBeVisible();
  await expect(menuButton(page)).toHaveAttribute("aria-expanded", "true");
  expect(await page.evaluate(() => document.documentElement.classList.contains("menu-open"))).toBe(true);
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    expect(await inDialog(page)).toBe(true);
  }
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await inDialog(page)).toBe(true);
  }
  // Clicking non-interactive content (the logo) leaves focus on the <dialog> itself;
  // Tab and Shift+Tab must still wrap inside the menu from there.
  const logo = page.locator("#site-menu .menu-bar img");
  for (const key of ["Shift+Tab", "Tab"]) {
    await logo.click();
    expect(await page.evaluate(() => document.activeElement.id)).toBe("site-menu");
    await page.keyboard.press(key);
    expect(await inDialog(page)).toBe(true);
    expect(await page.evaluate(() => document.activeElement.id)).not.toBe("site-menu");
  }
});

test("Esc closes the menu, unlocks scroll and returns focus to the menu button", async ({ page }) => {
  await page.goto("/");
  await menuButton(page).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#site-menu")).toBeHidden();
  await expect(menuButton(page)).toBeFocused();
  await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.documentElement.classList.contains("menu-open"))).toBe(false);
});

test("the close button closes the menu", async ({ page }) => {
  await page.goto("/");
  await menuButton(page).click();
  await page.getByRole("button", { name: "Close menu" }).click();
  await expect(page.locator("#site-menu")).toBeHidden();
});

test("drilling down focuses the panel heading; Back returns focus to the row", async ({ page }) => {
  await page.goto("/");
  await menuButton(page).click();
  const row = page.locator('[data-menu-open-panel="industries"]');
  await row.click();
  const panel = page.locator('[data-menu-panel="industries"]');
  await expect(panel).toBeVisible();
  await expect(page.locator("#menu-h-industries")).toBeFocused();
  await expect(panel.getByRole("link")).toHaveCount(10); // 9 industries + "All industries →"
  await expect(panel.locator(".menu-ctas")).toHaveCount(0); // sub-panels carry no CTAs
  await panel.getByRole("button", { name: /Back to menu/ }).click();
  await expect(panel).toBeHidden();
  await expect(row).toBeFocused();
});

test("on tall viewports the CTAs are pinned to the bottom", async ({ page }) => {
  await page.goto("/");
  await menuButton(page).click();
  const cta = await page.locator("[data-menu-root] .menu-ctas").boundingBox();
  expect(cta.y + cta.height).toBeGreaterThan(844 - 48);
});

test("on short viewports the CTAs follow the rows instead of pinning", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto("/");
  await menuButton(page).click();
  const lastRow = await page.locator("[data-menu-root] .menu-row").last().boundingBox();
  const cta = await page.locator("[data-menu-root] .menu-ctas").boundingBox();
  expect(cta.y - (lastRow.y + lastRow.height)).toBeLessThanOrEqual(48);
});

test("growing to desktop width closes the menu and unlocks scroll", async ({ page }) => {
  await page.goto("/");
  await menuButton(page).click();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator("#site-menu")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.classList.contains("menu-open"))).toBe(false);
});

test("following an in-page link closes the menu", async ({ page }) => {
  await page.goto("/");
  // Preview-build targets aren't built; stop navigation so we assert on this page, not a 404.
  await page.evaluate(() => document.addEventListener("click", (e) => { if (e.target.closest("a[href]")) e.preventDefault(); }, true));
  await menuButton(page).click();
  await page.locator('[data-menu-open-panel="services"]').click();
  await page.locator('[data-menu-panel="services"]').getByRole("link", { name: "Prove" }).click();
  await expect(page.locator("#site-menu")).toHaveCount(1);
  await expect(page.locator("#site-menu")).toBeHidden();
  await expect(menuButton(page)).toHaveAttribute("aria-expanded", "false");
});

test("without JavaScript the menu button stays hidden and the basic links show", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("[data-menu-open]")).toBeHidden();
  await expect(page.getByRole("navigation", { name: "Main (basic)" })).toBeVisible();
  await ctx.close();
});
