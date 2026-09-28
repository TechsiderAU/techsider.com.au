import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { glob } from "astro/loaders";
import type { Loader } from "astro/loaders";

// The patterns the pre-check understands: "*.ext" (top level only) and "**/*.ext" (any depth).
const PATTERN = /^(\*\*\/)?\*(\.[a-z0-9]+)$/i;

// True when `base` (resolved from the working directory, as Astro resolves it from the project root)
// holds at least one non-dot file matching `pattern`.
function hasMatchingFile(base: string, pattern: string): boolean {
  const m = PATTERN.exec(pattern);
  if (!m) throw new Error(`optionalGlob: unsupported pattern "${pattern}" (use "*.ext" or "**/*.ext")`);
  const recursive = Boolean(m[1]);
  const ext = m[2].toLowerCase();
  const dir = resolve(base);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return false;
  return readdirSync(dir, { recursive }).some((entry) => {
    const rel = String(entry);
    const name = basename(rel);
    return !name.startsWith(".") && name.toLowerCase().endsWith(ext) && statSync(join(dir, rel)).isFile();
  });
}

// glob() for a collection that may legitimately be empty (B1 ships the schemas before the content).
// With no matching file it returns a silent loader that empties the store, so the build logs no
// "[WARN] [glob-loader] No files found …" line; otherwise it is exactly glob(opts).
// The check runs when the content config loads, so restart `astro dev` after adding a collection's first file.
export function optionalGlob(opts: { pattern: string; base: string }): Loader {
  if (!hasMatchingFile(opts.base, opts.pattern)) {
    return {
      name: "optional-glob",
      load: async ({ store }) => {
        store.clear();
      },
    };
  }
  return glob(opts);
}
