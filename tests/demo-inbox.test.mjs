// The ③ Draft-for-Approval demo (spec §8.8, §9.1): a synthetic property-management shared inbox of
// eight messages, each sorted and drafted, one escalated as ambiguous, then the approval queue and
// the trace log.
// - The data: src/data/demos/draft-for-approval.json parses as an illustrative inbox demo, holds
//   the spec's mix, is visibly synthetic (Phase D ruling 3) and keeps the site's language rules.
// - The words and the step plan (src/lib/inbox-copy.ts): one log line per step, each once.
// - The replay (src/scripts/demo/inbox.ts), over the real data on the fake DOM in
//   tests/support/fake-dom.mjs with mocked timers: it yields the plan's lines in order, reveals
//   parts in a view that already holds them all, stops drawing once its run is cancelled or
//   superseded, and on the engine announces each step once.
// - The gallery page (dist-preview/preview/templates/demo-inbox/): the engine's hooks, and a static
//   transcript that renders the whole inbox and says exactly what the replay's finished view says.
// The markup tests read dist-preview/: run `npm run build:preview` first.
// tests/e2e/demo-inbox.spec.mjs drives the replay in real browsers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeDemoSchema, plainRef } from "../src/content/schemas.ts";
import { FAIL_PHRASES, WARN_PHRASES } from "../scripts/ci/checks/04-banned-phrases.mjs";
import { metricTokens } from "../scripts/ci/checks/06-provenance.mjs";
import { CURRENCY } from "../scripts/ci/checks/11-pricing.mjs";
import { elementsWith, startTags } from "../scripts/ci/lib.mjs";
import { ACTION_LABEL, announcements, approvalLine, draftTo, formatMetric, inboxPlan, inboxSummary, introText } from "../src/lib/inbox-copy.ts";
import { LOG, mountDemo } from "../src/scripts/demo-engine.ts";
import { createPlayback } from "../src/scripts/playback.ts";
import { buildView, inboxRenderer } from "../src/scripts/demo/inbox.ts";
import { h, installDocument } from "./support/fake-dom.mjs";
import { readPreviewDist, visibleText } from "./helpers.mjs";

const FILE = JSON.parse(readFileSync(new URL("../src/data/demos/draft-for-approval.json", import.meta.url), "utf8"));
const DATA = FILE.data;
const PAGE = "preview/templates/demo-inbox/index.html";

/** Every string in a JSON value. */
const strings = (value) =>
  typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
const squash = (s) => s.replace(/\s+/g, "");
const flush = () => new Promise((resolve) => setImmediate(resolve));
/** Advances the mocked clock 10 ms at a time until `done()` holds; returns the script time taken. */
async function tickUntil(t, done, what) {
  for (let ms = 0; ms < 60_000; ms += 10) {
    if (done()) return ms;
    t.mock.timers.tick(10);
    await flush();
  }
  assert.fail(`timed out waiting for ${what}`);
}
/** A fresh stage on a fresh fake document. */
function freshStage() {
  const stage = h("div", { "data-demo-stage": "", "aria-hidden": "true" });
  installDocument(h("body", {}, stage));
  return stage;
}
/** Runs a renderer's steps() to the end in the background, collecting its log lines. */
function drive(renderer, stage, pb) {
  const run = { lines: [], done: false };
  run.finished = (async () => {
    for await (const step of renderer.steps(stage, pb)) run.lines.push(step.announce);
    run.done = true;
  })();
  return run;
}
const pending = (stage) => stage.querySelectorAll("[data-inbox-pending]").length;
const shownItems = (stage) => stage.querySelectorAll("[data-inbox-item]").filter((el) => el.getAttribute("data-inbox-pending") === null).length;
/** Each draft paragraph's [typed, not yet typed] text, in message order. */
const typing = (stage) => stage.querySelectorAll(".inbox-draft-text").map((p) => p.childNodes.map((n) => n.textContent));
/** The text of the finished view, as the transcript renders it. */
function finishedText(data) {
  installDocument(h("body"));
  return buildView(data, false).root.textContent;
}

