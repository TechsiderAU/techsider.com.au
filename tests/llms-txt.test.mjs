// /llms.txt (go-global §3.1, §3.2, §9.3): the entity sentence word for word, the headquarters line,
// the §3.2 paragraph, the facts an assistant should repeat (each restating copy the site carries; the
// reply sentence built from CONTACT, never a literal), a Profiles list only while SITE.profiles has an
// entry with a URL, and none of the S1 wording (spec §1). The last test reads dist/llms.txt: run
// `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readDist } from "./helpers.mjs";
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
/** Spec §1 S1: wording that says Techsider is Australian, serves Australian organisations or targets Australia. */
const S1_BANNED = [
  "Australian organisations", "for Australian", "in Australia |", "Australia's leading",
  "Australian AI", "Australian teams", "Australian-owned", "most Australian",
];
const POSTS = [{ id: "fixture-post", title: "Fixture post title.", description: "Fixture post description.", publishDate: new Date("2026-10-01") }];
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

test("no S1 wording: llms.txt never says Techsider is for Australian organisations (go-global §1 S1, §9.3)", () => {
  const text = build().toLowerCase();
  for (const s of S1_BANNED) assert.ok(!text.includes(s.toLowerCase()), `llms.txt says "${s}"`);
});

test("dist/llms.txt: the built file carries the entity sentence, the HQ line, the paragraph and every fact, and none of the S1 wording", () => {
  const built = readDist("llms.txt");
  const text = lines(built);
  for (const line of [`> ${SUMMARY}`, HQ_LINE, PARAGRAPH, ...LLMS_FACTS.map((f) => `- ${f}`)]) {
    assert.ok(text.includes(line), `dist/llms.txt lacks "${line}"`);
  }
  for (const s of S1_BANNED) assert.ok(!built.toLowerCase().includes(s.toLowerCase()), `dist/llms.txt says "${s}"`);
});
