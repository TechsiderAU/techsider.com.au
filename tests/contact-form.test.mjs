// Phase E Task 1: the contact form, provider-agnostic (spec §10.2), and the gated /contact/sent/.
// - src/lib/contact-form.ts, the pure half of src/scripts/contact-form.ts: the fields, their error
//   copy, the ?industry= / ?interest= preselection and reading a provider's JSON rejection;
// - tests/support/mock-form.mjs, the Formspark-shaped stand-in the browser tests post to, run here
//   on a free port;
// - the data: the form, /contact/sent/ and the privacy policy go live together, and gatedPaths()
//   fails a build that has /contact/sent/ live with no form;
// - both builds: the gallery's form carries the provider's hidden fields first, the honeypot under
//   the provider's name, an empty error line per field and the empty polite summary; production has
//   the form, /contact/sent/ and the form's script exactly when formEndpoint is set (none of them
//   until the owner chooses a provider); the preview's /contact/sent/ is noindex and left out of the
//   sitemap.
// Run `npm run build && npm run build:preview` first. tests/e2e/contact-form.spec.mjs drives the
// form in a browser against the mock, with and without JavaScript.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDist, readPreviewDist, visibleText } from "./helpers.mjs";
import { decodeEntities, elements, elementsWith, htmlFiles, readText, relPath } from "../scripts/ci/lib.mjs";
import { contactData } from "../src/content/page-schemas.ts";
import { CONTACT } from "../src/data/contact.ts";
import { PAGES, SITE } from "../src/data/nav.ts";
import { contactFixture, fixtureSite } from "../src/fixtures/index.ts";
import {
  ENQUIRY_FIELDS, FIELD_ERRORS, FORM_MESSAGES, MESSAGE_MAX, errorLine, preselection, problemOf, rejectedFields,
} from "../src/lib/contact-form.ts";
import { EXTRA_INTERESTS } from "../src/lib/fixed-copy.ts";
import { gatedPaths } from "../src/lib/pages.ts";
import { siteContext } from "../src/lib/site.ts";
import { MOCK_FORM, MOCK_FORM_PORT } from "../src/preview/mock-form.ts";
import { APPEND_FIELD, HONEYPOT_FIELD, REDIRECT_FIELD, SITE_ORIGIN, createMockForm, problems } from "./support/mock-form.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const source = (rel) => readFileSync(join(ROOT, rel), "utf8");
const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>") + "</main>".length);
const text = (html) => visibleText(html).trim();
const tagged = (html, name) => elements(html, (t) => t.name === name);
function one(html, attr, value) {
  const found = elementsWith(html, attr, value);
  assert.equal(found.length, 1, `expected one [${attr}${value === undefined ? "" : `="${value}"`}], found ${found.length}`);
  return found[0];
}
const galleryForm = () => one(mainOf(readPreviewDist("preview/templates/contact/index.html")), "data-contact-form");
const controlNamed = (html, name) =>
  elements(html, (t) => ["input", "select", "textarea"].includes(t.name) && t.attrs.name === name)[0];
// The origin the browser tests serve the preview build from (playwright.config.mjs).
const PREVIEW_ORIGIN = "http://127.0.0.1:4322";
const ENQUIRY = {
  name: "Fixture Person", email: "fixture-person@example.com", organisation: "Fixture Organisation",
  industry: "fixture-government", size: "200–999", interest: "evaluation-partner",
  message: "Fixture message: what we are trying to fix.", consent: "yes",
};

