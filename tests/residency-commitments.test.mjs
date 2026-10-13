// go-global §4.4, the commitment sweep: the residency promises no other test file pins.
// - Home's residency answer (also Home's FAQPage JSON-LD), AI Evaluation's answer on whether test
//   data leaves your environment (also that page's FAQPage JSON-LD) and the two in-voice promises
//   in the insights, word for word.
// - Part 3's data modules: the visible label is the region note (D5), and an Australian region is
//   named only for a system Techsider manages (D3). tests/solutions-content.test.mjs holds the
//   solution pages' own copy to the same rule.
// - Each page whose copy Part 3 rewrote and that claims a region also tells the reader the team
//   reaches systems remotely from Sydney (§4.1 "Short forms", D4). Remote access from a third
//   country is a transfer (EDPB Guidelines 05/2021; the ICO), so no page may read as "nothing leaves".
// - The final whole-branch review: Legal's answer on client files and the evaluation method's evidence
//   line, word for word, and a guard over every industry and solution FAQ that asks whether data
//   leaves or where it is processed: each answer says "remotely from Sydney" unless an allow-list
//   entry gives the reason it needn't.
// tests/services-pages.test.mjs pins the positioning and services copy, tests/company-pages.test.mjs
// the Trust copy. The tests that read dist/ need `npm run build` first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { readDist, visibleText } from "./helpers.mjs";
import { HOME } from "../src/data/home.ts";
import { POSITIONING } from "../src/data/positioning.ts";
import { SERVICES } from "../src/data/services.ts";
import { TRUST } from "../src/data/trust.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const read = (rel) => readFileSync(`${ROOT}${rel}`, "utf8");
const bodyOf = (md) => md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
/** Every string in a data value, however deep. */
const strings = (v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : []);
const POSTS = ["rag-that-survives-an-apra-audit", "property-platform-ai-and-tenant-data"];
/** The managed option's wording: the only places Part 3's data may name an Australian region (D3). */
const MANAGED_AU_REGION = /\b(?:or in an Australian region (?:if we manage|we manage)|or in ours in an Australian region|managed (?:by us |for you )?in an Australian region|we manage the system in an Australian region|we run it for you in an Australian region|(?:we|Techsider) manages? for you run in an Australian region)\b/gi;
/** AI Evaluation's question on test data, and its answer: a direct answer first, then the remote access (D4). */
const TEST_DATA_Q = "Does test data leave our environment?";
const TEST_DATA_A = "We don't take a copy. The test runs in your environment, and the graders run in your own subscription, so test data and results stay with you. Our team reaches your environment remotely from Sydney, under the data-transfer terms in your contract. The system under test processes each test question where its vendor runs it, as in normal use, and the report records the vendor's published processing location, with its date. While your approvals run, testing can start on public or synthetic data.";

test("Home: the residency answer is go-global §4.4's, word for word, remote access included", () => {
  const residency = HOME.faq.filter((f) => f.q === "Where does our data go?");
  assert.equal(residency.length, 1, "one residency question on Home");
  assert.equal(
    residency[0].a,
    "What we build for you runs in the cloud region you choose, in your own Microsoft or AWS account; systems we manage for you run in an Australian region. Each launch package's region note records where model inference actually runs. Our team reaches systems remotely from Sydney, under the data-transfer terms in your contract. Inside a platform you already license, the vendor sets where processing happens: we show you its published processing location, with the source, or tell you it isn't published.",
  );
});

test("insights: the two in-voice residency promises name the region you choose and the remote access (go-global §4.4)", () => {
  const rag = bodyOf(read("src/content/insights/rag-that-survives-an-apra-audit.md"));
  assert.ok(
    rag.includes("The pipeline runs inside your boundary, in the cloud region you choose, and your documents aren't used to train anyone's model. Who can reach it is part of the same design: our team reaches it remotely from Sydney, under the data-transfer terms in your contract."),
    "the APRA post's sovereignty paragraph",
  );
  assert.doesNotMatch(rag, /\bsent offshore\b/);
  const property = bodyOf(read("src/content/insights/property-platform-ai-and-tenant-data.md"));
  assert.ok(
    property.includes("Switch-On then configures the features you already own, and its region note records what each vendor publishes about where its AI runs, with the source and the date."),
    "the property post's Switch-On line",
  );
});

test("AI Evaluation: the test-data answer says we take no copy and that our team reaches your environment remotely from Sydney, word for word (go-global §4.4, D4)", () => {
  // A bare "Not to us." opener read as "nothing reaches us". Remote access from Sydney is a transfer.
  const item = parse(read("src/content/solutions/ai-evaluation.yaml")).faq.filter((f) => f.q === TEST_DATA_Q);
  assert.equal(item.length, 1, "one test-data question on AI Evaluation");
  assert.equal(item[0].a, TEST_DATA_A);
});

test("Part 3's residency data says 'region note', never 'onshore note', and names an Australian region only for what Techsider manages (go-global D3, D5)", () => {
  const sources = {
    "src/data/home.ts": strings(HOME),
    "src/data/positioning.ts": strings(POSITIONING),
    "src/data/services.ts": strings(SERVICES),
    "src/data/trust.ts": strings(TRUST),
    ...Object.fromEntries(POSTS.map((id) => [`src/content/insights/${id}.md`, [bodyOf(read(`src/content/insights/${id}.md`))]])),
  };
  for (const [file, list] of Object.entries(sources)) {
    for (const s of list) {
      assert.doesNotMatch(s, /\bonshore note\b/i, `${file}: "${s}"`);
      assert.doesNotMatch(s.replace(MANAGED_AU_REGION, ""), /\bAustralian region\b/, `${file}: an Australian region outside the managed option: "${s}"`);
    }
  }
});

