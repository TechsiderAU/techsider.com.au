// The singleton pages' typed data (src/data/*.ts: positioning, services, contact, trust, about) parses
// with its page-data schema from src/content/page-schemas.ts. The schemas are strict, so a misspelt
// or leftover key fails as well as a missing one. Each Phase C task that writes a data module adds
// its line to MODULES (and the schema's import); the first test fails until it does.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { aboutData, contactData, homeData, positioningData, servicesData, trustData } from "../src/content/page-schemas.ts";

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
