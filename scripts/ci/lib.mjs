// Shared helpers for the spec §11.5 CI checks in scripts/ci/checks/.
// Plain Node plus the `yaml` parser: no Astro, no DOM library. nav.ts is
// imported directly (Node strips its types), exactly as the unit tests do.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";

/** The repo root, with a trailing separator. */
export const ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Imports `<root>/src/data/nav.ts`. Checks pass their `root`, so tests can point them at a synthetic tree. */
export function loadNav(root = ROOT) {
  return import(pathToFileURL(join(root, "src/data/nav.ts")).href);
}

/** `path` relative to `from`, with forward slashes (for messages and glob matching). */
export function relPath(from, path) {
  return relative(from, path).split(sep).join("/");
}

/**
 * Every file under `dir`, recursively, whose path relative to `dir` (forward slashes)
 * passes `predicate(rel, abs)`. Absolute paths, sorted. A missing `dir` gives [].
 */
export function listFiles(dir, predicate = () => true) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return [];
  const out = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const abs = join(d, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile() && predicate(relPath(dir, abs), abs)) out.push(abs);
    }
  };
  walk(dir);
  return out.sort();
}

export function readText(path) {
  return readFileSync(path, "utf8");
}

export function readJson(path) {
  return JSON.parse(readText(path));
}

export function loadYaml(path) {
  return parseYaml(readText(path));
}

/** The YAML frontmatter of a Markdown file as an object ({} when there is none). */
export function readFrontmatter(path) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(readText(path));
  return (m && parseYaml(m[1])) || {};
}

/** Every .html file under a build directory (absolute paths, sorted). */
export function htmlFiles(distDir) {
  return listFiles(distDir, (rel) => rel.endsWith(".html"));
}

/** Same algorithm as tests/helpers.mjs visibleText(). */
export function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

/** Decodes the entities Astro emits in attribute values. */
export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// --- A small start-tag scanner (enough for Astro's well-formed output) ---

