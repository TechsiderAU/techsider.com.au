// go-global §10.2 check 13: anchors and regions. Its findings are the same in every VERIFY_MODE.
// 1. Structure (S3), an error. In every built page, each [data-regulatory-row] and
//    [data-jurisdiction-section] sits inside a [data-region="au"] ancestor (its own data-region
//    doesn't count), and every built industry page (industries/<id>/index.html, not the hub and not
//    the gallery's specimens) has #rules-that-travel, then #australia, which carries data-region="au".
// 2. reviewBy dates. Each reviewBy on an anchor (src/data/anchors/*.json, anchors[].reviewBy) and in
//    an insight's frontmatter (src/content/insights/**/*.md) is a warning from 30 days before the
//    date through the day itself, and an error from the day after, so a passed date fails the
//    build until someone reviews the item and moves the date (go-global §11, O10). Days are UTC
//    calendar days, counted from run()'s `now`, so the tests pass fixed dates. A reviewBy that isn't
//    a real YYYY-MM-DD date is an error.
import { join, resolve } from "node:path";
import { elements, htmlFiles, listFiles, readFrontmatter, readJson, readText, relPath, result, startTags } from "../lib.mjs";

export const NAME = "13-anchors-and-regions";
/** A reviewBy this many days away, or fewer, is a warning. */
export const WARN_DAYS = 30;
export const ANCHORS_DIR = "src/data/anchors";
export const INSIGHTS_DIR = "src/content/insights";
/** A built industry page, relative to the build root (the hub is industries/index.html). */
export const INDUSTRY_PAGE = /^industries\/[a-z0-9-]+\/index\.html$/;

const STRUCTURE_RULE_LIVE = false; // Part 4A deletes this flag

const DAY_MS = 86_400_000;
const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
/** The hooks rule 1 holds inside the Australia band. */
const AU_HOOKS = ["data-jurisdiction-section", "data-regulatory-row"];

/** A "YYYY-MM-DD" string as UTC midnight, or null when it isn't a real calendar date. */
function parseDay(value) {
  const m = typeof value === "string" ? ISO_DAY.exec(value) : null;
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  return back.getUTCFullYear() === y && back.getUTCMonth() === mo - 1 && back.getUTCDate() === d ? t : null;
}

