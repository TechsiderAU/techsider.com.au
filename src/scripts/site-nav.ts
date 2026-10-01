// Desktop disclosure navigation (WAI-ARIA APG "disclosure navigation with top-level links").
// Each group: a real <a> to its hub plus a separate toggle <button> for its panel.

interface Group {
  el: HTMLElement;
  btn: HTMLButtonElement;
  panel: HTMLElement;
  pinned: boolean;
  hoverTimer?: ReturnType<typeof setTimeout>;
  hideTimer?: ReturnType<typeof setTimeout>;
}

export function initSiteNav(): void {
  const nav = document.querySelector<HTMLElement>("[data-site-nav]");
  if (!nav) return;
  const groups: Group[] = [];
  nav.querySelectorAll<HTMLElement>("[data-nav-group]").forEach((el) => {
    const btn = el.querySelector<HTMLButtonElement>("[data-nav-toggle]");
    const panel = el.querySelector<HTMLElement>("[data-nav-panel]");
    if (btn && panel) groups.push({ el, btn, panel, pinned: false });
  });

  const desktop = matchMedia("(min-width: 1024px)");
  const hover = matchMedia("(hover: hover) and (pointer: fine)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const clearHover = (g: Group) => { clearTimeout(g.hoverTimer); };

  const close = (g: Group, focusToggle = false, instant = false) => {
    clearHover(g);
    g.pinned = false;
    if (focusToggle) g.btn.focus();
    const wasOpen = g.btn.getAttribute("aria-expanded") === "true";
    g.btn.setAttribute("aria-expanded", "false");
    g.panel.inert = true;
    delete g.panel.dataset.navOpen;
    if (instant || reduced.matches) {
      clearTimeout(g.hideTimer);
      g.panel.hidden = true;
    } else if (wasOpen) {
      // Keep the closing panel visible for the fade, but remove its links from interaction now.
      g.hideTimer = setTimeout(() => { g.panel.hidden = true; }, 200);
    }
  };
  const open = (g: Group) => {
    clearHover(g);
    clearTimeout(g.hideTimer);
    for (const other of groups) if (other !== g) close(other);
    g.btn.setAttribute("aria-expanded", "true");
    g.panel.hidden = false;
    g.panel.inert = false;
    // Establish the closed style after removing display:none so CSS can transition into view.
    getComputedStyle(g.panel).opacity;
    g.panel.dataset.navOpen = "";
  };

  for (const g of groups) {
    g.btn.hidden = false;
    g.panel.inert = true;
    g.btn.addEventListener("click", (e) => {
      const expanded = g.btn.getAttribute("aria-expanded") === "true";
      // A mouse click pins a hover-open panel; a second click or a keyboard toggle closes it.
      if (expanded && (g.pinned || e.detail === 0)) close(g);
      else { open(g); g.pinned = true; }
    });
    g.el.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse" || !desktop.matches || !hover.matches) return;
      clearHover(g);
      if (g.btn.getAttribute("aria-expanded") !== "true") open(g);
    });
    g.el.addEventListener("pointerleave", (e) => {
      if (e.pointerType !== "mouse" || g.pinned || g.el.contains(document.activeElement)) return;
      clearHover(g);
      g.hoverTimer = setTimeout(() => close(g), 120);
    });
    g.el.addEventListener("focusout", (e) => {
      const next = e.relatedTarget as Node | null;
      if (next && !g.el.contains(next)) close(g);
    });
  }

  // Esc closes the open panel wherever focus is, including <body>: Safari and Firefox leave
  // focus there after a click. Focus returns to the toggle only if it was inside that group.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    for (const g of groups) {
      if (g.btn.getAttribute("aria-expanded") !== "true") continue;
      e.preventDefault();
      close(g, g.el.contains(document.activeElement));
    }
  });

  document.addEventListener("click", (e) => {
    for (const g of groups) if (!g.el.contains(e.target as Node)) close(g);
  });
  desktop.addEventListener("change", (m) => {
    if (!m.matches) for (const g of groups) close(g, false, true);
  });
  reduced.addEventListener("change", (m) => {
    if (m.matches) for (const g of groups) {
      if (g.btn.getAttribute("aria-expanded") !== "true") close(g, false, true);
    }
  });
}
