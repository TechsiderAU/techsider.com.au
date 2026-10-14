// /llms.txt (go-global §3.1, §3.2, §9.3): the entity sentence word for word, the headquarters line,
// the §3.2 paragraph, the facts an assistant should repeat (each restating copy the site carries; the
// reply sentence built from CONTACT, never a literal), a Profiles list only while SITE.profiles has an
// entry with a URL, the "(Australia)" label on each Australian post's line and on no other (go-global
// §6.1, final review F7), and none of the S1 wording (spec §1). The tests that read dist/llms.txt need
// `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { readDist } from "./helpers.mjs";
import { S1_BANNED, bannedRegExp } from "./support/s1-scan.mjs";
import { normalizeQuotes, readFrontmatter } from "../scripts/ci/lib.mjs";
import { SITE, hqLine } from "../src/data/nav.ts";
import { CONTACT } from "../src/data/contact.ts";
import { DISAMBIGUATION } from "../src/lib/fixed-copy.ts";
import { LLMS_FACTS, llmsTxt } from "../src/lib/llms-txt.ts";
import { replySentence } from "../src/lib/reply-time.ts";

const ORIGIN = "https://techsider.com.au";
const SUMMARY =
  "Techsider is an AI automation company headquartered in Sydney, Australia. It designs, builds and supports AI workflow automation, document processing and internal knowledge assistants that keep people in control, for organisations in Australia and internationally, and independently evaluates AI bought or built elsewhere.";
const HQ_LINE = "Headquartered in Sydney, Australia · Techsider Pty Ltd · ABN 12 636 205 868";
const PARAGRAPH =
  "Techsider Pty Ltd (ABN 12 636 205 868) is headquartered in Sydney, Australia, and builds for organisations in nine industries: mid-market firms with no AI team of their own, and enterprise and government teams that need independent evidence about the AI they run. Contact: admin@techsider.com.au or https://techsider.com.au/contact/.";
/** Spec §1 S1: the banned strings in a plain text, matched as tests/support/s1-scan.mjs matches them. */
const s1In = (text) => S1_BANNED.filter((s) => bannedRegExp(s).test(normalizeQuotes(text)));
const POSTS = [
  { id: "fixture-post", title: "Fixture post title.", description: "Fixture post description.", publishDate: new Date("2026-10-01"), region: null },
  { id: "fixture-region-post", title: "Fixture regional post title.", description: "Fixture regional post description.", publishDate: new Date("2026-09-30"), region: "au" },
];
const INSIGHTS = fileURLToPath(new URL("../src/content/insights/", import.meta.url));
/** Every published insight's id and region, from its frontmatter. */
const PUBLISHED = readdirSync(INSIGHTS)
  .filter((f) => f.endsWith(".md"))
  .map((f) => ({ id: f.slice(0, -".md".length), fm: readFrontmatter(join(INSIGHTS, f)) }))
  .filter((p) => p.fm.draft !== true)
  .map((p) => ({ id: p.id, region: p.fm.region ?? null }));
/** The lines of an llms.txt that list one post: "- [title](its URL)", " (Australia)" on an Australian post, then ": " and its description. */
const postLine = (text, id) => text.split("\n").filter((l) => l.startsWith("- [") && l.includes(`](${ORIGIN}/insights/${id}/)`));
const build = () => llmsTxt({ site: ORIGIN, posts: POSTS });
const lines = (text) => text.split("\n");

test("SITE.summary is the go-global entity sentence, word for word (go-global §3.1, S5)", () => {
  assert.equal(SITE.summary, SUMMARY);
});

test("llms.txt opens with the name, the entity sentence, the HQ line and the §3.2 paragraph (go-global §3.2, §9.3)", () => {
  assert.equal(hqLine(), HQ_LINE);
  assert.deepEqual(lines(build()).slice(0, 7), ["# Techsider", "", `> ${SUMMARY}`, "", HQ_LINE, "", PARAGRAPH]);
});

