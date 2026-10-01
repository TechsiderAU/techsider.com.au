// Phase C Task 7: the company pages with real content (spec §8.10, §8.11, §8.7). /about/, /contact/
// and /resources/ are live. /trust/, /legal/, /legal/privacy/, /legal/website-terms/ and
// /resources/safe-use-kits/ are written but stay planned, so only the preview build has them.
// Checked here: the data carries its owner markers (tests/content-data.test.mjs parses it); the
// About build log is held to this repository's history; the kits and the legal drafts wait for
// review; the evaluation method (published with its page in Phase D) states no result; and the
// built pages render that content.
// Run `npm run build && npm run build:preview` first. tests/e2e/prod-company.spec.mjs and
// tests/e2e/company-pages.spec.mjs cover axe and 320px in a browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { allHtmlFiles, readDist, readPreviewDist, visibleText } from "./helpers.mjs";
import {
  decodeEntities, elements, elementsWith, listFiles, loadExceptions, loadYaml, readFrontmatter, relPath, result,
} from "../scripts/ci/lib.mjs";
import { EXCEPTIONS_FILE, SOURCE_FILE, WARN_PHRASES, scan } from "../scripts/ci/checks/04-banned-phrases.mjs";
import { SCOPES as VERIFY_SCOPES } from "../scripts/ci/checks/07-verify-markers.mjs";
import { documentSchema } from "../src/content/page-schemas.ts";
import { makeKitSchema, plainRef } from "../src/content/schemas.ts";
import { PAGES, SITE } from "../src/data/nav.ts";
import { ABOUT } from "../src/data/about.ts";
import { CONTACT } from "../src/data/contact.ts";
import { POSITIONING } from "../src/data/positioning.ts";
import { SERVICES } from "../src/data/services.ts";
import { TRUST } from "../src/data/trust.ts";
import { CONTACT_H1 } from "../src/lib/fixed-copy.ts";
import { pageDescription, pageTitle } from "../src/lib/meta.ts";
import { siteContext } from "../src/lib/site.ts";
import { trustView } from "../src/lib/views/company.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = join(ROOT, "dist");
const DIST_PREVIEW = join(ROOT, "dist-preview");
const LIVE = ["/about/", "/contact/", "/resources/"];
const PLANNED = ["/trust/", "/legal/", "/legal/privacy/", "/legal/website-terms/", "/resources/safe-use-kits/"];
// Every source file this task writes, for the banned-phrase scan.
const SOURCES = [
  "src/data/about.ts", "src/data/contact.ts", "src/data/trust.ts",
  "src/content/kits/accounting.yaml", "src/content/kits/legal.yaml", "src/content/kits/property.yaml",
  "src/content/documents/privacy.md", "src/content/documents/website-terms.md", "src/content/documents/evaluation-method.md",
  "src/pages/about/[...page].astro", "src/pages/contact/[...page].astro", "src/pages/resources/[...page].astro",
  "src/pages/trust/[...page].astro", "src/pages/legal/[...page].astro", "src/pages/legal/privacy/[...page].astro",
  "src/pages/legal/website-terms/[...page].astro", "src/pages/resources/safe-use-kits/[...page].astro",
];
// Each About build-log entry, in ABOUT.buildLog order, with the subjects of the commits that
// evidence it. Every subject must be in this repository's history, dated (Australia/Sydney) on the
// entry's date. A new entry needs its evidence here first.
const BUILD_LOG_EVIDENCE = [
  // The CI workflow adds Firefox; the second subject records that Firefox hadn't run when it was written.
  ["2026-09-29", [
    "ci: CI workflow, gated deploy build, e2e in Chromium, WebKit and Firefox plus the production shell",
    "fix(phase-b1): keep a Playwright trace for every failed test; correct the \"Firefox verified in CI\" record",
    "test(gallery): sweep every template page for axe, one h1, heading order, 320px, unique ids and landing links",
  ]],
  ["2026-09-29", [
    "ci: spec §11.5 checks 1–6 (slugs and cross-references, links, anchors, banned phrases, captions, provenance)",
    "ci: add checks 7, 8, 10 and 11 and the run-all runner; npm run build now runs every check",
  ]],
  ["2026-09-28", [
    "feat(brand): Acid Signal tokens, Archivo + JetBrains Mono, base styles and utilities",
    "feat(brand): [techsider] wordmark and favicon/PWA kit from JetBrains Mono Bold outlines",
  ]],
  ["2026-09-28", ["fix(demo): add pause/skip, replay-anytime and screen-reader-safe status (WCAG 2.2.2)"]],
  ["2026-09-28", ["fix(demo): correct CPS 230 citations (¶34 not ¶37), add ¶41 24-hour and ¶60 notices, label metrics illustrative"]],
  ["2026-06-14", [
    "feat: grounded scripted-transcript data for the RAG demo",
    "feat: demo section with SSR static-transcript fallback; wire into page",
    "feat: canned RAG demo replay engine (animation, citations, trace, replay)",
  ]],
  ["2026-06-14", ["feat: /insights index page", "feat: RSS feed for /insights"]],
  ["2026-05-12", ["chore: scaffold astro 5 project with tailwind v4 and sitemap", "ci: github pages deploy workflow using withastro action"]],
];
// CI check 6's metric-shaped tokens: a decimal fraction, a percentage, a latency, a ratio.
const METRIC_SHAPES = [/\b0\.\d+\b/, /\d+(\.\d+)?\s?%/, /\d+\s?ms\b/, /\d+\s?\/\s?\d+/];

