// The ① Document Registers demo (spec §9.1 ①, §8.8; Phase D scope rulings 3–5):
// - the synthetic set in src/data/demos/document-registers.json and the script that builds it;
// - the register views and announcements over it (src/lib/register.ts), and the two downloads in
//   public/downloads/, with the check exceptions its quoted amounts need;
// - the replay (src/scripts/demo/register.ts), run over the real data on the fake DOM;
// - the static transcript and the engine slot, as the preview gallery renders them on the register
//   fixture (dist-preview/: run `npm run build:preview` first).
// tests/e2e/register-demo.spec.mjs drives the replay and the side panel in a browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readPreviewDist, visibleText } from "./helpers.mjs";
import { h, installDocument } from "./support/fake-dom.mjs";
import { decodeEntities, elements, elementsWith, matchesGlob } from "../scripts/ci/lib.mjs";
import { AS_AT, buildRegisterDemo, dayOf } from "../scripts/demo-register-set.mjs";
import { makeDemoSchema, plainRef } from "../src/content/schemas.ts";
import { demoFixture } from "../src/fixtures/index.ts";
import { createPlayback } from "../src/scripts/playback.ts";
import { registerRenderer } from "../src/scripts/demo/register.ts";
import {
  REPLAY_INTRO, announcedSteps, documentsText, downloadsOf, findValue, markSegments, pageAnchor, rangesOn, registerCsv,
  registerSteps, registerView,
} from "../src/lib/register.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const read = (rel) => readFileSync(`${ROOT}${rel}`, "utf8");
const DEMO_FILE = "src/data/demos/document-registers.json";
const DEMO = JSON.parse(read(DEMO_FILE));
const DATA = DEMO.data;
const MA = registerView(DATA, "management-agreements");
const TD = registerView(DATA, "trust-deeds");
/** The values that record what a page doesn't have, so nothing on the page is highlighted. */
const ABSENCES = ["Not signed", "Not stated", "None found", "Page missing"];

// ---------- the synthetic set ----------

test("the demo file is an illustrative register demo for ① that parses with the demo schema", () => {
  const demo = makeDemoSchema(plainRef).parse(DEMO);
  assert.equal(demo.solution, "document-registers");
  assert.equal(demo.kind, "register");
  assert.equal(demo.provenance, "illustrative");
  assert.equal(demo.run, undefined);
  assert.equal(demo.title, "Every value links to the page it came from.");
  // Each title carries the register's date, which expiry and vesting dates are read against, so an
  // "ok" expiry that a visitor's own date has passed still reads as right.
  assert.equal(AS_AT, "1 September 2026");
  assert.deepEqual(DATA.registers.map((r) => [r.id, r.title]), [
    ["management-agreements", "Management agreement register as at 1 September 2026"],
    ["trust-deeds", "Trust deed register as at 1 September 2026"],
  ]);
});

test("the committed demo file is what scripts/demo-register-set.mjs builds", () => {
  assert.deepEqual(DEMO, buildRegisterDemo());
});

test("12 management agreements on three forms and 6 trust deeds on two, each document in one register and titled Synthetic", () => {
  const docs = (view) => view.rows.map((row) => row.doc);
  assert.equal(docs(MA).length, 12);
  assert.equal(new Set(docs(MA).map((d) => d.template)).size, 3);
  assert.equal(docs(TD).length, 6);
  assert.equal(new Set(docs(TD).map((d) => d.template)).size, 2);
  assert.deepEqual([...docs(MA), ...docs(TD)].map((d) => d.id), DATA.documents.map((d) => d.id));
  for (const doc of DATA.documents) {
    assert.match(doc.title, /^Synthetic (management agreement MA|trust deed TD)-\d{2}$/, doc.id);
    assert.match(doc.pages[0].text, /^SYNTHETIC DOCUMENT FOR A DEMO\. NOT A REAL (AGREEMENT|TRUST DEED)\.$/m, `${doc.id}: page 1 doesn't say it is synthetic`);
  }
});