const START_TAG = /<([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
const ATTR = /([^\s"'>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** Blanks script/style bodies and comments, keeping every index, so markup inside them is never read. */
function mask(html) {
  const blank = (s) => s.replace(/[^\n]/g, " ");
  return html
    .replace(/(<(script|style)\b[^>]*>)([\s\S]*?)(<\/\2\s*>)/gi, (_, open, _name, body, close) => open + blank(body) + close)
    .replace(/<!--[\s\S]*?-->/g, blank);
}

/** Every start tag: { name (lower case), attrs (name → decoded value, "" when bare), start, end }. */
export function startTags(html) {
  const tags = [];
  for (const m of mask(html).matchAll(START_TAG)) {
    const attrs = {};
    for (const a of m[2].matchAll(ATTR)) attrs[a[1].toLowerCase()] = decodeEntities(a[2] ?? a[3] ?? a[4] ?? "");
    tags.push({ name: m[1].toLowerCase(), attrs, start: m.index, end: m.index + m[0].length });
  }
  return tags;
}

/**
 * Every element whose start tag passes `predicate(tag)`, as
 * { name, attrs, outer, inner } (nested elements of the same name are balanced).
 */
export function elements(html, predicate) {
  const masked = mask(html);
  const out = [];
  for (const tag of startTags(html)) {
    if (!predicate(tag)) continue;
    let close = tag.end;
    let innerEnd = tag.end;
    if (!VOID.has(tag.name) && !/\/>$/.test(masked.slice(tag.start, tag.end))) {
      const re = new RegExp(`<(/?)${tag.name}(?=[\\s>/])[^>]*>`, "gi");
      re.lastIndex = tag.end;
      let depth = 1;
      innerEnd = close = html.length;
      for (let m = re.exec(masked); m; m = re.exec(masked)) {
        depth += m[1] ? -1 : 1;
        if (depth === 0) {
          innerEnd = m.index;
          close = m.index + m[0].length;
          break;
        }
      }
    }
    out.push({ name: tag.name, attrs: tag.attrs, outer: html.slice(tag.start, close), inner: html.slice(tag.end, innerEnd) });
  }
  return out;
}

/** Elements carrying attribute `attr` (and, when given, with exactly `value`). */
export function elementsWith(html, attr, value) {
  return elements(html, (t) => attr in t.attrs && (value === undefined || t.attrs[attr] === value));
}

/** Every href attribute value, entity-decoded (script and style bodies and comments are ignored). */
export function hrefsIn(html) {
  return startTags(html).filter((t) => "href" in t.attrs).map((t) => t.attrs.href);
}

/** The set of id attribute values. */
export function idsIn(html) {
  return new Set(startTags(html).map((t) => t.attrs.id).filter(Boolean));
}

/** True for hrefs that leave the site or aren't pages: any scheme (http:, mailto:, tel:, …) or protocol-relative. */
export function isExternal(href) {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}

/** The decoded fragment of an href ("" for a bare "#", null when there is none). */
export function fragmentOf(href) {
  const i = href.indexOf("#");
  if (i < 0) return null;
  try {
    return decodeURIComponent(href.slice(i + 1));
  } catch {
    return href.slice(i + 1);
  }
}

/** The site URL path a built file is served at: dist/insights/index.html → "/insights/". */
export function pageUrl(distDir, file) {
  const rel = relPath(resolve(distDir), file);
  return `/${rel.replace(/(^|\/)index\.html$/, "$1")}`;
}

/**
 * The built file an internal href lands on, or null. Handles "/x/", "/x", "/x/index.html",
 * plain files ("/favicon.svg"), "/404" → 404.html, queries and fragments. A relative href
 * (including "#frag" and "?q") resolves against `fromFile`'s URL, or "/" without one.
 * External hrefs (see isExternal) give null.
 */
export function resolveDistPath(distDir, href, fromFile) {
  if (isExternal(href)) return null;
  const dist = resolve(distDir);
  const base = fromFile ? pageUrl(dist, fromFile) : "/";
  let path;
  try {
    path = decodeURIComponent(new URL(href, `http://site${base}`).pathname);
  } catch {
    return null;
  }
  const candidates = path.endsWith("/") ? [`${path}index.html`] : [path, `${path}/index.html`, `${path}.html`];
  for (const c of candidates) {
    const abs = join(dist, c);
    if (!abs.startsWith(dist + sep)) continue;
    if (existsSync(abs) && statSync(abs).isFile()) return abs;
  }
  return null;
}

// --- Phrase matching (spec §3.5: case-insensitive, whole phrase, hyphen ≡ space) ---

/** Regex source for one or more spaces or hyphens (spec §3.5 treats them as the same). */
export const GAP = "[\\s\\-\\u2010\\u2011]+";
const GAP_RE = new RegExp(GAP);
const CURLY_APOSTROPHES = new RegExp("[\\u2018\\u2019\\u02bc]", "g");
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A global, case-insensitive RegExp from regex `source`, in which every literal space stands for GAP. */
export function looseRegExp(source) {
  return new RegExp(source.replaceAll(" ", GAP), "gi");
}

/** `phrase` as a global, case-insensitive RegExp; hyphens and spaces match each other; `bounded` adds \b at both ends. */
export function phraseRegExp(phrase, { bounded = true } = {}) {
  const body = phrase.trim().split(GAP_RE).map(escapeRe).join(" ");
  return looseRegExp(bounded ? `\\b${body}\\b` : body);
}

/** Curly apostrophes become straight ones, so "world’s best" matches "world's best". */
export function normalizeQuotes(text) {
  return text.replace(CURLY_APOSTROPHES, "'");
}

/** Every match of a global RegExp: { start, end, match }. */
export function findAll(text, re) {
  return [...text.matchAll(re)].map((m) => ({ start: m.index, end: m.index + m[0].length, match: m[0] }));
}

/** True when an occurrence of `context` (hyphen ≡ space, any case) in `text` spans [start, end). */
export function covers(text, start, end, context) {
  return findAll(text, phraseRegExp(context, { bounded: false })).some((c) => c.start <= start && end <= c.end);
}

/** A glob-ish path pattern: "**" crosses "/", "*" and "?" don't. Anchored at both ends. */
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      i++;
      if (glob[i + 1] === "/") {
        i++;
        re += "(?:.*/)?";
      } else re += ".*";
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += escapeRe(c);
  }
  return new RegExp(`^${re}$`);
}

export function matchesGlob(glob, path) {
  return globToRegExp(glob).test(path);
}

/**
 * Reads an exceptions file (repo-relative; `[{ file, <textKey>, reason }]`) and returns its valid entries.
 * A missing file gives []; a malformed file or entry is added to `r` as an error.
 */
export function loadExceptions(root, relFile, textKey, r) {
  const path = join(root, relFile);
  if (!existsSync(path)) return [];
  let list;
  try {
    list = readJson(path);
  } catch (e) {
    r.add("error", `${relFile}: ${e.message}`);
    return [];
  }
  if (!Array.isArray(list)) {
    r.add("error", `${relFile}: expected a JSON array`);
    return [];
  }
  return list.filter((e, i) => {
    const ok = ["file", textKey, "reason"].every((k) => typeof e?.[k] === "string" && e[k].trim() !== "");
    if (!ok) r.add("error", `${relFile}[${i}]: needs non-empty "file", "${textKey}" and "reason"`);
    return ok;
  });
}

/**
 * True when an exception covers the hit [start, end) in `text` of `file` ("src/…" or "dist/…").
 * An entry's `file` is a glob, or "dist" for any built page; its text is the hit itself or a longer
 * phrase around it (e.g. "CREST-accredited" covers "accredited" there, and only there).
 */
export function excepted(list, textKey, file, text, start, end) {
  return list.some(
    (e) => (e.file === "dist" ? file.startsWith("dist/") : matchesGlob(e.file, file)) && covers(text, start, end, e[textKey]),
  );
}

/** 1-based line number of `index` in `text`. */
export function lineAt(text, index) {
  let line = 1;
  for (let i = text.indexOf("\n"); i !== -1 && i < index; i = text.indexOf("\n", i + 1)) line++;
  return line;
}

/** A one-line excerpt around [start, end), for messages. */
export function excerpt(text, start, end, pad = 30) {
  const a = Math.max(0, start - pad);
  const b = Math.min(text.length, end + pad);
  return `${a > 0 ? "…" : ""}${text.slice(a, b).replace(/\s+/g, " ").trim()}${b < text.length ? "…" : ""}`;
}

/** Collects a check's findings. kind: "error" (fails the run) or "warning" (printed only). */
export function result() {
  const errors = [];
  const warnings = [];
  return {
    errors,
    warnings,
    add(kind, msg) {
      if (kind === "error") errors.push(msg);
      else if (kind === "warning") warnings.push(msg);
      else throw new Error(`result.add: unknown kind "${kind}"`);
    },
  };
}
