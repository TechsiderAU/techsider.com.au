// Spec §11.3's post-deploy check, run by deploy.yml's live-check job against the LIVE domain,
// because Cloudflare rewrites HTML at the edge after every build-time check (spec §12 item 1):
// 1. Freshness. With EXPECT_SHA set (a deploy run), it polls the home page, cache-busted, until its
//    <meta name="build"> is this run's commit, for up to 15 minutes. The daily watch run sets no
//    EXPECT_SHA and checks whatever is live.
// 2. /.well-known/security.txt (RFC 9116): HTTP 200 as text/plain; charset=utf-8, Contact the
//    security address, one Expires at least 30 days away, and a Canonical naming its own URL.
// 3. A contact address on /, /contact/, the first live industry page, the 404 and, once the form
//    exists, /contact/sent/. Accept plain text or the owner's retained Cloudflare-protected
//    contact link, verifying the exact mailbox and the decoder. Metadata alone does not count.
// 4. No Rocket Loader in any response: every sitemap page, security.txt, the 404 and /contact/sent/.
//    Email Address Obfuscation is explicitly retained and disclosed (owner, 2 October 2026).
// A Cloudflare challenge (cf-mitigated: challenge), or a 403 from Cloudflare's edge (cf-ray, and no
// page of the site's in it), stops the run as a CDN block, not a site defect. A security.txt served
// with another Content-Type is a warning until STRICT_TXT_TYPE is set (controller ruling 4).
// No dependencies: Node's fetch, nav.ts and src/lib/security-txt.ts (TypeScript with no imports).
//   node scripts/ci/live-check.mjs        env: EXPECT_SHA, BASE_URL, GITHUB_RUN_ID (all optional)
// Exit codes: 0 clean; 1 a problem, or the site never served EXPECT_SHA; 2 Cloudflare blocked the
// check; 3 warnings alone, which deploy.yml's step lets pass (the ::warning:: line annotates the run).
// tests/live-check.test.mjs runs it against a fake site made from the built pages.
import { pathToFileURL } from "node:url";
import { PAGES, SITE } from "../../src/data/nav.ts";
import { SECURITY_TXT_PATH } from "../../src/lib/security-txt.ts";

/** The live site: astro.config.mjs's `site`, with its trailing slash. */
export const DEFAULT_BASE = "https://techsider.com.au/";
/**
 * A browser-like user agent that names the check: Cloudflare's Browser Integrity Check challenges
 * a request with no user agent or an unusual one.
 */
