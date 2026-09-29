import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockPanelFixture, sampleReportFixture, traceFixture, regulatoryFixture } from "../../src/fixtures/index.ts";

// MockPanel, SampleReport, TracePanel and DataTable on the preview gallery (spec §8.12).
// GalleryStaticB renders each once on carbon and once on bone.
const PAGE = "/preview/components/";
const MOCK_CAPTION = "Illustrative interface, fictional data";
const SAMPLE_CAPTION = "Sample report: Techsider testing its own demo system, so not independent.";
const GRAPHITE = "rgb(42, 43, 46)";
const CARBON = "rgb(11, 11, 12)";
const BONE = "rgb(242, 241, 236)";

test("every MockPanel carries the fixed caption, on carbon and on bone", async ({ page }) => {
  await page.goto(PAGE);
  const panels = page.locator("[data-mock-panel]");
  await expect(panels).toHaveCount(2);
  for (const panel of await panels.all()) {
    await expect(panel.locator("figcaption")).toHaveText(MOCK_CAPTION);
    await expect(panel.locator("figcaption")).toBeVisible();
  }
});

test("MockPanel shows redaction, status and the decision row as text, not colour alone", async ({ page }) => {
  await page.goto(PAGE);
  const panel = page.locator("#gallery-mock-panel [data-mock-panel]");
  // Redacted values never reach the page: the field reads "•••• (redacted)" instead.
  const redacted = mockPanelFixture.fields.filter((f) => f.redacted);
  const masked = panel.locator("dd[data-redacted]");
  await expect(masked).toHaveCount(redacted.length);
  for (let i = 0; i < redacted.length; i++) await expect(masked.nth(i)).toHaveText("•••• (redacted)");
  const html = await page.content();
  for (const f of redacted) expect(html).not.toContain(f.value);
  const chips = panel.locator("[data-status]");
  await expect(chips).toHaveCount(mockPanelFixture.chips.length);
  for (const [i, c] of mockPanelFixture.chips.entries()) {
    await expect(chips.nth(i)).toHaveAttribute("data-status", c.status);
    await expect(chips.nth(i)).toContainText(`[${c.status}]`);
    await expect(chips.nth(i)).toContainText(c.text);
  }
  const decision = panel.locator(".mock-decision");
  await expect(decision.locator("button, a, [role=button], [tabindex]")).toHaveCount(0);
  await expect(decision.locator('span[aria-hidden="true"]')).toHaveText([mockPanelFixture.decision.approve, mockPanelFixture.decision.reject]);
  await expect(decision.locator(".sr-only")).toContainText("Decision buttons shown for illustration");
});

test("MockPanel and TracePanel stay dark islands inside a bone section", async ({ page }) => {
  await page.goto(PAGE);
  const look = (loc) => loc.evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, color: s.color, scheme: s.colorScheme };
  });
  expect(await look(page.locator("#gallery-mock-panel-bone .mock-window"))).toEqual({ bg: GRAPHITE, color: BONE, scheme: "dark" });
  expect(await look(page.locator("#gallery-trace-panel-bone [data-trace-panel]").first())).toEqual({ bg: CARBON, color: BONE, scheme: "dark" });
});

test("every SampleReport has the fixed title and caption and is never titled Independent Evaluation Report", async ({ page }) => {
  await page.goto(PAGE);
  const reports = page.locator("[data-sample-report]");
  await expect(reports).toHaveCount(4); // illustrative and measured, on carbon and on bone
  for (const report of await reports.all()) {
    await expect(report.getByRole("heading", { level: 2 })).toHaveText("Sample evaluation report");
    const caption = report.locator("[data-sample-caption]");
    await expect(caption).toHaveText(SAMPLE_CAPTION);
    await expect(caption).toBeVisible();
    // Body size, not small print (spec §8.12: the caption can't be switched off or shrunk away).
    expect(await caption.evaluate((el) => getComputedStyle(el).fontSize)).toBe("16px");
  }
  expect(await page.locator("body").textContent()).not.toMatch(/independent evaluation report/i);
});

test("SampleReport labels its provenance: the illustrative fixture says so, a measured report cites its run", async ({ page }) => {
  await page.goto(PAGE);
  for (const section of ["#gallery-sample-report", "#gallery-sample-report-bone"]) {
    const reports = page.locator(`${section} [data-sample-report]`);
    await expect(reports).toHaveCount(2);
    const illustrative = reports.nth(0);
    await expect(illustrative).toHaveAttribute("data-provenance", sampleReportFixture.provenance);
    await expect(illustrative.locator("[data-provenance-label]")).toHaveText("Illustrative sample: not a real test run");
    await expect(illustrative.locator("[data-provenance-label]")).toBeVisible();
    const measured = reports.nth(1);
    await expect(measured).toHaveAttribute("data-provenance", "measured");
    await expect(measured.locator("[data-provenance-label]")).toHaveText("Measured run: src/data/runs/fixture-run/");
    await expect(measured.locator("[data-provenance-label]")).toBeVisible();
  }
});

test("SampleReport shows n, method, typed thresholds, pass/fail as text and every failure with its rating", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(PAGE);
  const report = page.locator("#gallery-sample-report [data-sample-report]").first();
  await expect(report).toContainText(`n = ${sampleReportFixture.n}`);
  await expect(report).toContainText(sampleReportFixture.method);
  const rows = report.locator("table tbody tr");
  await expect(rows).toHaveCount(sampleReportFixture.thresholds.length);
  const show = (m) => `${m.value}${m.unit ?? ""}`;
  for (const [i, t] of sampleReportFixture.thresholds.entries()) {
    await expect(rows.nth(i).locator('th[scope="row"]')).toHaveText(t.metric);
    // innerText: at this width each cell's column label is display:none, so only the value counts.
    await expect(rows.nth(i).locator("td")).toHaveText([show(t.target), show(t.result), t.pass ? "Pass" : "Fail"], { useInnerText: true });
  }
  const failures = report.locator("[data-rating]");
  await expect(failures).toHaveCount(sampleReportFixture.failures.length);
  for (const [i, f] of sampleReportFixture.failures.entries()) {
    await expect(failures.nth(i)).toContainText(f.id);
    await expect(failures.nth(i)).toContainText(new RegExp(`Rating: ${f.rating}`, "i"));
  }
});

