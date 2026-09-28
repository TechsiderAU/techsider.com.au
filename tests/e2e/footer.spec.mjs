import { test, expect } from "@playwright/test";

// Spec §7.3 and Phase A carry-over B6: one "Footer" navigation landmark holds the five
// h2-headed columns; the positioning line, email and "Talk to us" CTA sit below them.
const COLUMNS = ["solutions", "industries", "services", "resources", "company"];

for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`the footer is one Footer landmark with the sign-off below its columns at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    const nav = footer.getByRole("navigation");
    await expect(nav).toHaveCount(1);
    await expect(nav).toHaveAccessibleName("Footer");
    const headings = nav.getByRole("heading", { level: 2 });
    await expect(headings).toHaveCount(COLUMNS.length);
    for (let i = 0; i < COLUMNS.length; i++) await expect(headings.nth(i)).toHaveAccessibleName(COLUMNS[i]);
    const navBox = await nav.boundingBox();
    const signOff = [
      footer.getByText("AI that ships."),
      footer.getByRole("link", { name: "admin@techsider.com.au" }),
      footer.getByRole("link", { name: "Talk to us" }),
    ];
    for (const item of signOff) {
      await expect(item).toBeVisible();
      const box = await item.boundingBox();
      expect(box.y, await item.textContent()).toBeGreaterThanOrEqual(navBox.y + navBox.height);
    }
  });
}
