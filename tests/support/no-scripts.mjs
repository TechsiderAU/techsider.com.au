// The no-JavaScript rendering of one page, for tests that must still run page JavaScript of their
// own: the page is served with every script stripped (the no-js → js flip included), so its own
// enhancement never runs, while evaluate() and axe still work. A javaScriptEnabled: false context
// runs neither. The ld+json blocks stay: they're data, not scripts.
/**
 * @param {import("@playwright/test").Page} page
 * @param {string} path the page's path, e.g. "/preview/templates/contact/"; any query string still matches
 */
export async function withoutScripts(page, path) {
  await page.route((url) => url.pathname === path, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/<script\b(?![^>]*application\/ld\+json)[^>]*>[\s\S]*?<\/script>/g, "");
    await route.fulfill({ response, body });
  });
}
