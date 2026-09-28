// Spec §11.5 check 10: package status in the built pages. The solution templates
// (Phase B2) mark every rendered package with data-package-status, every package
// tab and full package block with data-package-tab, and the onshore pillar with
// data-onshore-pillar. In every built page:
// - no element has data-package-status="internal" (internal packages never render);
// - every [data-package-tab] has data-package-status="launch" (on-request packages
//   are listed, never given a tab or a full block);
// - every [data-onshore-pillar] itself carries data-onshore="true".
import { resolve } from "node:path";
import { htmlFiles, readText, relPath, result, startTags } from "../lib.mjs";

export const NAME = "10-package-status";

const shorten = (tag) => (tag.length > 120 ? `${tag.slice(0, 117)}...` : tag);

export async function run({ dist }) {
  const r = result();
  const out = resolve(dist);
  const pages = htmlFiles(out);
  if (pages.length === 0) r.add("error", `${dist}: no built HTML found (run the build first)`);
  for (const file of pages) {
    const html = readText(file);
    const page = `dist/${relPath(out, file)}`;
    for (const { attrs, start, end } of startTags(html)) {
      const tag = shorten(html.slice(start, end));
      const status = attrs["data-package-status"];
      if (status === "internal") {
        r.add("error", `${page}: an internal package renders: ${tag}`);
      } else if ("data-package-tab" in attrs && status !== "launch") {
        const found = status === undefined ? "no data-package-status" : `data-package-status="${status}"`;
        r.add("error", `${page}: a package tab or full block needs data-package-status="launch", found ${found}: ${tag}`);
      }
      if ("data-onshore-pillar" in attrs && attrs["data-onshore"] !== "true") {
        r.add("error", `${page}: the onshore pillar renders without data-onshore="true": ${tag}`);
      }
    }
  }
  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
