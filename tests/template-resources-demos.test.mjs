// The resources and demos templates (spec §8.7, §8.8, §9.1) as the preview build renders them
// from the fixtures: the Resources hub, Safe-Use Kits, What you already pay for, the Evaluation
// method, the Demos hub, and two demo pages (the register demo, and the ④-like demo with its
// sample report), plus DemoFrame, the frame every demo renders in. Pages are parsed with the CI
// checks' own scanner (scripts/ci/lib.mjs). tests/e2e/template-resources-demos.spec.mjs covers
// axe, 320px, tap targets, focus and the no-JS transcript in the browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { allHtmlFiles, readDist, readPreviewDist, visibleText } from "./helpers.mjs";
import { elements, elementsWith, startTags } from "../scripts/ci/lib.mjs";
import { PREVIEW_PAGES } from "../src/fixtures/preview-pages.ts";
import {
  demoFixture, documentFixtures, fixtureSite, KIT_FIXTURE_ID, kitFixture, PENDING_KIT_FIXTURE_ID, pendingKitFixture,
  sampleReportFixture,
} from "../src/fixtures/index.ts";
import { crumbs, industryLink, solutionLink } from "../src/lib/site.ts";
import { CHECKER_BADGE, DEMO_BADGE, DEMO_CTA, KIT_PENDING_NOTE, REPORT_BADGE, kitReviewedNote } from "../src/lib/fixed-copy.ts";

const KINDS = ["resources-hub", "safe-use-kits", "pay-for", "evaluation-method", "demos-hub", "demo", "demo-report"];
const SAMPLE_CAPTION = "Sample report: Techsider testing its own demo system, so not independent.";
const METHOD = documentFixtures.find((d) => d.id === "fixture-evaluation-method");
const REPORT_DEMO_TITLE = "Fixture evaluation report demo"; // DemoReportSpecimen and DemosHubSpecimen
const switchOn = fixtureSite.solutions[4];
const evaluation = fixtureSite.solutions[3];

// Content dates print as UTC calendar dates: "15 September 2026".
const long = (d) => d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const iso = (d) => d.toISOString().slice(0, 10);
const text = (s) => visibleText(s).trim();
// Markup to text without the space visibleText() puts for each tag: the h1's highlight <span>.
const plain = (s) => s.replace(/<[^>]+>/g, "").trim();
const page = (kind) => readPreviewDist(`preview/templates/${kind}/index.html`);
const mainOf = (html) => html.slice(html.search(/<main\b/), html.indexOf("</main>"));
const byAttr = (html, attr, value) => elementsWith(html, attr, value);
const sectionOf = (html, id) => {
  const found = elements(html, (t) => t.name === "section" && t.attrs.id === id);
  assert.equal(found.length, 1, `expected one section#${id}, found ${found.length}`);
  return found[0].outer;
};
const anchors = (html) => elements(html, (t) => t.name === "a").map((a) => ({ href: a.attrs.href, text: text(a.inner), attrs: a.attrs }));
function template(kind) {
  const name = kind === "demo-report" ? "demo" : kind;
  const roots = byAttr(page(kind), "data-template", name);
  assert.equal(roots.length, 1, `${kind}: expected one [data-template="${name}"], found ${roots.length}`);
  return roots[0].outer;
}
const source = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const propKeys = (src) => {
  const body = src.match(/interface Props \{\n([\s\S]*?)\n\}/)?.[1];
  assert.ok(body, "no multi-line `interface Props { … }` block");
  return [...body.matchAll(/^\s*(\w+)\??:/gm)].map((m) => m[1]);
};

test("the seven pages are registered as template pages, in this task's order", () => {
  assert.ok(METHOD, 'documentFixtures has no "fixture-evaluation-method" entry');
  const pages = PREVIEW_PAGES.filter((p) => KINDS.includes(p.kind));
  assert.deepEqual(pages.map((p) => [p.slug, p.kind, p.group]), KINDS.map((k) => [`templates/${k}`, k, "templates"]));
  for (const p of pages) assert.match(p.title, /\bFixture\b/, p.title);
});

