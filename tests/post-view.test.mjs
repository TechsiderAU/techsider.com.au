// The insight post view (spec §8.9): the breadcrumb, the §10.1 contextual closing CTA, the
// illustrative label (§9.3) and the BlogPosting JSON-LD (§11.3). The CTA follows the post's
// references: the first solution, else the first industry, else plain "Talk to us". Links come from
// the SiteContext; /contact/ is live (Phase C Task 7), so both builds send the CTA to /contact/ with
// the query string.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SCENARIO_LABEL } from "../src/lib/fixed-copy.ts";
import { jsonLd } from "../src/lib/json-ld.ts";
import { siteContext } from "../src/lib/site.ts";
import { postView } from "../src/lib/views/post.ts";

const SITE_URL = "https://techsider.com.au";
const PUBLISHED = new Date("2026-06-09T00:00:00Z");
const post = (data = {}, id = "test-post") => ({
  id,
  body: Array.from({ length: 400 }, (_, i) => `word${i}`).join(" "),
  data: {
    title: "Test post title", description: "Test post description.", publishDate: PUBLISHED, type: "article",
    industries: [], solutions: [], illustrative: false, draft: false, ...data,
  },
});
const view = (data, preview = false) => postView({ post: post(data), site: siteContext(preview), siteUrl: SITE_URL });

test("postView: the card, page title, breadcrumb and dates of a published post", () => {
  const v = view();
  assert.deepEqual(v.card, {
    id: "test-post", href: "/insights/test-post/", title: "Test post title", description: "Test post description.",
    typeLabel: "Article", date: PUBLISHED, minutes: 2, industries: [],
  });
  assert.equal(v.metaTitle, "Test post title | Techsider");
  assert.equal(v.updated, null);
  assert.equal(v.illustrativeLabel, null);
  // Insights is live, so the production trail keeps it: Home › Insights › the post.
  assert.deepEqual(v.breadcrumb, [
    { label: "Home", href: "/" },
    { label: "Insights", href: "/insights/" },
    { label: "Test post title", href: "/insights/test-post/" },
  ]);
  const updated = new Date("2026-07-01T00:00:00Z");
  assert.equal(view({ updatedDate: updated }).updated, updated);
});

test("postView: a post with no references closes with plain 'Talk to us', linked to /contact/", () => {
  assert.deepEqual(view().closing, { command: "talk_to_us", label: "Talk to us", href: "/contact/" });
  assert.deepEqual(view({}, true).closing, { command: "talk_to_us", label: "Talk to us", href: "/contact/" });
});

test("postView: the first solution reference wins, then the first industry (spec §10.1)", () => {
  const both = { solutions: ["knowledge-assistant", "document-registers"], industries: ["government"] };
  assert.deepEqual(view(both, true).closing, {
    command: "talk_to_us", args: "--about=knowledge-assistant",
    label: "Talk to us about Knowledge Assistant", href: "/contact/?interest=knowledge-assistant",
  });
  const industries = { industries: ["financial-services", "government"] };
  assert.deepEqual(view(industries, true).closing, {
    command: "talk_to_us", args: "--about=financial-services",
    label: "Talk to us about AI for financial services", href: "/contact/?industry=financial-services",
  });
  // Production: the label stays contextual, and the link carries the same query as the preview's.
  assert.equal(view(both).closing.label, "Talk to us about Knowledge Assistant");
  assert.equal(view(both).closing.href, "/contact/?interest=knowledge-assistant");
  assert.equal(view(industries).closing.href, "/contact/?industry=financial-services");
  // Astro's reference() gives { id, collection }; refId reads both shapes.
  const refs = { solutions: [{ id: "ai-evaluation", collection: "solutions" }], industries: [{ id: "government", collection: "industries" }] };
  assert.equal(view(refs, true).closing.href, "/contact/?interest=ai-evaluation");
  assert.deepEqual(view(refs, true).card.industries, [{ id: "government", label: "Government", href: "/industries/government/" }]);
  // Government is live from Phase C Task 4, so production links its chip too.
  assert.deepEqual(view(refs).card.industries, [{ id: "government", label: "Government", href: "/industries/government/" }]);
});

test("postView: an illustrative post carries the scenario label", () => {
  assert.equal(view({ type: "reference-scenario", illustrative: true }).illustrativeLabel, SCENARIO_LABEL);
});

test("postView: drafts and unknown references throw", () => {
  assert.throws(() => view({ draft: true }), /"test-post" is a draft/);
  assert.throws(() => view({ solutions: ["mining-assistant"] }), /Unknown solution id "mining-assistant"/);
  assert.throws(() => view({ industries: ["mining"] }), /Unknown industry id "mining"/);
});

test("postView: BlogPosting JSON-LD, authored and published by the Organization, never a person", () => {
  const updated = new Date("2026-07-01T00:00:00Z");
  const organization = { "@type": "Organization", name: "Techsider", url: "https://techsider.com.au" };
  assert.deepEqual(view({ updatedDate: updated }).jsonLd, {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "Test post title",
    description: "Test post description.",
    datePublished: "2026-06-09T00:00:00.000Z",
    dateModified: "2026-07-01T00:00:00.000Z",
    inLanguage: "en-AU",
    url: "https://techsider.com.au/insights/test-post/",
    mainEntityOfPage: "https://techsider.com.au/insights/test-post/",
    author: organization,
    publisher: organization,
  });
  const plain = view().jsonLd;
  assert.equal("dateModified" in plain, false, "no dateModified without an updatedDate");
  assert.doesNotMatch(jsonLd(plain), /"Person"|"founder"|"employee"/);
  assert.deepEqual(JSON.parse(jsonLd(plain)), plain);
});
