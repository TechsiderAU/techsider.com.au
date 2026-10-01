// The post-deploy live check (spec §11.3; scripts/ci/live-check.mjs), which deploy.yml runs against
// techsider.com.au after each deploy and daily. Every rule runs here against fixtures made from the
// built pages: the site as it is built, and the same pages after Cloudflare's Email Address
// Obfuscation and Rocket Loader would have rewritten them. A whole run is driven against a fake
// live site over dist/ with a fake clock, so no test touches the network or waits.
// Also: BaseLayout's build stamp, which the freshness poll reads.
// Run `npm run build && npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { htmlFiles, relPath } from "../scripts/ci/lib.mjs";
import {
  Blocked,
  DEFAULT_BASE,
  EDGE_SIGNATURES,
  MISSING_PATH,
  POLL_BUDGET_MS,
  STRICT_TXT_TYPE,
  USER_AGENT,
  edgeRewrites,
  emailProblems,
  isCdnBlock,
  isChallenge,
  liveCheck,
  main,
  plainText,
  securityTxtProblems,
  servedBuild,
  siteTargets,
  sitemapLocs,
  txtTypeProblem,
} from "../scripts/ci/live-check.mjs";
import { PAGES, SITE } from "../src/data/nav.ts";
import { buildStamp } from "../src/lib/build-stamp.ts";
import { SECURITY_TXT_PATH, securityTxt } from "../src/lib/security-txt.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = join(ROOT, "dist");
const EMAIL = SITE.email;
const SHA = "a".repeat(40);
const OLD_SHA = "b".repeat(40);
const T0 = Date.parse("2026-10-04T20:30:00Z");
const SECURITY_CONTACT = "security@example.com";
const TARGETS = { email: EMAIL, securityContact: SECURITY_CONTACT, industryPath: siteTargets().industryPath };
const SECURITY_TXT = securityTxt({ contact: SECURITY_CONTACT, site: DEFAULT_BASE, now: new Date(T0) });
const TEXT_PLAIN = { "content-type": "text/plain; charset=utf-8" };
const read = (rel) => readFileSync(join(DIST, rel), "utf8");
/** The four pages spec §11.3 names that every production build has: Home, Contact, an industry page and the 404. */
const EMAIL_FILES = ["index.html", "contact/index.html", `${TARGETS.industryPath.slice(1)}index.html`, "404.html"];

/** Cloudflare's Email Address Obfuscation, as it rewrites a page: every address outside <head>, and its decoder. */
function obfuscate(html, email = EMAIL) {
  const cut = html.indexOf("</head>");
  const body = html
    .slice(cut)
    .replaceAll(`href="mailto:${email}`, 'href="/cdn-cgi/l/email-protection#1c7d78717572')
    .replaceAll(email, '<span class="__cf_email__" data-cfemail="1c7d7871757252">[email&#160;protected]</span>')
    .replace("</body>", '<script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script></body>');
  return html.slice(0, cut) + body;
}

/** Cloudflare's Rocket Loader, as it rewrites a page: each module script's type, and its loader. */
function rocketLoad(html) {
  return html
    .replaceAll('type="module"', 'type="9f3c1a7e5b2d4c6e8a0b1c2d-module"')
    .replace("</body>", '<script src="/cdn-cgi/scripts/7d0fa10a/cloudflare-static/rocket-loader.min.js" data-cf-settings="9f3c1a7e5b2d4c6e8a0b1c2d-|49" defer></script></body>');
}

/** A page's <head> with a JSON-LD address in it, as the Organization carries one. */
function withHeadAddress(html) {
  return html.replace("</head>", `<script type="application/ld+json">{"@type":"Organization","email":"${EMAIL}"}</script></head>`);
}

/** Replaces the page's build stamp. */
const stamped = (html, sha) => html.replace(/<meta name="build" content="[^"]*"/, `<meta name="build" content="${sha}"`);

/** The dist/ file a path resolves to, as GitHub Pages resolves it, or null. */
function distFile(path) {
  const rel = decodeURIComponent(path).slice(1);
  const file = join(DIST, rel === "" || rel.endsWith("/") ? `${rel}index.html` : rel);
  return existsSync(file) ? file : null;
}

/**
 * A fake live site over dist/. It answers like GitHub Pages (a file, or 404.html with 404) and
 * serves the security.txt the route would build for `securityContact`. `serving(n)` is the build
 * stamp on the nth request, `edit(html, path)` stands in for Cloudflare, `files` overrides a path
 * (null: 404), and `headers` go on every response.
 */