// Every place the forms name a party: after a label, in form C's opening line, in a deed's definitions,
// and in an execution or consent line.
const PARTY = [
  /\b(?:Owner|Manager|Trustee|Settlor|Insurer|Appointor):[ \t]+(?!signed\b|_)([^\n.,;]+)/g,
  /\bBetween ([^()]+) \(the Owner\) and ([^()]+) \(the Manager\)/g,
  /\b(?:Appointor|Principal) means ([^\n.,]+)/g,
  /\bby ([^\n,]+), who gives\b/g,
  /\bExecuted by ([^\n:]+):/g,
  /\bConsent of the Appointor, ([^\n:]+):/g,
];

test("nothing real: every party is named Synthetic, and no company suffix, ABN, address, phone number or outside email address appears (ruling 3)", () => {
  for (const doc of DATA.documents) {
    const body = doc.pages.map((p) => p.text).join("\n");
    const parties = PARTY.flatMap((re) => [...body.matchAll(re)].flatMap((m) => m.slice(1).map((p) => p.trim())));
    assert.ok(parties.length >= 2, `${doc.id}: ${parties.length} named parties found`);
    for (const party of parties) assert.match(party, /^Synthetic (?:Owner|Agency|Insurer|Settlor|Trustee Company|Principal) (?:\d{1,2}|One|Two)$/, `${doc.id}: ${party}`);
  }
  const everything = JSON.stringify(DEMO);
  assert.doesNotMatch(everything, /\b(?:Pty|Ltd|Limited|Inc|ABN|ACN)\b/);
  assert.doesNotMatch(everything, /\b\d+[A-Za-z]?\s+[A-Z][a-z]+\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Drive|Parade|Place|Crescent)\b/);
  assert.doesNotMatch(everything, /\b(?:NSW|VIC|Vic|QLD|Qld|WA|SA|TAS|Tas|ACT|NT)\s+\d{4}\b/);
  assert.doesNotMatch(everything, /(?:\+61|\b0[2-478])[\s-]?\d{4}[\s-]?\d{4}\b/);
  for (const m of everything.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) assert.match(m[0], /@example\.com$/, m[0]);
});

// ---------- the registers and their exceptions ----------

test("the management-agreement register flags spec §9.1's three exceptions, and nothing else", () => {
  assert.deepEqual(MA.queue.map(({ row, cell }) => [row.doc.id, cell.key, cell.status, cell.value]), [
    ["ma-04", "owner-authority", "blocked", "Not signed"],
    ["ma-07", "landlord-insurance", "review", "30 June 2026"],
    ["ma-10", "repair-limit", "review", "Not stated"],
  ]);
  const [unsigned, , noLimit] = MA.queue;
  assert.match(unsigned.cell.pageText, /Signed by the Owner: _+ Date: _+/);
  assert.match(noLimit.cell.pageText, /up to \$_+ each/);
});

test("insurance is flagged exactly when the policy expired before the register date, and a vesting date the same way", () => {
  for (const row of MA.rows) {
    const cell = row.cells.find((c) => c.key === "landlord-insurance");
    assert.equal(cell.status === "review", dayOf(cell.value) < dayOf(AS_AT), `${row.doc.id}: ${cell.value}`);
    if (cell.status === "review") assert.ok(cell.note.includes(cell.value) && cell.note.includes(AS_AT), cell.note);
  }
  for (const row of TD.rows) {
    const cell = row.cells.find((c) => c.key === "vesting-date");
    assert.equal(cell.status === "review", dayOf(cell.value) < dayOf(AS_AT), `${row.doc.id}: ${cell.value}`);
  }
});

test("the trust-deed register flags a changed appointor, a passed vesting date and a missing page", () => {
  assert.deepEqual(TD.queue.map(({ row, cell }) => [row.doc.id, cell.key, cell.status, cell.value]), [
    ["td-02", "appointor", "review", "Synthetic Principal 07"],
    ["td-04", "vesting-date", "review", "30 June 2026"],
    ["td-06", "streaming", "blocked", "Page missing"],
  ]);
  const td06 = DATA.documents.find((d) => d.id === "td-06");
  assert.deepEqual(td06.pages.map((p) => p.n), [1, 3]);
  const td02 = TD.rows.find((row) => row.doc.id === "td-02");
  assert.equal(td02.cells.find((c) => c.key === "variations").value, "12 May 2021");
  assert.match(td02.doc.pages.find((p) => p.n === 5).text, /^DEED OF VARIATION/);
});

