import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { SITE } from "../../src/data/nav.ts";
import { ENQUIRY_FIELDS, FIELD_ERRORS, FORM_MESSAGES } from "../../src/lib/contact-form.ts";
import { MOCK_FORM } from "../../src/preview/mock-form.ts";
import { withoutScripts } from "../support/no-scripts.mjs";

// Phase E Task 1: the contact form in a browser (spec §10.2), on the gallery's contact page. Its
// form posts to tests/support/mock-form.mjs, the Formspark-shaped stand-in provider that
// playwright.config.mjs starts. Without JavaScript (the page served with its scripts stripped) an
// enquiry is a plain POST, which the provider answers with a 303 to the gallery's message-sent page.
// With it, the same fields go by fetch, and errors show in place. Each test names its own
// organisation, and the mock logs enquiries by organisation, so a test reads only its own, whatever
// runs beside it. Also here: the preview build's own /contact/sent/.
const CONTACT = "/preview/templates/contact/";
const SENT = "/preview/templates/sent/";
const MOCK = new URL(MOCK_FORM.formEndpoint).origin;
const WIDE = { width: 1280, height: 800 };
const NARROW = { width: 390, height: 844 };
const CONTROL_ID = {
  name: "contact-name", email: "contact-email", organisation: "contact-organisation", industry: "contact-industry",
  size: "contact-size", interest: "contact-interest", message: "contact-message", consent: "contact-consent",
};
// Every field a complete enquiry posts, the provider's included, less the organisation each test names.
const POSTED = {
  _redirect: "https://techsider.com.au/preview/templates/sent/",
  _append: "false",
  name: "Fixture Person",
  email: "fixture-person@example.com",
  industry: "fixture-government",
  size: "200–999",
  interest: "evaluation-partner",
  message: "Fixture message: what we are trying to fix.",
  consent: "yes",
  _gotcha: "",
};

const axe = (page) => new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const form = (page) => page.locator("form[data-contact-form]");
const summary = (page) => page.locator("[data-form-summary]");
const send = (page) => form(page).getByRole("button", { name: "Send enquiry" });
const sentUrl = (page) => page.waitForURL((url) => url.pathname === SENT);
/** This test's organisation: the key the mock logs its enquiries under. */
const organisation = () => `Fixture Organisation ${test.info().testId}`;
const logged = async (request, org) => (await request.get(`${MOCK}/__log?organisation=${encodeURIComponent(org)}`)).json();

async function fillEnquiry(page, org) {
  await page.getByLabel("Name").fill(POSTED.name);
  await page.getByLabel("Work email").fill(POSTED.email);
  await page.getByLabel("Organisation", { exact: true }).fill(org);
  await page.getByLabel("Industry").selectOption(POSTED.industry);
  await page.getByLabel("Organisation size").selectOption(POSTED.size);
  await page.getByLabel("Interest").selectOption(POSTED.interest);
  await page.getByLabel("Message").fill(POSTED.message);
  await page.getByLabel(/I agree/).check();
}

test("without JavaScript, a complete enquiry is a plain POST, and the provider's 303 lands on the message-sent page with nothing in its query string", async ({ page, request }) => {
  const org = organisation();
  await withoutScripts(page, CONTACT);
  await page.goto(CONTACT);
  await expect(page.locator("html")).toHaveClass(/\bno-js\b/);
  await fillEnquiry(page, org);
  await Promise.all([sentUrl(page), send(page).click()]);
  expect(new URL(page.url()).search).toBe("");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Message sent.");
  expect(await logged(request, org)).toEqual({ delivered: [{ ...POSTED, organisation: org }], spam: [] });
});

test("without JavaScript, a filled honeypot still lands on the message-sent page, and the provider drops the enquiry", async ({ page, request }) => {
  const org = organisation();
  await withoutScripts(page, CONTACT);
  await page.goto(CONTACT);
  // The script's fetch path would pass this test too, so prove the page runs no script.
  await expect(page.locator("html")).toHaveClass(/\bno-js\b/);
  await fillEnquiry(page, org);
  await page.locator("[data-honeypot] input").evaluate((el) => {
    el.value = "https://example.com/fixture-spam";
  });
  await Promise.all([sentUrl(page), send(page).click()]);
  expect(await logged(request, org)).toEqual({
    delivered: [],
    spam: [{ ...POSTED, organisation: org, _gotcha: "https://example.com/fixture-spam" }],
  });
});