test("the enquiry fields are spec §10.2's, in form order, and each error line says what to do", () => {
  assert.deepEqual([...ENQUIRY_FIELDS], ["name", "email", "organisation", "industry", "size", "interest", "message", "consent"]);
  assert.equal(MESSAGE_MAX, 1000);
  assert.deepEqual(FIELD_ERRORS, {
    name: { missing: "Enter your name." },
    email: { missing: "Enter your work email address.", invalid: "Enter an email address like name@example.com." },
    organisation: { missing: "Enter your organisation's name." },
    industry: { missing: "Choose your industry, or Other." },
    size: { missing: "Choose your organisation's size." },
    interest: { missing: "Choose what you'd like to talk about, or Not sure yet." },
    message: { missing: "Tell us what you're trying to fix.", invalid: "Keep your message to 1,000 characters or fewer." },
    consent: { missing: "Tick the box to agree to how we handle your enquiry." },
  });
  assert.deepEqual(FORM_MESSAGES, {
    invalid: "Your enquiry wasn't sent. Check these answers:",
    sending: "Sending your enquiry…",
    unconfirmed: "Your enquiry may not have been sent. Email us at the address on this page instead of sending it again.",
  });
  // A fetch that rejects (a provider answer the browser blocks for CORS, or a connection dropped
  // after the enquiry went) can't tell whether the provider has the enquiry, so its line never says
  // it wasn't sent, and points to the address rather than to a second try (ledger ruling R4).
  assert.ok(!FORM_MESSAGES.unconfirmed.includes("wasn't sent"));
  // The interest line names the choice the select really offers.
  assert.ok(EXTRA_INTERESTS.some((e) => FIELD_ERRORS.interest.missing.includes(e.label)));
});

test("problemOf and errorLine: an empty field is missing, a wrong answer invalid, and a field with no invalid line reuses its missing line", () => {
  assert.equal(problemOf({ valid: true, valueMissing: false }), null);
  assert.equal(problemOf({ valid: false, valueMissing: true }), "missing");
  assert.equal(problemOf({ valid: false, valueMissing: false }), "invalid");
  assert.equal(errorLine(FIELD_ERRORS.email, "missing"), "Enter your work email address.");
  assert.equal(errorLine(FIELD_ERRORS.email, "invalid"), "Enter an email address like name@example.com.");
  assert.equal(errorLine(FIELD_ERRORS.name, "invalid"), "Enter your name.");
  assert.equal(errorLine({ missing: "Fixture missing.", invalid: undefined }, "invalid"), "Fixture missing.");
});

test("preselection: a value its select offers is chosen; an unknown, empty or differently cased one chooses nothing", () => {
  const offered = { industry: ["government", "accounting", "other"], interest: ["ai-evaluation", "evaluation-partner", "not-sure"] };
  assert.deepEqual(preselection("?industry=government", offered), { industry: "government" });
  assert.deepEqual(preselection("?interest=evaluation-partner", offered), { interest: "evaluation-partner" });
  assert.deepEqual(preselection("?industry=accounting&interest=not-sure", offered), { industry: "accounting", interest: "not-sure" });
  assert.deepEqual(preselection("?industry=government&industry=accounting", offered), { industry: "government" }, "the first value counts");
  for (const search of ["", "?", "?interest=pricing", "?industry=", "?industry=Government", "?size=Government", "?interest=%3Cb%3E"]) {
    assert.deepEqual(preselection(search, offered), {}, search);
  }
});

test("preselection: every /contact/ link the site builds (spec §10.1) preselects exactly its value", () => {
  const site = siteContext(true);
  const offered = {
    industry: [...site.industries.map((i) => i.id), "other"],
    interest: [...site.solutions.map((s) => s.id), ...EXTRA_INTERESTS.map((e) => e.id)],
  };
  for (const industry of site.industries.map((i) => i.id)) {
    assert.deepEqual(preselection(new URL(site.contact({ industry }), SITE_ORIGIN).search, offered), { industry });
  }
  for (const interest of offered.interest) {
    assert.deepEqual(preselection(new URL(site.contact({ interest }), SITE_ORIGIN).search, offered), { interest });
  }
});

test("rejectedFields: a local supported validation list or an object keyed by field, in form order; anything else names nothing", () => {
  assert.deepEqual(rejectedFields({ ok: false, errors: [{ field: "message", message: "Fixture" }, { field: "email", message: "Fixture" }] }), ["email", "message"]);
  assert.deepEqual(rejectedFields({ errors: { consent: "Fixture", name: ["Fixture"] } }), ["name", "consent"]);
  for (const body of [
    null, "Fixture", 42, {}, { errors: null }, { errors: [{ code: "EMPTY" }] }, { errors: [null, "email"] },
    { success: false, error: "EMPTY_SUBMISSION", code: 400 }, { errors: [{ field: "website" }] }, { errors: { _gotcha: "Fixture" } },
  ]) {
    assert.deepEqual(rejectedFields(body), [], JSON.stringify(body));
  }
});