test("each template and DemoFrame takes exactly the props the blueprint names", () => {
  assert.deepEqual(propKeys(source("templates/ResourcesHubTemplate.astro")), ["site"]);
  assert.deepEqual(propKeys(source("templates/SafeUseKitsTemplate.astro")), ["kits", "site"]);
  assert.deepEqual(propKeys(source("templates/PayForTemplate.astro")), ["site", "asAt"]);
  assert.deepEqual(propKeys(source("templates/EvaluationMethodTemplate.astro")), ["doc", "report", "harnessUrl", "site"]);
  assert.deepEqual(propKeys(source("templates/DemosHubTemplate.astro")), ["demos", "site"]);
  assert.deepEqual(propKeys(source("templates/DemoTemplate.astro")), ["solution", "demo", "report", "site"]);
  assert.deepEqual(propKeys(source("components/page/DemoFrame.astro")), ["title", "badge", "provenance"]);
});

test("every page: one template, one h1, no skipped heading level, unique ids, and every aria-labelledby target exists", () => {
  const h1 = {
    "resources-hub": "Resources.",
    "safe-use-kits": `${fixtureSite.page("safeUseKits").label}.`,
    "pay-for": `${fixtureSite.page("payFor").label}.`,
    "evaluation-method": METHOD.data.title,
    "demos-hub": "Demos.",
    demo: demoFixture.title,
    "demo-report": REPORT_DEMO_TITLE,
  };
  for (const kind of KINDS) {
    const html = page(kind);
    const main = mainOf(html);
    template(kind);
    const h1s = elements(main, (t) => t.name === "h1");
    assert.equal(h1s.length, 1, `${kind}: ${h1s.length} h1 elements`);
    assert.equal(plain(h1s[0].inner), h1[kind], kind);
    const levels = startTags(main).filter((t) => /^h[1-6]$/.test(t.name)).map((t) => Number(t.name[1]));
    assert.equal(levels[0], 1, `${kind}: the first heading is not the h1`);
    for (let i = 1; i < levels.length; i++) {
      assert.ok(levels[i] <= levels[i - 1] + 1, `${kind}: h${levels[i - 1]} is followed by h${levels[i]}`);
    }
    const ids = startTags(html).map((t) => t.attrs.id).filter(Boolean);
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], `${kind}: duplicate ids`);
    for (const t of startTags(html).filter((tag) => "aria-labelledby" in tag.attrs)) {
      for (const id of t.attrs["aria-labelledby"].split(/\s+/)) assert.ok(ids.includes(id), `${kind}: aria-labelledby="${id}" has no target`);
    }
  }
});

test("every page's sections follow the blueprint, in order, with their titles", () => {
  const expected = {
    "resources-hub": ["resources", "contact"],
    "safe-use-kits": ["kits", "no-kit", "contact"],
    "pay-for": ["checker", "how-it-works", "contact"],
    "evaluation-method": ["method", "sample-report", "contact"],
    "demos-hub": ["demos", "contact"],
    demo: ["next"],
    "demo-report": ["sample-report", "next"],
  };
  const titles = {
    resources: "Free resources", kits: "The kits", "no-kit": "No kit for your industry?", checker: "The checker",
    "how-it-works": "How it works", method: "The method", "sample-report": "The sample report", demos: "The demos", next: DEMO_CTA,
  };
  for (const kind of KINDS) {
    const t = template(kind);
    const ids = startTags(t).filter((tag) => tag.name === "section" && tag.attrs.id).map((tag) => tag.attrs.id);
    assert.deepEqual(ids, expected[kind], kind);
    for (const id of ids.filter((s) => s !== "contact")) {
      const [heading] = elements(t, (tag) => tag.attrs.id === `${id}-heading`);
      assert.ok(heading, `${kind}: no #${id}-heading`);
      assert.equal(heading.name, "h2", `${kind}: #${id}-heading is an ${heading.name}`);
      assert.equal(text(heading.inner), titles[id], `${kind} #${id}`);
    }
  }
});

