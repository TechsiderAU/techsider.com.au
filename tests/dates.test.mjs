// One date format across the site (Phase B2 carry-over WB-14): src/lib/dates.ts is the only code in
// src/ that turns a date into text, and every date either build prints reads the same way.
// Run `npm run build && npm run build:preview` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { htmlFiles, listFiles, readText, relPath, startTags } from "../scripts/ci/lib.mjs";
import { formatDate, isoDate } from "../src/lib/dates.ts";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const BUILDS = ["dist", "dist-preview"].map((d) => fileURLToPath(new URL(`../${d}/`, import.meta.url)));
const FORMATS_A_DATE = /\.toLocaleDateString\(|\.toISOString\(\)\.slice\(|\bIntl\.DateTimeFormat\b/;
/** The files that show a date, each through the shared helpers. */
const SHOWS_DATES = [
  "components/page/InsightCard.astro",
  "layouts/PostLayout.astro",
  "lib/views/checker.ts",
  "templates/AboutTemplate.astro",
  "templates/DocumentTemplate.astro",
  "templates/EvaluationMethodTemplate.astro",
  "templates/IndustryTemplate.astro",
  "templates/LegalHubTemplate.astro",
  "templates/PayForTemplate.astro",
  "templates/SafeUseKitsTemplate.astro",
  "templates/TrustTemplate.astro",
];

test("formatDate and isoDate print a content date in UTC", () => {
  const day = new Date("2026-09-01"); // how a frontmatter, YAML or JSON date parses: UTC midnight
  assert.equal(formatDate(day), "1 September 2026");
  assert.equal(isoDate(day), "2026-09-01");
  const late = new Date("2026-06-30T23:30:00Z"); // already 1 July in Sydney, still 30 June in UTC
  assert.equal(formatDate(late), "30 June 2026");
  assert.equal(isoDate(late), "2026-06-30");
});

test("no file in src/ but src/lib/dates.ts turns a date into text (WB-14)", () => {
  const offenders = listFiles(SRC, (rel) => /\.(astro|ts|js|mjs)$/.test(rel) && rel !== "lib/dates.ts")
    .filter((file) => FORMATS_A_DATE.test(readText(file)))
    .map((file) => relPath(SRC, file));
  assert.deepEqual(offenders, []);
  for (const rel of SHOWS_DATES) {
    assert.match(readText(join(SRC, rel)), /^import \{ formatDate(?:, isoDate)? \} from "(?:\.\.\/)+(?:lib\/)?dates(?:\.ts)?";$/m, rel);
  }
});

test("every <time datetime=\"YYYY-MM-DD\"> in both builds reads as formatDate prints that day", () => {
  let checked = 0;
  for (const build of BUILDS) {
    for (const file of htmlFiles(build)) {
      const html = readText(file);
      for (const tag of startTags(html).filter((t) => t.name === "time" && /^\d{4}-\d{2}-\d{2}$/.test(t.attrs.datetime ?? ""))) {
        checked += 1;
        const shown = html.slice(tag.end, html.indexOf("</time>", tag.end)).trim();
        assert.equal(shown, formatDate(new Date(tag.attrs.datetime)), `${relPath(build, file)}: <time datetime="${tag.attrs.datetime}">`);
      }
    }
  }
  assert.ok(checked >= 100, `only ${checked} dates checked`);
});