/** Runs `fn(base)` against a fresh mock provider on a free port. */
async function withMock(fn) {
  const server = createMockForm();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
const post = (base, fields, headers = {}) =>
  fetch(`${base}/f/fixture-form`, { method: "POST", redirect: "manual", body: new URLSearchParams(fields), headers: { origin: PREVIEW_ORIGIN, ...headers } });
const logFor = async (base, organisation) => (await fetch(`${base}/__log?organisation=${encodeURIComponent(organisation)}`)).json();
const FORMSPARK = { [REDIRECT_FIELD]: `${SITE_ORIGIN}/preview/templates/sent/`, [APPEND_FIELD]: "false" };

test("mock provider: a plain POST is a 303 to the _redirect page on the posting origin, with nothing in its query string", async () => {
  await withMock(async (base) => {
    const res = await post(base, { ...FORMSPARK, ...ENQUIRY, [HONEYPOT_FIELD]: "" });
    assert.equal(res.status, 303);
    assert.equal(res.headers.get("location"), `${PREVIEW_ORIGIN}/preview/templates/sent/`);
    const log = await logFor(base, ENQUIRY.organisation);
    assert.deepEqual(log.delivered.map((f) => f.email), [ENQUIRY.email]);
    assert.deepEqual(log.spam, []);
    assert.deepEqual(await logFor(base, "Another Fixture Organisation"), { delivered: [], spam: [] });
    assert.equal((await fetch(`${base}/`)).status, 200, "Playwright's readiness check");
  });
});

test("mock provider: like Formspark, without _append=false the enquiry lands in the redirect's query string", async () => {
  await withMock(async (base) => {
    const res = await post(base, { [REDIRECT_FIELD]: FORMSPARK[REDIRECT_FIELD], ...ENQUIRY });
    assert.equal(res.status, 303);
    const location = new URL(res.headers.get("location"));
    assert.equal(location.pathname, "/preview/templates/sent/");
    assert.equal(location.searchParams.get("email"), ENQUIRY.email);
    assert.equal(location.searchParams.get("message"), ENQUIRY.message);
  });
});

test("mock provider: a redirect off the site, a POST with no Origin or Referer, and an incomplete enquiry are refused", async () => {
  await withMock(async (base) => {
    assert.equal((await post(base, { ...FORMSPARK, ...ENQUIRY, [REDIRECT_FIELD]: "https://example.com/fixture/sent/" })).status, 400);
    assert.equal((await post(base, { ...FORMSPARK, ...ENQUIRY, [REDIRECT_FIELD]: "/contact/sent/" })).status, 400);
    const bare = await fetch(`${base}/f/fixture-form`, { method: "POST", redirect: "manual", body: new URLSearchParams({ ...FORMSPARK, ...ENQUIRY }) });
    assert.equal(bare.status, 400);
    assert.equal((await post(base, { ...FORMSPARK, ...ENQUIRY, message: "" })).status, 400);
    assert.deepEqual(await logFor(base, ENQUIRY.organisation), { delivered: [], spam: [] });
  });
});

test("mock provider: with Accept: application/json, 200 and CORS for a complete enquiry, 422 naming what's wrong, and a filled honeypot accepted but dropped", async () => {
  await withMock(async (base) => {
    const json = { accept: "application/json" };
    const ok = await post(base, { ...FORMSPARK, ...ENQUIRY }, json);
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("access-control-allow-origin"), PREVIEW_ORIGIN);
    assert.deepEqual(await ok.json(), { ok: true });

    assert.deepEqual(problems({ ...ENQUIRY, email: "fixture@example" }).map((p) => p.field), ["email"], "the browser takes name@host; the provider doesn't");
    const rejected = await post(base, { ...FORMSPARK, ...ENQUIRY, email: "fixture@example", consent: "" }, json);
    assert.equal(rejected.status, 422);
    assert.equal(rejected.headers.get("access-control-allow-origin"), PREVIEW_ORIGIN);
    const body = await rejected.json();
    assert.deepEqual(rejectedFields(body), ["email", "consent"]);

    const organisation = "Fixture Spam Organisation";
    const spam = await post(base, { ...FORMSPARK, ...ENQUIRY, organisation, [HONEYPOT_FIELD]: "https://example.com/fixture-spam" }, json);
    assert.equal(spam.status, 200);
    const plainSpam = await post(base, { ...FORMSPARK, ...ENQUIRY, organisation, [HONEYPOT_FIELD]: "https://example.com/fixture-spam" });
    assert.equal(plainSpam.status, 303, "a bot sees the same redirect as a person");
    const log = await logFor(base, organisation);
    assert.equal(log.delivered.length, 0);
    assert.equal(log.spam.length, 2);

    const preflight = await fetch(`${base}/f/fixture-form`, { method: "OPTIONS", headers: { origin: PREVIEW_ORIGIN } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), PREVIEW_ORIGIN);
  });
});