export const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) techsider-live-check/1.0 (+https://techsider.com.au/)";
/** How long a deploy run waits for the live site to serve its commit. */
export const POLL_BUDGET_MS = 15 * 60_000;
/** A path no page lives at: GitHub Pages answers it with dist/404.html and status 404. */
export const MISSING_PATH = "/live-check-no-such-page/";
/** Days Expires must still be away. The weekly rebuild keeps it 173 or more; fewer means the deploys stopped. */
export const EXPIRES_MIN_DAYS = 30;
/**
 * Whether a security.txt served with another Content-Type fails the run (controller ruling 4).
 * GitHub Pages sets the type from the file's extension, and no one has seen its headers for this
 * file on the live domain yet. Until the owner has, once, after the first deploy, a wrong type is a
 * warning: the run exits 3, which deploy.yml's step lets pass with an annotation. Once the live
 * headers have been seen, set this to true, and a wrong type fails the run like any other problem.
 */
export const STRICT_TXT_TYPE = false;
/** Owner decision, 2 October 2026: retain email harvesting protection. Trust discloses its decoder. */
export const ALLOW_EMAIL_OBFUSCATION = true;
/** What Cloudflare's edge features leave in a response (spec §12 item 1), and what each means. */
export const EDGE_SIGNATURES = [
  ["/cdn-cgi/l/email-protection", "Email Address Obfuscation rewrote a mailto: link"],
  ["email-decode.min.js", "Email Address Obfuscation added its decoder script"],
  ["data-cfemail", "Email Address Obfuscation encoded an address"],
  ["__cf_email__", "Email Address Obfuscation encoded an address"],
  ["[email&#160;protected]", "Email Address Obfuscation hid an address"],
  ["[email protected]", "Email Address Obfuscation hid an address"],
  ["rocket-loader.min.js", "Rocket Loader added its loader script"],
];
/** Rocket Loader's rewritten script type ("<hex>-text/javascript", "<hex>-module"). A heuristic: Cloudflare's docs don't print it. */
export const ROCKET_TYPE = /<script\b[^>]*\btype=["'][0-9a-f]{8,}-(?:text\/javascript|module)["']/i;
/** Elements whose content Email Address Obfuscation leaves alone, so an address inside them proves nothing. */
const UNREWRITTEN = ["head", "script", "style", "noscript", "textarea", "xmp"];
/** Strip tags with quote handling only at attribute-value boundaries. An apostrophe inside an
 * unquoted value (data-x=it's) does not open a quote. An unfinished quoted tag consumes the rest
 * conservatively, so an attribute cannot become evidence of a visible email address. */
function stripTags(html) {
  let out = "", start = 0;
  for (let i = 0; i < html.length; i++) {
    if (html[i] !== "<") continue;
    out += html.slice(start, i) + " ";
    let quote = null, beforeValue = false, unquoted = false;
    for (i++; i < html.length; i++) {
      const ch = html[i];
      if (quote !== null) {
        if (ch === quote) quote = null;
        continue;
      }
      if (beforeValue) {
        if (/\s/.test(ch)) continue;
        beforeValue = false;
        if (ch === '"' || ch === "'") { quote = ch; continue; }
        unquoted = true;
      }
      if (ch === ">") break;
      if (/\s/.test(ch)) unquoted = false;
      else if (!unquoted && ch === "=") beforeValue = true;
    }
    start = i + 1;
  }
  return out + html.slice(start);
}
const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: "\u00a0" };
const DAY_MS = 86_400_000;

/** Cloudflare challenged the request: nothing the check would read is the site's own response. */
export class Blocked extends Error {}

/** The commit a page was built from (its <meta name="build">, which BaseLayout writes), or null. */
export function servedBuild(html) {
  return /<meta name="build" content="([^"]*)"/.exec(html)?.[1] ?? null;
}

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
    if (name[0] !== "#") return NAMED_ENTITIES[name.toLowerCase()] ?? entity;
    return String.fromCodePoint(name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1)));
  });
}

/** A page's own text: comments and the elements obfuscation skips removed, then every tag, so no attribute counts. */
export function plainText(html) {
  let out = html.replace(/<!--[\s\S]*?-->/g, " ");
  for (const tag of UNREWRITTEN) out = out.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, "gi"), " ");
  return decodeEntities(stripTags(out)).replace(/\s+/g, " ").trim();
}

/** The Cloudflare rewrites a response body carries, each as "<token>: <what it means>". */
export function edgeRewrites(body, { allowEmailObfuscation = false } = {}) {
  const found = EDGE_SIGNATURES.filter(([token, what]) => body.includes(token) &&
    !(allowEmailObfuscation && what.startsWith("Email Address Obfuscation"))).map(([token, what]) => `${token}: ${what}`);
  if (ROCKET_TYPE.test(body)) found.push(`<script type="<hex>-…">: Rocket Loader rewrote a script's type`);
  return found;
}

/** True for a Cloudflare challenge response (https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/detect-response/). */
export function isChallenge(headers) {
  return (headers.get("cf-mitigated") ?? "").toLowerCase() === "challenge";
}

/**
 * True when Cloudflare's edge answered instead of the site: a challenge, or a 403 that Cloudflare
 * served (every response through it carries cf-ray) with no page of the site in it (no build stamp),
 * such as a WAF or Bot Fight Mode block (controller ruling 4). GitHub Pages never answers 403 with
 * one of the site's pages, and a 5xx is retried, then counted as the site's.
 */
