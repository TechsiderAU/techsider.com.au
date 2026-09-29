import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { focusKeys } from "../support/keys.mjs";

// The company page templates (spec §8.10, §8.11, §10.2) on the preview gallery: About, Trust (with
// and without a confirmed Part B term), the Legal hub, a legal document, Contact (with and without a
// form endpoint), the message-sent page and the 404 body. The contact form posts to an example.com endpoint; the tests intercept it, so
// nothing leaves the machine.
const BASE = "/preview/templates";
const KINDS = ["about", "trust", "trust-no-terms", "legal-hub", "legal-document", "contact", "contact-no-endpoint", "sent", "not-found"];
const CONTACT = `${BASE}/contact/`;
const ENDPOINT = "https://example.com/fixture/form";
const EMAIL = "fixture@example.com";
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
const CARBON = "rgb(11, 11, 12)";
const MUTED_DARK = "rgb(92, 91, 85)";
// The order Tab visits the form's controls; the honeypot (tabindex="-1", display:none) is never one.
const FORM_ORDER = ["contact-name", "contact-email", "contact-organisation", "contact-industry", "contact-size", "contact-interest", "contact-message", "contact-consent", "submit"];

const axe = (page) => new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const form = (page) => page.locator("form[data-contact-form]");
const copyButton = (page) => page.locator("[data-copy-email]");
const copyStatus = (page) => page.locator("[data-copy-status]");

// Replaces the Clipboard API before any page script runs: `mode` "ok" records each copy in
// window.__copied, "fail" rejects, "absent" removes navigator.clipboard altogether.
async function stubClipboard(page, mode) {
  await page.addInitScript((mode) => {
    window.__copied = [];
    const clipboard = {
      writeText: async (value) => {
        if (mode === "fail") throw new DOMException("Fixture: write refused", "NotAllowedError");
        window.__copied.push(value);
      },
    };
    Object.defineProperty(Navigator.prototype, "clipboard", { configurable: true, get: () => (mode === "absent" ? undefined : clipboard) });
  }, mode);
}

async function fillEnquiry(page) {
  await page.getByLabel("Name").fill("Fixture Person");
  await page.getByLabel("Work email").fill("fixture-person@example.com");
  await page.getByLabel("Organisation", { exact: true }).fill("Fixture Organisation");
  await page.getByLabel("Industry").selectOption("fixture-government");
  await page.getByLabel("Organisation size").selectOption("200–999");
  await page.getByLabel("Interest").selectOption("evaluation-partner");
  await page.getByLabel("Message").fill("Fixture message: what we are trying to fix.");
  await page.getByLabel(/I agree/).check();
}

