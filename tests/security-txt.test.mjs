// RFC 9116 security.txt (spec §11.3, §12 item 7): src/lib/security-txt.ts writes it, and the route
// src/pages/.well-known/[name].txt.ts builds /.well-known/security.txt only once SITE.securityContact
// is set. The e2e static server serves it as text/plain; charset=utf-8, as RFC 9116 §3 requires.
// scripts/ci/live-check.mjs checks the live file (tests/live-check.test.mjs).
// The build tests read dist/ and dist-preview/: run `npm run build && npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "../src/data/nav.ts";
import { CONTACT } from "../src/data/contact.ts";
import { TRUST } from "../src/data/trust.ts";
import { SECURITY_TXT_DAYS, SECURITY_TXT_PATH, securityTxt, securityTxtExpires, securityTxtPaths } from "../src/lib/security-txt.ts";
import { GET, getStaticPaths } from "../src/pages/.well-known/[name].txt.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SITE_URL = "https://techsider.com.au";
const CANONICAL = `${SITE_URL}${SECURITY_TXT_PATH}`;
const CONTACT_ADDRESS = "security@example.com";
const NOW = new Date("2026-09-30T13:45:00Z");
const TEXT_PLAIN = "text/plain; charset=utf-8";
const DAY_MS = 86_400_000;

test("Expires is UTC midnight of the build day plus 180 days, so every build that day writes the same file", () => {
  assert.equal(SECURITY_TXT_DAYS, 180);
  assert.equal(securityTxtExpires(NOW), "2027-03-29T00:00:00Z");
  for (const time of ["2026-09-30T00:00:00Z", "2026-09-30T23:59:59.999Z"]) assert.equal(securityTxtExpires(new Date(time)), "2027-03-29T00:00:00Z", time);
  assert.equal(securityTxtExpires(new Date("2026-10-01T00:00:00Z")), "2027-03-30T00:00:00Z");
});

test("the file: Contact and Expires (RFC 9116's required fields), Preferred-Languages and Canonical, one per line, LF-ended", () => {
  const text = securityTxt({ contact: CONTACT_ADDRESS, site: SITE_URL, now: NOW });
  assert.equal(
    text,
    [
      "Contact: mailto:security@example.com",
      "Expires: 2027-03-29T00:00:00Z",
      "Preferred-Languages: en",
      "Canonical: https://techsider.com.au/.well-known/security.txt",
      "",
    ].join("\n"),
  );
  assert.doesNotMatch(text, /\r/);
  assert.equal(securityTxt({ contact: CONTACT_ADDRESS, site: new URL(`${SITE_URL}/`), now: NOW }), text, "a URL site with a trailing slash writes the same Canonical");
});

test("the route's paths: none while the contact is null, the one file once it is an address, and a build error for anything else", () => {
  assert.deepEqual(securityTxtPaths(null), []);
  assert.deepEqual(securityTxtPaths(CONTACT_ADDRESS), [{ params: { name: "security" }, props: { contact: CONTACT_ADDRESS } }]);
  for (const bad of ["mailto:security@example.com", "https://techsider.com.au/security/", "security", "security@example", "a b@example.com"]) {
    assert.throws(() => securityTxtPaths(bad), /isn't an email address; write it without "mailto:" \(spec §12 item 7\)/, bad);
  }
});

test("the route builds from SITE.securityContact and serves text/plain; charset=utf-8", async () => {
  assert.deepEqual(getStaticPaths(), securityTxtPaths(SITE.securityContact));
  const before = new Date();
  const res = GET({ props: { contact: CONTACT_ADDRESS }, site: new URL(SITE_URL) });
  const after = new Date();
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("content-type"), TEXT_PLAIN);
  const lines = (await res.text()).split("\n");
  assert.equal(lines[0], `Contact: mailto:${CONTACT_ADDRESS}`);
  assert.ok([securityTxtExpires(before), securityTxtExpires(after)].includes(lines[1].replace("Expires: ", "")), lines[1]);
  assert.equal(lines[3], `Canonical: ${CANONICAL}`);
  assert.throws(() => GET({ props: { contact: CONTACT_ADDRESS }, site: undefined }), /astro\.config\.mjs sets no site/);
});