test("every value sits on the page it cites, or records an absence the page shows; every flagged value says why", () => {
  for (const view of [MA, TD]) {
    for (const row of view.rows) {
      for (const c of row.cells) {
        const where = `${view.id}/${row.doc.id}/${c.key}`;
        if (c.at) assert.equal(c.pageText.slice(c.at.start, c.at.end).toLowerCase(), c.value.toLowerCase(), where);
        else assert.ok(ABSENCES.includes(c.value), `${where}: "${c.value}" isn't on page ${c.page}`);
        if (c.status === "ok") assert.equal(c.note, null, `${where}: an ok value has a note`);
        else assert.ok(c.note && c.note.length > 20, `${where}: a flagged value has no note`);
        if (c.value === "None found") assert.equal(c.status, "ok", where);
      }
    }
  }
});

test("money and fees sit only in their own fields, so the check exceptions below cover nothing else", () => {
  for (const view of [MA, TD]) {
    for (const row of view.rows) {
      for (const c of row.cells) {
        if (/\$\s?\d/.test(c.value)) assert.equal(c.key, "repair-limit", `${row.doc.id}/${c.key}`);
        if (/%/.test(c.value)) assert.equal(c.key, "management-fee", `${row.doc.id}/${c.key}`);
        assert.doesNotMatch(c.note ?? "", /\$\s?\d|%/, `${row.doc.id}/${c.key}: note`);
      }
    }
  }
  assert.doesNotMatch(JSON.stringify(DATA.registers.map((r) => [r.title, r.fields])), /\$|%/);
  assert.doesNotMatch(DEMO.title, /\$|%/);
});

test("the demo's check exceptions name its quoted amounts and fees exactly, in its own file only", () => {
  const raw = read(DEMO_FILE);
  const amounts = [...new Set(raw.match(/\$\d[\d,]*/g))].sort();
  const fees = [...new Set(DATA.registers.flatMap((r) => r.rows.flatMap((row) => Object.values(row.cells).map((c) => c.value))).filter((v) => v.includes("%")))].sort();
  const phrases = JSON.parse(read("src/data/banned-phrase-exceptions.json"));
  const metrics = JSON.parse(read("src/data/metric-exceptions.json"));
  assert.deepEqual(phrases.filter((e) => e.file === DEMO_FILE).map((e) => e.phrase).sort(), amounts);
  assert.deepEqual(metrics.filter((e) => e.file === DEMO_FILE).map((e) => e.token).sort(), fees);
  assert.deepEqual(amounts, ["$1,000", "$300", "$500", "$800"]);
  assert.deepEqual(fees, ["5.5%", "6.6%", "7.7%"]);
  // No wider entry excepts an amount or a fee in this file (Phase C's src/** entries name proper names only).
  const wider = (e) => e.file !== DEMO_FILE && matchesGlob(e.file, DEMO_FILE);
  assert.deepEqual(phrases.filter((e) => wider(e) && /\$\s?\d/.test(e.phrase)).map((e) => `${e.file}: ${e.phrase}`), []);
  assert.deepEqual(metrics.filter(wider).map((e) => `${e.file}: ${e.token}`), []);
});

// ---------- the view helpers and the replay ----------

test("findValue ignores case; markSegments keeps every character once and merges overlapping marks with all their values", () => {
  assert.deepEqual(findValue("Signed by the Owner: signed 3 March 2025", "Signed 3 March 2025"), { start: 21, end: 40 });
  assert.equal(findValue("up to $______________ each", "$500"), null);
  assert.equal(findValue("anything", " "), null);
  assert.deepEqual(markSegments("abcdef", [{ start: 2, end: 4, cells: ["x:b"] }, { start: 1, end: 3, cells: ["x:a"] }]), [
    { text: "a", cells: [] }, { text: "bcd", cells: ["x:a", "x:b"] }, { text: "ef", cells: [] },
  ]);
  assert.deepEqual(markSegments("abc", []), [{ text: "abc", cells: [] }]);
  assert.deepEqual(markSegments("abc", [{ start: 0, end: 3, cells: ["x:a"] }]), [{ text: "abc", cells: ["x:a"] }]);
  assert.equal(pageAnchor("register", "ma-01", 2), "register-ma-01-p2");
});