test("TracePanel labels its provenance and renders metrics from typed values", async ({ page }) => {
  await page.goto(PAGE);
  const panels = page.locator("#gallery-trace-panel [data-trace-panel]");
  await expect(panels).toHaveCount(2);
  const illustrative = panels.nth(0);
  await expect(illustrative).toHaveAttribute("data-provenance", "illustrative");
  await expect(illustrative.locator("figcaption [data-provenance-label]")).toHaveText("Illustrative trace");
  await expect(illustrative.locator("figcaption")).toBeVisible();
  const lines = illustrative.locator("ol > li");
  await expect(lines).toHaveCount(traceFixture.lines.length);
  for (const [i, l] of traceFixture.lines.entries()) {
    await expect(lines.nth(i)).toContainText(`${l.t} ${l.op} ${l.detail}`);
    if (l.metric) await expect(lines.nth(i).locator("[data-metric]")).toHaveText(`${l.metric.value}${l.metric.unit ?? ""}`);
    else await expect(lines.nth(i).locator("[data-metric]")).toHaveCount(0);
  }
  const measured = panels.nth(1);
  await expect(measured).toHaveAttribute("data-provenance", "measured");
  await expect(measured.locator("figcaption [data-provenance-label]")).toHaveText("Measured run: src/data/runs/fixture-run/");
});

const tables = (page) => page.locator("[data-data-table]");
const LABELS = ["Obligation", "What it means", "How we design for it", "Evidence you get", "Source"];

// One <table> at every width (B1 review finding BR-7a): a table from 768px, its rows stacked as
// cards below. tests/e2e/data-table.spec.mjs covers the specimen's row ids and link cells.
for (const width of [1280, 768]) {
  test(`at ${width}px every DataTable lays out as a table, without the in-cell labels`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PAGE);
    // The specimen, plus the tables inside the SampleReports, on carbon and on bone.
    expect(await tables(page).count()).toBeGreaterThanOrEqual(6);
    for (const t of await tables(page).all()) {
      await expect(t.locator("table")).toHaveCount(1);
      expect(await t.locator("table").evaluate((el) => getComputedStyle(el).display)).toBe("table");
      expect(await t.locator("thead").evaluate((el) => getComputedStyle(el).display)).toBe("table-header-group");
      expect(await t.locator(".dt-label").evaluateAll((els) => els.every((el) => getComputedStyle(el).display === "none"))).toBe(true);
    }
    const table = page.locator("#gallery-data-table [data-data-table] table");
    await expect(table.locator("caption")).toHaveText("Fixture obligations register");
    await expect(table.locator('thead th[scope="col"]')).toHaveText(LABELS);
    await expect(table.locator('tbody th[scope="row"]')).toHaveText(regulatoryFixture.rows.map((r) => r.obligation));
  });
}

for (const width of [767, 390]) {
  test(`at ${width}px every DataTable stacks its rows as cards, each value under its column label`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PAGE);
    expect(await tables(page).count()).toBeGreaterThanOrEqual(6);
    for (const t of await tables(page).all()) {
      const table = t.locator("table");
      await expect(table).toHaveCount(1);
      expect(await table.evaluate((el) => getComputedStyle(el).display)).toBe("block");
      // The header row is out of sight (each cell shows its label instead), but it stays in the
      // table, so screen readers still hear the column headers.
      expect(await t.locator("thead").evaluate((el) => el.getBoundingClientRect().height)).toBeLessThanOrEqual(1);
      expect(await table.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
    }
    const table = page.locator("#gallery-data-table [data-data-table] table");
    await expect(table.locator("caption")).toHaveText("Fixture obligations register");
    await expect(table.locator("caption")).toBeVisible();
    const cards = table.locator("tbody tr");
    await expect(cards).toHaveCount(regulatoryFixture.rows.length);
    const card = cards.first();
    await expect(card.locator('th[scope="row"]')).toHaveText(regulatoryFixture.rows[0].obligation);
    await expect(card.locator(".dt-label")).toHaveText(LABELS.slice(1));
    for (const label of await card.locator(".dt-label").all()) await expect(label).toBeVisible();
    await expect(card.locator("td").first()).toContainText(regulatoryFixture.rows[0].meaning);
    // Stacked: every cell starts at the card's left edge, below the cell before it.
    const boxes = await card.locator("th, td").evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: r.x, top: r.top, bottom: r.bottom })),
    );
    for (const [i, box] of boxes.entries()) {
      expect(box.x).toBeCloseTo(boxes[0].x, 0);
      if (i > 0) expect(box.top).toBeGreaterThanOrEqual(boxes[i - 1].bottom - 0.5);
    }
  });
}

test("the components page has no horizontal scroll at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(PAGE);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  test(`MockPanel, SampleReport, TracePanel and DataTable have no axe violations at ${vp.width}px`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto(PAGE);
    const axe = new AxeBuilder({ page })
      .include("[data-mock-panel]")
      .include("[data-sample-report]")
      .include("[data-trace-panel]")
      .include("[data-data-table]")
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]);
    expect((await axe.analyze()).violations).toEqual([]);
  });
}