test("SITE.securityContact is null or a bare address, and nav.ts holds the owner's ⚑ on it while it is null (spec §12 item 7)", () => {
  const nav = readFileSync(join(ROOT, "src/data/nav.ts"), "utf8");
  if (SITE.securityContact === null) {
    assert.match(nav, /\/\/ ⚑ owner: a security contact address for security\.txt \(spec §12 item 7\)\n\s*securityContact: null as string \| null,/);
  } else {
    assert.doesNotThrow(() => securityTxtPaths(SITE.securityContact));
  }
});

test("one security address: the contact page's Security disclosure and Trust's Part A name the one security.txt names", () => {
  // Every security report goes to the one mailbox until the owner names a security contact.
  const address = SITE.securityContact ?? SITE.email;
  const fix = "point it at SITE.securityContact, and drop that file's own ⚑ for spec §12 item 7";
  assert.equal(CONTACT.deflection.find((d) => d.title === "Security disclosure")?.email, address, `src/data/contact.ts: ${fix}`);
  assert.equal(TRUST.partA.securityContact, address, `src/data/trust.ts: ${fix}`);
});

for (const build of ["dist", "dist-preview"]) {
  test(`${build}: /.well-known/security.txt ships exactly when SITE.securityContact is set, as securityTxt() writes it`, () => {
    // Without a build, "no .well-known/" would pass for the wrong reason.
    assert.ok(existsSync(join(ROOT, build, "index.html")), `${build}/ isn't built: run npm run build && npm run build:preview first`);
    if (SITE.securityContact === null) {
      assert.equal(existsSync(join(ROOT, build, ".well-known")), false, `${build}/.well-known/ exists while SITE.securityContact is null`);
      return;
    }
    const text = readFileSync(join(ROOT, build, ".well-known/security.txt"), "utf8");
    const expires = Date.parse(text.match(/^Expires: (.+)$/m)?.[1] ?? "");
    assert.ok(expires > Date.now(), `${build}: the built file has expired; rebuild`);
    const buildDay = new Date(expires - SECURITY_TXT_DAYS * DAY_MS);
    assert.equal(text, securityTxt({ contact: SITE.securityContact, site: SITE_URL, now: buildDay }));
    assert.doesNotMatch(readFileSync(join(ROOT, build, "sitemap-0.xml"), "utf8"), /security\.txt/, "the sitemap lists pages only");
  });
}

/** A port nothing listens on: the OS picks it, and it is released before the server starts. */
async function freePort() {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", () => resolve(undefined)));
  const address = probe.address();
  await new Promise((resolve) => probe.close(() => resolve(undefined)));
  if (address === null || typeof address === "string") throw new Error("no port");
  return address.port;
}

test("the e2e static server serves .txt as text/plain; charset=utf-8, as RFC 9116 §3 requires of security.txt", async () => {
  const dir = mkdtempSync(join(tmpdir(), "security-txt-"));
  mkdirSync(join(dir, ".well-known"));
  const text = securityTxt({ contact: CONTACT_ADDRESS, site: SITE_URL, now: NOW });
  writeFileSync(join(dir, ".well-known/security.txt"), text);
  const port = await freePort();
  const server = spawn(process.execPath, [join(ROOT, "tests/support/static-server.mjs"), dir, String(port)], { stdio: ["ignore", "pipe", "inherit"] });
  try {
    await new Promise((resolve, reject) => {
      server.stdout.on("data", (chunk) => String(chunk).includes("serving") && resolve(undefined));
      server.on("exit", (code) => reject(new Error(`static server exited with ${code}`)));
    });
    const res = await fetch(`http://127.0.0.1:${port}${SECURITY_TXT_PATH}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), TEXT_PLAIN);
    assert.equal(await res.text(), text);
  } finally {
    server.kill();
    rmSync(dir, { recursive: true, force: true });
  }
});
