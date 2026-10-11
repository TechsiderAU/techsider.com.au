// The sitemap's <lastmod> dates (astro.config.mjs): each published insight post's updatedDate, else
// its publishDate, by its path, and /insights/ with the newest of them. Read from the posts'
// frontmatter with the CI helpers, since astro.config.mjs runs before content collections load.
import { basename, join } from "node:path";
import { listFiles, readFrontmatter, ROOT } from "./ci/lib.mjs";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A frontmatter date (YAML reads 2026-10-02 as a Date) as an ISO day, or null. */
function isoDay(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === "string" && ISO_DAY.test(value) ? value : null;
}

/** Map of path → ISO day for every published post and the Insights index. */
export function insightLastmod(root = ROOT) {
  const dates = new Map();
  for (const file of listFiles(join(root, "src/content/insights"), (rel) => rel.endsWith(".md"))) {
    const fm = readFrontmatter(file);
    if (fm.draft === true) continue;
    const day = isoDay(fm.updatedDate) ?? isoDay(fm.publishDate);
    if (day === null) throw new Error(`${file}: no publishDate for the sitemap's lastmod`);
    dates.set(`/insights/${basename(file, ".md")}/`, day);
  }
  const newest = [...dates.values()].sort().at(-1);
  if (newest !== undefined) dates.set("/insights/", newest);
  return dates;
}
