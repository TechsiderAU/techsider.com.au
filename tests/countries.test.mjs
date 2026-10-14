// The Country select's list (go-global §8.1): src/data/countries.ts holds the codes, and
// countryOptions() names each one in English from Intl when the site builds. The names come from
// the runtime's CLDR, which changes between Node releases (CI builds on Node 22, locally on 24), so
// these tests pin the list's properties and never a country's name.
import { test } from "node:test";
import assert from "node:assert/strict";
import { COUNTRY_CODES, countryOptions } from "../src/data/countries.ts";

const names = new Intl.DisplayNames("en", { type: "region" });

test("COUNTRY_CODES: 250 codes (ISO 3166-1's 249 and XK), each two capital letters, each once, in code order", () => {
  assert.equal(COUNTRY_CODES.length, 250);
  for (const code of COUNTRY_CODES) assert.match(code, /^[A-Z]{2}$/);
  assert.equal(new Set(COUNTRY_CODES).size, COUNTRY_CODES.length, "a code repeats");
  assert.deepEqual([...COUNTRY_CODES], [...COUNTRY_CODES].sort(), "the codes aren't in code order");
});

test("COUNTRY_CODES: the expected countries and XK are there; deprecated aliases and CLDR's non-country regions aren't", () => {
  for (const code of ["AU", "NZ", "GB", "US", "SG", "DE", "IN", "XK"]) assert.ok(COUNTRY_CODES.includes(code), `${code} is missing`);
  for (const code of ["UK", "EU", "UN", "ZZ", "XA", "QO"]) assert.ok(!COUNTRY_CODES.includes(code), `${code} is offered`);
});

test("countryOptions: every code has its own English name from Intl, and the options are sorted by name", () => {
  const options = countryOptions();
  assert.deepEqual(options.map((o) => o.value).sort(), [...COUNTRY_CODES]);
  for (const { value, label } of options) assert.notEqual(label, value, `this runtime's Intl has no English name for ${value}`);
  assert.equal(new Set(options.map((o) => o.label)).size, options.length, "two codes share a name");
  for (let i = 1; i < options.length; i++) {
    const [a, b] = [options[i - 1].label, options[i].label];
    assert.ok(a.localeCompare(b, "en") <= 0, `"${a}" sorts after "${b}"`);
  }
  assert.equal(options.find((o) => o.value === "AU").label, names.of("AU"));
});

test("countryOptions: names and sorts the codes it is given", () => {
  assert.deepEqual(countryOptions(["NZ", "AU"]), [{ value: "AU", label: names.of("AU") }, { value: "NZ", label: names.of("NZ") }]);
  assert.deepEqual(countryOptions([]), []);
});
