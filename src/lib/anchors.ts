// The "Rules that travel" chip text (go-global §5.2): "{Kind} · {status} · as at {Mon YYYY}", such as
// "Law · applies from 2 Dec 2027 · as at Oct 2026". The industry view builds each chip's label here,
// never IndustryTemplate.astro (tests/dates.test.mjs pins the template's dates import). It imports
// only plain modules, so node tests import it directly.
import type { AnchorData } from "../content/schemas.ts";
import { formatMonthYear, formatShortDate } from "./dates.ts";
import { ANCHOR_KIND_LABEL } from "./fixed-copy.ts";

/** The chip's separator: a middle dot (U+00B7) with a space either side. */
const SEPARATOR = " · ";

/**
 * in-force → "in force"; applies-from → "applies from 2 Dec 2027"; published → "published Sep 2026";
 * draft → "draft"; not-in-force → "not in force". Throws when a dated status has no statusDate.
 */
export function anchorStatusText(a: Pick<AnchorData, "status" | "statusDate">): string {
  switch (a.status) {
    case "in-force":
      return "in force";
    case "draft":
      return "draft";
    case "not-in-force":
      return "not in force";
    case "applies-from":
    case "published":
      if (!a.statusDate) throw new Error(`an anchor that is ${a.status} needs its statusDate (go-global §5.2)`);
      return a.status === "applies-from" ? `applies from ${formatShortDate(a.statusDate)}` : `published ${formatMonthYear(a.statusDate)}`;
  }
}

/** "Law · applies from 2 Dec 2027 · as at Oct 2026" (separator " · ", U+00B7). */
export function anchorChipLabel(a: Pick<AnchorData, "kind" | "status" | "statusDate" | "asAt">): string {
  return [ANCHOR_KIND_LABEL[a.kind], anchorStatusText(a), `as at ${formatMonthYear(a.asAt)}`].join(SEPARATOR);
}
