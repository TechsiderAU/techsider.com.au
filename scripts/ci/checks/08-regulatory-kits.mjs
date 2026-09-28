// Spec §11.5 check 8 (launch gate; §11.6): regulatory rows and Safe-Use Kits are complete.
// - Every src/data/regulatory/*.json validates with `regulatoryFile`, and every row
//   carries source, asAt and lastReviewed.
// - Every government.json row names its jurisdictions, and together the rows cover
//   the Commonwealth (cth), a state (nsw, vic or qld) and local government.
// - Every src/content/kits/*.yaml validates with the kit schema, carries source and
//   asAt, and has been lawyer-reviewed (lawyerReviewedAt is set).
// Findings are errors with VERIFY_MODE=gate and warnings otherwise. With no files
// yet (Phase B1) there is nothing to check.
import { join } from "node:path";
import { makeKitSchema, plainRef, regulatoryFile } from "../../../src/content/schemas.ts";
import { listFiles, loadYaml, readJson, relPath, result } from "../lib.mjs";

export const NAME = "08-regulatory-kits";
const ROW_FIELDS = ["source", "asAt", "lastReviewed"];
const KIT_FIELDS = ["source", "asAt"];
const STATES = ["nsw", "vic", "qld"];
const kitSchema = makeKitSchema(plainRef);

/** Top-level entry files, as the collection loaders read them (README.md never matches). */
const entries = (root, dir, ext) => listFiles(join(root, dir), (rel) => !rel.includes("/") && rel.endsWith(ext));

// Zod coerces a null date to 1970, so presence is checked on the raw value first.
const blank = (value) => value === undefined || value === null || value === "";

function regulatoryFindings(rel, data, government) {
  const out = [];
  const reported = new Set();
  const covered = new Set();
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  rows.forEach((row, i) => {
    const label = typeof row?.id === "string" ? row.id : `#${i + 1}`;
    for (const key of ROW_FIELDS) {
      if (!blank(row?.[key])) continue;
      out.push(`${rel}: row "${label}" has no ${key}`);
      reported.add(`${i}.${key}`);
    }
    const jurisdictions = Array.isArray(row?.jurisdictions) ? row.jurisdictions : [];
    if (government && jurisdictions.length === 0) {
      out.push(`${rel}: row "${label}" has no jurisdictions`);
      reported.add(`${i}.jurisdictions`);
    }
    for (const j of jurisdictions) covered.add(j);
  });
  const parsed = regulatoryFile.safeParse(data);
  for (const issue of parsed.success ? [] : parsed.error.issues) {
    const [top, i, key] = issue.path;
    if (top === "rows" && reported.has(`${i}.${key}`)) continue;
    out.push(`${rel}: ${issue.path.join(".") || "(file)"}: ${issue.message}`);
  }
  if (government && rows.length > 0) {
    if (!covered.has("cth")) out.push(`${rel}: no row covers the Commonwealth (cth)`);
    if (!STATES.some((s) => covered.has(s))) out.push(`${rel}: no row covers a state (nsw, vic or qld)`);
    if (!covered.has("local")) out.push(`${rel}: no row covers local government (local)`);
  }
  return out;
}

function kitFindings(rel, data) {
  const out = [];
  const reported = new Set();
  for (const key of KIT_FIELDS) {
    if (!blank(data?.[key])) continue;
    out.push(`${rel}: has no ${key}`);
    reported.add(key);
  }
  if (blank(data?.lawyerReviewedAt)) {
    out.push(`${rel}: lawyerReviewedAt is not set, so the kit has not been lawyer-reviewed`);
    reported.add("lawyerReviewedAt");
  }
  const parsed = kitSchema.safeParse(data);
  for (const issue of parsed.success ? [] : parsed.error.issues) {
    if (reported.has(issue.path[0])) continue;
    out.push(`${rel}: ${issue.path.join(".") || "(file)"}: ${issue.message}`);
  }
  return out;
}

export async function run({ root, mode }) {
  const r = result();
  const kind = mode === "gate" ? "error" : "warning";
  for (const file of entries(root, "src/data/regulatory", ".json")) {
    const rel = relPath(root, file);
    let data;
    try {
      data = readJson(file);
    } catch (e) {
      r.add(kind, `${rel}: not valid JSON (${e.message})`);
      continue;
    }
    for (const msg of regulatoryFindings(rel, data, rel.endsWith("/government.json"))) r.add(kind, msg);
  }
  for (const file of entries(root, "src/content/kits", ".yaml")) {
    const rel = relPath(root, file);
    let data;
    try {
      data = loadYaml(file);
    } catch (e) {
      r.add(kind, `${rel}: not valid YAML (${e.message.split("\n")[0]})`);
      continue;
    }
    for (const msg of kitFindings(rel, data)) r.add(kind, msg);
  }
  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