const source = (rel) => readFileSync(join(ROOT, rel), "utf8");
const fileOf = (path) => `${path.slice(1)}index.html`;
const entryAt = (path) => PAGES.find((p) => p.path === path);
const isoDate = (d) => d.toISOString().slice(0, 10);
const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>") + "</main>".length);
const text = (html) => visibleText(html).trim();
// Text as a browser shows it inline: tags dropped without adding spaces ("<span>fix</span>." → "fix.").
const inlineText = (html) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const tagged = (html, name) => elements(html, (t) => t.name === name);
const titleOf = (html) => decodeEntities(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
const descriptionOf = (html) => decodeEntities(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");
const jsonLd = (html) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
// A YAML file's content lines, without its comments (where the ⚑ markers live).
const withoutComments = (yaml) => yaml.split("\n").filter((line) => !line.trimStart().startsWith("#")).join("\n");
const bodyOf = (md) => md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
function one(html, attr, value) {
  const found = elementsWith(html, attr, value);
  assert.equal(found.length, 1, `expected one [${attr}${value === undefined ? "" : `="${value}"`}], found ${found.length}`);
  return found[0];
}

test("each held fact carries its owner marker, which check 07 keeps open until launch", () => {
  const has = (rel, marker) => assert.ok(source(rel).includes(marker), `${rel} lacks "${marker}"`);
  for (const rel of ["src/data/about.ts", "src/data/contact.ts", "src/data/trust.ts"]) {
    has(rel, "// ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2)");
  }
  has("src/data/contact.ts", "// ⚑ owner: confirm the reply-time promise (spec §12 item 9)");
  has("src/data/about.ts", "// ⚑ owner: re-confirm team claims (spec §12 item 10)");
  // A frontmatter comment, not a body comment: the body renders on the live page, HTML comments included.
  has("src/content/documents/evaluation-method.md", "# ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2)");
});

test("the Trust FAQ's missing §8.11 answers are held by an owner marker (C7-T7-F2)", () => {
  // Spec §8.11 asks the Trust FAQ for retention, encryption, the DPA and "Can we trust the output?";
  // nothing true can be said yet, so the gap is a ⚑ check 07 keeps open until launch.
  const qs = TRUST.faq.map((f) => f.q).join("\n");
  assert.doesNotMatch(qs, /\bencrypt|\bDPA\b|data processing agreement|trust the output/i, "an answer arrived: drop the marker");
  assert.ok(source("src/data/trust.ts").includes('// ⚑ owner: add the §8.11 FAQ answers on retention, encryption, the DPA and "Can we trust the output?" (spec §8.11)'));
});

test("every ⚑ that check 07 reports is one owner marker naming its action (C7-T7-F4)", () => {
  // A ⚑ in a cross-reference is still an open item to check 07, so every glyph starts an action.
  let markers = 0;
  for (const scope of VERIFY_SCOPES) {
    for (const file of listFiles(join(ROOT, scope), (rel) => /\.(astro|md|mdx|ya?ml|json|ts|tsx|js|mjs|html|css|svg|txt)$/.test(rel) && !rel.endsWith("-exceptions.json"))) {
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        const n = line.split("⚑").length - 1;
        if (n === 0) return;
        markers += n;
        const at = `${relPath(ROOT, file)}:${i + 1}`;
        assert.equal(n, 1, `${at}: ${n} markers on one line`);
        assert.match(line, /⚑ owner: \S/, `${at}: a ⚑ that names no owner action`);
      });
    }
  }
  assert.ok(markers >= 50, `only ${markers} markers found`);
});

