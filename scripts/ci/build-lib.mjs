// Output gate behind scripts/ci/build.mjs (spec §11.5: the build must be pristine).
// Astro 7 exits 0 even when it logs [ERROR] (an invalid content reference) or
// [WARN] (a glob collection with no files), so the gate reads the log itself.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";

/** Astro's warn/error prefix; Vite's warnings reach it through Astro's logger. */
export const FLAGGED = /\[(ERROR|WARN)\]/;
const LEVEL_TAGS = /\[(ERROR|WARN)\]/g;
const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;

/** Astro colours its log prefix when CI is set; classify the plain text. */
export function stripAnsi(text) {
  return text.replace(ANSI, "");
}

/**
 * @param {string} line one line of build output (may carry ANSI colours)
 * @param {{ match: string, reason: string }[]} [allow] entries from build-allow.json
 * @returns {"ok" | "allowed" | "fail"}
 */
export function classifyLine(line, allow = []) {
  const text = stripAnsi(line);
  if (!FLAGGED.test(text)) return "ok";
  return allow.some((entry) => text.includes(entry.match)) ? "allowed" : "fail";
}

/**
 * Reads and validates an allow list: a JSON array of { match, reason }.
 * `match` is a plain substring of the colour-stripped line and must say more
 * than the level tag (at least 10 characters besides [WARN]/[ERROR]);
 * `reason` must be non-empty.
 * @param {string} path
 * @returns {{ match: string, reason: string }[]}
 */
export function loadAllow(path) {
  const list = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(list)) throw new Error(`${path}: expected a JSON array`);
  list.forEach((entry, i) => {
    const match = typeof entry?.match === "string" ? entry.match : "";
    if (match.replace(LEVEL_TAGS, "").trim().length < 10) {
      throw new Error(`${path}[${i}]: "match" must name the message, not just its level tag`);
    }
    if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
      throw new Error(`${path}[${i}]: "reason" must say why the line is acceptable`);
    }
  });
  return list;
}

/**
 * Runs `command ...args`, streams its stdout and stderr through line by line,
 * and classifies every line.
 * @param {string} command
 * @param {string[]} args
 * @param {{ allow?: { match: string, reason: string }[], cwd?: string, env?: NodeJS.ProcessEnv,
 *   out?: { write(s: string): unknown }, err?: { write(s: string): unknown } }} [options]
 * @returns {Promise<{ code: number, failures: string[], allowed: string[] }>}
 *   `code` is the exit code (1 if the process was killed by a signal);
 *   `failures` and `allowed` hold the colour-stripped flagged lines.
 */
export async function runGated(command, args, { allow = [], cwd, env = process.env, out = process.stdout, err = process.stderr } = {}) {
  const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  const failures = [];
  const allowed = [];
  const pump = async (stream, dest) => {
    for await (const line of createInterface({ input: stream, crlfDelay: Infinity })) {
      dest.write(`${line}\n`);
      const verdict = classifyLine(line, allow);
      if (verdict === "fail") failures.push(stripAnsi(line));
      else if (verdict === "allowed") allowed.push(stripAnsi(line));
    }
  };
  const [[code]] = await Promise.all([once(child, "close"), pump(child.stdout, out), pump(child.stderr, err)]);
  return { code: code ?? 1, failures, allowed };
}