test("with JavaScript, a complete enquiry goes by fetch, urlencoded with Accept: application/json, then the message-sent page opens", async ({ page, request }) => {
  const org = organisation();
  await page.goto(CONTACT);
  await fillEnquiry(page, org);
  const posted = page.waitForRequest((r) => r.url() === MOCK_FORM.formEndpoint && r.method() === "POST");
  await Promise.all([sentUrl(page), send(page).click()]);
  const req = await posted;
  expect(req.isNavigationRequest()).toBe(false);
  expect(req.headers().accept).toBe("application/json");
  expect(req.headers()["content-type"]).toMatch(/^application\/x-www-form-urlencoded/);
  expect(Object.fromEntries(new URLSearchParams(req.postData() ?? ""))).toEqual({ ...POSTED, organisation: org });
  expect(new URL(page.url()).search).toBe("");
  expect(await logged(request, org)).toEqual({ delivered: [{ ...POSTED, organisation: org }], spam: [] });
});

test("with JavaScript, an empty enquiry sends nothing: each field shows its error, tied to it, the summary lists them in order, and focus moves to the first", async ({ page }) => {
  const requests = [];
  page.on("request", (r) => {
    if (r.url().startsWith(MOCK)) requests.push(r.url());
  });
  await page.goto(CONTACT);
  await send(page).click();
  await expect(page.getByLabel("Name")).toBeFocused();
  for (const name of ENQUIRY_FIELDS) {
    const id = CONTROL_ID[name];
    await expect(page.locator(`#${id}-error`)).toBeVisible();
    await expect(page.locator(`#${id}-error`)).toHaveText(FIELD_ERRORS[name].missing);
    await expect(page.locator(`#${id}`)).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(`#${id}`)).toHaveAttribute("aria-describedby", name === "message" ? `${id}-hint ${id}-error` : `${id}-error`);
  }
  await expect(page.getByLabel("Name")).toHaveAccessibleDescription(FIELD_ERRORS.name.missing);
  await expect(summary(page)).toHaveAttribute("aria-live", "polite");
  await expect(summary(page).locator("p")).toHaveText(FORM_MESSAGES.invalid);
  const links = summary(page).getByRole("link");
  await expect(links).toHaveText(ENQUIRY_FIELDS.map((name) => FIELD_ERRORS[name].missing));
  for (const link of await links.all()) expect((await link.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await links.nth(ENQUIRY_FIELDS.indexOf("message")).click();
  await expect(page.getByLabel("Message")).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`${CONTACT}$`));
  expect(requests).toEqual([]);
});

test("with JavaScript, an answered field loses its error; a resubmit re-checks the rest, and a malformed email gets its own line", async ({ page }) => {
  await page.goto(CONTACT);
  await send(page).click();
  await page.getByLabel("Name").fill(POSTED.name);
  await expect(page.locator("#contact-name-error")).toBeHidden();
  await expect(page.getByLabel("Name")).not.toHaveAttribute("aria-invalid");
  await expect(page.getByLabel("Name")).not.toHaveAttribute("aria-describedby");
  await page.getByLabel("Message").fill(POSTED.message);
  await expect(page.getByLabel("Message")).toHaveAttribute("aria-describedby", "contact-message-hint");
  await page.getByLabel("Industry").selectOption("other");
  await expect(page.locator("#contact-industry-error")).toBeHidden();
  await page.getByLabel(/I agree/).check();
  await expect(page.locator("#contact-consent-error")).toBeHidden();
  await page.getByLabel("Work email").fill("not-an-email");
  await send(page).click();
  await expect(page.locator("#contact-email-error")).toHaveText(FIELD_ERRORS.email.invalid);
  await expect(summary(page).getByRole("link")).toHaveText([
    FIELD_ERRORS.email.invalid, FIELD_ERRORS.organisation.missing, FIELD_ERRORS.size.missing, FIELD_ERRORS.interest.missing,
  ]);
  await expect(page.getByLabel("Work email")).toBeFocused();
});