test("About: the principles are the four pillars word for word, then vendor neutrality; no seniority, place or headcount", () => {
  assert.deepEqual(ABOUT.principles.slice(0, 4), POSITIONING.pillars.map((p) => ({ title: p.title, body: p.mechanism })));
  assert.equal(ABOUT.principles.length, 5);
  assert.equal(ABOUT.principles[4].title, "Vendor-neutral.");
  assert.doesNotMatch(JSON.stringify(ABOUT), /\bsenior\b|\bAU-based\b|\bAustralian-based\b|\bheadcount\b|\bteam of (?:\d|one|two|three|four|five|six|seven|eight|nine|ten|dozens?)\b/i);
  const team = ABOUT.howWeWork.find((s) => s.body.includes("The people who scope your work"));
  assert.ok(team, "the team line is by function (spec §8.6 block 5, blueprint ruling 13)");
  assert.doesNotMatch(team.body, /\d/, "the team line carries a number");
});

test("About: the build log holds real, dated events from this repository's history only", () => {
  const shallow = execFileSync("git", ["rev-parse", "--is-shallow-repository"], { cwd: ROOT, encoding: "utf8" }).trim();
  assert.equal(shallow, "false", "a shallow clone can't evidence the build log: check out with fetch-depth: 0");
  const log = execFileSync("git", ["log", "--format=%ad%x09%s", "--date=format-local:%Y-%m-%d"], {
    cwd: ROOT, encoding: "utf8", env: { ...process.env, TZ: "Australia/Sydney" }, maxBuffer: 64 * 1024 * 1024,
  });
  const dated = new Set(log.split("\n").filter(Boolean));
  assert.deepEqual(
    ABOUT.buildLog.map((e) => isoDate(e.date)),
    BUILD_LOG_EVIDENCE.map(([date]) => date),
    "every build-log entry needs its evidence in BUILD_LOG_EVIDENCE, in the same order",
  );
  for (const [date, subjects] of BUILD_LOG_EVIDENCE) {
    for (const subject of subjects) assert.ok(dated.has(`${date}\t${subject}`), `no commit "${subject}" dated ${date} (Australia/Sydney)`);
  }
});

test("Contact: the configured form provider is included in the services handling enquiries", () => {
  assert.equal(CONTACT.formProvider.name, "FormSubmit");
  assert.equal(CONTACT.emailProvider.name, "Lark Suite");
  assert.deepEqual(CONTACT.subProcessors.map((s) => s.entity), ["GitHub Pages", "Cloudflare", "Lark Suite", "FormSubmit"]);
  assert.equal(CONTACT.deflection.length, 1, "other enquiries share one contact block");
  assert.ok(CONTACT.deflection.every((d) => d.email === SITE.email), "a deflection address isn't the site's mailbox");
});

test("Trust: no Part B term is confirmed, so only Part A answers show; SOC 2 is a plain No; insurance isn't mentioned", () => {
  assert.ok(TRUST.partB.every((term) => term.confirmed === false));
  const { terms, faq } = trustView(TRUST);
  assert.deepEqual(terms, []);
  assert.ok(faq.length >= 5, `${faq.length} answers show; spec §8.11 needs a questionnaire`);
  assert.ok(faq.every((f) => f.part === "A"));
  const soc = TRUST.faq.find((f) => f.q === "Do you hold SOC 2 or ISO 27001?");
  assert.ok(soc, "no SOC 2 question");
  assert.ok(soc.a.startsWith("No. "), "the SOC 2 answer doesn't open with a plain No");
  assert.equal(soc.part, "A");
  assert.doesNotMatch(JSON.stringify(TRUST), /insur/i, "insurance is mentioned before any is confirmed (spec §12 item 8)");
  assert.equal(TRUST.partA.securityContact, SITE.email);
});