export function isCdnBlock(status, headers, body) {
  if (isChallenge(headers)) return true;
  return status === 403 && headers.has("cf-ray") && servedBuild(body) === null;
}

/** Every <loc> in a sitemap or sitemap index. */
export function sitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
}

/**
 * RFC 9116 on the served file: HTTP 200; a Contact of mailto:<contact> (§2.5.3); exactly one
 * Expires (§2.5.5), at least EXPIRES_MIN_DAYS away and less than a year; and a Canonical naming the
 * URL it was fetched from (§2.5.2). Its Content-Type is txtTypeProblem()'s to judge.
 */
export function securityTxtProblems({ url, status, body }, { contact, now }) {
  if (status !== 200) return [`${SECURITY_TXT_PATH}: HTTP ${status}, not 200`];
  const problems = [];
  const fields = [...body.matchAll(/^([A-Za-z-]+):[ \t]*(.*?)[ \t]*\r?$/gm)].map((m) => [m[1].toLowerCase(), m[2]]);
  const values = (name) => fields.filter(([field]) => field === name).map(([, value]) => value);
  if (!values("contact").includes(`mailto:${contact}`)) problems.push(`${SECURITY_TXT_PATH}: no "Contact: mailto:${contact}" line`);
  const expires = values("expires");
  if (expires.length !== 1) {
    problems.push(`${SECURITY_TXT_PATH}: ${expires.length} Expires fields; RFC 9116 §2.5.5 wants exactly one`);
  } else {
    const days = (Date.parse(expires[0]) - now.getTime()) / DAY_MS;
    if (Number.isNaN(days)) problems.push(`${SECURITY_TXT_PATH}: Expires "${expires[0]}" isn't a date`);
    else if (days < EXPIRES_MIN_DAYS) problems.push(`${SECURITY_TXT_PATH}: Expires ${expires[0]} is under ${EXPIRES_MIN_DAYS} days away; has the weekly rebuild stopped?`);
    else if (days > 366) problems.push(`${SECURITY_TXT_PATH}: Expires ${expires[0]} is more than a year away (RFC 9116 §2.5.5)`);
  }
  if (!values("canonical").includes(url)) {
    problems.push(`${SECURITY_TXT_PATH}: no "Canonical: ${url}" line; RFC 9116 §2.5.2 says not to trust a file served from a URL its Canonical doesn't list`);
  }
  return problems;
}

/** RFC 9116 §3 on the served file's type, text/plain with charset=utf-8: the problem, or null. */
export function txtTypeProblem({ headers }) {
  const type = headers.get("content-type") ?? "";
  if (/^text\/plain\s*(?:;|$)/i.test(type) && /;\s*charset=utf-8\s*(?:;|$)/i.test(type)) return null;
  return `${SECURITY_TXT_PATH}: served as "${type}", not text/plain; charset=utf-8 (RFC 9116 §3)`;
}

