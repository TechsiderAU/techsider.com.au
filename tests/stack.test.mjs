import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

test("astro is on major version 7", () => {
  const pkg = JSON.parse(readFileSync(new URL("../node_modules/astro/package.json", import.meta.url), "utf8"));
  assert.equal(Number(pkg.version.split(".")[0]), 7, `installed astro ${pkg.version}`);
});

test("exactly one vite version is installed (Astro and Tailwind share it)", () => {
  let json;
  try {
    json = execFileSync("npm", ["ls", "vite", "--all", "--json"], { encoding: "utf8" });
  } catch (e) {
    json = e.stdout; // npm ls exits non-zero on peer warnings but still prints the tree
  }
  const versions = new Set();
  const walk = (node) => {
    for (const [name, dep] of Object.entries(node.dependencies ?? {})) {
      if (name === "vite" && dep.version) versions.add(dep.version);
      walk(dep);
    }
  };
  walk(JSON.parse(json));
  assert.equal(versions.size, 1, `vite versions: ${[...versions].join(", ")}`);
});
