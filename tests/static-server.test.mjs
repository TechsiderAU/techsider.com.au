// tests/support/static-server.mjs, as tests/support/serve.mjs starts it: on a free port (port 0),
// named in its "serving … on <origin>" line, and with --latency holding every response back
// (tests/e2e/prod-vitals.spec.mjs, spec §11.4). Playwright's webServers keep their fixed ports.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "./support/serve.mjs";

const SERVER = fileURLToPath(new URL("./support/static-server.mjs", import.meta.url));
const LATENCY = 300;
// Node's timers count whole milliseconds from the event loop's cached clock, so the server's
// 300 ms setTimeout can end a fraction of a millisecond before 300 ms have passed by this
// process's performance.now(). A few ms of slack keeps the check from flaking; a missing delay
// still fails it by ~300 ms.
const SLACK = 5;

/** GET `url`: the status, the body, and how long the whole response took, in ms. */
async function timed(url) {
  const start = performance.now();
  const response = await fetch(url);
  const body = await response.text();
  return { status: response.status, body, ms: performance.now() - start };
}

test("on port 0 the server takes a free port and names it; --latency holds each response back that long", async () => {
  const dir = mkdtempSync(join(tmpdir(), "static-server-"));
  writeFileSync(join(dir, "index.html"), "<p>served</p>");
  const plain = await serve(dir);
  const slow = await serve(dir, { latency: LATENCY });
  try {
    for (const { origin } of [plain, slow]) {
      assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
      assert.notEqual(new URL(origin).port, "0");
    }
    assert.notEqual(plain.origin, slow.origin);
    const fast = await timed(`${plain.origin}/`);
    assert.deepEqual([fast.status, fast.body], [200, "<p>served</p>"]);
    const held = await timed(`${slow.origin}/`);
    assert.deepEqual([held.status, held.body], [200, "<p>served</p>"]);
    assert.ok(held.ms >= LATENCY - SLACK, `the response took ${held.ms.toFixed(0)} ms; --latency ${LATENCY} holds it at least that long`);
    const missing = await timed(`${slow.origin}/missing/`);
    assert.equal(missing.status, 404);
    assert.ok(missing.ms >= LATENCY - SLACK, "a 404 is held back too");
  } finally {
    await plain.close();
    await slow.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--latency takes a whole number of milliseconds, or the server refuses to start", () => {
  for (const bad of [["--latency"], ["--latency", "fast"], ["--latency", "-5"], ["--latency", "1.5"]]) {
    const run = spawnSync(process.execPath, [SERVER, "dist", "0", ...bad], { encoding: "utf8", timeout: 10_000 });
    assert.equal(run.status, 2, `${bad.join(" ")}: exit ${run.status}`);
    assert.match(run.stderr, /--latency needs a whole number of milliseconds/);
  }
});