test("breadcrumbs: the hubs sit under Home, the resource pages under Resources, the demo pages under Demos", () => {
  const trails = {
    "resources-hub": crumbs(fixtureSite, ["resources"]),
    "safe-use-kits": crumbs(fixtureSite, ["resources", "safeUseKits"]),
    "pay-for": crumbs(fixtureSite, ["resources", "payFor"]),
    "evaluation-method": crumbs(fixtureSite, ["resources", "evaluationMethod"]),
    "demos-hub": crumbs(fixtureSite, ["demos"]),
    demo: crumbs(fixtureSite, ["demos", { label: "Fixture Solution One", path: "/preview/templates/demo/" }]),
    "demo-report": crumbs(fixtureSite, ["demos", { label: "Fixture Solution Four", path: "/preview/templates/demo-report/" }]),
  };
  for (const kind of KINDS) {
    const [hero] = byAttr(template(kind), "data-page-hero");
    const navs = elements(hero.outer, (t) => t.name === "nav" && t.attrs["aria-label"] === "Breadcrumb");
    assert.equal(navs.length, 1, `${kind}: the hero has no breadcrumb`);
    const items = elements(navs[0].inner, (t) => t.name === "li").map((li) => {
      const a = elements(li.inner, (t) => t.name === "a")[0];
      return a ? { label: text(a.inner), href: a.attrs.href } : { label: text(li.inner).replace(/^\/\s*/, ""), href: null };
    });
    const trail = trails[kind];
    assert.deepEqual(items.map((i) => i.label), trail.map((c) => c.label), kind);
    assert.deepEqual(items.slice(0, -1).map((i) => i.href), trail.slice(0, -1).map((c) => c.href), kind);
    assert.equal(items.at(-1).href, null, `${kind}: the current page is a link`);
  }
});

test("every page closes with one terminal prompt that opens the right contact query", () => {
  const closing = {
    "resources-hub": ["contact", "talk_to_us", "Talk to us", fixtureSite.contact()],
    "safe-use-kits": ["contact", `talk_to_us --about=${switchOn.id}`, `Talk to us about ${switchOn.shortName}`, fixtureSite.contact({ interest: switchOn.id })],
    "pay-for": ["contact", `talk_to_us --about=${switchOn.id}`, `Talk to us about ${switchOn.shortName}`, fixtureSite.contact({ interest: switchOn.id })],
    "evaluation-method": ["contact", `talk_to_us --about=${evaluation.id}`, `Talk to us about ${evaluation.shortName}`, fixtureSite.contact({ interest: evaluation.id })],
    "demos-hub": ["contact", "talk_to_us", "Talk to us", fixtureSite.contact()],
    demo: ["next", "talk_to_us --about=fixture-solution", "Talk to us about Fixture Solution One", fixtureSite.contact({ interest: "fixture-solution" })],
    "demo-report": ["next", `talk_to_us --about=${evaluation.id}`, `Talk to us about ${evaluation.shortName}`, fixtureSite.contact({ interest: evaluation.id })],
  };
  for (const kind of KINDS) {
    const t = template(kind);
    const [where, prompt, label, href] = closing[kind];
    assert.equal(byAttr(t, "data-prompt-block").length, 1, `${kind}: expected one PromptBlock`);
    const [block] = byAttr(sectionOf(t, where), "data-prompt-block");
    assert.ok(block, `${kind}: the PromptBlock is not in #${where}`);
    const line = elements(block.inner, (tag) => tag.name === "p" && tag.attrs["aria-hidden"] === "true")[0];
    assert.equal(text(line.inner), `> ${prompt}`, kind);
    assert.deepEqual(anchors(block.inner).map((a) => [a.text, a.href]), [[label, href]], kind);
  }
});

