// Tabs (spec §8.12): server-rendered stacked sections ([data-tabs] > [data-tab-panel]),
// enhanced to the WAI-ARIA tabs pattern from 768px and to an accordion below it.
//
// Tabs use MANUAL activation (APG "Tabs with Manual Activation"): ArrowLeft/ArrowRight
// (wrapping), Home and End move focus between tabs; Enter or Space (a native button click)
// selects. The selected tab is the only one in the Tab order (roving tabindex).
// Selecting a tab, or expanding an accordion item, writes the panel id to the URL with
// history.replaceState. A hash naming a panel, or any element inside one, selects that
// panel on load and on hashchange, and scrolls it into view (on load, once the page and its
// fonts have settled). In tab mode each panel keeps a scroll margin as tall as its tablist,
// so the browser's own hash scroll, which lands after the load event, shows the selected tab
// too. Closing the current accordion
// item hands the selection to the open item opened most recently. Crossing the breakpoint
// tears the current mode down and builds the other, keeping the selected panel and the
// focused control.

type Mode = "tabs" | "accordion";

interface Panel {
  el: HTMLElement;
  heading: HTMLElement;
  body: HTMLElement;
  label: string;
  tab: HTMLButtonElement | null;
  toggle: HTMLButtonElement | null;
  /** When its accordion item last opened (a rising count); 0 while it is closed. */
  opened: number;
}

interface Group {
  root: HTMLElement;
  panels: Panel[];
  current: Panel;
  mode: Mode | null;
  tablist: HTMLElement | null;
  /** Tab mode: keeps --tab-list-block (Tabs.astro's panel scroll margin) at the tablist's height. */
  sizer: ResizeObserver | null;
}

const WIDE = "(min-width: 48rem)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const enhanced = new WeakSet<HTMLElement>();
let openings = 0;

// Collects a group's panels and moves everything after each heading into a body wrapper
// (built once; the accordion toggles it). Panels without a heading are left alone.
function collectPanels(root: HTMLElement): Panel[] {
  const panels: Panel[] = [];
  for (const el of root.querySelectorAll<HTMLElement>(":scope > [data-tab-panel]")) {
    const heading = el.querySelector<HTMLElement>(":scope > .tab-panel-heading");
    if (!el.id || !heading) continue;
    let body = el.querySelector<HTMLElement>(":scope > [data-tab-body]");
    if (!body) {
      body = document.createElement("div");
      body.id = `${el.id}-body`;
      body.className = "tab-panel-body";
      body.dataset.tabBody = "";
      while (heading.nextSibling) body.append(heading.nextSibling);
      el.append(body);
    }
    const label = el.dataset.tabLabel ?? heading.textContent?.trim() ?? el.id;
    panels.push({ el, heading, body, label, tab: null, toggle: null, opened: 0 });
  }
  return panels;
}

// The element the URL hash names, if any.
function hashTarget(): HTMLElement | null {
  try {
    const id = decodeURIComponent(location.hash.slice(1));
    return id ? document.getElementById(id) : null;
  } catch {
    return null; // a malformed %-escape
  }
}

// The group's panel that is, or contains, the hash target.
function panelHolding(g: Group, target: HTMLElement | null): Panel | undefined {
  return target ? g.panels.find((p) => p.el.contains(target)) : undefined;
}

function writeHash(p: Panel): void {
  history.replaceState(null, "", `#${p.el.id}`);
}

// Scrolls a hash-selected panel into view: the group's tablist when the hash names the whole
// panel in tab mode (so the selected tab shows too), otherwise the target. Smooth, unless the
// user prefers reduced motion ("auto" then follows global.css, which turns smooth scrolling off).
function reveal(g: Group, p: Panel, target: HTMLElement): void {
  const el = target === p.el && g.tablist ? g.tablist : target;
  el.scrollIntoView({ block: "start", behavior: matchMedia(REDUCED_MOTION).matches ? "auto" : "smooth" });
}

function select(g: Group, p: Panel): void {
  g.current = p;
  if (g.mode === "tabs") {
    for (const q of g.panels) {
      const on = q === p;
      q.tab?.setAttribute("aria-selected", String(on));
      if (q.tab) q.tab.tabIndex = on ? 0 : -1;
      q.el.hidden = !on;
    }
  } else if (g.mode === "accordion") {
    setExpanded(p, true);
  }
}

// Brings the hash-selected panel into view once the page has settled: after the load event,
// when the browser makes its own hash scroll (the panel's scroll margin makes that land in the
// same place), and after the web fonts, which can still move the panel. Revealing any earlier
// cancels Chromium's own hash scroll and leaves the panel wherever the late fonts push it.
function revealWhenSettled(g: Group, p: Panel, target: HTMLElement): void {
  const hash = location.hash;
  const loaded =
    document.readyState === "complete" ? Promise.resolve() : new Promise<void>((resolve) => addEventListener("load", () => resolve(), { once: true }));
  void loaded
    .then(() => document.fonts.ready)
    .then(() =>
      requestAnimationFrame(() => {
        if (location.hash === hash) reveal(g, p, target);
      }),
    );
}

function setExpanded(p: Panel, open: boolean): void {
  p.toggle?.setAttribute("aria-expanded", String(open));
  p.body.hidden = !open;
  p.opened = open ? ++openings : 0;
}