test("the facts: no clients yet, the reply sentence built from CONTACT, the Australian labels and the D18 disambiguation (go-global §9.3)", () => {
  const reply = replySentence(CONTACT, "Techsider");
  assert.equal(reply, "Techsider replies within two business days, Sydney time (AEST/AEDT).");
  assert.equal(DISAMBIGUATION, "Techsider is not affiliated with other organisations named TechSider.");
  for (const fact of ["Techsider has no clients yet.", reply, "Australian examples and regulatory maps are labelled as Australian.", DISAMBIGUATION]) {
    assert.ok(LLMS_FACTS.includes(fact), `LLMS_FACTS lacks "${fact}"`);
  }
  const text = lines(build());
  const at = text.indexOf("Facts to keep when describing Techsider:");
  assert.ok(at > 0, "no facts heading");
  assert.deepEqual(text.slice(at + 2, at + 2 + LLMS_FACTS.length), LLMS_FACTS.map((f) => `- ${f}`));
  // The reply time is written once, in src/data/contact.ts (tests/company-pages.test.mjs); this file reads it.
  assert.ok(!readFileSync(new URL("../src/lib/llms-txt.ts", import.meta.url), "utf8").includes(CONTACT.replyTime), "llms-txt.ts writes the reply time itself");
});

test("Profiles lists only the profiles with a URL, between Company and Optional, and is left out while there are none (go-global §9.3, O7)", () => {
  assert.deepEqual(SITE.profiles, []);
  assert.ok(!build().includes("## Profiles"), "Profiles renders with no profile");
  const saved = SITE.profiles;
  try {
    SITE.profiles = [{ name: "Fixture directory", url: "https://example.com/fixture-profile" }, { name: "Fixture pending", url: "" }];
    const text = lines(build());
    const at = text.indexOf("## Profiles");
    assert.ok(at > text.indexOf("## Company") && at < text.indexOf("## Optional"), "Profiles doesn't sit between Company and Optional");
    assert.deepEqual(text.slice(at, at + 4), ["## Profiles", "", "- [Fixture directory](https://example.com/fixture-profile)", ""]);
    SITE.profiles = [{ name: "Fixture pending", url: "" }];
    assert.ok(!build().includes("## Profiles"), "a profile without a URL renders the section");
  } finally {
    SITE.profiles = saved;
  }
});

test("Insights: an Australian post's line carries \"(Australia)\" after its link, and no other line does (go-global §6.1, final review F7)", () => {
  const text = build();
  assert.deepEqual(postLine(text, "fixture-post"), [`- [Fixture post title](${ORIGIN}/insights/fixture-post/): Fixture post description. (2026-10-01)`]);
  assert.deepEqual(postLine(text, "fixture-region-post"), [`- [Fixture regional post title](${ORIGIN}/insights/fixture-region-post/) (Australia): Fixture regional post description. (2026-09-30)`]);
  assert.equal(text.split("(Australia):").length - 1, 1, "one labelled line");
});

test("dist/llms.txt: every published post tagged region: au has the (Australia) label after its link, and no other post does (go-global §6.1, final review F7)", () => {
  const built = readDist("llms.txt");
  assert.ok(PUBLISHED.filter((p) => p.region === "au").length > 0, "no Australian post to check");
  for (const { id, region } of PUBLISHED) {
    const found = postLine(built, id);
    assert.equal(found.length, 1, `dist/llms.txt lists ${id} ${found.length} times`);
    const link = `](${ORIGIN}/insights/${id}/)`;
    assert.ok(found[0].includes(region === "au" ? `${link} (Australia): ` : `${link}: `), `${id} (region ${region}): ${found[0]}`);
  }
  assert.equal(built.split("(Australia):").length - 1, PUBLISHED.filter((p) => p.region === "au").length, "a label on a line that isn't an Australian post's");
});

test("no S1 wording: llms.txt never says Techsider is for Australian organisations (go-global §1 S1, §9.3)", () => {
  assert.deepEqual(s1In(build()), [], "llms.txt says an S1 string");
});

test("dist/llms.txt: the built file carries the entity sentence, the HQ line, the paragraph and every fact, and none of the S1 wording", () => {
  const built = readDist("llms.txt");
  const text = lines(built);
  for (const line of [`> ${SUMMARY}`, HQ_LINE, PARAGRAPH, ...LLMS_FACTS.map((f) => `- ${f}`)]) {
    assert.ok(text.includes(line), `dist/llms.txt lacks "${line}"`);
  }
  assert.deepEqual(s1In(built), [], "dist/llms.txt says an S1 string");
});
