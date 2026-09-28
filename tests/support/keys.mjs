// The keys that move keyboard focus through every link and button, per browser engine.
// WebKit on macOS keeps Safari's default ("Press Tab to highlight each item on a webpage" is off):
// Tab skips links and buttons, and Option+Tab reaches them. WebKit on Linux (CI) and Chromium tab
// to everything, and the firefox project sets accessibility.tabfocus = 7 so Firefox does too.
/**
 * @param {string} browserName Playwright's `browserName` fixture: "chromium", "firefox" or "webkit"
 * @param {string} [platform] defaults to process.platform (the unit test passes it explicitly)
 * @returns {{ next: string, prev: string }} keys for page.keyboard.press()
 */
export function focusKeys(browserName, platform = process.platform) {
  const option = browserName === "webkit" && platform === "darwin" ? "Alt+" : "";
  return { next: `${option}Tab`, prev: `${option}Shift+Tab` };
}