test("mock provider: it reads the gallery form's field names, runs on the gallery form's port, and knows the site's origin", async () => {
  assert.equal(MOCK_FORM.redirectField, REDIRECT_FIELD);
  assert.deepEqual(MOCK_FORM.hiddenFields, { [APPEND_FIELD]: "false" });
  assert.equal(MOCK_FORM.honeypotField, HONEYPOT_FIELD);
  assert.equal(MOCK_FORM.formEndpoint, `http://127.0.0.1:${MOCK_FORM_PORT}/f/fixture-form`);
  // The names are valid contact data: only the loopback endpoint is a test double's.
  assert.ok(contactData.safeParse({ ...contactFixture, ...MOCK_FORM, formEndpoint: "https://example.com/fixture/form" }).success);
  assert.equal(contactData.safeParse({ ...contactFixture, ...MOCK_FORM }).success, false, "contactData takes https endpoints only");
  const { default: playwright } = await import("../playwright.config.mjs");
  const server = playwright.webServer.find((s) => s.command.includes("tests/support/mock-form.mjs"));
  assert.ok(server, "playwright.config.mjs doesn't start the mock provider");
  assert.equal(server.command, `node tests/support/mock-form.mjs ${MOCK_FORM_PORT}`);
  assert.equal(server.url, `http://127.0.0.1:${MOCK_FORM_PORT}/`);
  const { default: astro } = await import("../astro.config.mjs");
  assert.equal(SITE_ORIGIN, astro.site);
});

