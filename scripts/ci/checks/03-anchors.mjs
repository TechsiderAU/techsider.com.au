// Spec §11.5 check 3: the Home page keeps the section anchors that the
// header CTAs (/#demo) and older inbound links rely on.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { idsIn, readText, result } from "../lib.mjs";

export const NAME = "03-anchors";
export const HOME_ANCHORS = ["services", "approach", "industries", "demo", "insights", "faq", "contact"];

export async function run({ dist }) {
  const r = result();
  const home = join(resolve(dist), "index.html");
  if (!existsSync(home)) {
    r.add("error", `${dist}/index.html: not found (run the build first)`);
  } else {
    const ids = idsIn(readText(home));
    for (const id of HOME_ANCHORS) {
      if (!ids.has(id)) r.add("error", `index.html: no element has id="${id}" (spec §11.5 check 3)`);
    }
  }
  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