/** UTC midnight of a Date's UTC calendar day. */
const utcDay = (date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/**
 * Whole UTC calendar days from `now`'s UTC day to the date's: 0 on the day itself, negative once it
 * has passed. `date` is a "YYYY-MM-DD" string or a Date; a string that isn't a real date throws.
 * @param {string | Date} date
 * @param {Date} now
 * @returns {number}
 */
export function daysUntil(date, now) {
  const target = date instanceof Date ? utcDay(date) : parseDay(date);
  if (target === null) throw new Error(`daysUntil: ${JSON.stringify(date)} is not a YYYY-MM-DD date`);
  return Math.round((target - utcDay(now)) / DAY_MS);
}

/**
 * "ok" more than WARN_DAYS away, "warning" from WARN_DAYS days before through the day itself,
 * "error" once the date has passed.
 * @param {string | Date} date
 * @param {Date} now
 * @returns {"ok" | "warning" | "error"}
 */
export function reviewByLevel(date, now) {
  const days = daysUntil(date, now);
  if (days < 0) return "error";
  return days <= WARN_DAYS ? "warning" : "ok";
}

/** `<tr id="x">`: a start tag's name and id, for messages. */
const describe = (tag) => `<${tag.name}${tag.attrs.id ? ` id="${tag.attrs.id}"` : ""}>`;

/**
 * Rule 1a: one finding for each [data-regulatory-row] or [data-jurisdiction-section] start tag that
 * no [data-region="au"] element contains. Markup inside scripts, styles and comments is ignored.
 * @param {string} html
 * @param {string} file the page as messages name it, "dist/…"
 * @returns {string[]}
 */
export function regionFindings(html, file) {
  const bands = elements(html, (t) => t.attrs["data-region"] === "au");
  const out = [];
  for (const tag of startTags(html)) {
    const hook = AU_HOOKS.find((h) => h in tag.attrs);
    if (!hook) continue;
    if (bands.some((b) => b.start < tag.start && tag.start < b.end)) continue;
    const value = tag.attrs[hook] ? `="${tag.attrs[hook]}"` : "";
    out.push(`${file}: [${hook}${value}] ${describe(tag)} is outside every [data-region="au"] element (go-global §5.4)`);
  }
  return out;
}

/**
 * Rule 1b, for a built industry page: #rules-that-travel exists; #australia exists and carries
 * data-region="au"; #rules-that-travel starts before #australia.
 * @param {string} html
 * @param {string} file the page as messages name it, "dist/…"
 * @returns {string[]}
 */
export function industryFindings(html, file) {
  const tags = startTags(html);
  const rules = tags.find((t) => t.attrs.id === "rules-that-travel");
  const band = tags.find((t) => t.attrs.id === "australia");
  const out = [];
  if (!rules) out.push(`${file}: no #rules-that-travel block (go-global §5.2)`);
  if (!band) out.push(`${file}: no #australia band (go-global §5.4)`);
  else if (band.attrs["data-region"] !== "au") out.push(`${file}: #australia does not carry data-region="au" (go-global §5.4)`);
  if (rules && band && rules.start > band.start) {
    out.push(`${file}: #rules-that-travel comes after #australia, and the Rules block goes first (go-global §5.1)`);
  }
  return out;
}

/** Every reviewBy in the anchor files and insight frontmatter, as { rel, label, value }; unreadable files are errors. */
function reviewDates(root, r) {
  const dates = [];
  const anchorFiles = listFiles(join(root, ANCHORS_DIR), (rel) => !rel.includes("/") && !rel.startsWith(".") && rel.endsWith(".json"));
  for (const file of anchorFiles) {
    const rel = relPath(root, file);
    let data;
    try {
      data = readJson(file);
    } catch (e) {
      r.add("error", `${rel}: not valid JSON (${e.message})`);
      continue;
    }
    const anchors = Array.isArray(data?.anchors) ? data.anchors : [];
    anchors.forEach((a, i) => {
      if (a?.reviewBy === undefined) return;
      dates.push({ rel, label: `anchor ${typeof a.id === "string" ? `"${a.id}"` : `#${i + 1}`}`, value: a.reviewBy });
    });
  }
  const posts = listFiles(join(root, INSIGHTS_DIR), (rel) => rel.endsWith(".md") && !/(^|\/)README\.md$/.test(rel));
  for (const file of posts) {
    const rel = relPath(root, file);
    let fm;
    try {
      fm = readFrontmatter(file);
    } catch (e) {
      r.add("error", `${rel}: frontmatter is not valid YAML (${e.message.split("\n")[0]})`);
      continue;
    }
    if (fm.reviewBy !== undefined) dates.push({ rel, label: "post", value: fm.reviewBy });
  }
  return dates;
}

const days = (n) => `${n} day${n === 1 ? "" : "s"}`;

/**
 * @param {{ root: string, dist: string, now?: Date }} options the runner's `mode` is ignored
 * @returns {Promise<{ name: string, errors: string[], warnings: string[] }>}
 */
export async function run({ root, dist, now = new Date() }) {
  const r = result();
  const out = resolve(dist);
  const pages = htmlFiles(out);
  if (pages.length === 0) r.add("error", `${dist}: no built HTML found (run the build first)`);
  if (STRUCTURE_RULE_LIVE) {
    for (const file of pages) {
      const rel = relPath(out, file);
      const html = readText(file);
      for (const msg of regionFindings(html, `dist/${rel}`)) r.add("error", msg);
      if (INDUSTRY_PAGE.test(rel)) for (const msg of industryFindings(html, `dist/${rel}`)) r.add("error", msg);
    }
  }
  for (const { rel, label, value } of reviewDates(root, r)) {
    if (parseDay(value) === null) {
      r.add("error", `${rel}: ${label} reviewBy ${JSON.stringify(value)} is not a YYYY-MM-DD date (go-global §10.2)`);
      continue;
    }
    const n = daysUntil(value, now);
    const level = reviewByLevel(value, now);
    if (level === "warning") r.add("warning", `${rel}: ${label} reviewBy ${value} is in ${days(n)}: review it and move the date (go-global §10.2)`);
    if (level === "error") r.add("error", `${rel}: ${label} reviewBy ${value} passed ${days(-n)} ago: review it and move the date (go-global §10.2)`);
  }
  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