test("data: an enabled form has a confirmation route, disclosure and registered provider", () => {
  const status = (path) => PAGES.find((p) => p.path === path).status;
  const formLive = CONTACT.formEndpoint !== null;
  assert.equal(status("/contact/sent/") === "live", formLive, "/contact/sent/ goes live with the form endpoint, and only with it");
  if (formLive) {
    const html = readDist("contact/index.html");
    if (status("/legal/privacy/") !== "live") {
      const notice = one(html, "id", "enquiry-privacy");
      assert.ok(text(notice.inner).includes(CONTACT.formProvider.name));
      assert.ok(text(notice.inner).includes(CONTACT.emailProvider.name));
      assert.equal(tagged(html, "a").filter((a) => a.attrs.href === "#enquiry-privacy").length, 2);
    }
    assert.ok(CONTACT.subProcessors.some((s) => s.entity === CONTACT.formProvider?.name), "the Trust page's Part A table names the form provider (spec §8.11)");
  }
  const sent = PAGES.find((p) => p.path === "/contact/sent/");
  assert.equal(sent.noindex, true);
  assert.deepEqual(PAGES.filter((p) => p.noindex).map((p) => p.path), ["/contact/sent/"]);
  assert.match(source("src/pages/contact/sent/[...page].astro"), /gatedPaths\("\/contact\/sent\/", CONTACT\.formEndpoint !== null, /);
});

test("data: FormSubmit uses its native POST, redirect and honeypot contract with CAPTCHA retained", () => {
  assert.equal(CONTACT.formEndpoint, `https://formsubmit.co/${SITE.email}`);
  assert.equal(CONTACT.formProvider.name, "FormSubmit");
  assert.equal(CONTACT.submitMode, "native");
  assert.equal(CONTACT.redirectField, "_next");
  assert.equal(CONTACT.honeypotField, "_honey");
  assert.equal(CONTACT.hiddenFields._subject, "New Techsider website enquiry");
  assert.equal(CONTACT.hiddenFields._template, "table");
  assert.ok(!("_captcha" in CONTACT.hiddenFields), "provider spam protection must remain enabled");
  const form = one(readDist("contact/index.html"), "data-contact-form");
  assert.equal(form.attrs["data-submit-mode"], "native");
  assert.equal(controlNamed(form.inner, "_next").attrs.value, `${SITE_ORIGIN}/contact/sent/`);
});

test("gatedPaths: a gated page builds like any singleton page, but a live one whose gate is shut fails the build", () => {
  const sent = PAGES.find((p) => p.path === "/contact/sent/");
  const before = { status: sent.status, preview: process.env.TECHSIDER_NAV_PREVIEW };
  const built = [{ params: { page: undefined } }];
  try {
    delete process.env.TECHSIDER_NAV_PREVIEW;
    sent.status = "planned";
    assert.deepStrictEqual(gatedPaths("/contact/sent/", false, "fixture reason"), []);
    assert.deepStrictEqual(gatedPaths("/contact/sent/", true, "fixture reason"), []);
    sent.status = "live";
    assert.deepStrictEqual(gatedPaths("/contact/sent/", true, "fixture reason"), built);
    assert.throws(() => gatedPaths("/contact/sent/", false, "fixture reason"), { message: "nav.ts: /contact/sent/ is live, but fixture reason" });
    process.env.TECHSIDER_NAV_PREVIEW = "1";
    sent.status = "planned";
    assert.deepStrictEqual(gatedPaths("/contact/sent/", false, "fixture reason"), built, "the preview build shows planned pages");
  } finally {
    sent.status = before.status;
    if (before.preview === undefined) delete process.env.TECHSIDER_NAV_PREVIEW;
    else process.env.TECHSIDER_NAV_PREVIEW = before.preview;
  }
});

test("gallery: the form posts to the stand-in provider, its hidden fields first, and the honeypot carries the provider's name", () => {
  const form = galleryForm();
  assert.equal(form.attrs.action, MOCK_FORM.formEndpoint);
  assert.equal(form.attrs["data-sent"], fixtureSite.page("sent").href);
  assert.equal(fixtureSite.page("sent").href, "/preview/templates/sent/");
  const hidden = tagged(form.inner, "input").filter((i) => i.attrs.type === "hidden");
  assert.deepEqual(hidden.map((i) => [i.attrs.name, i.attrs.value]), [
    [MOCK_FORM.redirectField, `${SITE_ORIGIN}/preview/templates/sent/`],
    ...Object.entries(MOCK_FORM.hiddenFields),
  ]);
  assert.ok(form.inner.startsWith(hidden.map((i) => i.outer).join("")), "the provider's hidden fields don't open the form");
  const honeypot = one(form.inner, "data-honeypot");
  assert.deepEqual(tagged(honeypot.inner, "input").map((i) => i.attrs.name), [MOCK_FORM.honeypotField]);
});

test("gallery: every enquiry field has one empty, hidden error line carrying its words, and the empty polite summary sits above the fields", () => {
  const form = galleryForm();
  for (const name of ENQUIRY_FIELDS) {
    const control = controlNamed(form.inner, name);
    assert.ok(control, `no control named ${name}`);
    const error = one(form.inner, "data-error-for", name);
    assert.equal(error.name, "p", name);
    assert.equal(error.attrs.id, `${control.attrs.id}-error`, name);
    assert.ok("hidden" in error.attrs, `${name}'s error line shows before anything is wrong`);
    assert.equal(error.inner, "", name);
    assert.equal(decodeEntities(error.attrs["data-missing"]), FIELD_ERRORS[name].missing, name);
    assert.equal(error.attrs["data-invalid"] === undefined ? undefined : decodeEntities(error.attrs["data-invalid"]), FIELD_ERRORS[name].invalid, name);
    assert.ok(!(control.attrs["aria-describedby"] ?? "").includes(error.attrs.id), `${name} is described by its empty error line`);
    assert.ok(!("aria-invalid" in control.attrs), name);
  }
  const summary = one(form.inner, "data-form-summary");
  assert.equal(summary.attrs["aria-live"], "polite");
  assert.equal(summary.inner, "");
  assert.deepEqual(
    ["data-say-invalid", "data-say-sending", "data-say-unconfirmed"].map((a) => decodeEntities(summary.attrs[a])),
    [FORM_MESSAGES.invalid, FORM_MESSAGES.sending, FORM_MESSAGES.unconfirmed],
  );
  assert.ok(form.inner.indexOf(summary.outer) < form.inner.indexOf('class="contact-fields"'), "the summary isn't above the fields");
});

/** Whether a page runs the form's script: a module script, inline or loaded from _astro/, that finds the summary. */
function runsFormScript(dir, html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].some(([, attrs, code]) => {
    if (!/type="module"/.test(attrs)) return false;
    const src = attrs.match(/src="\/([^"]+)"/)?.[1];
    return (src ? readText(join(dir, src)) : code).includes("[data-form-summary]");
  });
}