// The open accordion item opened most recently, if any.
function lastOpened(g: Group): Panel | undefined {
  return g.panels.reduce<Panel | undefined>((best, q) => (q.opened > (best?.opened ?? 0) ? q : best), undefined);
}

function onTabKey(g: Group, e: KeyboardEvent): void {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const tabs = g.panels.map((p) => p.tab).filter((t): t is HTMLButtonElement => t !== null);
  const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0) return;
  let next: number;
  switch (e.key) {
    case "ArrowRight":
      next = (i + 1) % tabs.length;
      break;
    case "ArrowLeft":
      next = (i - 1 + tabs.length) % tabs.length;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = tabs.length - 1;
      break;
    default:
      return;
  }
  e.preventDefault();
  tabs[next].focus();
}

function buildTabs(g: Group): void {
  const list = document.createElement("div");
  list.setAttribute("role", "tablist");
  list.setAttribute("aria-label", g.root.dataset.tabsLabel ?? "");
  list.className = "tab-list";
  for (const p of g.panels) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.id = `${p.el.id}-tab`;
    tab.className = "tab";
    tab.textContent = p.label;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", p.el.id);
    tab.addEventListener("click", () => {
      select(g, p);
      writeHash(p);
    });
    list.append(tab);
    p.tab = tab;
    p.el.setAttribute("role", "tabpanel");
    p.el.setAttribute("aria-labelledby", tab.id);
    p.el.tabIndex = 0;
    p.heading.classList.add("sr-only");
  }
  list.addEventListener("keydown", (e) => onTabKey(g, e));
  g.panels[0].el.before(list);
  g.tablist = list;
  // A hash scroll lands on a panel; its scroll margin (Tabs.astro) leaves room for the tablist
  // above it, however many rows the tabs wrap to.
  const fit = () => g.root.style.setProperty("--tab-list-block", `${list.offsetHeight}px`);
  fit();
  g.sizer = new ResizeObserver(fit);
  g.sizer.observe(list);
  g.mode = "tabs";
  select(g, g.current);
}

function buildAccordion(g: Group): void {
  for (const p of g.panels) {
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "tab-toggle";
    toggle.setAttribute("aria-controls", p.body.id);
    const text = document.createElement("span");
    text.textContent = p.label;
    const icon = document.createElement("span");
    icon.className = "tab-toggle-icon";
    icon.setAttribute("aria-hidden", "true");
    toggle.append(text, icon);
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      setExpanded(p, open);
      if (open) {
        g.current = p;
        writeHash(p);
      } else if (g.current === p) {
        // The current item closed: the selection moves to what is still showing, so growing
        // past 768px selects that tab (the first one when every item is closed).
        g.current = lastOpened(g) ?? g.panels[0];
      }
    });
    p.heading.replaceChildren(toggle);
    p.toggle = toggle;
    setExpanded(p, p === g.current);
  }
  g.mode = "accordion";
}

// Back to the server-rendered markup, so the other mode can be built without duplicates.
function teardown(g: Group): void {
  g.tablist?.remove();
  g.tablist = null;
  g.sizer?.disconnect();
  g.sizer = null;
  g.root.style.removeProperty("--tab-list-block");
  for (const p of g.panels) {
    p.el.removeAttribute("role");
    p.el.removeAttribute("tabindex");
    p.el.setAttribute("aria-labelledby", p.heading.id);
    p.el.hidden = false;
    p.body.hidden = false;
    p.heading.classList.remove("sr-only");
    p.heading.replaceChildren(p.label);
    p.tab = null;
    p.toggle = null;
  }
  g.mode = null;
}

function apply(g: Group, mode: Mode): void {
  if (g.mode === mode) return;
  const active = document.activeElement;
  // Focus inside a panel's content keeps that panel shown; focus on a tab or accordion
  // button moves to the same panel's control in the new mode.
  const inside = g.panels.find((p) => p.body.contains(active));
  if (inside) g.current = inside;
  const focused = g.panels.find((p) => p.tab === active || p.toggle === active);
  teardown(g);
  if (mode === "tabs") buildTabs(g);
  else buildAccordion(g);
  g.root.dataset.tabsMode = mode;
  if (focused) (focused.tab ?? focused.toggle)?.focus();
}

export function initTabs(root: ParentNode = document): void {
  const wide = matchMedia(WIDE);
  const modeNow = (): Mode => (wide.matches ? "tabs" : "accordion");
  const groups: Group[] = [];
  const target = hashTarget();
  let hashed: { g: Group; p: Panel } | undefined;
  for (const el of root.querySelectorAll<HTMLElement>("[data-tabs]")) {
    if (enhanced.has(el)) continue;
    const panels = collectPanels(el);
    if (panels.length === 0) continue;
    enhanced.add(el);
    const g: Group = { root: el, panels, current: panels[0], mode: null, tablist: null, sizer: null };
    const held = panelHolding(g, target);
    if (held) hashed = { g, p: held };
    g.current = held ?? panels[0];
    apply(g, modeNow());
    groups.push(g);
  }
  if (groups.length === 0) return;
  if (hashed && target) revealWhenSettled(hashed.g, hashed.p, target);

  wide.addEventListener("change", () => {
    for (const g of groups) apply(g, modeNow());
  });
  addEventListener("hashchange", () => {
    const target = hashTarget();
    for (const g of groups) {
      const p = panelHolding(g, target);
      if (!p || !target) continue;
      select(g, p);
      // The target was hidden when the browser tried to scroll to it.
      reveal(g, p, target);
    }
  });
}
