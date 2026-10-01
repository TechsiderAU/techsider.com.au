import { test, expect } from "@playwright/test";

// Phase D Task 7 in the production build (dist/ on port 4323, prod-chromium only): the demo pages
// and the solution heroes in a browser. tests/e2e/prod-site-sweep.spec.mjs already runs axe at 390px
// and 1280px, the 320px check and the link check over every page production builds, these included,
// and Tasks 2–4 pin the engine itself on the Home and the gallery. This spec pins placement: when
// each replay starts, spec §8.8's controls and focus in the solution heroes, reduced motion, what a
// frame shows without JavaScript, and where each demo link leads.
// tests/demos-pages.test.mjs pins the markup.
const REPLAYS = ["document-registers", "knowledge-assistant", "draft-for-approval"];
const ALL = [...REPLAYS, "ai-evaluation", "ai-switch-on"];
const WIDE = { width: 1280, height: 800 };
const CHECKER = "/resources/what-you-already-pay-for/";

async function open(page, path) {
  const response = await page.goto(path);
  expect(response.status(), path).toBe(200);
  if(path.startsWith("/solutions/") && !path.includes("#faq")) await page.locator(".solution-example > summary").click();
}
/**
 * How much a frame's polite log has announced. The engine writes the log from a run's first step
 * and nothing before it, so this reads 0 until a run starts, whether or not the stage is drawn early.
 */
const logged = (frame) => frame.locator("[data-demo-log]").evaluate((node) => (node.textContent ?? "").trim().length);

