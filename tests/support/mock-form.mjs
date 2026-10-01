// A local stand-in for a hosted form provider, for the browser tests (Phase E Task 1). The gallery's
// contact page (/preview/templates/contact/) posts its enquiry here: playwright.config.mjs starts
// `node tests/support/mock-form.mjs 4324` beside the two static servers, on the port that
// src/preview/mock-form.ts names. In what the site relies on, it behaves like Formspark, the
// research's first choice (documentation.formspark.io):
// - POST /f/<form id>, urlencoded, as a form sends it without JavaScript: a 303 to the URL in
//   `_redirect`. That URL is on the site's own origin (astro.config.mjs `site`), so the mock sends
//   the browser to the same path on the origin the form was served from (its Origin header), and
//   the test lands on the local build. Unless `_append` is "false", the enquiry's fields go into the
//   redirect's query string, as Formspark's do. A redirect off the site is refused (400), and so is
//   an incomplete enquiry, which the browser's own validation never sends.
// - The same POST with `Accept: application/json`, as the form's script sends it: 200 `{ ok: true }`,
//   or 422 `{ ok: false, errors: [{ field, message }] }`, with CORS headers for the page's origin.
//   Formspark documents only that a JSON request is answered in JSON and that `response.ok` tells
//   success; the 422 body is this local mock's supported validation shape, not verified vendor
//   behaviour. It lets tests exercise field errors; the chosen provider needs its own check.
// - A filled `_gotcha` honeypot is answered as a success and never delivered.
// - GET /__log?organisation=<name> lists what was delivered and what was dropped as spam for that
//   organisation, so tests running in parallel each read their own enquiries. GET / answers
//   Playwright's readiness check.
// No dependencies. createMockForm() returns the server unstarted, so tests/contact-form.test.mjs
// can run it on a free port.
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { ENQUIRY_FIELDS, MESSAGE_MAX } from "../../src/lib/contact-form.ts";

export const SITE_ORIGIN = "https://techsider.com.au";
export const REDIRECT_FIELD = "_redirect";
export const APPEND_FIELD = "_append";
export const HONEYPOT_FIELD = "_gotcha";
// Stricter than the browser's type="email", which accepts "name@host": the domain needs a dot, so a
// test can send an address the browser accepts and the provider rejects.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Why a provider would reject `fields` (an object of strings): `[{ field, message }]`, empty when complete. */
export function problems(fields) {
  const found = [];
  for (const field of ENQUIRY_FIELDS) {
    if ((fields[field] ?? "").trim() === "") found.push({ field, message: "Fixture provider: this field is required" });
  }
  if (fields.email && !EMAIL.test(fields.email)) found.push({ field: "email", message: "Fixture provider: not an email address" });
  if ((fields.message ?? "").length > MESSAGE_MAX) found.push({ field: "message", message: "Fixture provider: too long" });
  return found;
}

const html = (title) => `<!doctype html><html lang="en"><title>${title}</title><h1>${title}</h1></html>`;

/** The origin the posting page was served from: its Origin header, else its Referer's; null without either. */
function postingOrigin(req) {
  const origin = req.headers.origin;
  if (origin && origin !== "null") return origin;
  try {
    return new URL(req.headers.referer ?? "").origin;
  } catch {
    return null;
  }
}

async function readFields(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Object.fromEntries(new URLSearchParams(Buffer.concat(chunks).toString("utf8")));
}

export function createMockForm() {
  const log = { delivered: [], spam: [] };
  return createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://mock");
    const cors = { "access-control-allow-origin": req.headers.origin ?? "*", vary: "Origin" };
    try {
      if (req.method === "GET" && url.pathname === "/") {
        res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }).end("Fixture form provider");
        return;
      }
      if (req.method === "GET" && url.pathname === "/__log") {
        const organisation = url.searchParams.get("organisation");
        const mine = (list) => list.filter((f) => f.organisation === organisation);
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ delivered: mine(log.delivered), spam: mine(log.spam) }));
        return;
      }
      if (!url.pathname.startsWith("/f/")) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
        return;
      }
      if (req.method === "OPTIONS") {
        res.writeHead(204, { ...cors, "access-control-allow-methods": "POST", "access-control-allow-headers": "accept, content-type" }).end();
        return;
      }
      if (req.method !== "POST") {
        res.writeHead(405, { allow: "POST, OPTIONS" }).end();
        return;
      }
      if (!(req.headers["content-type"] ?? "").startsWith("application/x-www-form-urlencoded")) {
        res.writeHead(415, cors).end();
        return;
      }
      const fields = await readFields(req);
      const json = (req.headers.accept ?? "").includes("application/json");
      const found = problems(fields);
      if (json) {
        if (found.length > 0) {
          res.writeHead(422, { ...cors, "content-type": "application/json" }).end(JSON.stringify({ ok: false, errors: found }));
          return;
        }
        (fields[HONEYPOT_FIELD] ? log.spam : log.delivered).push(fields);
        res.writeHead(200, { ...cors, "content-type": "application/json" }).end(JSON.stringify({ ok: true }));
        return;
      }
      if (found.length > 0) {
        res.writeHead(400, { "content-type": "text/html; charset=utf-8" }).end(html("Fixture provider: the enquiry was rejected"));
        return;
      }
      const redirect = fields[REDIRECT_FIELD];
      if (redirect === undefined) {
        (fields[HONEYPOT_FIELD] ? log.spam : log.delivered).push(fields);
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(html("Fixture provider's own thank-you page"));
        return;
      }
      let target;
      try {
        target = new URL(redirect);
      } catch {
        target = null;
      }
      const origin = postingOrigin(req);
      if (target === null || target.origin !== SITE_ORIGIN || origin === null) {
        res.writeHead(400, { "content-type": "text/html; charset=utf-8" }).end(html("Fixture provider: the redirect isn't on the site"));
        return;
      }
      (fields[HONEYPOT_FIELD] ? log.spam : log.delivered).push(fields);
      const location = new URL(`${target.pathname}${target.search}`, origin);
      if (fields[APPEND_FIELD] !== "false") {
        for (const [key, value] of Object.entries(fields)) if (key !== REDIRECT_FIELD && key !== APPEND_FIELD) location.searchParams.append(key, value);
      }
      res.writeHead(303, { location: location.href }).end();
    } catch {
      res.writeHead(500).end();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.argv[2] ?? "4324");
  createMockForm().listen(port, "127.0.0.1", () => console.log(`mock form provider on http://127.0.0.1:${port}`));
}
