// BR-4 (spec §11.4, CLS under 0.05): the tab groups as a page first paints them, and as they are
// once src/scripts/tabs.ts has run. BaseLayout's head script swaps html.no-js for html.js before
// the first paint, but tabs.ts is a module script, which runs only once the parser has finished,
// often after the page has painted. tabsBeforeAndAfter() holds the tabs chunk back, measures every
// group with the page parsed and its stylesheets and fonts in, lets the chunk run, and measures
// again. moved() lists what differs: nothing may.

/** The chunk Astro builds from Tabs.astro's <script>, which imports and runs initTabs(). */
export const TABS_CHUNK = /\/_astro\/Tabs\.astro_astro_type_script_index_0_lang\.[\w-]+\.js$/;

/**
 * Runs in the page. Each group's id, whether tabs.ts has set it up, its top and height, and the
 * top of its first panel's first block of content (inside the body wrapper tabs.ts adds, once it
 * has), all in page coordinates.
 */
async function groupLayout() {
  document.body.getBoundingClientRect(); // lay the page out, so every font it uses starts loading
  // Each font face the layout asked for, loaded. Not document.fonts.ready: WebKit resolves it only
  // after the load event, which the held chunk holds back.
  await Promise.all([...document.fonts].filter((face) => face.status === "loading").map((face) => face.loaded.catch(() => undefined)));
  const top = (el) => el.getBoundingClientRect().top + scrollY;
  return [...document.querySelectorAll("[data-tabs]")].map((group) => {
    const panel = group.querySelector(":scope > [data-tab-panel]");
    const content = panel?.querySelector(":scope > [data-tab-body] > *, :scope > .tab-panel-heading ~ :not([data-tab-body])");
    return {
      id: group.id,
      enhanced: group.hasAttribute("data-tabs-mode"),
      top: top(group),
      height: group.getBoundingClientRect().height,
      content: content ? top(content) : null,
    };
  });
}

/**
 * Loads `path` with the tabs chunk held back, and measures the tab groups before and after it runs.
 * @param {import("@playwright/test").Page} page
 * @param {string} path
 */
export async function tabsBeforeAndAfter(page, path) {
  let release = () => {};
  const held = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(TABS_CHUNK, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto(path, { waitUntil: "commit" });
  // Parsed (a held module script keeps readyState at "interactive") and every stylesheet in.
  await page.waitForFunction(
    () => document.readyState !== "loading" && [...document.querySelectorAll('link[rel="stylesheet"]')].every((link) => link.sheet),
  );
  const before = await page.evaluate(groupLayout);
  release();
  await page.waitForFunction(() => [...document.querySelectorAll("[data-tabs]")].every((group) => group.hasAttribute("data-tabs-mode")));
  const after = await page.evaluate(groupLayout);
  await page.unroute(TABS_CHUNK);
  return { before, after };
}

/**
 * What moved by more than `tolerance` px between the two measurements, one line each: empty when
 * nothing did.
 * @param {{ id: string, top: number, height: number, content: number | null }[]} before
 * @param {{ id: string, top: number, height: number, content: number | null }[]} after
 */
export function moved(before, after, tolerance = 1) {
  const out = [];
  before.forEach((b, i) => {
    const a = after[i];
    for (const key of ["top", "height", "content"]) {
      const differs = b[key] === null || a[key] === null ? b[key] !== a[key] : Math.abs(a[key] - b[key]) > tolerance;
      if (differs) out.push(`#${b.id} ${key}: ${b[key]?.toFixed(1)} at first paint, ${a[key]?.toFixed(1)} once tabs.ts ran`);
    }
  });
  return out;
}