test("kits: accounting, legal and property, each pending lawyer review, its download path set and no file behind it", () => {
  const schema = makeKitSchema(plainRef);
  const industries = { accounting: "accounting", legal: "legal-and-professional", property: "real-estate" };
  for (const [id, industry] of Object.entries(industries)) {
    const rel = `src/content/kits/${id}.yaml`;
    const raw = loadYaml(join(ROOT, rel));
    const kit = schema.parse(raw);
    assert.equal(kit.industry, industry, rel);
    assert.equal(raw.lawyerReviewedAt, null, `${rel}: lawyerReviewedAt is set before any review`);
    assert.equal(kit.download, `/downloads/${id}-safe-use-kit.pdf`, rel);
    assert.equal(existsSync(join(ROOT, "public", kit.download)), false, `${rel}: a download file exists before the review`);
    assert.match(kit.source.url, /^https:\/\//, rel);
    assert.match(source(rel), /# ⚑ owner: lawyer review of the \w+ kit before any page links it \(spec §12 item 6\)/, rel);
  }
  assert.doesNotMatch(withoutComments(source("src/content/kits/legal.yaml")), /GPN-AI|Federal Court/, "GPN-AI is held until its live page is checked (blueprint ruling 1)");
  assert.doesNotMatch(withoutComments(source("src/content/kits/property.yaml")), /Connector|PropertyMe/, "no connector until index A3 is answered (blueprint ruling 9)");
});

test("documents: the privacy policy and website terms are drafts naming the entity for review; the evaluation method is published", () => {
  for (const [id, draft] of [["privacy", true], ["website-terms", true], ["evaluation-method", false]]) {
    const data = documentSchema.parse(readFrontmatter(join(ROOT, `src/content/documents/${id}.md`)));
    assert.equal(data.draft, draft, id);
  }
  for (const id of ["privacy", "website-terms"]) {
    assert.match(source(`src/content/documents/${id}.md`), /<!-- ⚑ owner: [^>]*TECHSIDER PTY LTD, whose ABN is still to be confirmed \(spec §12 item 5\)\. -->/, id);
  }
});

test("evaluation method: every part of the published method (spec §4.1 ④, blueprint Task 7)", () => {
  const body = bodyOf(source("src/content/documents/evaluation-method.md"));
  assert.deepEqual([...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]), [
    "Thresholds come first",
    "Sample size and confidence intervals",
    "Ground truth",
    "Inter-rater agreement",
    "Grading, and LLM-judge calibration",
    "False answers and false refusals, reported separately",
    "Every failure, listed",
    "Evidence you can re-run",
    "When the model changes",
    "What the report is, and what it isn't",
    "Adversarial testing",
  ]);
  for (const line of [
    "findings, not an assurance opinion",
    "It is not an ASAE 3000 or ASRE engagement.",
    "Techsider never does adversarial testing in-house. Where it's needed, it's done by a CREST-accredited tester you engage.",
    "a replay script that runs in your own cloud subscription",
    "Findings are rated to your risk matrix",
    "Each is counted and reported on its own, against its own threshold.",
    "The thresholds don't move once results are in.",
    'labelled "acceptance test (not independent)"',
  ]) assert.ok(body.includes(line), `the method lacks "${line}"`);
});

test("evaluation method: no result, every figure inside a labelled example, and no harness link yet", () => {
  const body = bodyOf(source("src/content/documents/evaluation-method.md"));
  const quoted = body.split("\n").filter((line) => line.startsWith(">"));
  assert.ok(quoted.length >= 1, "the method has no worked example");
  for (const line of quoted) assert.ok(line.startsWith("> **Worked example (an example, not a result).**"), `an unlabelled quote: ${line}`);
  const rest = body.split("\n").filter((line) => !line.startsWith(">")).join("\n");
  for (const shape of METRIC_SHAPES) assert.doesNotMatch(rest, shape, `a metric-shaped figure outside the labelled example: ${shape}`);
  assert.doesNotMatch(body, /github\.com/i, "the harness link waits for spec §12 item 4");
});

test("check 04: the new sources carry no banned phrase and no warning, beyond their seeded exceptions", () => {
  const r = result();
  const exceptions = loadExceptions(ROOT, EXCEPTIONS_FILE, "phrase", r);
  for (const rel of SOURCES) {
    const copy = source(rel);
    scan(copy, rel, exceptions, r, { lines: true });
    scan(copy, rel, exceptions, r, { lines: true, phrases: WARN_PHRASES, kind: "warning" });
  }
  assert.deepEqual([...r.errors, ...r.warnings], []);
});

test("nav: the company pages and contact confirmation are live; legal drafts and kits stay planned", () => {
  for (const path of LIVE) assert.equal(entryAt(path).status, "live", path);
  assert.equal(entryAt("/contact/sent/").status, "live");
  for (const path of PLANNED) assert.equal(entryAt(path).status, "planned", path);
});

test("each planned company page has its own [...page].astro route in src/pages/, built only while nav.ts shows it", () => {
  for (const path of PLANNED) {
    const file = `src/pages${path}[...page].astro`;
    assert.ok(existsSync(join(ROOT, file)), `${file} is missing`);
    assert.match(source(file), new RegExp(`getStaticPaths = \\(\\(\\) => singletonPaths\\("${path}"\\)\\)`), `${file} isn't gated by singletonPaths("${path}")`);
  }
});

test("production builds the live company pages only; the preview builds all eight", () => {
  for (const path of LIVE) assert.ok(existsSync(join(DIST, fileOf(path))), `dist/${fileOf(path)} is missing`);
  for (const path of PLANNED) assert.equal(existsSync(join(DIST, fileOf(path))), false, `dist/${fileOf(path)} is built while planned`);
  for (const path of [...LIVE, ...PLANNED]) assert.ok(existsSync(join(DIST_PREVIEW, fileOf(path))), `dist-preview/${fileOf(path)} is missing`);
});

test("every company page takes its title and meta description from nav.ts", () => {
  for (const path of LIVE) {
    const html = readDist(fileOf(path));
    assert.equal(titleOf(html), pageTitle(entryAt(path)), path);
    assert.equal(descriptionOf(html), pageDescription(entryAt(path)), path);
  }
  for (const path of PLANNED) {
    const html = readPreviewDist(fileOf(path));
    assert.equal(titleOf(html), pageTitle(entryAt(path)), path);
    assert.equal(descriptionOf(html), pageDescription(entryAt(path)), path);
  }
});

test("/contact/: the enquiry form, email fallback, reply time and next steps are available", () => {
  const main = mainOf(readDist("contact/index.html"));
  one(main, "data-template", "contact");
  const h1s = tagged(main, "h1");
  assert.equal(h1s.length, 1);
  assert.equal(inlineText(h1s[0].inner), CONTACT_H1);
  assert.equal(tagged(main, "form").length, 1);
  assert.equal(one(main, "data-contact-form").attrs.action, CONTACT.formEndpoint);
  assert.equal(text(one(main, "data-email").inner), SITE.email);
  assert.equal(text(one(main, "data-reply-time").inner), `We reply within ${CONTACT.replyTime}.`);
  assert.deepEqual(tagged(tagged(one(main, "id", "next").inner, "ol")[0].inner, "li").map((li) => text(li.inner)), CONTACT.whatNext);
  assert.deepEqual(tagged(one(main, "id", "elsewhere").inner, "a").map((a) => a.attrs.href), CONTACT.deflection.map((d) => `mailto:${d.email}`));
});

test("the reply time is written once and shared by the contact and confirmation pages", () => {
  const files = listFiles(join(ROOT, "src"), (rel) => SOURCE_FILE.test(rel) && !rel.startsWith("fixtures/"));
  const writing = files.filter((f) => readFileSync(f, "utf8").includes(CONTACT.replyTime)).map((f) => relPath(ROOT, f)).sort();
  // The legacy Home's contact section said it too, until Phase D Task 8 deleted it with the legacy
  // Home. No other page states a reply time (spec §8.11).
  assert.deepEqual(writing, ["src/data/contact.ts"]);
  const stating = allHtmlFiles().filter((f) => /\bwe reply within\b/i.test(visibleText(readDist(f)))).sort();
  assert.deepEqual(stating, ["contact/index.html", "contact/sent/index.html"]);
  for (const f of stating) assert.ok(visibleText(readDist(f)).includes(`We reply within ${CONTACT.replyTime}.`), f);
});

test("/about/: the mission, who it's for, the origin line, the principles, how we work, the build log newest first, and a prompt to /contact/", () => {
  const main = mainOf(readDist("about/index.html"));
  const root = one(main, "data-template", "about");
  const copy = text(root.inner);
  for (const s of [ABOUT.mission, ABOUT.whoWeServe, ABOUT.whyControl, POSITIONING.originLine]) assert.ok(copy.includes(s), s);
  assert.deepEqual(tagged(one(main, "id", "principles").inner, "h3").map((h) => text(h.inner)), ABOUT.principles.map((p) => p.title));
  assert.deepEqual(tagged(one(main, "id", "how-we-work").inner, "h3").map((h) => text(h.inner)), ABOUT.howWeWork.map((s) => s.title));
  const log = one(main, "id", "build-log");
  assert.deepEqual(tagged(log.inner, "time").map((t) => t.attrs.datetime), ABOUT.buildLog.map((e) => isoDate(e.date)).sort().reverse());
  for (const e of ABOUT.buildLog) assert.ok(text(log.inner).includes(e.event), e.event);
  assert.deepEqual(tagged(one(main, "id", "contact").inner, "a").map((a) => a.attrs.href), ["/contact/"]);
});

test("/resources/: a linked card for each resource this build shows, and no unlinked card (nothing 'coming soon')", () => {
  const main = mainOf(readDist("resources/index.html"));
  one(main, "data-template", "resources-hub");
  const shown = siteContext(false).resources.filter((r) => r.href !== null);
  const cards = elementsWith(main, "data-resource");
  assert.deepEqual(cards.map((c) => c.attrs["data-resource"]), shown.map((r) => r.key));
  assert.deepEqual(cards.map((c) => c.attrs["data-resource"]), ["insights", "demos", "payFor", "evaluationMethod"], "the Safe-Use Kits wait for a lawyer's review (spec §12 item 6)");
  cards.forEach((card, i) => assert.deepEqual(tagged(card.inner, "a").map((a) => a.attrs.href), [shown[i].href]));
});

test("preview /trust/: the three services in Part A, no Part B, only Part A answers, the independence policy and one card per AI system", () => {
  const html = readPreviewDist("trust/index.html");
  const main = mainOf(html);
  one(main, "data-template", "trust");
  const partA = text(one(main, "id", "part-a").inner);
  for (const s of CONTACT.subProcessors) assert.ok(partA.includes(s.entity) && partA.includes(s.country), s.entity);
  assert.equal(elementsWith(main, "id", "part-b").length, 0, "#part-b renders with no confirmed term");
  const faq = jsonLd(html).filter((b) => b["@type"] === "FAQPage");
  assert.equal(faq.length, 1);
  assert.deepEqual(faq[0].mainEntity.map((q) => q.name), trustView(TRUST).faq.map((f) => f.q));
  assert.deepEqual(tagged(one(main, "id", "independence").inner, "li").map((li) => text(li.inner)), SERVICES.independence);
  assert.equal(elementsWith(main, "data-ai-system").length, TRUST.transparency.systems.length);
});

test("preview /legal/: both drafts listed, each page rendering its body under Home › Legal", () => {
  const hub = mainOf(readPreviewDist("legal/index.html"));
  one(hub, "data-template", "legal-hub");
  assert.deepEqual(elementsWith(hub, "data-legal-doc").map((c) => tagged(c.inner, "a")[0].attrs.href), ["/legal/privacy/", "/legal/website-terms/"]);
  for (const [path, title] of [["/legal/privacy/", "Privacy policy"], ["/legal/website-terms/", "Website terms"]]) {
    const main = mainOf(readPreviewDist(fileOf(path)));
    one(main, "data-template", "document");
    assert.equal(inlineText(tagged(main, "h1")[0].inner), title, path);
    assert.deepEqual(tagged(tagged(main, "nav")[0].inner, "a").map((a) => a.attrs.href), ["/", "/legal/"], `${path}: breadcrumb`);
    assert.ok(tagged(one(main, "data-document-body").inner, "h2").length >= 5, `${path}: the body has too few sections`);
  }
});

test("preview /resources/safe-use-kits/: the three kits in order, each pending review, with no download link", () => {
  const main = mainOf(readPreviewDist("resources/safe-use-kits/index.html"));
  const kits = elementsWith(main, "data-kit");
  assert.deepEqual(kits.map((k) => k.attrs.id), ["kit-accounting", "kit-legal", "kit-property"]);
  assert.ok(kits.every((k) => k.attrs["data-kit-status"] === "pending"));
  assert.equal(elementsWith(main, "data-kit-download").length, 0);
});

// Spec §12 item 6 (Global Constraints; review finding T7-F1): no kit is called free before a lawyer
// reviews it. While any kit's lawyerReviewedAt is null, no nav one-liner or description and no
// sentence on any page of either build (its text, its meta and alt text, its JSON-LD) calls a kit
// free. The kits page lists all three kits, so one reviewed kit doesn't make the others free.
test("no build calls a kit free while any kit waits for lawyer review (spec §12 item 6)", (t) => {
  const kitFiles = listFiles(join(ROOT, "src/content/kits"), (rel) => rel.endsWith(".yaml"));
  assert.ok(kitFiles.length > 0, "no kit in src/content/kits/");
  const pending = kitFiles.filter((abs) => loadYaml(abs).lawyerReviewedAt === null);
  if (pending.length === 0) {
    t.skip("every kit is lawyer-reviewed");
    return;
  }
  const callsAKitFree = (s) => /\bfree\b/i.test(s) && /\bkits?\b/i.test(s);
  const sentencesOf = (s) => s.replace(/\s+/g, " ").trim().split(/(?<=[.!?;:])\s+/).filter(Boolean);
  const INLINE = /^(a|abbr|b|bdi|bdo|cite|code|data|dfn|em|i|kbd|mark|q|s|samp|small|span|strong|sub|sup|time|u|var|wbr)$/i;
  // A page's sentences: each block's text (an inline tag reads as a space, since a span may be styled
  // as its own line), then its content, alt, title and aria-label attributes, then its JSON-LD strings.
  const pageSentences = (html) => {
    const ld = [];
    const collect = (v) => (typeof v === "string" ? ld.push(v) : v && typeof v === "object" && Object.values(v).forEach(collect));
    jsonLd(html).forEach(collect);
    const bare = html.replace(/<!--[\s\S]*?-->/g, "\n").replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "\n");
    const attrs = [...bare.matchAll(/\s(?:content|alt|title|aria-label)="([^"]*)"/g)].map((m) => m[1]);
    const blocks = bare.replace(/<\/?([a-zA-Z][\w-]*)\b[^>]*>/g, (_, name) => (INLINE.test(name) ? " " : "\n")).split("\n");
    return [...blocks, ...attrs].map(decodeEntities).concat(ld).flatMap(sentencesOf);
  };
  const offending = [];
  for (const p of PAGES) {
    for (const s of [p.oneLiner, p.description].filter(Boolean).flatMap(sentencesOf)) {
      if (callsAKitFree(s)) offending.push(`nav.ts ${p.path}: "${s}"`);
    }
  }
  for (const dir of [DIST, DIST_PREVIEW]) {
    const pages = listFiles(dir, (rel) => rel.endsWith(".html"));
    assert.ok(pages.length > 0, `${relPath(ROOT, dir)}/ has no page: run \`npm run build && npm run build:preview\` first`);
    for (const abs of pages) {
      for (const s of pageSentences(readFileSync(abs, "utf8"))) {
        if (callsAKitFree(s)) offending.push(`${relPath(ROOT, abs)}: "${s}"`);
      }
    }
  }
  const distinct = [...new Set(offending.map((o) => o.replace(/^[^:]+: /, "")))];
  assert.deepEqual(distinct, [], `${offending.length} place(s) call a kit free while ${pending.length} kit(s) wait for lawyer review, first: ${offending.slice(0, 5).join(" | ")}`);
});

test("CI checks out the full history, so the build-log test can read the commits", () => {
  const ci = parseYaml(source(".github/workflows/ci.yml"));
  const checkout = ci.jobs.test.steps.find((s) => s.uses === "actions/checkout@v5");
  assert.equal(checkout.with?.["fetch-depth"], 0);
});
