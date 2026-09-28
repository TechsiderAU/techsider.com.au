// Mobile menu: a native modal <dialog> (the page behind is inert) with an explicit
// Tab wrap, Esc via the dialog's cancel event, scroll lock, focus return, and
// drill-down sub-panels ("Back to menu" returns focus to the originating row).

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
}

export function initSiteMenu(): void {
  const dialog = document.querySelector<HTMLDialogElement>("[data-menu]");
  const openBtn = document.querySelector<HTMLButtonElement>("[data-menu-open]");
  const root = dialog?.querySelector<HTMLElement>("[data-menu-root]");
  if (!dialog || !openBtn || !root || typeof dialog.showModal !== "function") return;
  const panels = [...dialog.querySelectorAll<HTMLElement>("[data-menu-panel]")];
  const rowFor = (id: string) => dialog.querySelector<HTMLButtonElement>(`[data-menu-open-panel="${id}"]`);

  const showRoot = (focusTarget?: HTMLElement | null) => {
    for (const p of panels) p.hidden = true;
    root.hidden = false;
    focusTarget?.focus();
  };

  openBtn.hidden = false;
  openBtn.addEventListener("click", () => {
    showRoot();
    dialog.showModal();
    document.documentElement.classList.add("menu-open");
    openBtn.setAttribute("aria-expanded", "true");
  });

  dialog.addEventListener("close", () => {
    document.documentElement.classList.remove("menu-open");
    openBtn.setAttribute("aria-expanded", "false");
    openBtn.focus();
  });

  dialog.querySelector("[data-menu-close]")?.addEventListener("click", () => dialog.close());

  dialog.querySelectorAll<HTMLButtonElement>("[data-menu-open-panel]").forEach((row) => {
    row.addEventListener("click", () => {
      const panel = panels.find((p) => p.dataset.menuPanel === row.dataset.menuOpenPanel);
      if (!panel) return;
      root.hidden = true;
      panel.hidden = false;
      panel.querySelector<HTMLElement>("h2")?.focus();
    });
  });

  dialog.querySelectorAll<HTMLButtonElement>("[data-menu-back]").forEach((back) => {
    back.addEventListener("click", () => showRoot(rowFor(back.dataset.menuBack ?? "")));
  });

  // Clicking non-interactive content inside the menu (the logo, a gap, padding) leaves
  // focus on the <dialog> itself. Tab from there reaches the first item natively, but
  // Shift+Tab would leave the modal, so it wraps to the last item like it does from the first.
  dialog.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const items = focusables(dialog);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Following a link (including same-page anchors) closes the menu. A modifier-key or
  // non-primary click opens a new tab or window instead, so the menu stays open.
  dialog.addEventListener("click", (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((e.target as HTMLElement).closest("a[href]")) dialog.close();
  });

  matchMedia("(min-width: 1024px)").addEventListener("change", (m) => {
    if (m.matches && dialog.open) dialog.close();
  });
}
