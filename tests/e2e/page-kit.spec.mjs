import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { focusKeys } from "../support/keys.mjs";
import { industryLink, solutionLink } from "../../src/lib/site.ts";
import { fixtureSite } from "../../src/fixtures/index.ts";

// The page kit (src/components/page/) on /preview/page-kit/: a carbon hero and a carbon section,
// then a hero framed in bone and a bone section, each section holding every other component.
const PAGE = "/preview/page-kit/";
const TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const WIDE = { width: 1280, height: 900 };
const NARROW = { width: 390, height: 844 };
const SURFACES = ["carbon", "bone"];
const ACID = "rgb(200, 255, 46)";
const CARBON = "rgb(11, 11, 12)";
const BONE = "rgb(242, 241, 236)";
const SHOWN = industryLink(fixtureSite, "fixture-industry");
const UNSHOWN = industryLink(fixtureSite, "fixture-industry-9");
const PRIVACY = fixtureSite.page("privacy");
const ONE = solutionLink(fixtureSite, "fixture-solution");
const section = (page, s) => page.locator(`#kit-section-${s}`);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const look = (loc) =>
  loc.evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, color: s.color, scheme: s.colorScheme, ring: s.boxShadow };
  });

for (const vp of [WIDE, NARROW]) {
  test(`the page-kit page has no axe violations, on carbon and on bone, at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto(PAGE);
    await expect(page.locator("[data-page-kit] [data-page-hero]")).toHaveCount(2);
    await expect(page.locator('[data-page-kit] section.page-section[data-surface="carbon"]')).toHaveCount(2);
    await expect(page.locator('[data-page-kit] section.page-section[data-surface="bone"]')).toHaveCount(2);
    expect((await new AxeBuilder({ page }).withTags(TAGS).analyze()).violations).toEqual([]);
  });
}

test("the hero highlights one whole word in display caps; the sentence-case hero has neither", async ({ page }) => {
  await page.goto(PAGE);
  const h1 = page.locator("#kit-hero-carbon h1");
  const hl = h1.locator(".hl");
  await expect(hl).toHaveCount(1);
  await expect(hl).toHaveText("ships");
  expect(await look(hl)).toMatchObject({ bg: ACID, color: CARBON });
  expect(await h1.evaluate((el) => getComputedStyle(el).textTransform)).toBe("uppercase");
  const plain = page.locator("#kit-hero-bone h1");
  await expect(plain).toHaveText(ONE.fullName);
  await expect(plain.locator(".hl")).toHaveCount(0);
  expect(await plain.evaluate((el) => getComputedStyle(el).textTransform)).toBe("none");
});

test("PageHero stays a carbon island, even framed in bone", async ({ page }) => {
  await page.goto(PAGE);
  for (const s of SURFACES) {
    expect(await look(page.locator(`#kit-hero-${s} [data-page-hero]`)), s).toMatchObject({ bg: CARBON, color: BONE, scheme: "dark" });
  }
  expect(await look(page.locator("#kit-hero-bone"))).toMatchObject({ bg: BONE });
});

test("CTAs follow the surface: a lime fill with carbon text, and the secondary in bone or carbon", async ({ page }) => {
  await page.goto(PAGE);
  for (const s of SURFACES) {
    const links = section(page, s).locator("[data-cta-links]").first().locator("a");
    await expect(links).toHaveText([`Talk to us about ${ONE.shortName}`, "Open the fixture gallery"]);
    expect(await look(links.nth(0)), `${s} primary`).toMatchObject({ bg: ACID, color: CARBON });
    const secondary = await look(links.nth(1));
    expect(secondary.color, `${s} secondary`).toBe(s === "bone" ? CARBON : BONE);
    if (s === "bone") expect(secondary.ring).toContain(CARBON);
  }
  // Inside the hero framed in bone, a CTA keeps its carbon-surface look.
  expect(await look(page.locator("#kit-hero-bone [data-cta-links] a"))).toMatchObject({ bg: ACID, color: CARBON });
});

test("a null href renders plain text, never a link", async ({ page }) => {
  await page.goto(PAGE);
  expect(UNSHOWN.href).toBeNull();
  expect(PRIVACY.href).toBeNull();
  for (const s of SURFACES) {
    const row = page.locator(`#kit-industries-${s}`);
    await expect(row.getByRole("link")).toHaveCount(fixtureSite.industries.filter((i) => i.href !== null).length);
    await expect(row.getByRole("link", { name: UNSHOWN.shortName })).toHaveCount(0);
    await expect(row.getByText(UNSHOWN.shortName)).toBeVisible();
    const card = section(page, s).locator("[data-link-card]", { hasText: PRIVACY.label });
    await expect(card.getByRole("heading", { level: 3 })).toHaveText(PRIVACY.label);
    await expect(card.getByRole("link")).toHaveCount(0);
    const insight = section(page, s).locator("[data-insight-card]").nth(1);
    await expect(insight.getByRole("link", { name: UNSHOWN.shortName })).toHaveCount(0);
    await expect(insight.getByText(UNSHOWN.shortName)).toBeVisible();
  }
});

