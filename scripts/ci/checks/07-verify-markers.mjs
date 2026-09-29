// Spec §11.5 check 7 (launch gate): the ⚑ register is empty. A fact still to be
// verified is marked in copy or data with ⚑ or the upper-case word VERIFY, and
// none may be left at launch. Findings are errors with VERIFY_MODE=gate and
// warnings otherwise, so the branch can carry open items until the launch PR.
import { join } from "node:path";
import { lineAt, listFiles, readText, relPath, result } from "../lib.mjs";

export const NAME = "07-verify-markers";
/**
 * Where copy and data live: layouts hold site-wide copy (BaseLayout) and lib holds fixed copy
 * (fixed-copy.ts, and the ② demo's words in assistant-copy.ts). src/fixtures/ is fictional preview
 * data and is not scanned.
 */
export const SCOPES = ["src/content", "src/data", "src/pages", "src/components", "src/layouts", "src/lib"];
const TEXT_FILE = /\.(astro|md|mdx|ya?ml|json|ts|tsx|js|mjs|html|css|svg|txt)$/;
/** ⚑ anywhere; VERIFY only as an upper-case whole word, so "verify", "VERIFYING" and "unverified" pass. */
export const MARKER = /⚑|\bVERIFY\b/g;

export async function run({ root, mode }) {
  const r = result();
  const kind = mode === "gate" ? "error" : "warning";
  for (const scope of SCOPES) {
    // The exception lists quote phrases and tokens; they never hold open items.
    for (const file of listFiles(join(root, scope), (rel) => TEXT_FILE.test(rel) && !rel.endsWith("-exceptions.json"))) {
      const text = readText(file);
      for (const m of text.matchAll(MARKER)) {
        r.add(kind, `${relPath(root, file)}:${lineAt(text, m.index)}: open ${m[0]} marker`);
      }
    }
  }
  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