function fakeSite({ serving = () => SHA, edit = (html) => html, files = {}, headers = {}, securityContact = SECURITY_CONTACT } = {}) {
  const requests = [];
  const answer = (body, status, type) => new Response(body, { status, headers: { ...type, ...headers } });
  const html = (body, status, path) => answer(edit(stamped(body, serving(requests.length)), path), status, { "content-type": "text/html; charset=utf-8" });
  const txt = securityTxt({ contact: securityContact, site: DEFAULT_BASE, now: new Date(T0) });
  const served = { [SECURITY_TXT_PATH]: { body: txt, headers: TEXT_PLAIN }, ...files };
  const fetch = async (url, init) => {
    const { pathname, search } = new URL(url);
    requests.push({ path: pathname + search, init });
    if (pathname in served) {
      const file = served[pathname];
      if (file === null) return html(read("404.html"), 404, pathname);
      if (typeof file === "function") return file(requests.length);
      return answer(file.body, file.status ?? 200, file.headers);
    }
    const file = distFile(pathname);
    if (file === null) return html(read("404.html"), 404, pathname);
    if (file.endsWith(".html")) return html(readFileSync(file, "utf8"), 200, pathname);
    return answer(readFileSync(file, "utf8"), 200, { "content-type": "application/xml" });
  };
  return { fetch, requests };
}

/** A clock that only moves when the check sleeps. */
function fakeClock() {
  let t = T0;
  const sleeps = [];
  return { sleeps, now: () => new Date(t), sleep: async (ms) => { sleeps.push(ms); t += ms; } };
}

/** One run over a fake site and a fake clock, with its log. */
async function run(site, options = {}) {
  const clock = fakeClock();
  const logged = [];
  const result = await liveCheck({ ...TARGETS, sha: SHA, runId: "42", fetch: site.fetch, sleep: clock.sleep, now: clock.now, log: (line) => logged.push(line), ...options });
  return { ...result, sleeps: clock.sleeps, logged };
}

/** The production pages the sitemap lists. */
function listedPaths() {
  return sitemapLocs(read("sitemap-index.xml")).flatMap((loc) => sitemapLocs(read(new URL(loc).pathname.slice(1)))).map((loc) => new URL(loc).pathname);
}

test("buildStamp: GITHUB_SHA when it is a full commit id, else 'local'", () => {
  assert.equal(buildStamp({ GITHUB_SHA: SHA }), SHA);
  assert.equal(buildStamp({ GITHUB_SHA: "c".repeat(64) }), "c".repeat(64), "a SHA-256 repository");
  for (const env of [{}, { GITHUB_SHA: "" }, { GITHUB_SHA: "main" }, { GITHUB_SHA: SHA.toUpperCase() }, { GITHUB_SHA: SHA.slice(1) }]) {
    assert.equal(buildStamp(env), "local", JSON.stringify(env));
  }
});

for (const build of ["dist", "dist-preview"]) {
  test(`${build}: every page carries one build stamp in its <head>, this build's, which servedBuild() reads`, () => {
    const files = htmlFiles(join(ROOT, build));
    assert.ok(files.length > 0, `${build} holds no page`);
    for (const file of files) {
      const html = readFileSync(file, "utf8");
      const head = html.slice(0, html.indexOf("</head>"));
      assert.equal(html.match(/<meta name="build"/g)?.length, 1, `${relPath(ROOT, file)}: build stamps`);
      assert.match(head, /<meta name="build" content="[^"]+">/, `${relPath(ROOT, file)}: the stamp isn't in <head>`);
      assert.equal(servedBuild(html), buildStamp(), relPath(ROOT, file));
    }
  });
}

