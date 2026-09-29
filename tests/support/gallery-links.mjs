// Link resolution for the template-gallery sweep. tests/e2e/template-gallery.spec.mjs collects the
// links in each template page's <main>, and tests/template-gallery.test.mjs unit-tests this logic.
//
// Every link a template renders comes from a SiteContext, and the gallery's fixtureSite points
// each one into the gallery, so every internal link must land on a page or file of dist-preview/,
// and its fragment on an id there. Three kinds of destination exist only because fixtures stand
// in for content that no build publishes. They are derived from the fixtures here, never listed
// by hand:
// - /insights/<id>/ for a published fixture insight: the gallery renders cards from fixture posts,
//   while the insights route builds one page per real post only;
// - a reviewed fixture kit's download: a real kit's file ships from public/downloads/, and a
//   fixture file there would reach the production dist/;
// - a fragment on a stand-in page: fixtureSite points several fixture solutions (or industries) at
//   one specimen page, which renders only one of them. A link to another one's package tab or
//   regulatory row names an id that only that entity's own page would have.
import { isExternal } from "../../scripts/ci/lib.mjs";
import {
  fixtureSite, industryFixtures, insightFixtures, kitFixture, pendingKitFixture, regulatoryFixtures, solutionFixtures,
} from "../../src/fixtures/index.ts";

/**
 * The fixture solution or industry that each entity specimen renders (the B2 blueprint's specimen
 * list). tests/template-gallery.test.mjs checks each against the built page's h1.
 * @type {Record<string, { kind: "solution" | "industry", id: string }>}
 */
export const SPECIMEN_ENTITY = {
  "/preview/templates/solution/": { kind: "solution", id: "fixture-solution" },
  "/preview/templates/solution-evaluation/": { kind: "solution", id: "fixture-solution-4" },
  "/preview/templates/solution-switch-on/": { kind: "solution", id: "fixture-solution-5" },
  "/preview/templates/industry/": { kind: "industry", id: "fixture-industry" },
  "/preview/templates/industry-government/": { kind: "industry", id: "fixture-government" },
};

/**
 * The package ids a solution page carries: the generic package's full block, then one tab panel
 * per launch package. On-request packages are listed without an id, and internal ones never render.
 * @param {{ genericPackage: { id: string }, packages: { id: string, status: string }[] }} solution
 * @returns {string[]}
 */
export function packageIds(solution) {
  return [solution.genericPackage.id, ...solution.packages.filter((p) => p.status === "launch").map((p) => p.id)];
}

/**
 * The regulatory-row anchors a single-mode industry page carries: `reg-<row id>`.
 * @param {{ rows: { id: string }[] }} regulatory
 * @returns {string[]}
 */
export function rowAnchors(regulatory) {
  return regulatory.rows.map((row) => `reg-${row.id}`);
}

/**
 * The destinations only gallery links name (see the header). `paths`: the fixture-only pages and
 * files. `fragments`: for each stand-in page, the ids its guests' own pages would carry. A guest is
 * a shown entity that fixtureSite points at a specimen page rendering another entity of its kind.
 * @param {{
 *   site: { solutions: { id: string, href: string | null }[], industries: { id: string, href: string | null }[] },
 *   solutions: Record<string, { genericPackage: { id: string }, packages: { id: string, status: string }[] }>,
 *   industries: Record<string, { jurisdictions?: string[] }>,
 *   regulatory: Record<string, { rows: { id: string }[] }>,
 *   insights: { id: string, data: { draft?: boolean } }[],
 *   kits: { lawyerReviewedAt: Date | null, download: string }[],
 *   specimens?: Record<string, { kind: "solution" | "industry", id: string }>,
 * }} input
 * @returns {{ paths: Set<string>, fragments: Map<string, Set<string>> }}
 */
export function galleryOnlyDestinations({ site, solutions, industries, regulatory, insights, kits, specimens = SPECIMEN_ENTITY }) {
  const paths = new Set([
    ...insights.filter((post) => post.data.draft !== true).map((post) => `/insights/${post.id}/`),
    ...kits.filter((kit) => kit.lawyerReviewedAt !== null).map((kit) => kit.download),
  ]);
  const fragments = new Map();
  const add = (path, ids) => fragments.set(path, new Set([...(fragments.get(path) ?? []), ...ids]));
  const guests = (links, kind) =>
    links.filter((link) => {
      const shown = link.href !== null && Object.hasOwn(specimens, link.href) ? specimens[link.href] : null;
      return shown?.kind === kind && shown.id !== link.id;
    });
  for (const link of guests(site.solutions, "solution")) add(link.href, packageIds(solutions[link.id]));
  for (const link of guests(site.industries, "industry")) {
    if (industries[link.id].jurisdictions) throw new Error(`${link.id}: a jurisdiction-mode industry needs its own specimen page`);
    add(link.href, rowAnchors(regulatory[link.id]));
  }
  return { paths, fragments };
}

/** The gallery-only destinations of the real fixtures. */
export const GALLERY_ONLY = galleryOnlyDestinations({
  site: fixtureSite,
  solutions: solutionFixtures,
  industries: industryFixtures,
  regulatory: regulatoryFixtures,
  insights: insightFixtures,
  kits: [kitFixture, pendingKitFixture],
});

/**
 * The internal links among `hrefs`, found on the page served at `from`: each href once, with its
 * decoded path (resolved against `from`, query dropped) and fragment (null without a "#", "" for a
 * bare "#"). Links that leave the site (any scheme, or protocol-relative) are dropped.
 * @param {string[]} hrefs
 * @param {string} from
 * @returns {{ href: string, path: string, fragment: string | null }[]}
 */
export function internalLinks(hrefs, from) {
  const links = [];
  for (const href of new Set(hrefs)) {
    if (isExternal(href)) continue;
    const url = new URL(href, `http://gallery${from}`);
    links.push({
      href,
      path: decodeURIComponent(url.pathname),
      fragment: href.includes("#") ? decodeURIComponent(url.hash.slice(1)) : null,
    });
  }
  return links;
}

/**
 * One message per link that doesn't land; [] when every one does. `served` maps each path to the
 * ids of the page served there (an empty set for a file that isn't HTML), or to null when nothing is
 * served there; a path it doesn't hold counts as not served. A bare "#" and "#top" need no id.
 * @param {{ href: string, path: string, fragment: string | null }[]} links
 * @param {Map<string, Set<string> | null>} served
 * @param {{ paths: Set<string>, fragments: Map<string, Set<string>> }} allowed gallery-only destinations
 * @returns {string[]}
 */
export function linkProblems(links, served, allowed) {
  const problems = [];
  for (const { href, path, fragment } of links) {
    const ids = served.get(path);
    if (!ids) {
      if (!allowed.paths.has(path)) problems.push(`${href}: nothing is built at ${path}`);
      continue;
    }
    if (!fragment || fragment.toLowerCase() === "top") continue;
    if (!ids.has(fragment) && !allowed.fragments.get(path)?.has(fragment)) problems.push(`${href}: ${path} has no id="${fragment}"`);
  }
  return problems;
}