/** The stage holds one view, every part shown and every draft typed in full. */
function assertComplete(stage, data) {
  assert.equal(stage.childNodes.length, 1, "the stage holds more than one view");
  const [view] = stage.childNodes;
  assert.equal(view.getAttribute("data-inbox-view"), "");
  assert.equal(pending(stage), 0, "a part of the view is still hidden");
  assert.deepEqual(view.querySelectorAll("[data-inbox-item]").map((el) => el.getAttribute("data-inbox-action")), data.messages.map((m) => m.action));
  assert.deepEqual(typing(stage), data.messages.filter((m) => m.draft).map((m) => [m.draft, ""]));
  assert.equal(view.querySelectorAll("[data-inbox-approval-item]").length, inboxSummary(data).drafts.length);
  assert.equal(view.querySelectorAll("[data-inbox-trace-step]").length, data.trace.length);
  const text = view.textContent;
  assert.equal(squash(text), squash(finishedText(data)));
}

test("the ③ demo file is an illustrative inbox demo for draft-for-approval, and parses with the demo schema", () => {
  const parsed = makeDemoSchema(plainRef).safeParse(FILE);
  assert.ok(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues));
  assert.deepEqual(parsed.data, FILE, "the schema dropped or changed a field");
  assert.deepEqual([FILE.solution, FILE.kind, FILE.provenance, FILE.run], ["draft-for-approval", "inbox", "illustrative", undefined]);
  assert.match(FILE.title, /\bsynthetic\b/i, "the title says the inbox is synthetic");
});

test("eight messages: five drafted for approval, one escalated as ambiguous with no draft, two filed with none", () => {
  const { messages } = DATA;
  assert.equal(messages.length, 8);
  const { drafts, escalated, filed } = inboxSummary(DATA);
  assert.deepEqual([drafts.length, escalated.length, filed.length], [5, 1, 2]);
  for (const m of drafts) assert.ok(m.draft.length >= 40, `${m.id}: the draft is a stub`);
  for (const m of [...escalated, ...filed]) assert.equal(m.draft, undefined, `${m.id} is "${m.action}" but carries a draft`);
  // The automation reads only the shared mailbox and the SMS line (Phase C ruling 9), so each
  // draft's reason names the person who checks, acts or decides before anything is sent.
  for (const m of drafts) assert.match(m.reason, /\bproperty manager\b|\bthe owner decides\b/, `${m.id}: the reason says who checks or decides`);
  // Drafts are internal (controller ruling 5): a work order, owner updates, a contractor's key
  // pickup and a task, never a reply to a tenant, which spec §4.1 leaves to the property system.
  assert.deepEqual(drafts.map((m) => m.to), ["a contractor", "a property manager", "the owner of SYN-120", "Synthetic Electrical", "the owner of SYN-140"]);
  for (const m of drafts) assert.doesNotMatch(m.to, /tenant/i, `${m.id}: the draft goes to a tenant`);
  for (const m of [...escalated, ...filed]) assert.equal(m.to, undefined, `${m.id} is "${m.action}" but names a recipient`);
  // The trace's Draft step names that set as it is (ledger ruling R4): one work order, one task, two
  // owner updates and one reply to a contractor, with no plural the drafts don't bear out, and no
  // mechanism the demo doesn't show, such as templates (final review D4-M2).
  assert.equal(
    DATA.trace.find((step) => step.label === "Draft")?.detail,
    "Drafted a work order, a task, two owner updates and a reply to a contractor",
  );
  assert.match(DATA.trace[0].detail, /\bshared mailbox\b.*\bSMS line\b.*\bread-only\b/, "the trace reads only the mailbox and the SMS line");
  assert.match(escalated[0].reason, /^Ambiguous: /, "the escalation says it is ambiguous (spec §9.1)");
  const at = messages.indexOf(escalated[0]);
  assert.ok(at > 0 && at < messages.length - 1, "the replay shows messages sorted before and after the escalation");
  // An email has a subject line and an SMS doesn't; the inbox holds both (spec §9.1 "emails/SMS").
  for (const m of messages) assert.equal(m.subject !== undefined, m.channel === "email", `${m.id}: subject on ${m.channel}`);
  assert.equal(messages.filter((m) => m.channel === "sms").length, 3, "three SMS and five emails");
});