test("each page marks every value read from it, and nothing else", () => {
  const views = [MA, TD];
  const page2 = DATA.documents.find((d) => d.id === "ma-01").pages[1].text;
  assert.deepEqual(rangesOn(views, "ma-01", 2).map((r) => [page2.slice(r.start, r.end), r.cells]), [
    ["6.6%", ["ma-01:management-fee"]],
    ["$500", ["ma-01:repair-limit"]],
  ]);
  // An absence has nothing to mark: MA-04's page 3 marks the insurance expiry, not the blank signature.
  assert.deepEqual(rangesOn(views, "ma-04", 3).map((r) => r.cells), [["ma-04:landlord-insurance"]]);
});

test("the replay's announcements over the real data: a line per row, in register order, then a summary, none repeated; the replay announces only the flagged rows' lines and the summary", () => {
  for (const view of [MA, TD]) {
    const lines = registerSteps(view);
    assert.equal(lines.length, view.rows.length + 1, view.id);
    view.rows.forEach((row, i) => assert.ok(lines[i].startsWith(`${row.doc.title}: `), `${view.id} line ${i + 1}`));
    assert.equal(new Set(lines).size, lines.length, `${view.id}: an announcement repeats`);
    // Review Focus 1: the log carries the exceptions, and the summary counts the rest.
    assert.deepEqual(announcedSteps(view), [...lines.filter((_, i) => i < view.rows.length && view.rows[i].flagged.length > 0), lines.at(-1)], view.id);
  }
  assert.deepEqual(announcedSteps(MA).map((line) => line.split(":")[0]), ["Synthetic management agreement MA-04", "Synthetic management agreement MA-07", "Synthetic management agreement MA-10", MA.title]);
  assert.deepEqual(announcedSteps(TD).map((line) => line.split(":")[0]), ["Synthetic trust deed TD-02", "Synthetic trust deed TD-04", "Synthetic trust deed TD-06", TD.title]);
  const ma = registerSteps(MA);
  assert.equal(ma[0], "Synthetic management agreement MA-01: 4 values read, none flagged.");
  assert.equal(ma[3], "Synthetic management agreement MA-04: 4 values read, 1 flagged: Owner's signed authority, blocked.");
  assert.equal(ma.at(-1), "Management agreement register as at 1 September 2026: 48 values from 12 documents, 3 in the exception queue. Each value opens the page it came from.");
  assert.equal(registerSteps(TD)[5], "Synthetic trust deed TD-06: 5 values read, 1 flagged: Streaming clause, blocked.");
  assert.equal(REPLAY_INTRO, "Replay started: the register fills in from the synthetic documents, a row at a time. Use Pause to hold it, or Skip to result to read the full transcript now.");
});

// ---------- the downloads ----------

test("the downloads are the register as CSV and the documents as text, exactly as the data gives them", () => {
  const { register, documents } = downloadsOf(DATA);
  assert.equal(register, "/downloads/document-registers-demo-register.csv");
  assert.equal(documents, "/downloads/document-registers-demo-documents.txt");
  const csv = read(`public${register}`);
  const txt = read(`public${documents}`);
  assert.equal(csv, registerCsv(DATA));
  assert.equal(txt, documentsText(DATA));
  const lines = csv.trimEnd().split("\n");
  assert.equal(lines[0], "register,document_id,document,template,field,value,page,status,note");
  assert.equal(lines.length - 1, 12 * 4 + 6 * 5);
  assert.ok(lines.includes('Management agreement register as at 1 September 2026,ma-04,Synthetic management agreement MA-04,"Form A (Synthetic Agency One, 2024 edition)",Owner\'s signed authority,Not signed,3,blocked,"The Owner\'s signature and date on page 3 are blank, so the file holds no signed authority."'));
  // The note records what the page shows, not a call on the agreement's validity (final review D3-T3-R-3).
  assert.doesNotMatch(csv, /\bto act on\b/);
  for (const doc of DATA.documents) for (const page of doc.pages) assert.ok(txt.includes(`--- Page ${page.n} ---\n${page.text}`), `${doc.id} p${page.n}`);
  assert.match(txt, /^Synthetic documents from the Techsider Document Registers demo\.\nEvery party, premises, policy, date and amount in this file is invented\./);
  // Plain ASCII, so a spreadsheet opens the CSV without an encoding prompt.
  for (const [name, body] of [["csv", csv], ["txt", txt]]) assert.match(body, /^[\t\n\x20-\x7e]*$/, name);
});