for (const kind of KINDS) {
  const url = `${BASE}/${kind}/`;
  test(`${kind}: no horizontal scroll at 320px`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(url);
    expect(await overflow(page)).toBeLessThanOrEqual(0);
  });

  for (const vp of [WIDE, NARROW]) {
    test(`${kind}: no axe violations at ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize(vp);
      await page.goto(url);
      expect((await axe(page).analyze()).violations).toEqual([]);
    });
  }
}

test("without JavaScript the copy button stays hidden, and the address and the form are there", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: NARROW });
  const page = await ctx.newPage();
  await page.goto(CONTACT);
  await expect(copyButton(page)).toBeHidden();
  await expect(page.locator("[data-email]")).toHaveText(EMAIL);
  await expect(page.locator("[data-email]")).toBeVisible();
  await expect(form(page)).toBeVisible();
  await expect(form(page).getByRole("button", { name: "Send enquiry" })).toBeVisible();
  await ctx.close();
});

test("the copy button copies the address and announces Copied", async ({ page, browserName }) => {
  await stubClipboard(page, "ok");
  await page.goto(CONTACT);
  await expect(copyButton(page)).toBeVisible();
  await expect(copyButton(page)).toHaveAccessibleName("Copy address");
  await expect(copyStatus(page)).toHaveText("");
  // From the form's submit button, the next stop is the copy button.
  await form(page).getByRole("button", { name: "Send enquiry" }).focus();
  await page.keyboard.press(focusKeys(browserName).next);
  await expect(copyButton(page)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(copyStatus(page)).toHaveText("Copied");
  expect(await page.evaluate(() => window.__copied)).toEqual([EMAIL]);
  await copyButton(page).click();
  await expect(copyStatus(page)).toHaveText("Copied");
  expect(await page.evaluate(() => window.__copied)).toEqual([EMAIL, EMAIL]);
});

test("a refused copy is announced, and without the Clipboard API the button never shows", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: NARROW });
  const failing = await ctx.newPage();
  await stubClipboard(failing, "fail");
  await failing.goto(CONTACT);
  await copyButton(failing).click();
  await expect(copyStatus(failing)).toHaveText("Couldn't copy. Select the address instead.");
  const absent = await ctx.newPage();
  await stubClipboard(absent, "absent");
  await absent.goto(CONTACT);
  await expect(absent.locator("[data-email]")).toHaveText(EMAIL);
  await expect(copyButton(absent)).toBeHidden();
  await ctx.close();
});

test("native validation stops an empty or malformed enquiry in the browser", async ({ page }) => {
  const posted = [];
  await page.route(`${ENDPOINT}**`, (route) => {
    posted.push(route.request().method());
    return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Fixture endpoint</title>" });
  });
  await page.goto(CONTACT);
  await form(page).getByRole("button", { name: "Send enquiry" }).click();
  await expect(page).toHaveURL(new RegExp(`${CONTACT}$`));
  expect(await form(page).evaluate((f) => f.checkValidity())).toBe(false);
  await expect(page.getByLabel("Name")).toBeFocused(); // the browser moves to the first invalid field

  await fillEnquiry(page);
  await page.getByLabel("Work email").fill("not-an-email");
  await form(page).getByRole("button", { name: "Send enquiry" }).click();
  await expect(page).toHaveURL(new RegExp(`${CONTACT}$`));
  expect(await page.getByLabel("Work email").evaluate((el) => el.validity.typeMismatch)).toBe(true);
  expect(posted).toEqual([]);
});

test("a complete enquiry is a plain form POST of every field, with the honeypot empty", async ({ page }) => {
  let request = null;
  await page.route(`${ENDPOINT}**`, (route) => {
    request = route.request();
    return route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Fixture endpoint</title>" });
  });
  await page.goto(CONTACT);
  await fillEnquiry(page);
  await Promise.all([page.waitForURL(`${ENDPOINT}**`), form(page).getByRole("button", { name: "Send enquiry" }).click()]);
  expect(request.method()).toBe("POST");
  expect(request.headers()["content-type"]).toMatch(/^application\/x-www-form-urlencoded/);
  expect(Object.fromEntries(new URLSearchParams(request.postData()))).toEqual({
    name: "Fixture Person",
    email: "fixture-person@example.com",
    organisation: "Fixture Organisation",
    industry: "fixture-government",
    size: "200–999",
    interest: "evaluation-partner",
    message: "Fixture message: what we are trying to fix.",
    consent: "yes",
    website: "",
  });
});

test("Tab moves through the form's controls in order and never reaches the honeypot", async ({ page, browserName }) => {
  await page.goto(CONTACT);
  await page.getByLabel("Name").focus();
  const visited = [];
  for (let i = 0; i < FORM_ORDER.length; i++) {
    visited.push(await page.evaluate(() => document.activeElement.id || document.activeElement.getAttribute("type")));
    await page.keyboard.press(focusKeys(browserName).next);
  }
  expect(visited).toEqual(FORM_ORDER);
  await expect(page.locator('[data-honeypot] input[name="website"]')).toBeHidden();
});

test("on bone a field has a muted-dark border that turns carbon, with the carbon focus ring", async ({ page }) => {
  await page.goto(CONTACT);
  const field = page.getByLabel("Organisation", { exact: true });
  const look = () =>
    field.evaluate((el) => {
      const s = getComputedStyle(el);
      return { border: s.borderTopColor, width: s.borderTopWidth, outline: s.outlineStyle === "none" ? "none" : `${s.outlineWidth} ${s.outlineColor}` };
    });
  expect(await look()).toEqual({ border: MUTED_DARK, width: "1px", outline: "none" });
  await field.focus();
  expect(await look()).toEqual({ border: CARBON, width: "1px", outline: `2px ${CARBON}` });
});

test("every form control is at least 44px tall at 390px; the consent row is the checkbox's 44px target", async ({ page }) => {
  await page.setViewportSize(NARROW);
  await page.goto(CONTACT);
  const small = await form(page).evaluate((f) =>
    [...f.querySelectorAll('input:not([type="checkbox"]):not([tabindex="-1"]), select, textarea, button, label.contact-consent, a')]
      .map((el) => ({ what: el.id || el.className || el.textContent.trim(), h: el.getBoundingClientRect().height, w: el.getBoundingClientRect().width }))
      .filter((t) => t.h < 44 || t.w < 44),
  );
  expect(small).toEqual([]);
  await page.locator("label.contact-consent").click({ position: { x: 200, y: 10 } });
  await expect(page.getByLabel(/I agree/)).toBeChecked();
});

test("a Trust FAQ answer opens to show its Part and as-at date", async ({ page }) => {
  await page.goto(`${BASE}/trust/`);
  const item = page.locator("#questions details").first();
  await expect(item.locator(".faq-meta")).toBeHidden();
  await item.locator("summary").click();
  await expect(item.locator(".faq-meta")).toBeVisible();
  await expect(item.locator(".faq-meta")).toHaveText(/^Part [AB] · as at \d{1,2} [A-Z][a-z]+ \d{4}$/);
  expect((await axe(page).analyze()).violations).toEqual([]);
});