test("a draft says only what its message supports: no time, place or return rule of its own (final review D4-M1)", () => {
  const { drafts } = inboxSummary(DATA);
  const keys = drafts.find((m) => m.id === "keys-syn-126");
  assert.equal(keys.draft, "Hi, the keys for SYN-126 can be collected from our office before the job on Thursday. Please sign them out when you collect them.");
  for (const m of drafts) {
    for (const time of m.draft.match(/\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/gi) ?? []) assert.ok(m.body.includes(time), `${m.id}: the draft sets a time, ${time}, its message doesn't`);
    assert.doesNotMatch(m.draft, /\bfront desk\b|\bsame day\b/i, m.id);
  }
});

test("each approval row names who the draft goes to and what it is about in the demo's own words, never a sender's (final review D4-M3)", () => {
  const { drafts } = inboxSummary(DATA);
  assert.deepEqual(drafts.map(draftTo), [
    "Draft to a contractor: Repair request",
    "Draft to a property manager: Inspection question",
    "Draft to the owner of SYN-120: Owner instruction",
    "Draft to Synthetic Electrical: Contractor access",
    "Draft to the owner of SYN-140: Lease renewal",
  ]);
});

test("every sender, property and organisation is visibly synthetic, and nothing real-looking slips in (ruling 3)", () => {
  const text = strings(FILE).join("\n");
  const addresses = text.match(/[\w.+-]+@[\w.-]+\w/g) ?? [];
  assert.equal(addresses.length, 5, "each email sender has an address");
  for (const a of addresses) assert.match(a, /@example\.com$/, `${a}: only example.com addresses`);
  // Properties are SYN- references, never street addresses; senders are roles or "Synthetic" firms.
  for (const ref of text.match(/\bSYN-\w*/g)) assert.match(ref, /^SYN-\d{3}$/, ref);
  for (const m of DATA.messages) {
    assert.match(m.from.split(", ")[0], /^(?:Tenants? at SYN-\d{3}|Owner of SYN-\d{3}|Synthetic [A-Z][a-z]+|Owner portal notices)$/, m.from);
  }
  const REAL_LOOKING = [
    ["a street address", /\b\d+[A-Za-z]?\s+(?:[A-Z][a-z]+\s+){1,2}(?:Street|St|Road|Rd|Avenue|Ave|Lane|Drive|Dr|Parade|Place|Court|Crescent|Highway|Way)\b/],
    ["a phone number", /\+\s?61|\b0[2-478](?:[\s-]?\d){8}\b|\b1[38]00(?:[\s-]?\d){6}\b/],
    ["an ABN or ACN", /\bA[BC]N\b/],
    ["a company suffix", /\b(?:Pty|Ltd|Inc)\b|\bCo\./i],
    ["a web address", /https?:\/\/|www\./i],
  ];
  for (const [what, re] of REAL_LOOKING) assert.doesNotMatch(text, re, `the inbox holds ${what}`);
});

