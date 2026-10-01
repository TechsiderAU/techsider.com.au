// The one way a date is shown on the site (Phase B2 carry-over WB-14). Content dates are calendar
// dates ("2026-09-01" in frontmatter, YAML or JSON) that parse as UTC midnight, so they print in
// UTC: a build in a time zone behind UTC would otherwise print the day before. Every template,
// component and view imports these two, so no page can show a date differently from another.
// Plain TypeScript with no imports, so node tests import it directly.

/** "1 September 2026": en-AU day, month name and year, in UTC. */
export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "2026-09-01": the value for <time datetime>, in UTC. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