test("downloadsOf rejects a download path it can't pair with a documents file", () => {
  assert.throws(() => downloadsOf({ ...DATA, download: "/downloads/demo.txt" }), /must be \/downloads\/<name>-register\.csv/);
});

// ---------- the replay, on the fake DOM ----------

/**
 * A demo frame whose transcript carries the hooks RegisterTranscript renders (the gallery tests
 * below check the real markup has them), built from `data`, with `selected` the register shown.
 * It has an id, a link, a labelled list and a button, as the transcript does, for the copy to disarm.
 */
function frameOver(data, selected) {
  const views = data.registers.map((r) => registerView(data, r.id));
  const registers = views.map((view) => {
    const lines = registerSteps(view);
    return h(
      "div",
      { "data-register": view.id, "data-register-summary": lines.at(-1), ...(view.id === selected ? {} : { hidden: "" }) },
      h("table", {}, h("tbody", {}, ...view.rows.map((row, i) =>
        h("tr", { "data-register-row": row.doc.id, "data-register-announce": lines[i], ...(row.flagged.length > 0 ? { "data-register-flagged": "" } : {}) },
          h("th", {}, row.doc.title),
          ...row.cells.map((c) => h("td", {}, h("a", { href: `#register-${row.doc.id}-p${c.page}`, "data-register-cell": c.id }, c.value))))))),
      h("p", { id: `register-${view.id}-queue` }, "Exception queue"),
      h("ul", { "aria-labelledby": `register-${view.id}-queue` }, ...view.queue.map(({ cell }) => h("li", { "data-register-queue-item": cell.id }, cell.value))),
    );
  });
  const transcript = h("div", { "data-register-transcript": "" },
    h("div", { "data-register-switch": "" }, ...views.map((v) => h("button", { "data-register-choice": v.id }, v.title))),
    ...registers,
    h("p", { id: "register-panel-title", tabindex: "-1" }, "Source page"));
  const stage = h("div", { "data-demo-stage": "" });
  installDocument(h("body", {}, h("figure", { "data-demo-frame": "" }, h("div", {}, stage), h("div", { "data-demo-transcript": "" }, transcript))));
  return { stage, transcript };
}

async function runAll(stage, pb) {
  const lines = [];
  for await (const step of registerRenderer.steps(stage, pb)) lines.push(step.announce);
  return lines;
}

test("the replay announces each flagged row of the register the toggle chose, in order, then its summary (the step sequence over the real data)", async () => {
  assert.equal(registerRenderer.intro, REPLAY_INTRO);
  for (const view of [MA, TD]) {
    const { stage } = frameOver(DATA, view.id);
    assert.deepEqual(await runAll(stage, createPlayback({ instant: true })), announcedSteps(view), view.id);
  }
});

test("the stage holds one copy of the transcript that can't take focus: no ids, no link targets, no live buttons, and every row shown at the end", async () => {
  const { stage, transcript } = frameOver(DATA, MA.id);
  await runAll(stage, createPlayback({ instant: true }));
  const copies = stage.querySelectorAll("[data-register-replay]");
  assert.equal(copies.length, 1);
  assert.equal(stage.querySelectorAll("[data-register-transcript]").length, 0, "the copy keeps the transcript's hook");
  for (const attr of ["id", "aria-labelledby", "tabindex"]) assert.equal(stage.querySelectorAll(`[${attr}]`).length, 0, `the copy keeps ${attr}`);
  // The copy has every link and button the transcript has (so the two checks after these aren't vacuous), all disarmed.
  const links = stage.querySelectorAll("a");
  const buttons = stage.querySelectorAll("button");
  assert.equal(links.length, transcript.querySelectorAll("a").length, "the copy lost a link");
  assert.equal(buttons.length, transcript.querySelectorAll("button").length, "the copy lost a button");
  assert.ok(links.length > 0 && buttons.length > 0);
  assert.ok(links.every((a) => a.getAttribute("href") === null), "a link in the stage still has a target");
  assert.ok(buttons.every((b) => b.disabled), "a button in the stage is still live");
  assert.equal(stage.querySelectorAll(".rg-pending").length, 0, "the finished replay leaves a value hidden");
  assert.equal(copies[0].querySelectorAll("tr").length, MA.rows.length + TD.rows.length);
  // The transcript itself is untouched.
  assert.equal(transcript.querySelectorAll("[id]").length, 1 + 2);
  assert.ok(transcript.querySelectorAll("a").every((a) => a.getAttribute("href") !== null));
});

