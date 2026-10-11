// IndexNow (scripts/ci/indexnow.mjs): the key file the build publishes holds the key the script
// sends, and the request lists only this host's URLs, once each. The script runs in deploy.yml.
// The build test reads dist/: run `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { INDEXNOW_KEY, locs, payload } from "../scripts/ci/indexnow.mjs";

test("public/<key>.txt holds exactly the key, a 32-character hex string, and the build publishes it", () => {
  assert.match(INDEXNOW_KEY, /^[0-9a-f]{32}$/);
  assert.equal(readFileSync(new URL(`../public/${INDEXNOW_KEY}.txt`, import.meta.url), "utf8"), INDEXNOW_KEY);
  assert.equal(readFileSync(new URL(`../dist/${INDEXNOW_KEY}.txt`, import.meta.url), "utf8"), INDEXNOW_KEY);
});

test("payload(): the host, the key and its location, and this host's URLs, each once", () => {
  const xml = "<urlset><url><loc>https://techsider.com.au/</loc></url><url><loc> https://techsider.com.au/about/ </loc></url></urlset>";
  assert.deepEqual(locs(xml), ["https://techsider.com.au/", "https://techsider.com.au/about/"]);
  assert.deepEqual(payload([...locs(xml), "https://techsider.com.au/", "https://example.com/elsewhere/"]), {
    host: "techsider.com.au",
    key: INDEXNOW_KEY,
    keyLocation: `https://techsider.com.au/${INDEXNOW_KEY}.txt`,
    urlList: ["https://techsider.com.au/", "https://techsider.com.au/about/"],
  });
});

test("deploy.yml submits after the live check, on a push to main only, and a failed submission doesn't fail the deploy", () => {
  const yml = readFileSync(new URL("../.github/workflows/deploy.yml", import.meta.url), "utf8");
  const job = yml.slice(yml.indexOf("\n  indexnow:"));
  assert.ok(yml.includes("\n  indexnow:"), "deploy.yml has no indexnow job");
  assert.match(job, /needs: live-check/);
  assert.match(job, /github\.event_name == 'push'/);
  assert.match(job, /continue-on-error: true/);
  assert.match(job, /node scripts\/ci\/indexnow\.mjs/);
});
