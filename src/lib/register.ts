// The ① Document Registers demo without the DOM (spec §9.1 ①). RegisterTranscript.astro renders
// its static transcript from these at build time: each register resolved into rows of values with
// the page each came from, where each value sits on its page, and the replay's announcements,
// which the transcript carries for the replay to read. scripts/demo-register-set.mjs writes the
// two downloads with them. Type-only imports, so node tests, Playwright specs and the script
// import this file directly.
import type { RegisterData } from "../content/schemas";

export type { RegisterData };
export type SyntheticDoc = RegisterData["documents"][number];
export type CellStatus = "ok" | "review" | "blocked";

/** A span of a page's text, [start, end). */
export interface TextRange {
  start: number;
  end: number;
}

/** One value in a register, with the page it was read from. */
export interface CellView {
  /** "<doc id>:<field key>": the value's id in the transcript's hooks. */
  id: string;
  key: string;
  label: string;
  value: string;
  status: CellStatus;
  note: string | null;
  page: number;
  pageText: string;
  /** Where the value sits on its page, or null when it records an absence ("Not signed"). */
  at: TextRange | null;
}

export interface RowView {
  doc: SyntheticDoc;
  cells: CellView[];
  /** The row's values that aren't ok, in field order. */
  flagged: CellView[];
}

export interface RegisterView {
  id: string;
  title: string;
  fields: { key: string; label: string }[];
  rows: RowView[];
  /** The exception queue: every value that isn't ok, in register order. */
  queue: { row: RowView; cell: CellView }[];
}

/** A run of a page's text; `cells` lists the values it shows (none for plain text). */
export interface Segment {
  text: string;
  cells: string[];
}

/** The replay log's first line (the engine's DemoRenderer `intro`). */
export const REPLAY_INTRO = "Replay started: the register fills in from the synthetic documents, a row at a time. Use Pause to hold it, or Skip to result to read the full transcript now.";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Where `value` first sits in `text`, ignoring case, or null. */
export function findValue(text: string, value: string): TextRange | null {
  if (value.trim() === "") return null;
  const m = new RegExp(escapeRe(value), "i").exec(text);
  return m ? { start: m.index, end: m.index + m[0].length } : null;
}

/** `text` as runs, every character once: ranges that overlap or touch make one run showing all their values. */
export function markSegments(text: string, ranges: (TextRange & { cells: string[] })[]): Segment[] {
  const merged: (TextRange & { cells: string[] })[] = [];
  for (const r of [...ranges].sort((a, b) => a.start - b.start)) {
    const last = merged.at(-1);
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
      last.cells = [...new Set([...last.cells, ...r.cells])];
    } else merged.push({ ...r, cells: [...r.cells] });
  }
  const out: Segment[] = [];
  let at = 0;
  for (const r of merged) {
    if (r.start > at) out.push({ text: text.slice(at, r.start), cells: [] });
    out.push({ text: text.slice(r.start, r.end), cells: r.cells });
    at = r.end;
  }
  if (at < text.length) out.push({ text: text.slice(at), cells: [] });
  return out;
}

/** The id of a document page in the static transcript: every value read from it links there. */
export function pageAnchor(prefix: string, docId: string, page: number): string {
  return `${prefix}-${docId}-p${page}`;
}

/** One register resolved: each row's document and, per field, its value and source page. Throws on a reference the data can't resolve. */
export function registerView(data: RegisterData, registerId: string): RegisterView {
  const register = data.registers.find((r) => r.id === registerId);
  if (!register) throw new Error(`register demo: no register "${registerId}"`);
  const rows = register.rows.map((row): RowView => {
    const doc = data.documents.find((d) => d.id === row.doc);
    if (!doc) throw new Error(`register demo: ${register.id} reads "${row.doc}", which isn't a document`);
    const cells = register.fields.map((field): CellView => {
      const cell = row.cells[field.key];
      if (!cell) throw new Error(`register demo: ${register.id}/${doc.id} has no "${field.key}" value`);
      const page = doc.pages.find((p) => p.n === cell.page);
      if (!page) throw new Error(`register demo: ${register.id}/${doc.id}/${field.key} cites page ${cell.page}, which ${doc.id} doesn't have`);
      return {
        id: `${doc.id}:${field.key}`,
        key: field.key,
        label: field.label,
        value: cell.value,
        status: cell.status,
        note: cell.note ?? null,
        page: cell.page,
        pageText: page.text,
        at: findValue(page.text, cell.value),
      };
    });
    return { doc, cells, flagged: cells.filter((c) => c.status !== "ok") };
  });
  return {
    id: register.id,
    title: register.title,
    fields: register.fields,
    rows,
    queue: rows.flatMap((row) => row.flagged.map((cell) => ({ row, cell }))),
  };
}