/** Spec §1 criterion 3: the address in the page's own text, which is what a visitor reads. */
export function emailProblems({ path, body }, email, { allowEmailObfuscation = false } = {}) {
  if (plainText(body).includes(email)) return [];
  if (allowEmailObfuscation) {
    // Check a real protected contact link, not an address in head metadata, script or an unrelated attribute.
    const publicBody = body.replace(/<!--[\s\S]*?-->/g, " ").replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, " ");
    let visibleBody = publicBody;
    for (const tag of UNREWRITTEN) visibleBody = visibleBody.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, "gi"), " ");
    const encoded = [...visibleBody.matchAll(/<a\b[^>]*\shref=["']\/cdn-cgi\/l\/email-protection#([0-9a-f]+)["'][^>]*>/gi)];
    const matches = encoded.some(([, hex]) => {
      if (hex.length < 4 || hex.length % 2) return false;
      const key = parseInt(hex.slice(0, 2), 16);
      const address = Buffer.from(hex.slice(2).match(/../g).map(byte => parseInt(byte, 16) ^ key)).toString("utf8");
      return address === email;
    });
    const decoder = /<script\b[^>]*\ssrc=["']\/cdn-cgi\/scripts\/[0-9a-f]+\/cloudflare-static\/email-decode\.min\.js["'][^>]*>/i.test(publicBody);
    if (matches && decoder) return [];
    return [`${path}: ${email} has neither plain text nor a matching Cloudflare-protected contact link with its decoder`];
  }
  return [`${path}: ${email} isn't plain text in the page (outside <head>, <script> and attributes)`];
}

/** What nav.ts gives the check: the contact address, the security contact and the first live industry page. */
export function siteTargets(site = SITE, pages = PAGES) {
  const industry = pages.find((p) => p.base === "/industries/" && p.status === "live");
  if (!industry) throw new Error("nav.ts has no live industry page to check");
  return { email: site.email, securityContact: site.securityContact, industryPath: industry.path };
}

/**
 * One run against the live site. Every request goes through `fetch` and every wait through
 * `sleep`, so the tests drive it with a fake site and a fake clock. Resolves to
 * { problems, warnings, checked }, where `checked` counts the responses read after the freshness
 * poll, and `warnings` holds security.txt's wrong Content-Type while `strictTxtType` is false.
 * Rejects with Blocked when Cloudflare's edge answers instead of the site (isCdnBlock), and with an
 * Error when the site never serves `sha` within `pollBudgetMs`.
 */
export async function liveCheck({
  base = DEFAULT_BASE,
  sha = "",
  runId = "local",
  email,
  securityContact,
  industryPath,
  fetch = globalThis.fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => new Date(),
  log = console.log,
  pollBudgetMs = POLL_BUDGET_MS,
  strictTxtType = STRICT_TXT_TYPE,
  allowEmailObfuscation = ALLOW_EMAIL_OBFUSCATION,
}) {
  const get = async (path, bust = "") => {
    const url = new URL(path, base);
    if (bust) url.searchParams.set("__lc", bust);
    for (let attempt = 1; ; attempt++) {
      let res;
      let body;
      try {
        res = await fetch(url, {
          redirect: "manual",
          signal: AbortSignal.timeout(30_000),
          headers: { "user-agent": USER_AGENT, accept: "text/html,text/plain;q=0.9,*/*;q=0.5" },
        });
        body = await res.text();
      } catch (error) {
        if (attempt >= 3) throw new Error(`${url.href}: ${error instanceof Error ? error.message : error}`);
        await sleep(5_000 * attempt);
        continue;
      }
      if (isCdnBlock(res.status, res.headers, body)) {
        const why = isChallenge(res.headers)
          ? "Cloudflare challenged the check (cf-mitigated: challenge)"
          : `Cloudflare's edge refused the check (HTTP 403, cf-ray ${res.headers.get("cf-ray")}, no page of the site's)`;
        throw new Blocked(
          `${url.href}: ${why}. This is a CDN block, not a site defect: ` +
            "let the GitHub runner through Bot Fight Mode, the WAF or the Browser Integrity Check, then re-run the job.",
        );
      }
      if ((res.status >= 500 || res.status === 429) && attempt < 3) {
        log(`${res.status} ${url.pathname}${url.search}: retrying`);
        await sleep(5_000 * attempt);
        continue;
      }
      log(`${res.status} ${res.headers.get("cf-cache-status") ?? "-"} age=${res.headers.get("age") ?? "-"} ${url.pathname}${url.search}`);
      return { url: url.href, path, status: res.status, headers: res.headers, body };
    }
  };

  if (sha) {
    const start = now().getTime();
    for (let n = 1; ; n++) {
      const home = await get("/", `${runId}-${n}`).catch((error) => {
        if (error instanceof Blocked) throw error;
        log(`poll ${n}: ${error.message}`);
        return null;
      });
      const live = home && servedBuild(home.body);
      if (live === sha) break;
      if (now().getTime() - start >= pollBudgetMs) {
        throw new Error(`the live site still serves ${live ?? "no build stamp"}, not ${sha}, after ${pollBudgetMs / 60_000} minutes`);
      }
      await sleep(Math.min(30_000, 10_000 * n));
    }
    log(`the live site serves ${sha}`);
  }

  const problems = [];
  const warnings = [];
  let checked = 0;
  const read = (path) => {
    checked++;
    return get(path);
  };
  const inspect = (res, { status = 200, emailPage = false } = {}) => {
    if (res.status !== status) {
      problems.push(`${res.path}: HTTP ${res.status}, not ${status}`);
      return;
    }
    problems.push(...edgeRewrites(res.body, { allowEmailObfuscation }).map((found) => `${res.path}: ${found}`));
    if (emailPage) problems.push(...emailProblems(res, email, { allowEmailObfuscation }));
  };

  if (securityContact === null) {
    problems.push(`${SECURITY_TXT_PATH}: SITE.securityContact is null in nav.ts, so the file isn't built (spec §12 item 7)`);
  } else {
    const file = await read(SECURITY_TXT_PATH);
    problems.push(...securityTxtProblems(file, { contact: securityContact, now: now() }));
    if (file.status === 200) {
      const type = txtTypeProblem(file);
      if (type !== null) (strictTxtType ? problems : warnings).push(type);
      inspect(file);
    }
  }

  const index = await read("/sitemap-index.xml");
  if (index.status !== 200) problems.push(`/sitemap-index.xml: HTTP ${index.status}, not 200`);
  const listed = new Set();
  for (const loc of index.status === 200 ? sitemapLocs(index.body) : []) {
    const sitemap = await read(new URL(loc).pathname);
    if (sitemap.status !== 200) problems.push(`${sitemap.path}: HTTP ${sitemap.status}, not 200`);
    else for (const page of sitemapLocs(sitemap.body)) listed.add(new URL(page).pathname);
  }
  if (listed.size === 0) problems.push("the sitemap lists no page");

  const emailPaths = new Set(["/", "/contact/", industryPath]);
  let contactForm = false;
  for (const path of new Set([...emailPaths, ...listed])) {
    const page = await read(path);
    inspect(page, { emailPage: emailPaths.has(path) });
    if (path === "/contact/") contactForm = /<form\b/i.test(page.body);
  }
  // /contact/sent/ is built once the form has an endpoint, and it is noindex, so the sitemap leaves it out.
  if (contactForm) inspect(await read("/contact/sent/"), { emailPage: true });
  else log("/contact/ has no form, so /contact/sent/ isn't built: skipped");
  inspect(await read(MISSING_PATH), { status: 404, emailPage: true });
  return { problems, warnings, checked };
}

/** The command: reads the environment, runs the check, prints the outcome and returns the exit code. */
export async function main({ env = process.env, targets = siteTargets(), report = console.error, log = console.log, ...io } = {}) {
  try {
    const { problems, warnings, checked } = await liveCheck({
      base: env.BASE_URL || DEFAULT_BASE,
      sha: env.EXPECT_SHA ?? "",
      runId: env.GITHUB_RUN_ID ?? String(Date.now()),
      ...targets,
      log,
      ...io,
    });
    // GitHub Actions turns a ::warning:: line in the log into an annotation on the run.
    for (const warning of warnings) log(`::warning title=live-check::${warning}`);
    if (problems.length > 0) {
      report(`live-check: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join("\n")}`);
      return 1;
    }
    if (warnings.length > 0) {
      report(`live-check: OK with ${warnings.length} warning(s) (${checked} responses)\n${warnings.map((w) => `  - ${w}`).join("\n")}`);
      return 3;
    }
    log(`live-check: OK (${checked} responses)`);
    return 0;
  } catch (error) {
    const blocked = error instanceof Blocked;
    report(`live-check: ${blocked ? "BLOCKED" : "FAILED"}: ${error instanceof Error ? error.message : error}`);
    return blocked ? 2 : 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
