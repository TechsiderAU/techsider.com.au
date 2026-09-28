// Desktop disclosure navigation (WAI-ARIA APG "disclosure navigation with top-level links").
// Each group: a real <a> to its hub plus a separate toggle <button> for its panel.

interface Group {
  el: HTMLElement;
  btn: HTMLButtonElement;
  panel: HTMLElement;
}

export function initSiteNav(): void {
  const nav = document.querySelector<HTMLElement>("[data-site-nav]");
  if (!nav) return;
  const groups: Group[] = [];
  nav.querySelectorAll<HTMLElement>("[data-nav-group]").forEach((el) => {
    const btn = el.querySelector<HTMLButtonElement>("[data-nav-toggle]");
    const panel = el.querySelector<HTMLElement>("[data-nav-panel]");
    if (btn && panel) groups.push({ el, btn, panel });
  });

  const close = (g: Group, focusToggle = false) => {
    g.btn.setAttribute("aria-expanded", "false");
    g.panel.hidden = true;
    if (focusToggle) g.btn.focus();
  };
  const open = (g: Group) => {
    for (const other of groups) if (other !== g) close(other);
    g.btn.setAttribute("aria-expanded", "true");
    g.panel.hidden = false;
  };

  for (const g of groups) {
    g.btn.hidden = false;
    g.btn.addEventListener("click", () => (g.btn.getAttribute("aria-expanded") === "true" ? close(g) : open(g)));
    g.el.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !g.panel.hidden) {
        e.preventDefault();
        close(g, true);
      }
    });
    g.el.addEventListener("focusout", (e) => {
      const next = e.relatedTarget as Node | null;
      if (next && !g.el.contains(next)) close(g);
    });
  }

  document.addEventListener("click", (e) => {
    for (const g of groups) if (!g.el.contains(e.target as Node)) close(g);
  });
  matchMedia("(min-width: 1024px)").addEventListener("change", (m) => {
    if (!m.matches) for (const g of groups) close(g);
  });
}
