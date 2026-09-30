import { test, expect } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { serve } from "../support/serve.mjs";
import { CLS_BUDGET, LCP_BUDGET_MS, VITALS_PAGES, clsOf, median } from "../support/vitals.mjs";

// The lab vitals gate (spec §1 criterion 4, §11.4): LCP under 2.0 s and CLS under 0.05 on mobile,
// on Home, one solution page and one industry page of the production build. It runs in the
// prod-vitals project only: the real Chrome build ("new headless"), after every other project and
// one page load at a time, so nothing else competes for the CPU. The spec serves dist/ itself,
// through tests/support/static-server.mjs with every response held back 150 ms (Lighthouse's
// mobile round trip), and slows the CPU 4× through CDP (Lighthouse's mobile slowdown), on
// Lighthouse's mobile screen. Each page loads five times, each in a fresh context with a cold
// cache, and the median of each metric is gated.
//
// A lab reading covers the load only: nothing clicks, scrolls or presses a key, since input ends
// LCP. A run ends once neither metric has had a new entry for 2 s, or 10 s after navigation.
// A local server has no TLS, HTTP/2, CDN or edge, so this measures the page's own render path, not
// its delivery.
const DIST = fileURLToPath(new URL("../../dist/", import.meta.url));
const LATENCY_MS = 150;
const CPU_SLOWDOWN = 4;
const RUNS = 5;
const QUIET_MS = 2000;
const CAP_MS = 10_000;
const MOBILE = { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true };

/** @type {{ origin: string, close: () => Promise<void> }} */
let server;
test.beforeAll(async () => {
  server = await serve(DIST, { latency: LATENCY_MS });
});
test.afterAll(async () => {
  await server?.close();
});

// Runs in the page before any of its own scripts. It keeps the latest LCP candidate and every
// layout shift without recent input, with the nodes that moved, and when the last entry came. It
// also records which of the two entry types the browser supports: a browser that reports no
// layout shifts at all would otherwise pass the CLS gate with 0.
function observeVitals() {
  const name = (node) => {
    if (!(node instanceof Element)) return node ? node.nodeName : "(removed)";
    const classes = [...node.classList].slice(0, 2).map((c) => `.${c}`).join("");
    return `${node.localName}${node.id ? `#${node.id}` : ""}${classes}`;
  };
  const types = ["largest-contentful-paint", "layout-shift"];
  const vitals = { lcp: null, shifts: [], last: 0, supported: types.filter((t) => PerformanceObserver.supportedEntryTypes.includes(t)) };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) vitals.lcp = { time: entry.startTime, element: name(entry.element) };
    vitals.last = performance.now();
  }).observe({ type: "largest-contentful-paint", buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      vitals.shifts.push({ time: entry.startTime, value: entry.value, moved: (entry.sources ?? []).map((s) => name(s.node)) });
    }
    vitals.last = performance.now();
  }).observe({ type: "layout-shift", buffered: true });
  Object.defineProperty(window, "__vitals", { value: vitals });
}

/** One cold, throttled mobile load of `url`: its LCP (ms) and element, its CLS, and every shift. */
async function measure(browser, url) {
  const context = await browser.newContext(MOBILE);
  try {
    const page = await context.newPage();
    await page.addInitScript(observeVitals);
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction(
      ({ quiet, cap }) => performance.now() - window.__vitals.last >= quiet || performance.now() >= cap,
      { quiet: QUIET_MS, cap: CAP_MS },
      { polling: 250, timeout: CAP_MS + 10_000 },
    );
    const vitals = await page.evaluate(() => window.__vitals);
    expect(vitals.supported, `${url}: the browser can't report both metrics`).toEqual(["largest-contentful-paint", "layout-shift"]);
    expect(vitals.lcp, `${url}: no largest-contentful-paint entry`).not.toBeNull();
    return { lcp: vitals.lcp.time, element: vitals.lcp.element, cls: clsOf(vitals.shifts), shifts: vitals.shifts };
  } finally {
    await context.close();
  }
}

for (const path of VITALS_PAGES) {
  test(`${path}: the median of ${RUNS} throttled mobile loads has LCP under ${LCP_BUDGET_MS} ms and CLS under ${CLS_BUDGET} (spec §11.4)`, async ({ browser }, testInfo) => {
    test.setTimeout(RUNS * (CAP_MS + 20_000));
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(browser, `${server.origin}${path}`));
    const lcp = median(runs.map((r) => r.lcp));
    const cls = median(runs.map((r) => r.cls));
    // The figures the launch report quotes: printed on every run, and attached to the test result.
    const report = { path, lcpMs: Math.round(lcp), cls: Number(cls.toFixed(4)), runs };
    console.log(`vitals ${path}: LCP ${report.lcpMs} ms, CLS ${report.cls} (median of ${RUNS}; LCP elements: ${[...new Set(runs.map((r) => r.element))].join(", ")})`);
    await testInfo.attach(`vitals ${path}`, { body: JSON.stringify(report, null, 2), contentType: "application/json" });
    const moved = [...new Set(runs.flatMap((r) => r.shifts.flatMap((s) => s.moved)))].join(", ") || "none";
    expect(cls, `${path}: median CLS ${cls.toFixed(4)}; elements that moved: ${moved}`).toBeLessThan(CLS_BUDGET);
    expect(lcp, `${path}: median LCP ${Math.round(lcp)} ms; LCP elements: ${runs.map((r) => r.element).join(", ")}`).toBeLessThan(LCP_BUDGET_MS);
  });
}