test("plainText keeps a page's own text, and drops comments, attributes and what obfuscation skips", () => {
  const page = [
    `<html><head><title>${EMAIL}</title><script type="application/ld+json">{"email":"${EMAIL}"}</script></head>`,
    `<body><header><p>Head office</p></header><script>const e = "${EMAIL}";</script><noscript>${EMAIL}</noscript>`,
    `<textarea>${EMAIL}</textarea><!-- ${EMAIL} --><a href="mailto:${EMAIL}" data-copy="${EMAIL}">Email us</a>`,
    "<p>Fish &amp; chips&nbsp;&#8212;&#x2014;</p></body></html>",
  ].join("");
  assert.equal(plainText(page), "Head office Email us Fish & chips ——", "&nbsp; decodes to U+00A0, which the whitespace collapse folds into a space");
  assert.deepEqual(emailProblems({ path: "/x/", body: page }, EMAIL), [`/x/: ${EMAIL} isn't plain text in the page (outside <head>, <script> and attributes)`]);
  assert.deepEqual(emailProblems({ path: "/x/", body: page.replace("Email us", EMAIL) }, EMAIL), [], "an address as link text counts");
  assert.deepEqual(emailProblems({ path: "/x/", body: `<header><p>${EMAIL}</p></header>` }, EMAIL), [], "<header> isn't <head>");
  const quoted = `<p><a href="#" aria-label="Email us > ${EMAIL}" data-note='a > b'>Write to us</a></p>`;
  assert.equal(plainText(quoted), "Write to us", "a > inside a quoted attribute value doesn't end the tag, so the address in it stays out");
});

test("an apostrophe in an unquoted attribute cannot expose a later quoted address as page text", () => {
  const malformed = `<p><a data-x=it's title='a > ${EMAIL}'>Write</a></p>`;
  assert.equal(plainText(malformed), "Write");
  assert.equal(emailProblems({ path: "/x/", body: malformed }, EMAIL).length, 1);
  assert.deepEqual(emailProblems({ path: "/x/", body: malformed.replace("Write", EMAIL) }, EMAIL), []);
});

test("the built pages pass: the address is plain text on each page spec §11.3 names, and no page carries a Cloudflare signature", () => {
  for (const rel of EMAIL_FILES) assert.deepEqual(emailProblems({ path: rel, body: read(rel) }, EMAIL), [], rel);
  const clean = htmlFiles(DIST).flatMap((file) => edgeRewrites(readFileSync(file, "utf8")).map((found) => `${relPath(DIST, file)}: ${found}`));
  assert.deepEqual(clean, [], "the site's own copy must never hold a token the live check reads as Cloudflare's");
});

test("Email Address Obfuscation fails the page, even with the address still in its <head> JSON-LD", () => {
  for (const rel of EMAIL_FILES) {
    const rewritten = obfuscate(withHeadAddress(read(rel)));
    assert.ok(rewritten.slice(0, rewritten.indexOf("</head>")).includes(EMAIL), `${rel}: the fixture keeps the address in <head>`);
    assert.equal(emailProblems({ path: rel, body: rewritten }, EMAIL).length, 1, rel);
    const found = edgeRewrites(rewritten).map((f) => f.split(":")[0]);
    for (const token of ["/cdn-cgi/l/email-protection", "email-decode.min.js", "data-cfemail", "__cf_email__", "[email&#160;protected]"]) {
      assert.ok(found.includes(token), `${rel}: ${token} not caught`);
    }
  }
});

test("Rocket Loader fails the page: its loader, and a module script's rewritten type", () => {
  const home = read("index.html");
  assert.match(home, /type="module"/, "the fixture needs a module script to rewrite");
  const found = edgeRewrites(rocketLoad(home));
  assert.ok(found.includes("rocket-loader.min.js: Rocket Loader added its loader script"), found.join("\n"));
  assert.ok(found.some((f) => f.includes("Rocket Loader rewrote a script's type")), found.join("\n"));
  assert.deepEqual(edgeRewrites('<script type="9f3c1a7e5b2d4c6e8a0b1c2d-text/javascript">x()</script>'), [`<script type="<hex>-…">: Rocket Loader rewrote a script's type`]);
  assert.equal(EDGE_SIGNATURES.length, 7);
});