test("Resources hub: one card per free resource, in nav order, with its label, one-liner and link", () => {
  const cards = byAttr(sectionOf(template("resources-hub"), "resources"), "data-resource");
  assert.deepEqual(cards.map((c) => c.attrs["data-resource"]), fixtureSite.resources.map((r) => r.key));
  cards.forEach((card, i) => {
    const r = fixtureSite.resources[i];
    assert.deepEqual(anchors(card.inner).map((a) => [a.text, a.href]), [[r.label, r.href]], r.key);
    assert.ok(text(card.inner).includes(r.oneLiner), `${r.key}: no one-liner`);
  });
});

test("Safe-Use Kits: every kit names its industry, contents and regulatory source", () => {
  const kits = byAttr(sectionOf(template("safe-use-kits"), "kits"), "data-kit");
  assert.deepEqual(kits.map((k) => k.attrs.id), [`kit-${KIT_FIXTURE_ID}`, `kit-${PENDING_KIT_FIXTURE_ID}`]);
  assert.deepEqual(kits.map((k) => k.attrs["data-kit-status"]), ["reviewed", "pending"]);
  [kitFixture, pendingKitFixture].forEach((data, i) => {
    const kit = kits[i].inner;
    const industry = industryLink(fixtureSite, data.industry);
    assert.equal(text(elements(kit, (t) => t.name === "h3")[0].inner), data.title);
    const chip = byAttr(kit, "data-bracket-chip")[0];
    assert.equal(chip.attrs.href, industry.href, `${data.title}: the industry chip`);
    assert.ok(text(chip.inner).includes(industry.shortName), `${data.title}: the industry chip's label`);
    const body = text(kit);
    for (const s of [data.summary, ...data.contents]) assert.ok(body.includes(s), `${data.title}: missing "${s}"`);
    const [src] = byAttr(kit, "data-kit-source");
    assert.deepEqual(anchors(src.inner).map((a) => [a.text, a.href]), [[data.source.label, data.source.url]]);
    assert.equal(text(src.inner).replace(/ ,/g, ","), `Source: ${data.source.label}, as at ${long(data.source.asAt)}`);
    assert.ok(src.inner.includes(`datetime="${iso(data.source.asAt)}"`));
  });
});

test("Safe-Use Kits: a reviewed kit shows its dated review note and download; a pending kit shows the pending note and no download at all", () => {
  const html = page("safe-use-kits");
  const [reviewed, pending] = byAttr(template("safe-use-kits"), "data-kit").map((k) => k.inner);
  const notice = (kit) => byAttr(kit, "data-notice").map((n) => text(n.inner));
  assert.deepEqual(notice(reviewed), [kitReviewedNote(long(kitFixture.lawyerReviewedAt))]);
  const downloads = byAttr(reviewed, "data-kit-download");
  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].attrs.href, kitFixture.download);
  assert.ok("download" in downloads[0].attrs, "the download link lacks the download attribute");
  assert.equal(text(downloads[0].inner), `Download ${kitFixture.title} (PDF)`);
  assert.deepEqual(notice(pending), [KIT_PENDING_NOTE]);
  assert.equal(byAttr(pending, "data-kit-download").length, 0, "a pending kit has a download link");
  assert.ok(!anchors(pending).some((a) => a.href.startsWith("/downloads/")), "a pending kit links to /downloads/");
  assert.ok(!html.includes(pendingKitFixture.download), "the pending kit's download path reached the page");
  assert.doesNotMatch(text(pending), /Reviewed by/);
});

test("Safe-Use Kits: industries without a kit are sent to ⑤", () => {
  const noKit = sectionOf(template("safe-use-kits"), "no-kit");
  assert.deepEqual(anchors(noKit).map((a) => [a.text, a.href]), [[switchOn.fullName, switchOn.href]]);
  assert.ok(text(noKit).includes(switchOn.oneLiner));
});

