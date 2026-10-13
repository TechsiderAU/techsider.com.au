// The one way a date is shown on the site (Phase B2 carry-over WB-14). Content dates are calendar
// dates ("2026-09-01" in frontmatter, YAML or JSON) that parse as UTC midnight, so they print in
// UTC: a build in a time zone behind UTC would otherwise print the day before. Every template,
// component and view imports these helpers, so no page can show a date differently from another.
// The short forms are for the "Rules that travel" chips (go-global §5.2), built in src/lib/anchors.ts.
// Plain TypeScript with no imports, so node tests import it directly.

/** "1 September 2026": en-AU day, month name and year, in UTC. */
export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** "2026-09-01": the value for <time datetime>, in UTC. */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Three-letter months, fixed: en-AU's own short months print "Sept", "June" and "July". */
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "2 Dec 2027": day, three-letter month and year, in UTC (go-global §5.2 chips). */
export function formatShortDate(d: Date): string {
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "Oct 2026": three-letter month and year, in UTC. */
export function formatMonthYear(d: Date): string {
  return `${SHORT_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
