// Spec §11.5 check 6 (metric provenance, §9.3):
//  (a) every demo and trace file declares provenance; anything `measured` cites a committed run
//      directory that exists and is non-empty (checking that the run holds the cited metric key
//      waits for the harness's run format, which arrives with its first committed run: spec §9.2);
//  (b) metric-shaped numbers never sit in free text (they belong in typed { value, unit } metrics);
//  (c) every built element marked data-provenance="illustrative" shows its own label: a
//      [data-provenance-label] that says "Illustrative" and sits in no nested [data-provenance]
//      element. A nested trace's label, or body copy that says "illustrative", is not one (WB-9).
// The ⑤ checker is the one exception to (a) and (c) (controller ruling 6): a demo file of kind
// "checker" declares "sourced" (real, dated vendor facts), only such a file may, and its frame
// (data-provenance="sourced") needs no label.
import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  elements, excepted, findAll, htmlFiles, listFiles, loadExceptions, readJson, readText, relPath, result, visibleText,
} from "../lib.mjs";

export const NAME = "06-provenance";
export const EXCEPTIONS_FILE = "src/data/metric-exceptions.json";
export const DATA_DIRS = ["src/data/demos", "src/data/traces"];
export const PROVENANCE = ["measured", "illustrative"];
export const CHECKER_PROVENANCE = "sourced";
export const METRIC_PATTERNS = [/\b0\.\d+\b/g, /\b\d+(?:\.\d+)?\s?%/g, /\b\d+\s?ms\b/g, /\b\d+\s?\/\s?\d+\b/g];
/** Quoted source text, snippets, questions and cited answer segments may restate numbers. */
export const EXEMPT_KEYS = ["source", "text", "snippet", "question", "quote"];
const RUN = /^src\/data\/runs\/[a-z0-9][a-z0-9._-]*\/?$/;

/** Metric-shaped tokens in a string, dropping a hit that sits inside a longer one ("0.5" inside "0.5%"). */
export function metricTokens(s) {
  const hits = METRIC_PATTERNS.flatMap((re) => findAll(s, re)).sort((a, b) => a.start - b.start || b.end - a.end);
  const kept = [];
  for (const h of hits) if (!kept.some((k) => k.start <= h.start && h.end <= k.end)) kept.push(h);
  return kept;
}

/**
 * The visible text of each label an element's inner HTML holds for the element itself: its
 * [data-provenance-label] descendants, leaving out those inside a nested [data-provenance] element,
 * which labels only itself (WB-9).
 */
export function ownLabels(inner) {
  let own = inner;
  for (const nested of elements(inner, (t) => "data-provenance" in t.attrs)) own = own.split(nested.outer).join(" ");
  return elements(own, (t) => "data-provenance-label" in t.attrs).map((label) => visibleText(label.inner));
}

/**
 * Walks JSON: provenance on every object that has it, at any depth, and every lintable string.
 * Under an exempt key only the strings are exempt; objects there still get their provenance
 * checked, so a measured score nested in a `source` must still cite its run.
 */
function walk(value, path, visit, exempt = false) {
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, `${path}[${i}]`, visit, exempt));
  else if (value && typeof value === "object") {
    visit.object(value, path);
    for (const [k, v] of Object.entries(value)) {
      if (k === "run") continue; // `run` is a path, not copy (visit.object checks it)
      walk(v, path ? `${path}.${k}` : k, visit, exempt || EXEMPT_KEYS.includes(k));
    }
  } else if (!exempt && typeof value === "string" && !/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) visit.string(value, path);
}

export async function run({ root, dist }) {
  const r = result();
  const exceptions = loadExceptions(root, EXCEPTIONS_FILE, "token", r);

  for (const file of DATA_DIRS.flatMap((d) => listFiles(join(root, d), (rel) => !rel.includes("/") && rel.endsWith(".json")))) {
    const rel = relPath(root, file);
    let data;
    try {
      data = readJson(file);
    } catch (e) {
      r.add("error", `${rel}: cannot parse (${e.message})`);
      continue;
    }
    if (data?.kind === "checker" && rel.startsWith("src/data/demos/")) {
      if (data.provenance !== CHECKER_PROVENANCE) {
        r.add(
          "error",
          `${rel}: a checker demo's "provenance" must be "${CHECKER_PROVENANCE}": its facts are dated vendor statements, not illustrative data (got ${JSON.stringify(data.provenance)})`,
        );
      }
    } else if (!PROVENANCE.includes(data?.provenance)) {
      r.add("error", `${rel}: "provenance" must be "measured" or "illustrative" (got ${JSON.stringify(data?.provenance)})`);
    }
    walk(data, "", {
      object(o, path) {
        const at = path ? `${rel}: ${path}` : rel;
        if (path && "provenance" in o && !PROVENANCE.includes(o.provenance)) {
          r.add("error", `${at}: "provenance" must be "measured" or "illustrative"`);
        }
        if (o.provenance !== "measured") return;
        if (typeof o.run !== "string" || !RUN.test(o.run)) {
          r.add("error", `${at}: measured, so "run" must be "src/data/runs/<run-id>/" (got ${JSON.stringify(o.run)})`);
        } else {
          const dir = join(root, o.run);
          if (!existsSync(dir) || !statSync(dir).isDirectory()) r.add("error", `${at}: run ${o.run} does not exist`);
          else if (listFiles(dir).length === 0) r.add("error", `${at}: run ${o.run} is empty`);
        }
      },
      string(s, path) {
        for (const hit of metricTokens(s)) {
          if (excepted(exceptions, "token", rel, s, hit.start, hit.end)) continue;
          r.add("error", `${rel}: ${path} has the metric-shaped "${hit.match}" in free text; make it a typed { value, unit } metric or list it in ${EXCEPTIONS_FILE}`);
        }
      },
    });
  }

  const out = resolve(dist);
  const pages = htmlFiles(out);
  if (pages.length === 0) r.add("error", `${dist}: no built HTML found (run the build first)`);
  for (const file of pages) {
    const page = relPath(out, file);
    for (const el of elements(readText(file), (t) => "data-provenance" in t.attrs)) {
      const value = el.attrs["data-provenance"];
      if (value === CHECKER_PROVENANCE) continue; // the ⑤ checker's frame: sourced vendor facts, no label
      if (!PROVENANCE.includes(value)) r.add("error", `${page}: <${el.name} data-provenance="${value}"> is neither measured nor illustrative`);
      else if (value === "illustrative" && !ownLabels(el.inner).some((label) => /\billustrative\b/i.test(label))) {
        r.add("error", `${page}: <${el.name} data-provenance="illustrative"> renders no visible "Illustrative" label of its own ([data-provenance-label], outside any nested [data-provenance] element)`);
      }
    }
  }
  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