test("the form's script loads only with the form: on the gallery's contact page, and on /contact/ once it has a form endpoint", () => {
  // /contact/ renders the form in both builds once src/data/contact.ts has an endpoint; until then only the gallery does.
  const contact = CONTACT.formEndpoint === null ? [] : ["contact/index.html"];
  const expected = { dist: contact, "dist-preview": [...contact, "preview/templates/contact/index.html"] };
  for (const [build, dir] of [["dist", join(ROOT, "dist")], ["dist-preview", join(ROOT, "dist-preview")]]) {
    const loading = [];
    for (const file of htmlFiles(dir)) {
      const html = readText(file);
      const rel = relPath(dir, file);
      const renders = elementsWith(html, "data-contact-form").length > 0;
      assert.equal(runsFormScript(dir, html), renders, `${build}/${rel}: ${renders ? "the form without its script" : "the script without the form"}`);
      if (renders) loading.push(rel);
    }
    assert.deepEqual(loading.sort(), expected[build].sort(), build);
  }
  // Astro inlines a script under 4 KB and emits a larger one to _astro/ whether or not a page renders
  // it. The script reads its words from the markup to stay under that limit.
  const chunks = readdirSync(join(ROOT, "dist", "_astro")).filter((f) => f.endsWith(".js"));
  for (const f of chunks) {
    assert.ok(!readText(join(ROOT, "dist", "_astro", f)).includes("[data-form-summary]"), `dist/_astro/${f} carries the form's script: it has outgrown Astro's 4 KB inline limit`);
  }
});

test("production: /contact/ has the form and /contact/sent/ is built exactly when formEndpoint is set, and the sitemap never lists /contact/sent/", () => {
  // Until the owner chooses a provider (formEndpoint null) neither exists: the pin on that is
  // "data: until the owner chooses a provider, …" above.
  const live = CONTACT.formEndpoint !== null;
  assert.equal(elementsWith(readDist("contact/index.html"), "data-contact-form").length, live ? 1 : 0);
  assert.equal(existsSync(join(ROOT, "dist", "contact", "sent")), live);
  const locs = [...readDist("sitemap-0.xml").matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  assert.ok(locs.includes("/contact/"));
  assert.ok(!locs.includes("/contact/sent/"));
});

test("preview: /contact/sent/ is built from the real contact data, noindex, with the reply time and the address as plain text, and the sitemap leaves it out", () => {
  const html = readPreviewDist("contact/sent/index.html");
  assert.equal((html.match(/<meta name="robots" content="noindex">/g) ?? []).length, 1);
  const main = mainOf(html);
  one(main, "data-template", "sent");
  assert.equal(tagged(main, "h1").length, 1);
  assert.equal(elementsWith(main, "data-reply-time").length, 0);
  const email = one(main, "data-email");
  assert.equal(text(email.inner), SITE.email);
  assert.equal(tagged(main, "a").filter((a) => a.attrs.href === `mailto:${SITE.email}`).length, 0, "the address is plain text");
  const locs = [...readPreviewDist("sitemap-0.xml").matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  assert.ok(locs.includes("/contact/"), "the preview sitemap has no /contact/");
  assert.ok(!locs.includes("/contact/sent/"), "the sitemap lists /contact/sent/, a noindex page");
});