/** The values every register reads from one page, where they sit on it: the transcript marks them. */
export function rangesOn(views: RegisterView[], docId: string, page: number): (TextRange & { cells: string[] })[] {
  return views
    .flatMap((v) => v.rows.filter((row) => row.doc.id === docId).flatMap((row) => row.cells))
    .flatMap((c) => (c.page === page && c.at !== null ? [{ ...c.at, cells: [c.id] }] : []));
}

const flaggedList = (cells: CellView[]) => cells.map((c) => `${c.label}, ${c.status}`).join("; ");

/** The lines the transcript carries for one register: a line per row, in register order, then a summary. */
export function registerSteps(view: RegisterView): string[] {
  const values = view.rows.reduce((n, row) => n + row.cells.length, 0);
  return [
    ...view.rows.map((row) =>
      `${row.doc.title}: ${row.cells.length} values read, ${row.flagged.length === 0 ? "none flagged" : `${row.flagged.length} flagged: ${flaggedList(row.flagged)}`}.`),
    `${view.title}: ${values} values from ${view.rows.length} documents, ${view.queue.length} in the exception queue. Each value opens the page it came from.`,
  ];
}

/**
 * What the replay's log announces for one register: the line of each row with a flagged value, in
 * register order, then the summary, which counts the rest. So the log carries the exceptions rather
 * than a "none flagged" line a row (Review Focus 1). The transcript marks those rows data-register-flagged.
 */
export function announcedSteps(view: RegisterView): string[] {
  const lines = registerSteps(view);
  return [...view.rows.flatMap((row, i) => (row.flagged.length > 0 ? [lines[i]] : [])), lines[lines.length - 1]];
}

/** The two downloads: `download` is the register CSV, and the documents file sits beside it. */
export function downloadsOf(data: RegisterData): { register: string; documents: string } {
  const m = /^(\/downloads\/[a-z0-9-]+)-register\.csv$/.exec(data.download);
  if (!m) throw new Error(`register demo: download "${data.download}" must be /downloads/<name>-register.csv, with the documents at /downloads/<name>-documents.txt`);
  return { register: data.download, documents: `${m[1]}-documents.txt` };
}

const CSV_HEADER = ["register", "document_id", "document", "template", "field", "value", "page", "status", "note"];
const csvField = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** Both registers as one CSV, one line per value, so a spreadsheet can sort and filter them. */
export function registerCsv(data: RegisterData): string {
  const lines = [CSV_HEADER];
  for (const register of data.registers) {
    for (const row of registerView(data, register.id).rows) {
      for (const c of row.cells) {
        lines.push([register.title, row.doc.id, row.doc.title, row.doc.template, c.label, c.value, String(c.page), c.status, c.note ?? ""]);
      }
    }
  }
  return `${lines.map((line) => line.map(csvField).join(",")).join("\n")}\n`;
}

/** Every synthetic document, page by page, as plain text. */
export function documentsText(data: RegisterData): string {
  const rule = "=".repeat(72);
  const head = [
    "Synthetic documents from the Techsider Document Registers demo.",
    "Every party, premises, policy, date and amount in this file is invented. None of it is a real agreement or trust deed.",
    `The registers read from them are in ${downloadsOf(data).register.split("/").at(-1)}.`,
  ].join("\n");
  const docs = data.documents.map((doc) =>
    [rule, doc.title, `Template: ${doc.template}`, `Document id: ${doc.id}`, rule, ...doc.pages.map((p) => `\n--- Page ${p.n} ---\n${p.text}`)].join("\n"),
  );
  return `${[head, ...docs].join("\n\n")}\n`;
}
