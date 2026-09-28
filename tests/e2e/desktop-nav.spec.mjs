import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

// The "All …" link at the foot of each panel: plain accessible name, arrow drawn aria-hidden.
const ALL = [
  ["solutions", "Solutions", "All solutions", "/solutions/"],
  ["industries", "Industries", "All industries", "/industries/"],
  ["services", "Services", "How we work", "/services/"],
  ["resources", "Resources", "All resources", "/resources/"],
  ["about", "About", "About Techsider", "/about/"],
];

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
  await expect(page.locator("#nav-panel-industries").getByRole("link")).toHaveCount(10); // 9 industries + "All industries"
});

test("Esc closes an open panel when focus is on <body> (Safari and Firefox leave it there after a click)", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Solutions menu" });
  const panel = page.locator("#nav-panel-solutions");
  await toggle.click();
  await expect(panel).toBeVisible();
  await page.evaluate(() => document.activeElement.blur());
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await expect(panel).toBeVisible(); // blurring to <body> doesn't close it by itself
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  // Focus wasn't inside the group, so Esc doesn't pull it to the toggle.
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
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

test("each panel's 'All …' link is named without the arrow, which still shows", async ({ page }) => {
  await page.goto("/");
  for (const [id, section, name, href] of ALL) {
    await page.getByRole("button", { name: `${section} menu` }).click();
    const panel = page.locator(`#nav-panel-${id}`);
    await expect(panel).toBeVisible();
    const all = panel.getByRole("link", { name, exact: true });
    await expect(all).toHaveAttribute("href", href);
    await expect(all).toContainText("→");
    await expect(panel.getByRole("link", { name: /→/ })).toHaveCount(0);
  }
});

// B2: at the narrowest desktop width no panel may leave the viewport. Headless browsers draw
// overlay scrollbars, so also leave room for a classic one (17px on Windows), which narrows the
// layout viewport while the 1024px media query still matches.
test("at 1024px every panel stays inside the viewport, with room for a classic scrollbar", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");
  for (const [id, section] of ALL) {
    await page.getByRole("button", { name: `${section} menu` }).click();
    const panel = page.locator(`#nav-panel-${id}`);
    await expect(panel).toBeVisible();
    const edges = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, clientWidth: document.documentElement.clientWidth, innerWidth: window.innerWidth };
    });
    expect(edges.left, `${id} panel left edge`).toBeGreaterThanOrEqual(0);
    expect(edges.right, `${id} panel right edge`).toBeLessThanOrEqual(edges.clientWidth);
    expect(edges.right, `${id} panel right edge, with a 17px classic scrollbar`).toBeLessThanOrEqual(edges.innerWidth - 17);
  }
});

test("top-level labels are real links to their hubs", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-site-nav]").getByRole("link", { name: "Solutions", exact: true })).toHaveAttribute("href", "/solutions/");
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