test("What you already pay for: the checker badge and the vendor facts' date lead; the slots fill #checker and #how-it-works", () => {
  const t = template("pay-for");
  const [hero] = byAttr(t, "data-page-hero");
  assert.deepEqual(byAttr(hero.outer, "data-hero-badge").map((b) => text(b.inner)), [CHECKER_BADGE]);
  const [asAt] = byAttr(hero.outer, "data-vendor-as-at");
  assert.equal(text(asAt.inner), "Vendor facts as at 1 September 2026");
  assert.ok(asAt.inner.includes('datetime="2026-09-01"'));
  assert.ok(text(hero.outer).includes(fixtureSite.page("payFor").oneLiner));
  assert.equal(byAttr(sectionOf(t, "checker"), "data-checker-placeholder").length, 1);
  assert.equal(byAttr(sectionOf(t, "how-it-works"), "data-data-table").length, 1);
});

test("Evaluation method: title, summary and last-updated date lead; the body renders in Prose; no harness block while harnessUrl is null", () => {
  const t = template("evaluation-method");
  const [hero] = byAttr(t, "data-page-hero");
  assert.ok(text(hero.outer).includes(METHOD.data.summary));
  const [updated] = byAttr(hero.outer, "data-last-updated");
  assert.equal(text(updated.inner), `Last updated ${long(METHOD.data.lastUpdated)}`);
  assert.ok(updated.inner.includes(`datetime="${iso(METHOD.data.lastUpdated)}"`));
  const [prose] = byAttr(sectionOf(t, "method"), "data-prose");
  assert.ok(prose.inner.includes(METHOD.bodyHtml), "the method body is not rendered as given");
  const reports = byAttr(sectionOf(t, "sample-report"), "data-sample-report");
  assert.equal(reports.length, 1);
  assert.equal(text(byAttr(reports[0].inner, "data-sample-caption")[0].inner), SAMPLE_CAPTION);
  assert.equal(elements(page("evaluation-method"), (tag) => tag.attrs.id === "harness").length, 0, "#harness renders with a null harnessUrl");
  assert.equal(byAttr(t, "data-harness-link").length, 0);
});

test("Demos hub: one card per demo, in order, badged by kind and linking to its demo page", () => {
  const t = template("demos-hub");
  const [hero] = byAttr(t, "data-page-hero");
  assert.equal(byAttr(hero.outer, "data-hero-badge").length, 0);
  assert.ok(text(hero.outer).includes(fixtureSite.page("demos").oneLiner));
  const cards = byAttr(sectionOf(t, "demos"), "data-demo-kind");
  assert.deepEqual(cards.map((c) => c.attrs["data-demo-kind"]), ["register", "assistant", "inbox", "report", "checker"]);
  cards.forEach((card, i) => {
    const s = fixtureSite.solutions[i];
    const kind = card.attrs["data-demo-kind"];
    const eyebrow = elements(card.inner, (tag) => (tag.attrs.class ?? "").split(" ").includes("link-card-eyebrow"))[0];
    const meta = elements(card.inner, (tag) => (tag.attrs.class ?? "").split(" ").includes("link-card-meta"))[0];
    assert.equal(text(eyebrow.inner), `${s.number} ${s.shortName}`);
    // Ledger ruling R4: the ④ sample report is not a replay, so it has its own badge.
    assert.equal(text(meta.inner), { checker: CHECKER_BADGE, report: REPORT_BADGE }[kind] ?? DEMO_BADGE, kind);
    const [link] = anchors(card.inner);
    assert.equal(link.href, fixtureSite.demo(s.id), kind);
    assert.match(link.text, /\bFixture\b/);
  });
  assert.equal(anchors(cards[0].inner)[0].text, demoFixture.title);
  assert.equal(anchors(cards[3].inner)[0].text, REPORT_DEMO_TITLE);
});

