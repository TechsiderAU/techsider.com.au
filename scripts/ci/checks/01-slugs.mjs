// Spec §11.5 check 1: slugs and parity, plus cross-reference integrity.
// Astro logs an invalid reference() as [ERROR] but still exits 0, and nav.ts
// is not a collection at all, so the ids are joined here, in plain Node.
// Parity covers live nav entries (and every content file); parity for planned
// entries waits for Phase C's content.
// Beyond ids, an industry's recommended packages must be real, renderable packages of
// their solution (never internal ones, spec §4.1), and a chip that names a jurisdiction
// must link to a regulatory row that lists it (spec §8.5 Government).
import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import { listFiles, loadNav, loadYaml, readFrontmatter, readJson, relPath, result } from "../lib.mjs";

export const NAME = "01-slugs";

/** Where each id space lives (entry id = file name without extension). */
export const ID_DIRS = {
  solutions: "src/content/solutions",
  industries: "src/content/industries",
  kits: "src/content/kits",
  demos: "src/data/demos",
  traces: "src/data/traces",
};

const EXT = { solutions: ".yaml", industries: ".yaml", kits: ".yaml", demos: ".json", traces: ".json" };

/** Top-level `*.ext` files of a collection directory → Map(id → absolute path). READMEs are ignored. */
function collection(root, name) {
  const files = listFiles(join(root, ID_DIRS[name]), (rel) => !rel.includes("/") && rel.endsWith(EXT[name]));
  return new Map(files.map((f) => [basename(f, EXT[name]), f]));
}

const list = (v) => (Array.isArray(v) ? v : []);

export async function run({ root }) {
  const r = result();
  const nav = await loadNav(root);
  const rel = (f) => relPath(root, f);

  // (a) Every nav.ts path follows the slug rule (spec §7.2), once.
  const seen = new Set();
  for (const p of nav.PAGES) {
    if (seen.has(p.path)) r.add("error", `src/data/nav.ts: duplicate path ${p.path}`);
    seen.add(p.path);
    if (nav.EXEMPT_PATHS.includes(p.path)) continue;
    const want = `${p.base}${nav.slugify(p.shortName)}/`;
    if (p.path !== want) r.add("error", `src/data/nav.ts: "${p.shortName}" has path ${p.path}, but the slug rule gives ${want}`);
  }

  const ids = Object.fromEntries(Object.keys(ID_DIRS).map((name) => [name, collection(root, name)]));

  // (b) Parity: a live solution/industry page has its content file; every content file has a nav entry.
  for (const name of ["solutions", "industries"]) {
    const base = `/${name}/`;
    const navIds = new Map(nav.PAGES.filter((p) => p.base === base).map((p) => [p.path.slice(base.length, -1), p]));
    for (const [id, p] of navIds) {
      if (p.status === "live" && !ids[name].has(id)) {
        r.add("error", `src/data/nav.ts: ${p.path} is live, but ${ID_DIRS[name]}/${id}.yaml does not exist`);
      }
    }
    for (const [id, file] of ids[name]) {
      if (!navIds.has(id)) r.add("error", `${rel(file)}: no nav.ts entry has the path ${base}${id}/`);
    }
  }

  // (c) Every id one content file names in another exists.
  const parse = (file, load) => {
    try {
      return load(file) ?? {};
    } catch (e) {
      r.add("error", `${rel(file)}: cannot parse (${String(e.message).split("\n")[0]})`);
      return null;
    }
  };
  const ref = (file, field, name, value) => {
    if (typeof value !== "string" || !ids[name].has(value)) {
      r.add("error", `${rel(file)}: ${field} is "${value}", which is not an id in ${ID_DIRS[name]}/`);
    }
  };

  // Parsed once: industries read their solutions' package ids, then the solutions are checked.
  const solutions = new Map([...ids.solutions].map(([id, file]) => [id, parse(file, loadYaml)]));
  /** Package id → status, over a solution's generic package and its listed packages. */
  const packagesOf = (d) =>
    new Map([d?.genericPackage, ...list(d?.packages)].filter((p) => typeof p?.id === "string").map((p) => [p.id, p.status]));

  for (const [id, file] of ids.industries) {
    const d = parse(file, loadYaml);
    if (!d) continue;
    list(d.leadSolutions).forEach((s, i) => ref(file, `leadSolutions[${i}]`, "solutions", s));
    list(d.flagshipUseCases).forEach((u, i) => ref(file, `flagshipUseCases[${i}].solution`, "solutions", u?.solution));
    list(d.workflow).forEach((stage, i) =>
      list(stage?.useCases).forEach((u, j) => ref(file, `workflow[${i}].useCases[${j}].solution`, "solutions", u?.solution)),
    );
    list(d.packages).forEach((p, i) => {
      ref(file, `packages[${i}].solution`, "solutions", p?.solution);
      const solution = solutions.get(p?.solution);
      if (!solution) return; // an unknown id is reported above, an unparseable file by parse()
      const status = packagesOf(solution).get(p?.package);
      if (status === undefined) {
        r.add("error", `${rel(file)}: packages[${i}].package is "${p?.package}", which is not a package id in ${ID_DIRS.solutions}/${p.solution}.yaml`);
      } else if (status === "internal") {
        r.add("error", `${rel(file)}: packages[${i}].package "${p.package}" is internal to ${p.solution}, and internal packages never render`);
      }
    });
    const chips = list(d.obligationChips);
    if (chips.length) {
      const regRel = `src/data/regulatory/${id}.json`;
      const reg = existsSync(join(root, regRel)) ? parse(join(root, regRel), readJson) : null;
      const rows = new Map(list(reg?.rows).map((row) => [row?.id, row]));
      chips.forEach((c, i) => {
        if (!rows.has(c?.row)) {
          r.add("error", `${rel(file)}: obligationChips[${i}].row is "${c?.row}", which is not a row id in ${regRel}${reg ? "" : " (file missing)"}`);
          return;
        }
        const listed = list(rows.get(c.row)?.jurisdictions);
        if (c.jurisdiction !== undefined && !listed.includes(c.jurisdiction)) {
          r.add("error", `${rel(file)}: obligationChips[${i}] names "${c.jurisdiction}", but row "${c.row}" in ${regRel} lists ${listed.length ? listed.join(", ") : "no jurisdictions"}`);
        }
      });
    }
    if (d.scenario !== undefined) ref(file, "scenario.trace", "traces", d.scenario?.trace);
  }

  for (const [solutionId, file] of ids.solutions) {
    const d = solutions.get(solutionId);
    if (!d) continue;
    list(d.byIndustry).forEach((x, i) => ref(file, `byIndustry[${i}]`, "industries", x));
    if (d.demo != null) ref(file, "demo", "demos", d.demo);
    for (const key of Object.keys(d.matrix ?? {})) ref(file, "matrix key", "industries", key);
  }

  for (const [, file] of ids.kits) {
    const d = parse(file, loadYaml);
    if (d) ref(file, "industry", "industries", d.industry);
  }

  for (const [, file] of ids.demos) {
    const d = parse(file, readJson);
    if (d) ref(file, "solution", "solutions", d.solution);
  }

  for (const file of listFiles(join(root, "src/content/insights"), (p) => p.endsWith(".md"))) {
    const fm = parse(file, readFrontmatter);
    if (!fm) continue;
    list(fm.industries).forEach((x, i) => ref(file, `industries[${i}]`, "industries", x));
    list(fm.solutions).forEach((x, i) => ref(file, `solutions[${i}]`, "solutions", x));
  }

  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
