import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { optionalGlob } from "../src/content/optional-glob.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const temps = [];
after(() => temps.forEach((d) => rmSync(d, { recursive: true, force: true })));

// A throwaway directory holding `files` (paths relative to it) and empty `dirs`.
function tree(files, dirs = []) {
  const dir = mkdtempSync(join(tmpdir(), "optional-glob-"));
  temps.push(dir);
  for (const d of dirs) mkdirSync(join(dir, d), { recursive: true });
  for (const f of files) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), "{}\n");
  }
  return dir;
}

test("a missing or README-only directory gets the silent loader, which empties the store", async () => {
  for (const base of [join(tree([]), "missing"), tree(["README.md"])]) {
    const loader = optionalGlob({ pattern: "*.yaml", base });
    assert.equal(loader.name, "optional-glob", base);
    let cleared = 0;
    await loader.load({ store: { clear: () => { cleared += 1; } } });
    assert.equal(cleared, 1, "the silent loader clears stale entries");
  }
});

test("a directory with a matching file delegates to Astro's glob loader", () => {
  assert.equal(optionalGlob({ pattern: "*.yaml", base: tree(["test-entry.yaml", "README.md"]) }).name, "glob-loader");
  assert.equal(optionalGlob({ pattern: "*.json", base: tree(["test-entry.json"]) }).name, "glob-loader");
  assert.equal(optionalGlob({ pattern: "**/*.md", base: tree(["test-post.md"]) }).name, "glob-loader");
});

test("'*.ext' matches the top level only; '**/*.ext' matches any depth", () => {
  assert.equal(optionalGlob({ pattern: "*.json", base: tree(["nested/test-entry.json"]) }).name, "optional-glob");
  assert.equal(optionalGlob({ pattern: "**/*.md", base: tree(["nested/deeper/test-post.md"]) }).name, "glob-loader");
});

test("dotfiles, other extensions and directories named like entries don't count", () => {
  const base = tree([".hidden.yaml", "test-entry.yml", "test-entry.yaml.bak", "README.md"], ["folder.yaml"]);
  assert.equal(optionalGlob({ pattern: "*.yaml", base }).name, "optional-glob");
});

test("patterns the pre-check can't evaluate are rejected loudly", () => {
  for (const pattern of ["*.{yaml,yml}", "entries/*.yaml", "test-entry.yaml", "**/*"]) {
    assert.throws(() => optionalGlob({ pattern, base: tree([]) }), /unsupported pattern/, pattern);
  }
});

test("every content and data directory exists and carries a README", () => {
  for (const dir of [
    "src/content/solutions", "src/content/industries", "src/content/kits", "src/content/documents",
    "src/data/regulatory", "src/data/demos", "src/data/traces", "src/data/runs",
  ]) {
    const readme = join(ROOT, dir, "README.md");
    assert.ok(existsSync(readme), `${dir}/README.md is missing`);
    assert.match(readFileSync(readme, "utf8"), /^# \S/, `${dir}/README.md has no heading`);
  }
});

test("README.md documents a directory and is never an entry, even in a '*.md' collection", () => {
  assert.equal(optionalGlob({ pattern: "*.md", base: tree(["README.md"]) }).name, "optional-glob");
  assert.equal(optionalGlob({ pattern: "**/*.md", base: tree(["README.md", "nested/README.md"]) }).name, "optional-glob");
  assert.equal(optionalGlob({ pattern: "*.md", base: tree(["README.md", "test-entry.md"]) }).name, "glob-loader");
  // The delegated glob() leaves README.md out too (the documents collection probe in the plan builds with one).
  assert.match(readFileSync(join(ROOT, "src/content/optional-glob.ts"), "utf8"), /glob\(\{ \.\.\.opts, pattern: \[opts\.pattern, `!\*\*\/\$\{README\}`\] \}\)/);
});