test("a cancelled run stops drawing at once: the rows after it stay hidden and nothing more is announced", async () => {
  const { stage } = frameOver(DATA, MA.id);
  const pb = createPlayback();
  const run = registerRenderer.steps(stage, pb);
  const first = run.next(); // draws the copy, shows the first row's document, then waits
  pb.cancel();
  assert.deepEqual(await first, { value: undefined, done: true });
  const rows = stage.querySelectorAll("tr[data-register-row]");
  assert.equal(rows.length, MA.rows.length + TD.rows.length);
  assert.ok(!rows[0].classList.contains("rg-pending"), "the first document isn't shown");
  assert.ok(rows.slice(1, MA.rows.length).every((row) => row.classList.contains("rg-pending")), "a later row was drawn after the cancel");
});

// ---------- the gallery page: the engine slot and the static transcript ----------

const FIXTURE = demoFixture.data;
const FIXTURE_VIEWS = FIXTURE.registers.map((r) => registerView(FIXTURE, r.id));
const text = (html) => visibleText(html).trim();
const html = () => readPreviewDist("preview/templates/demo/index.html");
const one = (inner, attr, value) => {
  const found = elementsWith(inner, attr, value);
  assert.equal(found.length, 1, `expected one [${attr}${value === undefined ? "" : `="${value}"`}], found ${found.length}`);
  return found[0];
};
const cellAttrs = (cell) => ({
  href: `#${pageAnchor("register", cell.id.split(":")[0], cell.page)}`,
  "data-page": String(cell.page),
  "data-label": cell.label,
  "data-value": cell.value,
  "data-status": cell.status,
  ...(cell.note ? { "data-note": cell.note } : {}),
});
/** Markup to text with tags removed outright, so "[<span>review</span>]" reads "[review]". */
const inline = (s) => decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
const pick = (attrs, keys) => Object.fromEntries(keys.filter((k) => k in attrs).map((k) => [k, decodeEntities(attrs[k])]));
const CELL_KEYS = ["href", "data-page", "data-label", "data-value", "data-status", "data-note"];

test("gallery: the engine slot is DemoEngine for a register demo, and the transcript's toggle and side panel wait for JavaScript", () => {
  const frame = one(html(), "data-demo-frame");
  const root = one(one(frame.inner, "data-demo-engine").inner, "data-demo-root");
  assert.equal(root.attrs["data-demo-kind"], "register");
  const transcript = one(one(frame.inner, "data-demo-transcript").inner, "data-register-transcript");
  const toggle = one(transcript.inner, "data-register-switch");
  assert.ok("hidden" in toggle.attrs, "the toggle shows without JavaScript");
  const choices = elementsWith(toggle.inner, "data-register-choice");
  assert.deepEqual(choices.map((b) => [b.attrs["data-register-choice"], b.attrs["aria-pressed"], text(b.inner)]),
    FIXTURE_VIEWS.map((v, i) => [v.id, String(i === 0), v.title]));
  const panel = one(transcript.inner, "data-register-panel");
  assert.ok("hidden" in panel.attrs, "the side panel shows without JavaScript");
  const title = one(panel.inner, "data-register-panel-title");
  assert.equal(panel.attrs["aria-labelledby"], title.attrs.id);
  assert.equal(title.attrs.tabindex, "-1");
  assert.ok(!("hidden" in one(transcript.inner, "data-register-docs").attrs), "the page list is hidden without JavaScript");
});