test("securityTxtProblems holds the served file to RFC 9116, and txtTypeProblem its Content-Type", () => {
  const url = new URL(SECURITY_TXT_PATH, DEFAULT_BASE).href;
  const now = new Date(T0);
  const served = (body, type = TEXT_PLAIN["content-type"], status = 200) => ({ url, status, headers: new Headers({ "content-type": type }), body });
  const problems = (res) => securityTxtProblems(res, { contact: SECURITY_CONTACT, now });
  assert.deepEqual(problems(served(SECURITY_TXT)), []);
  assert.deepEqual(problems(served("Not found", "text/html", 404)), [`${SECURITY_TXT_PATH}: HTTP 404, not 200`]);
  assert.deepEqual(problems(served(SECURITY_TXT, "application/octet-stream")), [], "the type is txtTypeProblem's to judge");
  assert.equal(txtTypeProblem(served(SECURITY_TXT)), null);
  assert.equal(txtTypeProblem(served(SECURITY_TXT, "text/plain;charset=UTF-8")), null, "case and spacing don't matter");
  assert.match(txtTypeProblem(served(SECURITY_TXT, "application/octet-stream")), /served as "application\/octet-stream", not text\/plain; charset=utf-8/);
  assert.match(txtTypeProblem(served(SECURITY_TXT, "text/plain")), /not text\/plain; charset=utf-8/, "the charset is required too");
  assert.match(problems(served(SECURITY_TXT.replace(SECURITY_CONTACT, "other@example.com")))[0], /no "Contact: mailto:security@example\.com" line/);
  assert.match(problems(served(`${SECURITY_TXT}Expires: 2027-01-01T00:00:00Z\n`))[0], /2 Expires fields/);
  assert.match(problems(served(SECURITY_TXT.replace(/^Expires: .*$/m, "Expires: soon")))[0], /Expires "soon" isn't a date/);
  assert.match(problems(served(SECURITY_TXT.replace(/^Expires: .*$/m, "Expires: 2026-10-20T00:00:00Z")))[0], /under 30 days away; has the weekly rebuild stopped\?/);
  assert.match(problems(served(SECURITY_TXT.replace(/^Expires: .*$/m, "Expires: 2028-01-01T00:00:00Z")))[0], /more than a year away/);
  assert.match(problems(served(SECURITY_TXT.replace(/^Canonical: .*$/m, "Canonical: https://example.com/.well-known/security.txt")))[0], /no "Canonical: https:\/\/techsider\.com\.au\/\.well-known\/security\.txt" line/);
});

test("siteTargets reads nav.ts: the contact address, the security contact and the first live industry page", () => {
  const first = PAGES.find((p) => p.base === "/industries/" && p.status === "live");
  assert.deepEqual(siteTargets(), { email: SITE.email, securityContact: SITE.securityContact, industryPath: first.path });
  assert.equal(TARGETS.industryPath, "/industries/government/");
  assert.throws(() => siteTargets(SITE, PAGES.filter((p) => p.base !== "/industries/")), /no live industry page/);
});

test("DEFAULT_BASE is astro.config.mjs's site, and a challenge is read from cf-mitigated", () => {
  assert.match(readFileSync(join(ROOT, "astro.config.mjs"), "utf8"), new RegExp(`site: "${DEFAULT_BASE.slice(0, -1)}"`));
  assert.equal(isChallenge(new Headers({ "cf-mitigated": "challenge" })), true);
  assert.equal(isChallenge(new Headers({ "cf-mitigated": "Challenge" })), true);
  assert.equal(isChallenge(new Headers({})), false);
});

test("a deploy run waits until the live site serves its commit, then checks every page: a clean site passes", async () => {
  const site = fakeSite({ serving: (n) => (n <= 2 ? OLD_SHA : SHA) });
  const { problems, warnings, checked, sleeps, logged } = await run(site);
  assert.deepEqual(problems, []);
  assert.deepEqual(warnings, []);
  assert.deepEqual(sleeps, [10_000, 20_000], "two polls saw the previous build");
  assert.deepEqual(site.requests.slice(0, 3).map((r) => r.path), ["/?__lc=42-1", "/?__lc=42-2", "/?__lc=42-3"], "each poll misses every cache");
  assert.ok(logged.includes(`the live site serves ${SHA}`));
  const after = site.requests.slice(3).map((r) => r.path);
  assert.ok(after.every((p) => !p.includes("__lc")), "the checks read the URLs visitors read");
  const listed = listedPaths();
  for (const path of [SECURITY_TXT_PATH, "/sitemap-index.xml", ...listed, "/contact/", TARGETS.industryPath, MISSING_PATH]) assert.ok(after.includes(path), `${path} not checked`);
  const form = /<form\b/i.test(read("contact/index.html"));
  assert.equal(after.includes("/contact/sent/"), form, "/contact/sent/ is checked exactly when /contact/ has a form");
  assert.equal(checked, after.length);
  for (const { init } of site.requests) {
    assert.equal(init.headers["user-agent"], USER_AGENT);
    assert.equal(init.redirect, "manual");
  }
});

test("the daily watch (no EXPECT_SHA) doesn't poll: it checks whatever is live", async () => {
  const site = fakeSite({ serving: () => OLD_SHA });
  const { problems, sleeps } = await run(site, { sha: "" });
  assert.deepEqual(problems, []);
  assert.deepEqual(sleeps, []);
  assert.ok(site.requests.every((r) => !r.path.includes("__lc")));
});

test("a live site that never serves the commit fails the run after the 15-minute budget", async () => {
  await assert.rejects(run(fakeSite({ serving: () => OLD_SHA })), (error) => {
    assert.ok(!(error instanceof Blocked));
    assert.equal(error.message, `the live site still serves ${OLD_SHA}, not ${SHA}, after ${POLL_BUDGET_MS / 60_000} minutes`);
    return true;
  });
});

test("Email Address Obfuscation on the live site fails every page, and names what it found", async () => {
  const { problems } = await run(fakeSite({ edit: (html) => obfuscate(html) }));
  for (const path of ["/", "/contact/", TARGETS.industryPath, MISSING_PATH]) {
    assert.ok(problems.includes(`${path}: ${EMAIL} isn't plain text in the page (outside <head>, <script> and attributes)`), path);
  }
  for (const path of listedPaths()) assert.ok(problems.includes(`${path}: email-decode.min.js: Email Address Obfuscation added its decoder script`), path);
});

test("Rocket Loader on the live site fails every page", async () => {
  const { problems } = await run(fakeSite({ edit: (html) => rocketLoad(html) }));
  for (const path of [...listedPaths(), MISSING_PATH]) assert.ok(problems.includes(`${path}: rocket-loader.min.js: Rocket Loader added its loader script`), path);
});

test("a Cloudflare challenge stops the run as a CDN block, not a site defect", async () => {
  const challenged = fakeSite({ files: { "/": () => new Response("<html>Just a moment...</html>", { status: 403, headers: { "cf-mitigated": "challenge", "content-type": "text/html" } }) } });
  await assert.rejects(run(challenged), (error) => {
    assert.ok(error instanceof Blocked);
    assert.match(error.message, /Cloudflare challenged the check \(cf-mitigated: challenge\)\. This is a CDN block, not a site defect/);
    return true;
  });
});

test("a 403 from Cloudflare's edge, with cf-ray and no page of the site's, is a CDN block too; a 403 that carries a site page isn't (controller ruling 4)", async () => {
  const ray = "8c1f0e2a3b4c5d6e-SYD";
  const refused = fakeSite({ files: { "/": () => new Response("<html><title>Attention Required! | Cloudflare</title></html>", { status: 403, headers: { "cf-ray": ray, "content-type": "text/html" } }) } });
  await assert.rejects(run(refused), (error) => {
    assert.ok(error instanceof Blocked);
    assert.match(error.message, new RegExp(`Cloudflare's edge refused the check \\(HTTP 403, cf-ray ${ray}, no page of the site's\\)\\. This is a CDN block, not a site defect`));
    return true;
  });
  // Every response through Cloudflare carries cf-ray: a 403 with one of the site's pages in it is the site's.
  const page = { body: stamped(read("404.html"), SHA), status: 403, headers: { "cf-ray": ray, "content-type": "text/html; charset=utf-8" } };
  const ours = await run(fakeSite({ files: { "/about/": page } }), { sha: "" });
  assert.deepEqual(ours.problems, ["/about/: HTTP 403, not 200"]);
  assert.equal(isCdnBlock(403, new Headers({}), "<html></html>"), false, "no cf-ray: not Cloudflare's answer");
  assert.equal(isCdnBlock(503, new Headers({ "cf-ray": ray }), "<html></html>"), false, "a 5xx is retried, then counted");
  assert.equal(isCdnBlock(200, new Headers({ "cf-mitigated": "challenge" }), ""), true);
});

test("security.txt served with another Content-Type is a warning until the owner has seen the live headers (STRICT_TXT_TYPE), then a problem (controller ruling 4)", async () => {
  assert.equal(STRICT_TXT_TYPE, false, "the owner has seen the live headers and set STRICT_TXT_TYPE: drop this line");
  const plain = { [SECURITY_TXT_PATH]: { body: SECURITY_TXT, headers: { "content-type": "text/plain" } } };
  const warned = await run(fakeSite({ files: plain }));
  assert.deepEqual(warned.problems, []);
  assert.deepEqual(warned.warnings, [`${SECURITY_TXT_PATH}: served as "text/plain", not text/plain; charset=utf-8 (RFC 9116 §3)`]);
  const strict = await run(fakeSite({ files: plain }), { strictTxtType: true });
  assert.deepEqual(strict.problems, warned.warnings);
  assert.deepEqual(strict.warnings, []);
});

test("security.txt: missing live, or not built because SITE.securityContact is null", async () => {
  const missing = await run(fakeSite({ files: { [SECURITY_TXT_PATH]: null } }));
  assert.deepEqual(missing.problems, [`${SECURITY_TXT_PATH}: HTTP 404, not 200`]);
  const site = fakeSite();
  const unset = await run(site, { securityContact: null });
  assert.deepEqual(unset.problems, [`${SECURITY_TXT_PATH}: SITE.securityContact is null in nav.ts, so the file isn't built (spec §12 item 7)`]);
  assert.ok(!site.requests.some((r) => r.path === SECURITY_TXT_PATH));
});

test("/contact/sent/ is checked once /contact/ has a form, since the sitemap leaves it out", async () => {
  const withForm = (html, path) => (path === "/contact/" ? html.replace("</main>", '<form method="post" action="https://forms.example.com/f/x"></form></main>') : html);
  const missing = await run(fakeSite({ edit: withForm, files: { "/contact/sent/": null } }));
  assert.deepEqual(missing.problems, ["/contact/sent/: HTTP 404, not 200"]);
  // A stand-in for the Sent page: any page with the address in its text.
  const sent = { body: stamped(read("contact/index.html"), SHA), headers: { "content-type": "text/html; charset=utf-8" } };
  const served = await run(fakeSite({ edit: withForm, files: { "/contact/sent/": sent } }));
  assert.deepEqual(served.problems, []);
  assert.equal(emailProblems({ path: "/contact/sent/", body: obfuscate(sent.body) }, EMAIL).length, 1, "and its address is held to plain text");
});

test("a 5xx is retried before it counts", async () => {
  let calls = 0;
  const flaky = () => (++calls === 1 ? new Response("busy", { status: 503 }) : new Response(read("sitemap-index.xml"), { headers: { "content-type": "application/xml" } }));
  const { problems, sleeps } = await run(fakeSite({ files: { "/sitemap-index.xml": flaky } }), { sha: "" });
  assert.deepEqual(problems, []);
  assert.deepEqual(sleeps, [5_000]);
});

test("main: exit 0 when clean, 1 on a problem (as while SITE.securityContact is null), 2 when Cloudflare blocks the check, 3 on warnings alone", async () => {
  const io = (site) => {
    const clock = fakeClock();
    const reports = [];
    const logs = [];
    return { reports, logs, options: { fetch: site.fetch, sleep: clock.sleep, now: clock.now, log: (line) => logs.push(line), report: (line) => reports.push(line) } };
  };
  const env = { EXPECT_SHA: SHA, GITHUB_RUN_ID: "7", BASE_URL: DEFAULT_BASE };
  const clean = io(fakeSite());
  assert.equal(await main({ env, targets: TARGETS, ...clean.options }), 0);
  assert.deepEqual(clean.reports, []);
  const own = io(fakeSite({ securityContact: SITE.securityContact ?? SECURITY_CONTACT }));
  assert.equal(await main({ env, ...own.options }), SITE.securityContact === null ? 1 : 0, "nav.ts's own targets");
  if (SITE.securityContact === null) assert.match(own.reports[0], /SITE\.securityContact is null in nav\.ts/);
  const blocked = io(fakeSite({ headers: { "cf-mitigated": "challenge" } }));
  assert.equal(await main({ env, targets: TARGETS, ...blocked.options }), 2);
  assert.match(blocked.reports[0], /^live-check: BLOCKED: /);
  // deploy.yml's step lets exit 3 pass: the ::warning:: line annotates the run instead.
  const typed = io(fakeSite({ files: { [SECURITY_TXT_PATH]: { body: SECURITY_TXT, headers: { "content-type": "text/plain" } } } }));
  assert.equal(await main({ env, targets: TARGETS, ...typed.options }), 3);
  assert.match(typed.reports[0], /^live-check: OK with 1 warning\(s\)/);
  assert.ok(typed.logs.includes(`::warning title=live-check::${SECURITY_TXT_PATH}: served as "text/plain", not text/plain; charset=utf-8 (RFC 9116 §3)`), typed.logs.join("\n"));
});
