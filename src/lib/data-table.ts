// DataTable's cell type and the checks it runs on its props at build time (spec §8.12 tables).
// Plain TypeScript with no imports, so node tests import it directly and the view builders in
// src/lib/views/ can share the Cell type.

/** A table cell: text, or a link cell. A link cell whose href is null renders as text. */
export type Cell = string | { text: string; href: string | null };

export interface TableSpec {
  caption: string;
  columns: { key: string; label: string }[];
  rows: Record<string, Cell>[];
  rowHeader: string;
  rowIds?: string[];
  rowMarker?: string;
}

/** Row ids end up in URLs (#reg-…) and CSS selectors, so they are plain lower-case tokens. */
const ROW_ID = /^[a-z][a-z0-9-]*$/;
const ROW_MARKER = /^data-[a-z][a-z0-9-]*$/;

export function cellText(cell: Cell): string {
  return typeof cell === "string" ? cell : cell.text;
}

export function cellHref(cell: Cell): string | null {
  return typeof cell === "string" ? null : cell.href;
}

/** Throws, naming the table by its caption, when the props can't render the table they describe. */
export function checkTable({ caption, columns, rows, rowHeader, rowIds, rowMarker }: TableSpec): void {
  const fail = (problem: string): never => {
    throw new Error(`DataTable "${caption}": ${problem}`);
  };
  if (!columns.some((c) => c.key === rowHeader)) fail(`rowHeader "${rowHeader}" is not a column key`);
  rows.forEach((row, i) => {
    for (const c of columns) {
      const cell = row[c.key];
      if (cell == null) fail(`row ${i + 1} has no "${c.key}" cell`);
      // An empty cell reads as nothing, and an empty link cell would be a focusable link with no name.
      else if (cellText(cell).trim() === "") fail(`row ${i + 1} has an empty "${c.key}" cell`);
    }
  });
  if (rowIds) {
    if (rowIds.length !== rows.length) fail(`${rowIds.length} rowIds for ${rows.length} rows`);
    for (const id of rowIds) {
      if (!ROW_ID.test(id)) fail(`rowId "${id}" is not a lower-case id (a-z, 0-9 and "-", starting with a letter)`);
    }
    const repeated = rowIds.find((id, i) => rowIds.indexOf(id) !== i);
    if (repeated !== undefined) fail(`rowId "${repeated}" repeats`);
  }
  if (rowMarker !== undefined && !ROW_MARKER.test(rowMarker)) fail(`rowMarker "${rowMarker}" is not a data-* attribute name`);
}
