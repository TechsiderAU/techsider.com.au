// The singleton pages' typed data (src/data/*.ts: positioning, services, contact, trust, about) parses
// with its page-data schema from src/content/page-schemas.ts. The schemas are strict, so a misspelt
// or leftover key fails as well as a missing one. Each Phase C task that writes a data module adds
// its line to MODULES (and the schema's import); the first test fails until it does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { aboutData, contactData, homeData, internationalData, positioningData, servicesData, trustData } from "../src/content/page-schemas.ts";
import { CONTACT, INTERNATIONAL } from "../src/data/contact.ts";
import { DELIVERY_MODEL } from "../src/lib/fixed-copy.ts";
import { replySentence } from "../src/lib/reply-time.ts";

const DATA_DIR = fileURLToPath(new URL("../src/data/", import.meta.url));
/** src/data/*.ts modules that aren't page data: the page registry (names, paths, statuses, descriptions), with its own tests. */
const NOT_PAGE_DATA = ["nav.ts"];
/** [file in src/data/, its export, the page-schemas.ts schema that validates it]. */
const MODULES = [
  ["positioning.ts", "POSITIONING", positioningData],
  ["services.ts", "SERVICES", servicesData],
  ["about.ts", "ABOUT", aboutData],
  ["contact.ts", "CONTACT", contactData],
  ["trust.ts", "TRUST", trustData],
  ["home.ts", "HOME", homeData],
];

test("every page-data module in src/data/ is listed here with its schema", () => {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".ts") && !NOT_PAGE_DATA.includes(f)).sort();
  assert.deepEqual(files, MODULES.map(([file]) => file).sort());
});

for (const [file, name, schema] of MODULES) {
  test(`${file}: ${name} parses with its schema`, async () => {
    const mod = await import(new URL(`../src/data/${file}`, import.meta.url).href);
    assert.ok(Object.hasOwn(mod, name), `${file} has no export named ${name}`);
    const parsed = schema.safeParse(mod[name]);
    assert.ok(parsed.success, parsed.success ? "" : `${file}: ${JSON.stringify(parsed.error.issues, null, 2)}`);
  });
}

test("contact.ts: INTERNATIONAL parses with internationalData, and only the entity, delivery and certifications lines are confirmed (go-global §7.3)", () => {
  const parsed = internationalData.safeParse(INTERNATIONAL);
  assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues, null, 2));
  assert.deepEqual(INTERNATIONAL.map((l) => [l.id, l.confirmed, l.gate]), [
    ["entity", true, null], ["delivery", true, null], ["certifications", true, null],
    ["dpa", false, "legal"], ["representative", false, "owner"],
  ]);
  const text = Object.fromEntries(INTERNATIONAL.map((l) => [l.id, l.text]));
  assert.equal(text.entity, "Techsider Pty Ltd, ABN 12 636 205 868, headquartered in Sydney, Australia.");
  assert.equal(text.delivery, DELIVERY_MODEL);
  assert.equal(
    text.certifications,
    "We hold no ISO/IEC 27001 or ISO/IEC 42001 certification, no SOC 2 attestation report and no Cyber Essentials certificate.",
  );
  // The lawyer's draft (go-global §7.3, O2): written now, rendered only once a lawyer has reviewed it.
  assert.equal(
    text.dpa,
    "We sign a data processing agreement. Our team reaches your systems from Australia, which counts as a transfer, so for personal data from the EU or UK the agreement includes the EU standard contractual clauses, or the UK IDTA or UK Addendum.",
  );
});

test("replySentence builds the one reply-time sentence from CONTACT: the time, then its base (go-global §4.5, D7)", () => {
  assert.equal(CONTACT.replyTimeBase, "Sydney time (AEST/AEDT)");
  assert.equal(CONTACT.timeZone, "Australia/Sydney");
  assert.equal(replySentence(CONTACT), "We reply within two business days, Sydney time (AEST/AEDT).");
  // /llms.txt states it as a fact about Techsider.
  assert.equal(replySentence(CONTACT, "Techsider"), "Techsider replies within two business days, Sydney time (AEST/AEDT).");
  assert.equal(
    replySentence({ replyTime: "one fixture business day", replyTimeBase: "fixture time (FXT)" }),
    "We reply within one fixture business day, fixture time (FXT).",
  );
});
