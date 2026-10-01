// Smooth scrolling for an in-page link clicked with a mouse in Safari (Phase B2 carry-over NB-1).
// global.css scrolls smoothly only while focus is inside the page (html:focus-within), so a
// #fragment in the URL on load jumps at once: WebKit could stop a smooth scroll to it part-way.
// Desktop Safari doesn't focus a link on a mouse click, so there an in-page link jumped while every
// other browser, and Safari from the keyboard, scrolled smoothly. On a plain click of a link to an
// element on this page, this marks <html> with .anchor-scroll until the scroll ends; global.css
// scrolls smoothly under that class too. The browser's own fragment navigation still does the rest,
// so :target, the history entry, hashchange (tabs.ts) and the focus starting point stay native.
// Under prefers-reduced-motion global.css never scrolls smoothly, so the class changes nothing.

export const ANCHOR_SCROLL_CLASS = "anchor-scroll";
/** Longest a smooth scroll is given to end, where the browser fires no scrollend event. */
const HOLD_MS = 1500;

/** The id an in-page link's fragment names: `href` on the page at `here`, both absolute URLs. Null for another page or no fragment. */
export function fragmentId(href: string, here: string): string | null {
  const to = new URL(href);
  const from = new URL(here);
  if (to.origin !== from.origin || to.pathname !== from.pathname || to.search !== from.search) return null;
  if (to.hash.length < 2) return null;
  try {
    return decodeURIComponent(to.hash.slice(1));
  } catch {
    return to.hash.slice(1);
  }
}

export function initAnchorScroll(): void {
  const root = document.documentElement;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const release = () => {
    clearTimeout(timer);
    root.classList.remove(ANCHOR_SCROLL_CLASS);
  };
  document.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
    if (!(link instanceof HTMLAnchorElement) || (link.target !== "" && link.target !== "_self")) return;
    const id = fragmentId(link.href, location.href);
    if (id === null || document.getElementById(id) === null) return;
    root.classList.add(ANCHOR_SCROLL_CLASS);
    clearTimeout(timer);
    timer = setTimeout(release, HOLD_MS);
  });
  document.addEventListener("scrollend", () => {
    if (root.classList.contains(ANCHOR_SCROLL_CLASS)) release();
  });
}