test("a linked card is one target, and an insight card's industry chips stay their own targets", async ({ page }) => {
  await page.goto(PAGE);
  // Clicking the card's body text (not its title) follows the title link.
  const card = section(page, "bone").locator("[data-link-card]").first();
  await card.scrollIntoViewIfNeeded();
  const box = await card.locator(".link-card-body").boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page).toHaveURL(new RegExp(`${escapeRe(ONE.href)}$`));
  await page.goBack();
  // The chip sits above the stretched title link, so it opens its own page, not the post.
  const insight = section(page, "bone").locator("[data-insight-card]").nth(1);
  await insight.getByRole("link", { name: SHOWN.shortName, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${escapeRe(SHOWN.href)}$`));
});

test("linked cards run the scan line on hover, never under reduced motion, and unlinked cards never", async ({ page }) => {
  await page.goto(PAGE);
  const scan = (loc) => loc.evaluate((el) => getComputedStyle(el, "::before").animationName);
  const linked = [
    section(page, "carbon").locator("[data-link-card].link-card-linked").first(),
    section(page, "bone").locator("[data-insight-card]").first(),
  ];
  for (const card of linked) {
    expect(await scan(card)).toBe("none");
    await card.hover();
    expect(await scan(card)).not.toBe("none");
    await page.mouse.move(0, 0);
  }
  const unlinked = section(page, "carbon").locator("[data-link-card]", { hasText: PRIVACY.label });
  await unlinked.hover();
  expect(await scan(unlinked)).toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const card of linked) {
    await card.hover();
    expect(await scan(card)).toBe("none");
    await page.mouse.move(0, 0);
  }
});

// Every visible link in the kit is at least 44×44px (spec §6.6). Links inside running prose are
// inline text links, which WCAG 2.5.8 exempts, so they are left out.
for (const vp of [WIDE, NARROW]) {
  test(`every page-kit link outside running prose is at least 44px at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto(PAGE);
    const targets = await page.locator("[data-page-kit]").evaluate((root) =>
      [...root.querySelectorAll("a, button")]
        .filter((el) => !el.closest(".prose") && el.checkVisibility({ checkVisibilityCSS: true }))
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { name: el.textContent.replace(/\s+/g, " ").trim(), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
        }),
    );
    // Breadcrumbs, CTAs, chips, card and insight titles, on both surfaces.
    expect(targets.length).toBeGreaterThanOrEqual(40);
    expect(targets.filter((t) => t.w < 44 || t.h < 44)).toEqual([]);
  });
}

test("at 320px nothing scrolls sideways and nothing in the kit pokes past the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(PAGE);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  // Cards clip their overflow, so check each element's box too: the 60-character chip label,
  // the code block and the display H1 all have to wrap.
  const past = await page.locator("[data-page-kit]").evaluate((root) => {
    const width = document.documentElement.clientWidth;
    return [...root.querySelectorAll("*")]
      .filter((el) => el.getClientRects().length > 0 && el.getBoundingClientRect().right > width + 0.5)
      .map((el) => el.outerHTML.slice(0, 100));
  });
  expect(past).toEqual([]);
});

test("focus rings: lime inside the hero framed in bone, carbon in the bone section", async ({ page, browserName }) => {
  const { next } = focusKeys(browserName);
  const ring = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      const s = getComputedStyle(el);
      return { visible: el.matches(":focus-visible"), style: s.outlineStyle, width: s.outlineWidth, color: s.outlineColor };
    });
  await page.goto(PAGE);
  // The hero's last breadcrumb link, then one key to its CTA: the slot between them has no link.
  await page.locator('#kit-hero-bone nav[aria-label="Breadcrumb"] a').last().focus();
  await page.keyboard.press(next);
  await expect(page.locator("#kit-hero-bone [data-cta-links] a")).toBeFocused();
  expect(await ring()).toEqual({ visible: true, style: "solid", width: "2px", color: ACID });
  // The bone section's secondary CTA, then one key to the first industry chip.
  await section(page, "bone").locator("[data-cta-links] a").nth(1).focus();
  await page.keyboard.press(next);
  await expect(page.locator("#kit-industries-bone a").first()).toBeFocused();
  expect(await ring()).toEqual({ visible: true, style: "solid", width: "2px", color: CARBON });
});

test("acid is never text in the bone section", async ({ page }) => {
  await page.goto(PAGE);
  const hits = await page.evaluate((acid) => {
    const out = [];
    const walk = document.createTreeWalker(document.querySelector("#kit-section-bone"), NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const node = walk.currentNode;
      const el = node.parentElement;
      if (!node.textContent.trim() || el.closest(".bg-carbon, .bg-graphite")) continue;
      if (getComputedStyle(el).color === acid) out.push(node.textContent.trim());
    }
    return out;
  }, ACID);
  expect(hits).toEqual([]);
});