test("gallery: each register's rows carry their announcements and mark the flagged ones, and every value links to its page with what the side panel needs", () => {
  const transcript = one(html(), "data-register-transcript");
  const ids = new Set(elements(transcript.inner, (t) => t.attrs.id !== undefined).map((t) => t.attrs.id));
  for (const view of FIXTURE_VIEWS) {
    const register = one(transcript.inner, "data-register", view.id);
    const lines = registerSteps(view);
    assert.equal(decodeEntities(register.attrs["data-register-summary"]), lines.at(-1));
    assert.equal(text(elements(register.inner, (t) => t.name === "caption")[0].inner), view.title);
    const rows = elementsWith(register.inner, "data-register-row");
    assert.deepEqual(rows.map((r) => [r.attrs["data-register-row"], decodeEntities(r.attrs["data-register-announce"])]), view.rows.map((row, i) => [row.doc.id, lines[i]]));
    // Only a row with a flagged value is marked for the replay to announce (Review Focus 1).
    assert.deepEqual(rows.map((r) => "data-register-flagged" in r.attrs), view.rows.map((row) => row.flagged.length > 0));
    rows.forEach((tr, i) => {
      const row = view.rows[i];
      // The row header reads "<title> · <template>": the dot is aria-hidden and a space follows it, so
      // its accessible name is the title, then the template, never run together (ledger ruling R4).
      const [th] = elements(tr.inner, (t) => t.name === "th");
      const [sep] = elements(th.inner, (t) => t.attrs["aria-hidden"] === "true");
      assert.equal(inline(th.inner), `${row.doc.title} · ${row.doc.template}`, `${row.doc.id}: row header`);
      assert.equal(inline(sep?.inner ?? ""), "·", `${row.doc.id}: no aria-hidden separator`);
      assert.equal(inline(th.inner.replace(sep.outer, "")), `${row.doc.title} ${row.doc.template}`, `${row.doc.id}: row header's name`);
      const links = elementsWith(tr.inner, "data-register-cell");
      assert.deepEqual(links.map((a) => a.attrs["data-register-cell"]), row.cells.map((c) => c.id));
      links.forEach((a, j) => {
        const cell = row.cells[j];
        assert.deepEqual(pick(a.attrs, CELL_KEYS), cellAttrs(cell), cell.id);
        assert.ok(ids.has(a.attrs.href.slice(1)), `${a.attrs.href} lands on no id`);
        assert.equal(inline(a.inner), cell.status === "ok" ? `${cell.value}, page ${cell.page}` : `[${cell.status}] ${cell.value}, page ${cell.page}`);
      });
    });
    const entries = elementsWith(register.inner, "data-register-queue-item");
    assert.deepEqual(entries.map((li) => li.attrs["data-register-queue-item"]), view.queue.map(({ cell }) => cell.id));
    entries.forEach((li, i) => {
      const { row, cell } = view.queue[i];
      const [link] = elementsWith(li.inner, "data-register-open");
      assert.deepEqual(pick(link.attrs, CELL_KEYS), cellAttrs(cell), cell.id);
      assert.ok(inline(li.inner).startsWith(`${row.doc.title}, ${cell.label}: [${cell.status}] ${cell.value}`), cell.id);
      if (cell.note) assert.ok(inline(li.inner).endsWith(cell.note), `${cell.id}: no note`);
    });
  }
  const downloads = elements(transcript.inner, (t) => t.name === "a" && "download" in t.attrs).map((a) => a.attrs.href);
  assert.deepEqual(downloads, Object.values(downloadsOf(FIXTURE)));
});

test("gallery: every page of every document is in the transcript, with each value read from it marked and named", () => {
  const transcript = one(html(), "data-register-transcript");
  for (const doc of FIXTURE.documents) {
    for (const page of doc.pages) {
      const block = one(transcript.inner, "id", pageAnchor("register", doc.id, page.n));
      assert.equal(block.attrs["data-register-page"], `${doc.id}:${page.n}`);
      assert.equal(decodeEntities(block.attrs["data-page-title"]), `${doc.title}, page ${page.n}`);
      const pageText = one(block.inner, "data-register-page-text");
      assert.equal(decodeEntities(pageText.inner.replace(/<[^>]+>/g, "")), page.text);
      const marks = elements(pageText.inner, (t) => t.name === "mark").map((m) => [decodeEntities(m.inner), m.attrs["data-register-marks"]]);
      assert.deepEqual(marks, rangesOn(FIXTURE_VIEWS, doc.id, page.n).sort((a, b) => a.start - b.start).map((r) => [page.text.slice(r.start, r.end), r.cells.join(" ")]), `${doc.id} p${page.n}`);
    }
  }
  // The fixture exercises the panel: a value on its page, and a value its page doesn't have.
  const cells = FIXTURE_VIEWS.flatMap((v) => v.rows.flatMap((row) => row.cells));
  assert.ok(cells.some((c) => c.status === "ok" && c.at !== null), "no ok fixture value sits on its page");
  assert.ok(cells.some((c) => c.status !== "ok" && c.note !== null), "no flagged fixture value has a note");
});