test.describe("with JavaScript", () => {
  test.use({ viewport: WIDE });

  test("a demo page starts its replay on load; a solution hero waits until its frame scrolls into view", async ({ page }) => {
    for (const id of REPLAYS) {
      await open(page, `/demos/${id}/`);
      const demoFrame = page.locator("[data-demo-frame]");
      await expect.poll(() => logged(demoFrame), { message: `/demos/${id}/ didn't start on load`, timeout: 10_000 }).toBeGreaterThan(0);

      // Opened at its FAQ, the solution page's hero is out of view, so its replay waits.
      await open(page, `/solutions/${id}/#faq`);
      const frame = page.locator("[data-demo-frame]");
      await expect(frame).not.toBeInViewport();
      await page.waitForTimeout(1_000);
      expect(await logged(frame), `/solutions/${id}/ started out of view`).toBe(0);
      await expect(frame.locator("[data-demo-stage]"), `/solutions/${id}/ shows its stage out of view`).toBeHidden();
      const disclosure=page.locator(".solution-example:not([open]) > summary");
      if(await disclosure.count()) await disclosure.click();
      await frame.scrollIntoViewIfNeeded();
      await expect.poll(() => logged(frame), { message: `/solutions/${id}/ didn't start in view`, timeout: 10_000 }).toBeGreaterThan(0);
    }
  });

  test("in each solution hero, a running replay offers Pause, Skip and Replay, and Skip from the keyboard leaves focus on Replay, never on <body>", async ({ page }) => {
    for (const id of REPLAYS) {
      await open(page, `/solutions/${id}/`);
      const frame = page.locator("[data-demo-frame]");
      const part = (name) => frame.locator(`[data-demo-${name}]`);
      await frame.scrollIntoViewIfNeeded();
      await expect.poll(() => logged(frame), { message: `/solutions/${id}/ didn't start`, timeout: 10_000 }).toBeGreaterThan(0);
      // Spec §8.8: Pause/Resume and Skip are there while it runs, and Replay is never the only control nor disabled mid-run.
      await expect(part("controls"), id).toBeVisible();
      for (const name of ["pause", "skip", "replay"]) await expect(part(name), `${id}: ${name}`).toBeEnabled();
      await part("skip").focus();
      await page.keyboard.press("Enter");
      await expect(part("transcript"), `${id}: Skip didn't show the result`).toBeVisible();
      await expect(part("stage"), id).toBeHidden();
      await expect(part("pause"), id).toBeDisabled();
      await expect(part("skip"), id).toBeDisabled();
      // Skip disabled the focused button, so focus moved to Replay rather than falling to <body>.
      await expect(part("replay"), `${id}: focus left the controls`).toBeFocused();
      expect(await page.evaluate(() => document.activeElement === document.body), `${id}: focus fell to <body>`).toBe(false);
      const lines = await part("log").locator(":scope > *").allTextContents();
      expect(new Set(lines).size, `${id}: the log repeats a line: ${lines.join(" | ")}`).toBe(lines.length);
    }
  });

  test("each solution hero's 'Try the demo' leads to its demo page", async ({ page }) => {
    for (const id of ALL) {
      await open(page, `/solutions/${id}/`);
      await page.locator("[data-page-hero]").getByRole("link", { name: "Try the demo" }).click();
      await expect(page).toHaveURL(new RegExp(`/demos/${id}/$`));
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("the Demos hub's five cards lead to the five demo pages", async ({ page }) => {
    await open(page, "/demos/");
    const links = page.locator("#demos [data-demo-kind]").getByRole("link");
    await expect(links).toHaveCount(ALL.length);
    expect(await links.evaluateAll((as) => as.map((a) => a.getAttribute("href")))).toEqual(ALL.map((id) => `/demos/${id}/`));
    await links.first().click();
    await expect(page).toHaveURL(/\/demos\/document-registers\/$/);
  });

  test("⑤: the hero's compact frame opens the full checker; the demo page embeds the checker and points search at the checker's page", async ({ page }) => {
    await open(page, "/solutions/ai-switch-on/");
    await page.locator("[data-demo-frame]").getByRole("link", { name: "Open the checker" }).click();
    await expect(page).toHaveURL(new RegExp(`${CHECKER}$`));
    await expect(page.locator("h1")).toHaveText("What you already pay for.");
    await open(page, "/demos/ai-switch-on/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://techsider.com.au${CHECKER}`);
    await expect(page.locator("[data-page-hero] [data-demo-engine] [data-checker-form]")).toBeVisible();
  });

  test("④: the frame's summary leads down to the sample report", async ({ page }) => {
    await open(page, "/demos/ai-evaluation/");
    await page.locator("[data-demo-frame]").getByRole("link", { name: "Read the sample report" }).click();
    await expect(page).toHaveURL(/#sample-report$/);
    await expect(page.locator("#sample-report [data-sample-report]")).toBeInViewport();
  });
});

test.describe("under reduced motion", () => {
  test.use({ viewport: WIDE });

  test("each replay shows its transcript at once, on its demo page and in its solution hero: no controls, no stage, nothing announced", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const id of REPLAYS) {
      for (const path of [`/demos/${id}/`, `/solutions/${id}/`]) {
        await open(page, path);
        const frame = page.locator("[data-demo-frame]");
        await frame.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1_500);
        await expect(frame.locator("[data-demo-transcript]"), path).toBeVisible();
        await expect(frame.locator("[data-demo-controls]"), path).toBeHidden();
        await expect(frame.locator("[data-demo-stage]"), path).toBeHidden();
        expect(await logged(frame), `${path}: a run started under reduced motion`).toBe(0);
      }
    }
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: WIDE });

  test("every frame reads in full: the replays' transcripts with no controls, ④'s summary and report, ⑤'s vendor table with no checker form, and ⑤'s compact frame", async ({ page }) => {
    for (const id of REPLAYS) {
      for (const path of [`/demos/${id}/`, `/solutions/${id}/`]) {
        await open(page, path);
        const frame = page.locator("[data-demo-frame]");
        await expect(frame.locator("[data-demo-transcript]"), path).toBeVisible();
        await expect(frame.locator("[data-demo-controls]"), path).toBeHidden();
        await expect(frame.locator("[data-demo-stage]"), path).toBeHidden();
      }
    }
    await open(page, "/demos/ai-evaluation/");
    await expect(page.locator("[data-page-hero] [data-demo-frame] [data-report-summary]")).toBeVisible();
    await expect(page.locator("#sample-report [data-sample-report]")).toBeVisible();
    await open(page, "/demos/ai-switch-on/");
    const checkerFrame = page.locator("[data-demo-frame]");
    await expect(checkerFrame.locator("[data-demo-transcript] [data-platform-facts]")).toBeVisible();
    await expect(checkerFrame.locator("[data-checker-form]")).toBeHidden();
    await open(page, "/solutions/ai-switch-on/");
    await expect(page.locator("[data-demo-frame] [data-checker-summary]")).toBeVisible();
  });
});
