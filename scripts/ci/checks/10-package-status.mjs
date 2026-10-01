// Spec §11.5 check 10: package status in the built pages. The solution templates
// (Phase B2) mark every rendered package with data-package-status, every package
// tab and full package block with data-package-tab and its package's id in
// data-package-id, and the onshore pillar with data-onshore-pillar. In every built page:
// - no element has data-package-status="internal" (internal packages never render);
// - every [data-package-tab] has data-package-status="launch" (on-request packages
//   are listed, never given a tab or a full block);
// - every [data-onshore-pillar] itself carries data-onshore="true";
// - a package block shows the pillar's words (ONSHORE_PILLAR) only inside that pillar.
// The onshore clause checks the data, not only the markup that renders it (WB-10): on a
// solution's own page (solutions/<id>/), every block's data-package-id names a launch package
// in src/content/solutions/<id>.yaml, and the block shows the pillar exactly when that package
// has onshore: true. Gallery pages render fixtures, so only the markup rules apply there.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { ONSHORE_PILLAR } from "../../../src/lib/fixed-copy.ts";
import { ROOT, elements, htmlFiles, loadYaml, readText, relPath, result, startTags, visibleText } from "../lib.mjs";

export const NAME = "10-package-status";
export const SOLUTIONS_DIR = "src/content/solutions";
const SOLUTION_PAGE = /^solutions\/([a-z0-9-]+)\/index\.html$/;

const shorten = (tag) => (tag.length > 120 ? `${tag.slice(0, 117)}...` : tag);

/** A solution's launch packages, the generic one included, as id → onshore; null when it has no content file. */
function launchOnshore(root, solutionId, r) {
  const rel = `${SOLUTIONS_DIR}/${solutionId}.yaml`;
  const file = join(root, rel);
  if (!existsSync(file)) return null;
  let data;
  try {
    data = loadYaml(file);
  } catch (e) {
    r.add("error", `${rel}: cannot parse (${e.message})`);
    return null;
  }
  const packages = [data?.genericPackage, ...(Array.isArray(data?.packages) ? data.packages : [])];
  return new Map(packages.filter((p) => p?.status === "launch").map((p) => [p.id, p.onshore === true]));
}

export async function run({ root = ROOT, dist }) {
  const r = result();
  const out = resolve(dist);
  const pages = htmlFiles(out);
  if (pages.length === 0) r.add("error", `${dist}: no built HTML found (run the build first)`);
  const onshoreBySolution = new Map();
  for (const file of pages) {
    const html = readText(file);
    const rel = relPath(out, file);
    const page = `dist/${rel}`;
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

    const solutionId = SOLUTION_PAGE.exec(rel)?.[1];
    if (solutionId !== undefined && !onshoreBySolution.has(solutionId)) onshoreBySolution.set(solutionId, launchOnshore(root, solutionId, r));
    const onshore = solutionId === undefined ? null : onshoreBySolution.get(solutionId);
    for (const block of elements(html, (t) => "data-package-tab" in t.attrs)) {
      const pillars = elements(block.inner, (t) => "data-onshore-pillar" in t.attrs);
      let rest = block.inner;
      for (const pillar of pillars) rest = rest.split(pillar.outer).join(" ");
      const id = block.attrs["data-package-id"];
      const name = id === undefined ? "a package block" : `package "${id}"`;
      if (visibleText(rest).includes(ONSHORE_PILLAR)) {
        r.add("error", `${page}: ${name} shows "${ONSHORE_PILLAR}" outside its [data-onshore-pillar] element`);
      }
      if (onshore === null) continue;
      const data = `${SOLUTIONS_DIR}/${solutionId}.yaml`;
      if (id === undefined || !onshore.has(id)) {
        r.add("error", `${page}: ${id === undefined ? "a package block has no data-package-id" : `data-package-id "${id}" is not a launch package in ${data}`}, so its onshore pillar can't be checked against the data`);
      } else if (onshore.get(id) && pillars.length === 0) {
        r.add("error", `${page}: ${name} has onshore: true in ${data}, but its block shows no onshore pillar`);
      } else if (!onshore.get(id) && pillars.length > 0) {
        r.add("error", `${page}: ${name} has onshore: false in ${data}, but its block shows the onshore pillar`);
      }
    }
  }
  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
