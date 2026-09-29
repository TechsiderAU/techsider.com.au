// The ① register demo's static transcript, enhanced (spec §8.8, §9.1 ①). RegisterTranscript.astro
// ships the whole demo readable without JavaScript: both registers, their exception queues, and
// every source page, each value a link to its page. This script, which runs whether or not the
// replay does (reduced motion included), turns that into the register you can check:
// - a toggle shows one register at a time (aria-pressed);
// - each value, in the register or its queue, opens its page in the side panel: the page's own text
//   from the transcript, with only that value still marked. Focus moves to the panel's title, and
//   Back returns it to the value;
// - the page list, which the panel now shows a page at a time, is hidden.
// It makes no network call: everything it shows is already in the page.

type Link = HTMLAnchorElement;

function statusTag(status: string): HTMLElement {
  const tag = document.createElement("span");
  tag.className = "rg-status";
  tag.setAttribute("data-status", status);
  const bracket = (text: string) => {
    const b = document.createElement("span");
    b.setAttribute("aria-hidden", "true");
    b.textContent = text;
    return b;
  };
  tag.append(bracket("["), status, bracket("]"));
  return tag;
}

function line(cls: string, ...children: (Node | string)[]): HTMLParagraphElement {
  const p = document.createElement("p");
  p.className = cls;
  p.append(...children);
  return p;
}

export function enhanceRegisterTranscript(root: HTMLElement): void {
  const toggle = root.querySelector<HTMLElement>("[data-register-switch]");
  const panel = root.querySelector<HTMLElement>("[data-register-panel]");
  const pages = root.querySelector<HTMLElement>("[data-register-docs]");
  const hint = panel?.querySelector<HTMLElement>("[data-register-hint]");
  const title = panel?.querySelector<HTMLElement>("[data-register-panel-title]");
  if (!toggle || !panel || !pages || !hint || !title) return;
  const registers = [...root.querySelectorAll<HTMLElement>("[data-register]")];
  const choices = [...toggle.querySelectorAll<HTMLButtonElement>("[data-register-choice]")];
  const resting = { hint: hint.cloneNode(true), title: title.textContent ?? "" };
  let opener: Link | null = null;

  const reset = (): void => {
    opener = null;
    for (const el of root.querySelectorAll("[data-register-cell][aria-current]")) el.removeAttribute("aria-current");
    title.textContent = resting.title;
    panel.replaceChildren(title, resting.hint.cloneNode(true));
  };

  const show = (id: string): void => {
    for (const r of registers) r.hidden = r.getAttribute("data-register") !== id;
    for (const b of choices) b.setAttribute("aria-pressed", String(b.getAttribute("data-register-choice") === id));
    reset();
  };

  const open = (link: Link): void => {
    const cell = link.getAttribute("data-register-cell") ?? link.getAttribute("data-register-open") ?? "";
    const [doc] = cell.split(":");
    const page = root.querySelector<HTMLElement>(`[data-register-page="${doc}:${link.dataset.page}"]`);
    const source = page?.querySelector<HTMLElement>("[data-register-page-text]");
    if (!page || !source) return;
    // The page as the transcript shows it, with every mark but this value's unwrapped.
    const text = source.cloneNode(true) as HTMLElement;
    text.removeAttribute("data-register-page-text");
    text.setAttribute("data-register-panel-text", "");
    let found = false;
    for (const mark of [...text.querySelectorAll("mark")]) {
      if ((mark.getAttribute("data-register-marks") ?? "").split(" ").includes(cell)) found = true;
      else mark.replaceWith(...mark.childNodes);
    }
    const status = link.dataset.status ?? "ok";
    const note = link.dataset.note;
    const back = document.createElement("button");
    back.type = "button";
    back.className = "rg-button";
    back.setAttribute("data-register-back", "");
    back.textContent = "Back to the register";
    back.addEventListener("click", () => opener?.focus());
    title.textContent = page.getAttribute("data-page-title") ?? "";
    const parts: Node[] = [
      title,
      line("rg-panel-meta", page.getAttribute("data-doc-template") ?? ""),
      line("rg-panel-field", `${link.dataset.label}: `, ...(status === "ok" ? [] : [statusTag(status), " "]), link.dataset.value ?? ""),
    ];
    if (note) {
      const why = line("rg-panel-note", note);
      why.setAttribute("data-register-note", "");
      parts.push(why);
    }
    if (!found) parts.push(line("rg-panel-note", "Nothing is highlighted: this value records something the page doesn't have."));
    panel.replaceChildren(...parts, text, back);
    for (const el of root.querySelectorAll("[data-register-cell][aria-current]")) el.removeAttribute("aria-current");
    root.querySelector(`[data-register-cell="${cell}"]`)?.setAttribute("aria-current", "true");
    opener = link;
    title.focus();
  };

  toggle.hidden = false;
  panel.hidden = false;
  pages.hidden = true;
  root.setAttribute("data-register-enhanced", "");
  for (const b of choices) b.addEventListener("click", () => show(b.getAttribute("data-register-choice") ?? ""));
  for (const link of root.querySelectorAll<Link>("a[data-register-cell], a[data-register-open]")) {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      open(link);
    });
  }
  show(registers[0]?.getAttribute("data-register") ?? "");
}

export function enhanceRegisterTranscripts(): void {
  for (const root of document.querySelectorAll<HTMLElement>("[data-register-transcript]")) enhanceRegisterTranscript(root);
}