test("demo pages: the frame shows its badge first, then the engine slot, the static transcript and the caption", () => {
  for (const [kind, title] of [["demo", demoFixture.title], ["demo-report", REPORT_DEMO_TITLE]]) {
    const [hero] = byAttr(template(kind), "data-page-hero");
    const frames = byAttr(hero.outer, "data-demo-frame");
    assert.equal(frames.length, 1, `${kind}: the hero has no demo frame`);
    const frame = frames[0].outer;
    const tags = startTags(frame);
    const at = (attr) => tags.findIndex((tag) => attr in tag.attrs);
    const [badge] = byAttr(frame, "data-demo-badge");
    // Ledger ruling R4: the register demo is a canned replay; the ④-like demo is a sample report.
    assert.equal(text(badge.inner), kind === "demo" ? DEMO_BADGE : REPORT_BADGE, `${kind}: kind "${kind === "demo" ? "register" : "report"}" gets its badge`);
    assert.ok(!("hidden" in badge.attrs) && badge.attrs["aria-hidden"] !== "true" && !/sr-only/.test(badge.attrs.class ?? ""), `${kind}: the badge is hidden`);
    assert.equal(at("data-demo-badge"), 1, `${kind}: the badge is not the frame's first child`);
    assert.ok(at("data-demo-engine") > at("data-demo-badge") && at("data-demo-transcript") > at("data-demo-engine"), `${kind}: slot order`);
    // Phase D Task 3 puts DemoEngine in the register demo's engine slot; the ④-like demo keeps its placeholder.
    assert.equal(byAttr(frame, "data-engine-placeholder").length, kind === "demo" ? 0 : 1, `${kind}: engine placeholder`);
    assert.equal(byAttr(frame, "data-demo-root").length, kind === "demo" ? 1 : 0, `${kind}: replay root`);
    const captions = elements(frame, (tag) => tag.name === "figcaption");
    assert.equal(text(captions.at(-1).inner), title);
  }
  // One table per register, captioned with its title; tests/register-demo.test.mjs checks the rest.
  const [transcript] = byAttr(template("demo"), "data-demo-transcript");
  const tables = elements(transcript.inner, (t) => t.name === "table");
  assert.deepEqual(tables.map((t) => text(elements(t.inner, (e) => e.name === "caption")[0].inner)), demoFixture.data.registers.map((r) => r.title));
  const [reportTranscript] = byAttr(template("demo-report"), "data-demo-transcript");
  assert.equal(byAttr(reportTranscript.inner, "data-trace-panel").length, 1, "the ④ transcript has no trace");
});

// Review findings T11-F1 and T11-F2: a route could leave the demo's provenance out, so an
// illustrative demo rendered unlabelled where check 06(c) can't see it; and nothing held the
// "Illustrative data" label visible. Both demo pages now declare it, and the label is never hidden.
test("every demo frame declares its provenance, and an illustrative one shows a label nothing hides (spec §9.3)", () => {
  for (const [kind, provenance] of [["demo", demoFixture.provenance], ["demo-report", sampleReportFixture.provenance]]) {
    const [frame] = byAttr(template(kind), "data-demo-frame");
    assert.equal(frame.attrs["data-provenance"], provenance, `${kind}: the frame doesn't carry the demo's provenance`);
    // The frame's own label, not one inside its slots (the ④ transcript is a trace with its own label).
    let own = frame.inner;
    for (const slot of [...byAttr(frame.inner, "data-demo-transcript"), ...byAttr(frame.inner, "data-demo-engine")]) own = own.replace(slot.outer, "");
    const labels = byAttr(own, "data-provenance-label");
    // The report frame's badge says "Illustrative" itself, so it is the label (Phase D ruling R6).
    const label = kind === "demo-report" ? REPORT_BADGE : "Illustrative data";
    assert.deepEqual(labels.map((l) => text(l.inner)), provenance === "illustrative" ? [label] : [], `${kind}: the frame's provenance label`);
    for (const label of labels) {
      assert.ok(!("hidden" in label.attrs), `${kind}: the label is hidden`);
      assert.notEqual(label.attrs["aria-hidden"], "true", `${kind}: the label is aria-hidden`);
      assert.doesNotMatch(label.attrs.class ?? "", /(^|\s)(sr-only|visually-hidden|hidden)(\s|$)/, `${kind}: the label is visually hidden`);
      const wrappers = elements(own, () => true).filter((el) => el.outer !== label.outer && el.outer.includes(label.outer));
      assert.deepEqual(wrappers.map((el) => el.name), [], `${kind}: the label sits inside another element of the frame, which could hide it`);
    }
  }
  assert.equal(demoFixture.provenance, "illustrative", "the register demo fixture is illustrative, so its label shows");
});