test("each page Part 3 rewrote states a region and also says the team reaches systems remotely from Sydney (go-global §4.1, D4)", () => {
  const pages = [
    "index.html", "about/index.html", "services/index.html",
    ...["document-registers", "knowledge-assistant", "draft-for-approval", "ai-evaluation", "ai-switch-on"].map((id) => `solutions/${id}/index.html`),
  ];
  for (const file of pages) {
    const body = visibleText(readDist(file));
    assert.match(body, /\bregion you choose\b/, `${file}: no region claim (the test expects one on every page Part 3 rewrote)`);
    assert.ok(body.includes("remotely from Sydney"), `${file}: a region claim without the remote-access sentence`);
  }
});

test("the built AI Evaluation page's FAQPage JSON-LD carries the same test-data answer (go-global §4.4, D4)", () => {
  const blocks = [...readDist("solutions/ai-evaluation/index.html").matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const faq = blocks.filter((b) => b["@type"] === "FAQPage");
  assert.equal(faq.length, 1, "one FAQPage");
  assert.equal(faq[0].mainEntity.find((e) => e.name === TEST_DATA_Q)?.acceptedAnswer.text, TEST_DATA_A);
});

// ---------- the final whole-branch review (F1, F34): D4 on every answer about data leaving ----------

/** Legal's answer on whether client files leave the firm, in decision 1's pattern (final review F1). */
const LEGAL_FILES_Q = "Does testing mean our client files leave the firm?";
const LEGAL_FILES_A = "Only to the tools under test; we don't take a copy. Tests run in tool accounts your firm controls, on cleared matters or de-identified copies. Our team reaches those accounts remotely from Sydney, under the data-transfer terms in your contract. A data note first records each vendor's published storage and processing locations, with their dates. Whether a client must consent is your call.";
/** The evaluation method's evidence line: the graders run in your subscription, and our team reaches it from Sydney (final review F34). */
const METHOD_RESIDENCY = "The graders run there too, so test data and results stay with you. Our team reaches your subscription remotely from Sydney, under the data-transfer terms in your contract.";
/** A question that asks whether data or files leave, or where data is processed. */
const RESIDENCY_Q = /\b(?:leaves?|leaving)\b|\bprocessed\b/i;
/**
 * The answers to such a question that may leave out "remotely from Sydney", each with its reason.
 * Every other one says it (D4: "always disclose that staff reach systems remotely from Sydney").
 */
const NO_REMOTE_ACCESS = {
  "industries/healthcare: Does patient data have to leave our environment?": "the test uses scripted consultations, not patient records, so no patient data is in play",
  "industries/resources-and-energy: We run a SOCI-covered asset. Where would our data be processed?": "the Australia-only SOCI FAQ moves into the band unchanged (go-global §4.4, §5.6)",
  "solutions/ai-switch-on: Where is our data processed?": "Switch-On works only inside platforms the client licenses, where each vendor sets the processing location",
};
const yamlDir = (dir) => readdirSync(`${ROOT}src/content/${dir}`).filter((f) => f.endsWith(".yaml"));

test("Legal: the answer on whether client files leave the firm says we take no copy and that our team reaches the firm's accounts remotely from Sydney, word for word, here and in its FAQPage JSON-LD (final review F1, D4)", () => {
  const item = parse(read("src/content/industries/legal-and-professional.yaml")).faq.filter((f) => f.q === LEGAL_FILES_Q);
  assert.equal(item.length, 1, "one client-files question on Legal");
  assert.equal(item[0].a, LEGAL_FILES_A);
  const blocks = [...readDist("industries/legal-and-professional/index.html").matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const faq = blocks.filter((b) => b["@type"] === "FAQPage");
  assert.equal(faq.length, 1, "one FAQPage");
  assert.equal(faq[0].mainEntity.find((e) => e.name === LEGAL_FILES_Q)?.acceptedAnswer.text, LEGAL_FILES_A);
});

test("every industry and solution FAQ that asks whether data leaves, or where it is processed, says our team reaches systems remotely from Sydney, unless the allow-list gives a reason (final review F1, D4)", () => {
  const seen = [];
  for (const dir of ["industries", "solutions"]) {
    for (const file of yamlDir(dir)) {
      for (const f of parse(read(`src/content/${dir}/${file}`)).faq ?? []) {
        if (!RESIDENCY_Q.test(f.q)) continue;
        const key = `${dir}/${file.slice(0, -".yaml".length)}: ${f.q}`;
        seen.push(key);
        if (Object.hasOwn(NO_REMOTE_ACCESS, key)) continue;
        assert.ok(f.a.replace(/\s+/g, " ").includes("remotely from Sydney"), `${key}: the answer doesn't say our team reaches systems remotely from Sydney`);
      }
    }
  }
  assert.deepEqual(Object.keys(NO_REMOTE_ACCESS).filter((key) => !seen.includes(key)), [], "an allow-list entry names no current FAQ");
  assert.ok(seen.length >= 9, `${seen.length} residency questions found; the guard has stopped reading the FAQs`);
});

test("the evaluation method: test data and results stay with you, and our team reaches your subscription remotely from Sydney, in the source and on the built page (final review F34, D4)", () => {
  assert.ok(bodyOf(read("src/content/documents/evaluation-method.md")).includes(METHOD_RESIDENCY), "src/content/documents/evaluation-method.md");
  assert.ok(visibleText(readDist("resources/evaluation-method/index.html")).includes(METHOD_RESIDENCY), "dist/resources/evaluation-method/index.html");
});
