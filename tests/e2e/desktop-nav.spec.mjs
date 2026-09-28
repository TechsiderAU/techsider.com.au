import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

test("a disclosure opens from the keyboard; Esc closes it and returns focus", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Solutions menu" });
  const panel = page.locator("#nav-panel-solutions");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(panel).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(panel.getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("Space toggles too, and only one panel is open at a time", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Solutions menu" }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#nav-panel-solutions")).toBeVisible();
  await page.getByRole("button", { name: "Industries menu" }).click();
  await expect(page.locator("#nav-panel-industries")).toBeVisible();
  await expect(page.locator("#nav-panel-solutions")).toBeHidden();
  await expect(page.locator("#nav-panel-industries").getByRole("link")).toHaveCount(10); // 9 industries + "All industries →"
});

test("an outside click closes the open panel", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Resources menu" }).click();
  await expect(page.locator("#nav-panel-resources")).toBeVisible();
  await page.locator("main").click({ position: { x: 20, y: 300 } });
  await expect(page.locator("#nav-panel-resources")).toBeHidden();
});

test("focus leaving the panel closes it", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "About menu" });
  const panel = page.locator("#nav-panel-about");
  await toggle.focus();
  await page.keyboard.press("Enter");
  const links = await panel.getByRole("link").count();
  for (let i = 0; i <= links; i++) await page.keyboard.press("Tab");
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("top-level labels are real links to their hubs", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-site-nav]").getByRole("link", { name: "Solutions", exact: true })).toHaveAttribute("href", "/solutions/");
});

test("toggle buttons are at least 44px", async ({ page }) => {
  await page.goto("/");
  const box = await page.getByRole("button", { name: "Solutions menu" }).boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test("without JavaScript the toggles stay hidden and the basic link row shows", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.locator("[data-nav-toggle]").first()).toBeHidden();
  const basic = page.getByRole("navigation", { name: "Main (basic)" });
  await expect(basic).toBeVisible();
  await expect(basic.getByRole("link", { name: "Solutions" })).toHaveAttribute("href", "/solutions/");
  await ctx.close();
});