test("a demo's provenance is required: DemoTemplate and DemoFrame take no demo without one", () => {
  assert.match(source("templates/DemoTemplate.astro"), /demo: \{ title: string; kind: DemoKind; provenance: DemoData\["provenance"\] \};/, "DemoTemplate's demo.provenance is optional");
  assert.match(source("components/page/DemoFrame.astro"), /^\s*provenance: DemoData\["provenance"\];$/m, "DemoFrame's provenance is optional");
});

test("the ④-like demo carries the sample report with its fixed caption; the register demo has none", () => {
  const reports = byAttr(sectionOf(template("demo-report"), "sample-report"), "data-sample-report");
  assert.equal(reports.length, 1);
  assert.equal(text(byAttr(reports[0].inner, "data-sample-caption")[0].inner), SAMPLE_CAPTION);
  assert.equal(byAttr(page("demo"), "data-sample-report").length, 0);
});

test("#next: the demo CTA as its heading, then the solution page", () => {
  for (const [kind, id] of [["demo", "fixture-solution"], ["demo-report", "fixture-solution-4"]]) {
    const s = solutionLink(fixtureSite, id);
    const next = sectionOf(template(kind), "next");
    assert.equal(text(elements(next, (t) => t.attrs.id === "next-heading")[0].inner), DEMO_CTA);
    const cards = byAttr(next, "data-link-card");
    assert.equal(cards.length, 1, `${kind}: no solution card`);
    assert.deepEqual(anchors(cards[0].inner).map((a) => [a.text, a.href]), [[s.fullName, s.href]], kind);
  }
});

// Phase D puts the resources and demos pages live: the evaluation method (Task 5), the checker
// (Task 6) and the demos (Task 7). Each template's markup reaches production only on the pages that
// render it:
// - the Resources hub on /resources/;
// - the method page and the checker's page on their own pages, the checker badge on the latter;
// - the sample report on the method page, the ④ demo page and the ④ hero;
// - the vendor table on the checker's page and the ⑤ demo page;
// - the demo template on the five demo pages;
// - demo frames on those pages, in the four solution heroes that hold one (④'s holds the sample
//   report), and in the Home's demo band (Task 2's ② frame, which Task 8's Home keeps).
// The Safe-Use Kits page stays out until a lawyer reviews the kits (spec §12 item 6).
test("production: resources and demos template markup appears only on the pages that render it", () => {
  const CHECKER = "resources/what-you-already-pay-for/index.html";
  const METHOD = "resources/evaluation-method/index.html";
  const demoPages = ["document-registers", "knowledge-assistant", "draft-for-approval", "ai-evaluation", "ai-switch-on"].map((id) => `demos/${id}/index.html`);
  const framedHeroes = ["document-registers", "knowledge-assistant", "draft-for-approval", "ai-switch-on"].map((id) => `solutions/${id}/index.html`);
  const only = {
    'data-template="resources-hub"': ["resources/index.html"],
    'data-template="evaluation-method"': [METHOD],
    'data-template="pay-for"': [CHECKER],
    "data-hero-badge": [CHECKER],
    "data-sample-report": [METHOD, "demos/ai-evaluation/index.html", "solutions/ai-evaluation/index.html"],
    "data-platform-facts": [CHECKER, "demos/ai-switch-on/index.html"],
    'data-template="demo"': demoPages,
    "data-demo-frame": [...demoPages, ...framedHeroes, "index.html"],
    "data-kit": [],
    'data-template="safe-use-kits"': [],
  };
  const files = allHtmlFiles();
  for (const [hook, pages] of Object.entries(only)) {
    assert.deepEqual(files.filter((f) => readDist(f).includes(hook)).sort(), [...pages].sort(), hook);
  }
});
