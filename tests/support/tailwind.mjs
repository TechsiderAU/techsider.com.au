// Compile src/styles/global.css with Tailwind's own compiler for the given class candidates.
// Used where a utility isn't on any built page yet, so dist/ can't show it.
// The @fontsource imports only add @font-face rules, so they load as empty sheets.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "tailwindcss";
// The same step @tailwindcss/vite runs on a production build (it flattens nesting).
import { optimize } from "@tailwindcss/node";

const require = createRequire(import.meta.url);
export const globalCss = readFileSync(new URL("../../src/styles/global.css", import.meta.url), "utf8");

export async function buildCss(candidates) {
  const compiler = await compile(globalCss, {
    base: fileURLToPath(new URL("../../src/styles/", import.meta.url)),
    async loadStylesheet(id, base) {
      if (id.startsWith("@fontsource")) return { path: id, base, content: "" };
      const path = id.startsWith(".") ? join(base, id) : require.resolve(id === "tailwindcss" ? "tailwindcss/index.css" : id);
      return { path, base: dirname(path), content: readFileSync(path, "utf8") };
    },
  });
  return compiler.build(candidates);
}

/** buildCss, then flattened the way a production build ships it. */
export async function buildShippedCss(candidates) {
  return optimize(await buildCss(candidates), { minify: false }).code;
}