test("the copy keeps the site's language rules: no banned or warned phrase, no currency, no metric in free text", () => {
  const data = strings(FILE);
  // Everything a visitor or a screen reader meets: the data, the finished view's fixed words
  // (labels, decision row, notes) and every log line.
  const text = [...data, finishedText(DATA), introText(DATA), ...announcements(DATA)].join("\n");
  for (const rule of [...FAIL_PHRASES, ...WARN_PHRASES, CURRENCY]) {
    assert.doesNotMatch(text, new RegExp(rule.re.source, rule.re.flags.replace("g", "")), `"${rule.label}" (spec §3.5, D4)`);
  }
  // Spec §3.4 as Phase C applies it to the mid-market pages (③ among them): jobs, not agents;
  // "lease", never "tenancy"; no sprint.
  assert.doesNotMatch(text, /\bagent(?:s|ic)?\b|\btenanc(?:y|ies)\b|\bsprints?\b/i);
  // No subject whose handling differs by state (the research keeps state compliance-certificate
  // rules off the site): a draft about one would imply who must act, and how fast.
  assert.doesNotMatch(text, /\bsmoke[\s-]alarms?\b|\bpool (?:fence|barrier|safety)\b|\bgas\b|\bhot water\b|\belectrical safety\b|\burgent repairs?\b/i);
  // Check 06(b): scores, latencies and counts are typed metrics, never free text (spec §9.3). The
  // view's "2,910 ms" is formatMetric's output, from a typed metric, so only the data is linted.
  for (const s of data) assert.deepEqual(metricTokens(s).map((hit) => hit.match), [], s);
});

test("the trace has at least three steps, each timed as a typed ms metric", () => {
  assert.ok(DATA.trace.length >= 3);
  for (const step of DATA.trace) {
    assert.equal(step.ms.unit, "ms", step.label);
    assert.ok(Number.isInteger(step.ms.value) && step.ms.value > 0, step.label);
    assert.doesNotMatch(step.detail, /\d/, `${step.label}: a number in the detail belongs in its metric`);
  }
  assert.equal(formatMetric({ value: 2910, unit: "ms" }), "2,910 ms");
  assert.equal(formatMetric({ value: 7 }), "7");
});

test("inboxPlan: a step per message in inbox order, then the approval queue and the trace, each line distinct", () => {
  const plan = inboxPlan(DATA);
  const n = DATA.messages.length;
  assert.deepEqual(plan.map((s) => s.kind), [...DATA.messages.map(() => "message"), "approval", "trace"]);
  plan.slice(0, n).forEach((step, i) => {
    const m = DATA.messages[i];
    assert.deepEqual([step.index, step.message], [i, m]);
    assert.ok(step.announce.startsWith(`Message ${i + 1} of ${n}, `), step.announce);
    for (const part of [m.from, m.category, ACTION_LABEL[m.action]]) assert.ok(step.announce.includes(part), `${step.announce} lacks ${part}`);
  });
  assert.ok(plan[n].announce.includes(approvalLine(inboxSummary(DATA))));
  assert.deepEqual(announcements(DATA), plan.map((s) => s.announce));
  // No line sits inside another, so a browser test can count each one in the log by its text.
  const lines = [introText(DATA), ...announcements(DATA)];
  for (const a of lines) for (const b of lines) if (a !== b) assert.ok(!a.includes(b), `"${b}" is inside "${a}"`);
});

test("the escalation, approval and trace lines say what happened", () => {
  const plan = inboxPlan(DATA);
  assert.equal(
    plan[4].announce,
    "Message 5 of 8, SMS from Tenant at SYN-131, after hours. Sorted as Unclear request. Escalated to a property manager, with no draft. " +
      "Ambiguous: it asks for work to go ahead, but doesn't say what's wrong with the fence, and relies on an earlier promise that isn't in the inbox. " +
      "A property manager decides, so no draft is written.",
  );
  assert.equal(
    plan[8].announce,
    "Approval queue: 5 drafts wait for a property manager. Nothing is sent until a person approves it. " +
      "Escalated to a property manager, with no draft: Tenant at SYN-131, after hours. " +
      "Filed, with no reply: Synthetic Plumbing, accounts.plumbing@example.com; Owner portal notices, no-reply@example.com.",
  );
  assert.equal(plan[9].announce, "Trace log: 6 steps recorded, with illustrative timings.");
  assert.equal(inboxRenderer(DATA).intro, introText(DATA));
});