test("with JavaScript, the provider's 422 shows the error of each field it names, nothing is delivered, and the fixed enquiry goes", async ({ page, request }) => {
  const org = organisation();
  await page.goto(CONTACT);
  await fillEnquiry(page, org);
  // The browser takes name@host as an email address; the provider doesn't.
  await page.getByLabel("Work email").fill("fixture-person@example");
  const answered = page.waitForResponse((r) => r.url() === MOCK_FORM.formEndpoint);
  await send(page).click();
  expect((await answered).status()).toBe(422);
  await expect(page.locator("#contact-email-error")).toHaveText(FIELD_ERRORS.email.invalid);
  await expect(page.getByLabel("Work email")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Work email")).toBeFocused();
  await expect(summary(page).getByRole("link")).toHaveText([FIELD_ERRORS.email.invalid]);
  await expect(page).toHaveURL(new RegExp(`${CONTACT}$`));
  expect(await logged(request, org)).toEqual({ delivered: [], spam: [] });
  await page.getByLabel("Work email").fill(POSTED.email);
  await Promise.all([sentUrl(page), send(page).click()]);
  expect((await logged(request, org)).delivered).toHaveLength(1);
});

// HTTP server/gateway errors do not establish whether delivery happened, even with field names.
for (const [status, body] of [[500, { errors: [{ field: "email" }] }], [502, {}], [504, {}], [422, { errors: [{ field: "unknown" }] }]]) {
  test(`with JavaScript, HTTP ${status} without supported validation leaves delivery unconfirmed`, async ({ page }) => {
    let calls = 0;
    await page.route(MOCK_FORM.formEndpoint, (route) => {
      calls++;
      return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.goto(CONTACT);
    const org = organisation();
    await fillEnquiry(page, org);
    await send(page).click();
    await expect(summary(page)).toHaveText(FORM_MESSAGES.unconfirmed);
    await expect(summary(page)).toHaveAttribute("data-state", "unconfirmed");
    await expect(summary(page)).not.toContainText("wasn't sent");
    await expect(summary(page)).not.toContainText("Try again");
    await expect(summary(page).getByRole("link")).toHaveCount(0);
    await expect(page.getByLabel("Work email")).not.toHaveAttribute("aria-invalid");
    await expect(page.getByLabel("Organisation", { exact: true })).toHaveValue(org);
    await expect(page.getByLabel("Message")).toHaveValue(POSTED.message);
    await expect(page.getByLabel(/I agree/)).toBeChecked();
    await expect(page).toHaveURL(new RegExp(`${CONTACT}$`));
    expect(calls).toBe(1);
  });
}

test("a connection failure keeps the answers and advises email with neutral uncertainty", async ({ page }) => {
  await page.route(MOCK_FORM.formEndpoint, (route) => route.abort("failed"));
  await page.goto(CONTACT);
  await fillEnquiry(page, organisation());
  await send(page).click();
  await expect(summary(page)).toHaveText(FORM_MESSAGES.unconfirmed);
  await expect(summary(page)).toHaveAttribute("data-state", "unconfirmed");
  expect(await summary(page).evaluate((el) => getComputedStyle(el).borderTopColor === getComputedStyle(el).color)).toBe(true);
  await expect(page.getByLabel("Message")).toHaveValue(POSTED.message);
});

// A deliberately non-cooperative transport lets old continuations finish after cancellation.
// This models held headers/body and proves visible state/redirect ownership, rather than relying
// on fetch obeying abort. The browser clock bounds the attempt without a 30-second real wait.
async function holdTransport(page, phase) {
  await page.addInitScript(({ endpoint, phase }) => {
    window.heldEnquiries = [];
    const realFetch = window.fetch;
    window.fetch = (url, options) => {
      if (url !== endpoint) return realFetch(url, options);
      const attempt = { signal: options.signal };
      window.heldEnquiries.push(attempt);
      return new Promise((resolve, reject) => {
        attempt.reject = reject;
        if (phase === "headers") attempt.resolve = resolve;
        else resolve({ ok: false, status: 422, json: () => new Promise((resolveBody, rejectBody) => {
          attempt.resolve = resolveBody;
          attempt.reject = rejectBody;
        }) });
      });
    };
  }, { endpoint: MOCK_FORM.formEndpoint, phase });
  await page.clock.install();
  await page.goto(CONTACT);
  await fillEnquiry(page, organisation());
}

for (const phase of ["headers", "body"]) {
  for (const completion of ["success", "error"]) {
    test(`held ${phase} reaches its deadline; late ${completion} cannot affect a newer enquiry`, async ({ page }) => {
      await holdTransport(page, phase);
      await send(page).click();
      await expect(summary(page)).toHaveText(FORM_MESSAGES.sending);
      await send(page).click();
      expect(await page.evaluate(() => window.heldEnquiries.length)).toBe(1);
      await page.clock.runFor(30_001);
      await expect(summary(page)).toHaveText(FORM_MESSAGES.unconfirmed);
      await expect(summary(page)).toHaveAttribute("data-state", "unconfirmed");
      await expect(page.getByLabel("Message")).toHaveValue(POSTED.message);
      await expect(page.getByLabel(/I agree/)).toBeChecked();
      expect(await page.evaluate(() => window.heldEnquiries.length)).toBe(1); // No automatic retry.
      expect(await page.evaluate(() => window.heldEnquiries[0].signal.aborted)).toBe(true);
      await send(page).click();
      await expect(summary(page)).toHaveText(FORM_MESSAGES.sending);
      await page.evaluate(({ phase, completion }) => {
        const old = window.heldEnquiries[0];
        if (completion === "error") old.reject(new Error("late transport failure"));
        else old.resolve(phase === "headers" ? { ok: true, status: 200 } : { errors: [{ field: "email" }] });
      }, { phase, completion });
      await expect(summary(page)).toHaveText(FORM_MESSAGES.sending);
      await expect(page.getByLabel("Work email")).not.toHaveAttribute("aria-invalid");
      await expect(page).toHaveURL(new RegExp(`${CONTACT}$`));
      await send(page).click();
      expect(await page.evaluate(() => window.heldEnquiries.length)).toBe(2); // Still only one active.
      await page.clock.runFor(30_001);
      await expect(summary(page)).toHaveText(FORM_MESSAGES.unconfirmed);
    });
  }
  for (const completion of ["success", "error"]) {
  test(`persisted restore invalidates held ${phase}; late ${completion} cannot affect a new enquiry`, async ({ page }) => {
    await holdTransport(page, phase);
    await send(page).click();
    await expect(summary(page)).toHaveText(FORM_MESSAGES.sending);
    await page.clock.runFor(10_000);
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
    await expect(summary(page)).toBeEmpty();
    expect(await page.evaluate(() => window.heldEnquiries[0].signal.aborted)).toBe(true);
    await send(page).click();
    await page.evaluate(({ phase, completion }) => {
      const old = window.heldEnquiries[0];
      if (completion === "error") old.reject(new Error("late restored-page failure"));
      else old.resolve(phase === "headers" ? { ok: true, status: 200 } : { errors: [{ field: "email" }] });
    }, { phase, completion });
    await page.clock.runFor(20_001); // Old deadline must not expire the new request.
    await expect(summary(page)).toHaveText(FORM_MESSAGES.sending);
    await expect(page.getByLabel("Work email")).not.toHaveAttribute("aria-invalid");
    await expect(page).toHaveURL(new RegExp(`${CONTACT}$`));
    await send(page).click();
    expect(await page.evaluate(() => window.heldEnquiries.length)).toBe(2);
    await page.clock.runFor(10_000);
    await expect(summary(page)).toHaveText(FORM_MESSAGES.unconfirmed);
  });
  }
}

test("with JavaScript, a second click while the enquiry is on its way sends nothing more, and the button stays enabled", async ({ page }) => {
  const org = organisation();
  let calls = 0;
  let release = () => {};
  const held = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(MOCK_FORM.formEndpoint, async (route) => {
    calls++;
    await held;
    await route.continue();
  });
  await page.goto(CONTACT);
  await fillEnquiry(page, org);
  await send(page).click();
  await expect(summary(page)).toHaveText(FORM_MESSAGES.sending);
  await send(page).click();
  await expect(send(page)).toBeEnabled();
  expect(calls).toBe(1);
  release();
  await sentUrl(page);
  expect(calls).toBe(1);
});

test("?industry= and ?interest= preselect their select; a value the select doesn't offer preselects nothing", async ({ page }) => {
  await page.goto(`${CONTACT}?industry=fixture-government`);
  await expect(page.getByLabel("Industry")).toHaveValue("fixture-government");
  await expect(page.getByLabel("Interest")).toHaveValue("");
  await page.goto(`${CONTACT}?interest=evaluation-partner`);
  await expect(page.getByLabel("Interest")).toHaveValue("evaluation-partner");
  await expect(page.getByLabel("Industry")).toHaveValue("");
  for (const query of ["?interest=pricing", "?industry=Fixture%20Government", "?industry="]) {
    await page.goto(`${CONTACT}${query}`);
    await expect(page.getByLabel("Industry")).toHaveValue("");
    await expect(page.getByLabel("Interest")).toHaveValue("");
  }
});

for (const vp of [WIDE, NARROW]) {
  test(`with its errors and summary showing, the form has no axe violations at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto(CONTACT);
    await send(page).click();
    await expect(summary(page).getByRole("link")).toHaveCount(ENQUIRY_FIELDS.length);
    expect((await axe(page).analyze()).violations).toEqual([]);
  });
}

test("with its errors and summary showing, the form fits 320px with no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(CONTACT);
  await send(page).click();
  await expect(summary(page).getByRole("link")).toHaveCount(ENQUIRY_FIELDS.length);
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});

test("the preview build's /contact/sent/: one h1, the address as plain text, no axe violations at 390px and 1280px, and no horizontal scroll at 320px", async ({ page }) => {
  for (const vp of [WIDE, NARROW]) {
    await page.setViewportSize(vp);
    await page.goto("/contact/sent/");
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator("main [data-email]")).toHaveText(SITE.email);
    expect((await axe(page).analyze()).violations).toEqual([]);
  }
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/contact/sent/");
  expect(await overflow(page)).toBeLessThanOrEqual(0);
});
