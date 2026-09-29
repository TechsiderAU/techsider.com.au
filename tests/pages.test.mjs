// src/lib/pages.ts, the helpers every Phase C route is built on: pageAt() finds a nav entry,
// singletonPaths() builds a singleton page only while nav.ts shows it, and shownIds() lists the
// shown pages under a hub for a collection route. Both builds are exercised the way the routes see
// them, through the TECHSIDER_NAV_PREVIEW variable that isPreview() reads at build time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PAGES } from "../src/data/nav.ts";
import { pageAt, shownIds, singletonPaths } from "../src/lib/pages.ts";

const SOLUTION_IDS = ["document-registers", "knowledge-assistant", "draft-for-approval", "ai-evaluation", "ai-switch-on"];
const INDUSTRY_IDS = [
  "government", "financial-services", "accounting", "education", "manufacturing",
  "real-estate", "healthcare", "resources-and-energy", "legal-and-professional",
];
/** What a singleton route's getStaticPaths returns for a shown page: one path, with no rest segment. */
const BUILT = [{ params: { page: undefined } }];
/**
 * Pages that stay planned through Phase C and still are: the Trust and legal pages, the kits and
 * Sent. The demos stayed planned through Phase C too, until Phase D Task 7 put them live.
 */
const PLANNED_THROUGH_PHASE_C = ["/trust/", "/legal/", "/legal/privacy/", "/legal/website-terms/", "/resources/safe-use-kits/", "/contact/sent/"];

/** Runs `fn` as the production build (preview false) or the preview build sees nav.ts. */
function inBuild(preview, fn) {
  const before = process.env.TECHSIDER_NAV_PREVIEW;
  if (preview) process.env.TECHSIDER_NAV_PREVIEW = "1";
  else delete process.env.TECHSIDER_NAV_PREVIEW;
  try {
    return fn();
  } finally {
    if (before === undefined) delete process.env.TECHSIDER_NAV_PREVIEW;
    else process.env.TECHSIDER_NAV_PREVIEW = before;
  }
}

/** Runs `fn` with the pages at `paths` set to `status`, then restores them. */
function withStatus(paths, status, fn) {
  const entries = paths.map(pageAt);
  const before = entries.map((p) => p.status);
  for (const p of entries) p.status = status;
  try {
    return fn();
  } finally {
    entries.forEach((p, i) => {
      p.status = before[i];
    });
  }
}

test("pageAt: the nav entry at a path, and a throw for a path nav.ts doesn't have", () => {
  assert.equal(pageAt("/insights/"), PAGES.find((p) => p.path === "/insights/"));
  assert.equal(pageAt("/404").group, "system");
  assert.equal(pageAt("/services/evaluation-partner/").fullName, "Evaluation Partner");
  for (const path of ["/pricing/", "/services", "services/", "/solutions/fixture-solution/"]) {
    assert.throws(() => pageAt(path), { message: `nav.ts has no page at ${path}` });
  }
});

test("singletonPaths: production builds a live page once and a planned page not at all", () => {
  inBuild(false, () => {
    assert.deepStrictEqual(singletonPaths("/insights/"), BUILT);
    assert.deepStrictEqual(singletonPaths("/404"), BUILT);
    for (const path of PLANNED_THROUGH_PHASE_C) assert.deepStrictEqual(singletonPaths(path), [], path);
  });
});

test("singletonPaths: the preview build builds every page once", () => {
  inBuild(true, () => {
    for (const path of ["/insights/", "/services/", "/solutions/", "/industries/", ...PLANNED_THROUGH_PHASE_C]) {
      assert.deepStrictEqual(singletonPaths(path), BUILT, path);
    }
  });
});

test("singletonPaths follows each page's nav status in both builds, so going live is one line in nav.ts", () => {
  for (const preview of [false, true]) {
    inBuild(preview, () => {
      for (const p of PAGES) {
        const shown = preview || p.status === "live";
        assert.deepStrictEqual(singletonPaths(p.path), shown ? BUILT : [], `${p.path} (${preview ? "preview" : "production"})`);
      }
    });
  }
  inBuild(false, () => withStatus(["/trust/"], "live", () => assert.deepStrictEqual(singletonPaths("/trust/"), BUILT)));
  inBuild(false, () => assert.deepStrictEqual(singletonPaths("/trust/"), [], "withStatus didn't restore /trust/"));
});

test("singletonPaths throws on a path nav.ts doesn't have, in both builds", () => {
  for (const preview of [false, true]) {
    inBuild(preview, () => assert.throws(() => singletonPaths("/pricing/"), { message: "nav.ts has no page at /pricing/" }));
  }
});

test("shownIds: the preview build lists every page under a hub, in nav order", () => {
  inBuild(true, () => {
    assert.deepEqual(shownIds("/solutions/"), SOLUTION_IDS);
    assert.deepEqual(shownIds("/industries/"), INDUSTRY_IDS);
    assert.deepEqual(shownIds("/demos/"), SOLUTION_IDS);
    assert.deepEqual(shownIds("/services/"), ["evaluation-partner"]);
    assert.deepEqual(shownIds("/resources/"), ["safe-use-kits", "what-you-already-pay-for", "evaluation-method"]);
    assert.deepEqual(shownIds("/legal/"), ["privacy", "website-terms"]);
    assert.deepEqual(shownIds("/contact/"), ["sent"]);
  });
});

test("shownIds: production lists only the live pages under a hub, still in nav order", () => {
  inBuild(false, () => {
    for (const base of ["/solutions/", "/industries/", "/demos/", "/services/", "/resources/", "/legal/", "/contact/"]) {
      const live = PAGES.filter((p) => p.base === base && p.status === "live").map((p) => p.path.slice(base.length, -1));
      assert.deepEqual(shownIds(base), live, base);
    }
    assert.deepEqual(shownIds("/demos/"), SOLUTION_IDS, "a demo page is still planned after Phase D Task 7");
    assert.deepEqual(shownIds("/legal/"), [], "a legal document is live before its review");
    assert.ok(shownIds("/").includes("404"), "the 404 is not shown in production");
    const paths = ["/solutions/knowledge-assistant/", "/solutions/ai-evaluation/"];
    withStatus(paths, "live", () => {
      const expected = SOLUTION_IDS.filter((id) => pageAt(`/solutions/${id}/`).status === "live");
      assert.deepEqual(shownIds("/solutions/"), expected);
      assert.ok(expected.includes("knowledge-assistant") && expected.includes("ai-evaluation"));
    });
  });
});

test("shownIds throws on a base no nav page sits under, in both builds", () => {
  for (const preview of [false, true]) {
    inBuild(preview, () => {
      for (const base of ["/pricing/", "/solutions", "solutions/", "/insights/"]) {
        assert.throws(() => shownIds(base), { message: `nav.ts has no page under ${base}` }, base);
      }
    });
  }
});