test("a run yields the plan's lines in order and ends with the whole view shown, in 8–20 s of script time", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const stage = freshStage();
  const run = drive(inboxRenderer(DATA), stage, createPlayback());
  const ms = await tickUntil(t, () => run.done, "the run to finish");
  await run.finished;
  assert.deepEqual(run.lines, announcements(DATA));
  assertComplete(stage, DATA);
  // Long enough to need Pause and Skip (spec §6.5), which the engine gives it; never a drag.
  assert.ok(ms >= 8_000 && ms <= 20_000, `the run took ${ms} ms of script time`);
});

test("mid-run, the stage already holds the whole view, and only what has been shown is visible", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const stage = freshStage();
  const pb = createPlayback();
  const run = drive(inboxRenderer(DATA), stage, pb);
  await tickUntil(t, () => typing(stage)[0][0].length > 0, "the first draft to start typing");
  assert.equal(stage.childNodes.length, 1);
  assert.equal(stage.querySelectorAll("[data-inbox-item]").length, 8, "every message is in the view from the start");
  assert.equal(shownItems(stage), 1);
  const [typed, untyped] = typing(stage)[0];
  assert.equal(typed + untyped, DATA.messages[0].draft, "the untyped rest keeps the draft's space");
  assert.ok(untyped.length > 0);
  for (const hook of ["[data-inbox-approval]", "[data-inbox-trace]"]) assert.equal(stage.querySelector(hook).getAttribute("data-inbox-pending"), "", hook);
  pb.cancel();
  await run.finished;
  assert.deepEqual(run.lines, [], "a cancelled run ends without announcing its step");
});

test("Replay mid-run: the cancelled run stops drawing, and the new run leaves one complete view", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const stage = freshStage();
  const renderer = inboxRenderer(DATA);
  const old = createPlayback();
  const first = drive(renderer, stage, old);
  await tickUntil(t, () => shownItems(stage) >= 2, "the second message to arrive");
  const before = first.lines.length;
  old.cancel();
  stage.replaceChildren(); // as the engine does before the next run
  const second = drive(renderer, stage, createPlayback());
  await tickUntil(t, () => second.done, "the replayed run to finish");
  await first.finished;
  assert.equal(first.lines.length, before, "the cancelled run announced another step");
  assert.deepEqual(second.lines, announcements(DATA));
  assertComplete(stage, DATA);
});

test("a later run supersedes an earlier one even when the earlier playback is never cancelled", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const stage = freshStage();
  const renderer = inboxRenderer(DATA);
  const first = drive(renderer, stage, createPlayback());
  await tickUntil(t, () => shownItems(stage) >= 1, "the first message to arrive");
  const second = drive(renderer, stage, createPlayback());
  await tickUntil(t, () => second.done, "the second run to finish");
  await tickUntil(t, () => first.done, "the superseded run to return");
  assert.deepEqual(first.lines, [], "the superseded run announced a step");
  assertComplete(stage, DATA);
});

