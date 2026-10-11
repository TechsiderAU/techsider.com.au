// scripts/ci/crawler-check.mjs: the live site, as AI crawlers ask for it. A stub fetch stands in
// for the network, so no request leaves the machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CRAWLERS, PATHS, crawlerCheck, refusals } from "../scripts/ci/crawler-check.mjs";

test("every crawler robots.txt names for AI search or assistants is checked, with its own user agent", () => {
  const robots = readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8");
  for (const [name, ua] of Object.entries(CRAWLERS)) {
    assert.match(robots, new RegExp(`^User-agent: ${name}$`, "im"), `robots.txt doesn't name ${name}`);
    assert.ok(ua.toLowerCase().includes(name.toLowerCase()), `${name}'s user agent doesn't name it`);
  }
  assert.deepEqual(PATHS, ["/", "/llms.txt", "/robots.txt"]);
});

test("crawlerCheck(): one request per crawler and path, each with that crawler's user agent; anything but a 200 is a refusal", async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push([new URL(url).pathname, init.headers["User-Agent"]]);
    if (init.headers["User-Agent"].includes("GPTBot") && new URL(url).pathname === "/llms.txt") return { status: 403 };
    if (init.headers["User-Agent"].includes("bingbot") && new URL(url).pathname === "/") throw new Error("reset");
    return { status: 200 };
  };
  const results = await crawlerCheck({ fetchImpl });
  assert.equal(seen.length, Object.keys(CRAWLERS).length * PATHS.length);
  assert.deepEqual(refusals(results), ["GPTBot got HTTP 403 for /llms.txt", "bingbot got no response for /"]);
});

test("deploy.yml runs it in the live-check job, after the live check, and a refusal only warns", () => {
  const yml = readFileSync(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");
  const job = yml.slice(yml.indexOf("\n  live-check:"), yml.indexOf("\n  indexnow:"));
  assert.ok(job.indexOf("scripts/ci/live-check.mjs") < job.indexOf("scripts/ci/crawler-check.mjs"));
  assert.match(job, /run: node scripts\/ci\/crawler-check\.mjs \|\| test \$\? -eq 3/);
});
