// Spec §11.5 check 5: the MockPanel and SampleReport captions are on every render,
// and the sample report is never titled "Independent Evaluation Report".
import { resolve } from "node:path";
import { elements, elementsWith, htmlFiles, readText, relPath, result, visibleText } from "../lib.mjs";

export const NAME = "05-captions";
export const MOCK_PANEL_CAPTION = "Illustrative interface, fictional data";
export const SAMPLE_REPORT_CAPTION = "Sample report: Techsider testing its own demo system, so not independent.";
export const FORBIDDEN_REPORT_TITLE = "Independent Evaluation Report";

const text = (html) => visibleText(html).trim();
/** A caption that is present but hidden from sight doesn't count. */
const hidden = (attrs) =>
  "hidden" in attrs || attrs["aria-hidden"] === "true" || /(^|\s)(sr-only|visually-hidden)(\s|$)/.test(attrs.class ?? "");

export async function run({ dist }) {
  const r = result();
  const out = resolve(dist);
  const pages = htmlFiles(out);
  if (pages.length === 0) r.add("error", `${dist}: no built HTML found (run the build first)`);

  for (const file of pages) {
    const page = relPath(out, file);
    const html = readText(file);

    elementsWith(html, "data-mock-panel").forEach((panel, i) => {
      const ok = elements(panel.inner, (t) => t.name === "figcaption").some(
        (c) => text(c.inner) === MOCK_PANEL_CAPTION && !hidden(c.attrs),
      );
      if (!ok) r.add("error", `${page}: MockPanel ${i + 1} lacks its visible <figcaption>${MOCK_PANEL_CAPTION}</figcaption>`);
    });

    elementsWith(html, "data-sample-report").forEach((report, i) => {
      const ok = elementsWith(report.inner, "data-sample-caption").some(
        (c) => text(c.inner) === SAMPLE_REPORT_CAPTION && !hidden(c.attrs),
      );
      if (!ok) r.add("error", `${page}: SampleReport ${i + 1} lacks its visible [data-sample-caption] "${SAMPLE_REPORT_CAPTION}"`);
      const banned = FORBIDDEN_REPORT_TITLE.toLowerCase();
      const titled = elements(report.inner, () => true).some((el) => {
        const t = text(el.inner).toLowerCase();
        return /^h[1-6]$/.test(el.name) ? t.includes(banned) : t === banned;
      });
      if (titled) r.add("error", `${page}: SampleReport ${i + 1} is titled "${FORBIDDEN_REPORT_TITLE}"; the sample is never that report`);
    });
  }
  return { name: NAME, errors: r.errors, warnings: r.warnings };
}
