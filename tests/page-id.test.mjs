import { test } from "node:test";
import assert from "node:assert/strict";
import { pageUniqueId } from "../src/lib/page-id.ts";

test("pageUniqueId numbers each base from 1 per page, so ids never repeat on a page", () => {
  const pageA = {};
  const pageB = {};
  assert.deepEqual(
    [pageUniqueId(pageA, "dt-caption"), pageUniqueId(pageA, "dt-caption"), pageUniqueId(pageA, "other"), pageUniqueId(pageA, "dt-caption")],
    ["dt-caption-1", "dt-caption-2", "other-1", "dt-caption-3"],
  );
  assert.equal(pageUniqueId(pageB, "dt-caption"), "dt-caption-1", "a new page starts again at 1");
});
