import { test, expect } from "@playwright/test";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readFrontmatter } from "../../scripts/ci/lib.mjs";

// Phase C Task 8 (spec §8.5 block 9, §7.4, §10.1), in every browser: each industry page's related
// insights lead to a post about that industry, and the post's closing prompt leads to /contact/
// with the post's own context. tests/insights-content.test.mjs checks the same links in the markup.
const DIR = fileURLToPath(new URL("../../src/content/insights/", import.meta.url));
const INDUSTRIES = [
  ...new Set(
    readdirSync(DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => readFrontmatter(`${DIR}${f}`))
      .filter((fm) => fm.draft !== true)
      .flatMap((fm) => fm.industries ?? []),
  ),
].sort();

test("each industry's first related insight opens a post that names the industry and ends with a contact prompt", async ({ page }) => {
  test.setTimeout(60_000);
  expect(INDUSTRIES).toHaveLength(9);
  for (const id of INDUSTRIES) {
    await page.goto(`/industries/${id}/`);
    const link = page.locator("#insights [data-insight-card] a.insight-card-link").first();
    await expect(link, id).toBeVisible();
    const href = await link.getAttribute("href");
    await link.click();
    await expect(page, id).toHaveURL(new RegExp(`${href}$`));
    await expect(page.locator(`#post-industries a[href="/industries/${id}/"]`), id).toHaveCount(1);
    await expect(page.locator("[data-post-closing]").getByRole("link"), id).toHaveAttribute("href", /^\/contact\/\?(?:interest|industry)=[a-z-]+$/);
  }
});
