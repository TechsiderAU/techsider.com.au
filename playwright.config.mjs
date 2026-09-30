import { defineConfig, devices } from "@playwright/test";

// Every spec runs in Chromium, WebKit and Firefox against the preview build (dist-preview/:
// every planned page in the nav, plus the /preview/ template gallery). prod-*.spec.mjs specs
// run once, in Chromium, against the production build (dist/), where most pages are still
// planned. `npm run test:e2e` builds both before Playwright starts. A third server, the stand-in form
// provider (tests/support/mock-form.mjs), takes the gallery contact form's enquiries.
const PREVIEW = "http://127.0.0.1:4322";
const PROD = "http://127.0.0.1:4323";
const PROD_SPECS = "**/prod-*.spec.mjs";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.mjs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  // Keep a trace of every failed test: Firefox and Linux WebKit first run in CI, which uploads
  // test-results/, so a failure there leaves the trace as well as the screenshot. No retries.
  use: { screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: [
    { command: "node tests/support/static-server.mjs dist-preview 4322", url: `${PREVIEW}/`, reuseExistingServer: false, timeout: 30_000 },
    { command: "node tests/support/static-server.mjs dist 4323", url: `${PROD}/`, reuseExistingServer: false, timeout: 30_000 },
    { command: "node tests/support/mock-form.mjs 4324", url: "http://127.0.0.1:4324/", reuseExistingServer: false, timeout: 30_000 },
  ],
  projects: [
    { name: "chromium", testIgnore: PROD_SPECS, use: { ...devices["Desktop Chrome"], baseURL: PREVIEW } },
    { name: "webkit", testIgnore: PROD_SPECS, use: { ...devices["Desktop Safari"], baseURL: PREVIEW } },
    {
      name: "firefox",
      testIgnore: PROD_SPECS,
      use: {
        ...devices["Desktop Firefox"],
        baseURL: PREVIEW,
        // Tab reaches every link and button, as it does on Linux (CI). On macOS Firefox otherwise
        // follows the system "Keyboard navigation" setting. WebKit has no such pref: see focusKeys().
        launchOptions: { firefoxUserPrefs: { "accessibility.tabfocus": 7 } },
      },
    },
    { name: "prod-chromium", testMatch: PROD_SPECS, use: { ...devices["Desktop Chrome"], baseURL: PROD } },
  ],
});
