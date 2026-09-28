import { test } from "node:test";
import assert from "node:assert/strict";
import { createPlayback } from "../src/scripts/playback.ts";

const flush = () => new Promise((r) => setImmediate(r));

test("wait resolves after the delay", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pb = createPlayback();
  let done = false;
  const p = pb.wait(100).then(() => { done = true; });
  t.mock.timers.tick(99);
  await flush();
  assert.equal(done, false);
  t.mock.timers.tick(1);
  await p;
  assert.equal(done, true);
});

test("pause holds a wait past its delay until resume", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pb = createPlayback();
  let done = false;
  const p = pb.wait(100).then(() => { done = true; });
  pb.pause();
  assert.equal(pb.paused, true);
  t.mock.timers.tick(500);
  await flush();
  assert.equal(done, false);
  pb.resume();
  await p;
  assert.equal(done, true);
  assert.equal(pb.paused, false);
});

test("skip resolves pending waits and makes later waits immediate", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pb = createPlayback();
  const p = pb.wait(10_000);
  pb.skip();
  await p; // no tick needed
  await pb.wait(10_000); // resolves immediately after skip
  assert.equal(pb.skipped, true);
});

test("skip also ends a pause", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pb = createPlayback();
  pb.pause();
  const p = pb.wait(100);
  pb.skip();
  await p;
  assert.equal(pb.paused, false);
});

test("instant playback never waits and ignores pause", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pb = createPlayback({ instant: true });
  pb.pause();
  assert.equal(pb.paused, false);
  await pb.wait(10_000); // resolves with no tick
  assert.equal(pb.skipped, true);
});

test("cancel marks the run cancelled and releases a paused wait", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pb = createPlayback();
  pb.pause();
  const p = pb.wait(100);
  pb.cancel();
  await p;
  assert.equal(pb.cancelled, true);
  assert.equal(pb.skipped, true);
});
