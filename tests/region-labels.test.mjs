// Region labels (go-global §3.3, §6.1, §6.3): the visible "Australia", "Australian example" and
// "Australian plans and vendor pages" labels. Each is one RegionLabel, marked [data-region-label]
// (an allowed context for the go-global S1 rule), at the start of the element that carries
// data-region="au". Part 1A renders the component on its own; Part 5 adds the built-page checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { elementsWith } from "../scripts/ci/lib.mjs";
import { PLATFORM_REGION_LABEL, REGION_EXAMPLE_LABEL, REGION_LABEL } from "../src/lib/fixed-copy.ts";
import { visibleText } from "./helpers.mjs";
import { renderAstro } from "./support/render-astro.mjs";

const REGION_LABEL_COMPONENT = new URL("../src/components/ui/RegionLabel.astro", import.meta.url);

test("RegionLabel: one span marked data-region-label with its kind, carrying that kind's fixed label", async () => {
  for (const [props, kind, label] of [
    [{}, "region", REGION_LABEL],
    [{ kind: "region" }, "region", REGION_LABEL],
    [{ kind: "example" }, "example", REGION_EXAMPLE_LABEL],
    [{ kind: "platform" }, "platform", PLATFORM_REGION_LABEL],
  ]) {
    const html = await renderAstro(REGION_LABEL_COMPONENT, props);
    const found = elementsWith(html, "data-region-label");
    assert.equal(found.length, 1, JSON.stringify(props));
    const [span] = found;
    assert.equal(span.name, "span", kind);
    assert.equal(span.attrs["data-region-label"], kind);
    assert.match(span.attrs.class, /(?:^|\s)region-label(?:\s|$)/, kind);
    assert.equal(visibleText(span.inner).trim(), label, kind);
  }
});