test("on the engine, a full run logs its intro, each step once in order, then the end, and hands back to the transcript", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const root = h(
    "div",
    { "data-demo-root": "", "data-demo-kind": "inbox" },
    h(
      "div",
      { "data-demo-controls": "", hidden: "" },
      h("button", { "data-demo-pause": "" }, "Pause"),
      h("button", { "data-demo-skip": "" }, "Skip to result"),
      h("button", { "data-demo-replay": "" }, "Replay"),
    ),
    h("div", { "data-demo-stage": "", "aria-hidden": "true", hidden: "" }),
    h("div", { "data-demo-log": "", "aria-live": "polite" }),
  );
  const transcript = h("div", { "data-demo-transcript": "" }, h("div", { "data-inbox-transcript": "" }));
  const frame = h("figure", { "data-demo-frame": "" }, h("div", { "data-demo-engine": "" }, root), transcript);
  installDocument(h("body", {}, frame));
  const stage = root.querySelector("[data-demo-stage]");
  const log = root.querySelector("[data-demo-log]");
  mountDemo(root, inboxRenderer(DATA), { reducedMotion: false }).start();
  assert.equal(transcript.hidden, true);
  assert.equal(stage.hidden, false);
  await tickUntil(t, () => transcript.hidden === false, "the run to end");
  const lines = log.childNodes.map((p) => [p.getAttribute("data-log"), p.textContent]);
  assert.deepEqual(lines, [["start", introText(DATA)], ...announcements(DATA).map((line) => ["step", line]), ["end", LOG.finished]]);
  assert.equal(stage.hidden, true);
  assert.equal(stage.getAttribute("aria-hidden"), "true", "the stage is never exposed: the transcript is the result");
});

test("gallery page: one inbox engine, with its stage hidden and aria-hidden, and a polite log", () => {
  const roots = elementsWith(readPreviewDist(PAGE), "data-demo-root");
  assert.equal(roots.length, 1);
  assert.equal(roots[0].attrs["data-demo-kind"], "inbox");
  const tags = startTags(roots[0].outer);
  const at = (hook) => tags.findIndex((tag) => hook in tag.attrs);
  assert.ok(at("data-demo-controls") > 0 && at("data-demo-controls") < at("data-demo-stage") && at("data-demo-stage") < at("data-demo-log"));
  const stage = tags[at("data-demo-stage")].attrs;
  assert.equal(stage["aria-hidden"], "true");
  assert.ok("hidden" in stage, "the stage shows before a run starts");
  assert.equal(stage["aria-live"], undefined, "the typing stage is a live region");
  assert.equal(tags[at("data-demo-log")].attrs["aria-live"], "polite");
});

test("gallery page: the static transcript renders the whole inbox, with no headings, ids, links or hidden parts", () => {
  const transcript = elementsWith(readPreviewDist(PAGE), "data-demo-transcript")[0].inner;
  const tags = startTags(transcript);
  assert.deepEqual(tags.filter((tag) => /^(h[1-6]|a)$/.test(tag.name)).map((tag) => tag.name), []);
  assert.deepEqual(tags.filter((tag) => "id" in tag.attrs).map((tag) => tag.attrs.id), []);
  assert.equal(tags.filter((tag) => "data-inbox-pending" in tag.attrs).length, 0);
  assert.deepEqual(tags.filter((tag) => "data-inbox-item" in tag.attrs).map((tag) => tag.attrs["data-inbox-action"]), DATA.messages.map((m) => m.action));
  const { drafts } = inboxSummary(DATA);
  assert.equal(tags.filter((tag) => "data-inbox-draft" in tag.attrs).length, drafts.length);
  assert.equal(tags.filter((tag) => "data-inbox-approval-item" in tag.attrs).length, drafts.length);
  assert.equal(tags.filter((tag) => "data-inbox-trace-step" in tag.attrs).length, DATA.trace.length);
  const text = visibleText(transcript);
  for (const m of DATA.messages) {
    for (const part of [m.from, m.subject, m.body, m.category, ACTION_LABEL[m.action], m.reason, m.draft]) {
      if (part !== undefined) assert.ok(text.includes(part), `${m.id}: "${part}" is missing`);
    }
  }
  for (const step of DATA.trace) for (const part of [step.label, step.detail, formatMetric(step.ms)]) assert.ok(text.includes(part), part);
});

test("gallery page: the transcript says exactly what the replay's finished view says (Review Focus 2)", () => {
  const views = elementsWith(readPreviewDist(PAGE), "data-inbox-view");
  assert.equal(views.length, 1, "the built page holds one inbox view: the stage fills only in the browser");
  assert.equal(squash(visibleText(views[0].inner)), squash(finishedText(DATA)));
});
