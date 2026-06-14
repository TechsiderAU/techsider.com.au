import { demoScript, type Turn } from "../lib/demoScript";

const REDUCED =
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, REDUCED ? 0 : ms));

export function initDemo(): void {
  const root = document.querySelector<HTMLElement>("[data-demo-root]");
  if (!root) return;
  const stage = root.querySelector<HTMLElement>("[data-demo-stage]");
  const staticEl = root.querySelector<HTMLElement>("[data-demo-static]");
  const replay = root.querySelector<HTMLButtonElement>("[data-demo-replay]");
  const trace = root.querySelector<HTMLDetailsElement>("[data-demo-trace]");
  if (!stage || !staticEl || !replay) return;

  let started = false;
  let running = false;

  const highlightSource = (cite: number) => {
    root.querySelectorAll<HTMLElement>("[data-demo-src]").forEach((s) => {
      const on = s.getAttribute("data-demo-src") === String(cite);
      s.classList.toggle("demo-src-active", on);
      if (on) s.scrollIntoView({ block: "nearest", behavior: REDUCED ? "auto" : "smooth" });
    });
  };

  // Enhance the static-fallback citation anchors: highlight instead of jump.
  staticEl.querySelectorAll<HTMLAnchorElement>("a[href^='#demo-src-']").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      highlightSource(Number(a.getAttribute("href")!.replace("#demo-src-", "")));
    });
  });

  const citeChip = (cite: number): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "demo-cite";
    b.textContent = `[${cite}]`;
    b.setAttribute("aria-label", `Show source ${cite}`);
    b.addEventListener("click", () => highlightSource(cite));
    return b;
  };

  async function typeInto(node: HTMLElement, text: string) {
    if (REDUCED) {
      node.append(document.createTextNode(text));
      return;
    }
    const tn = document.createTextNode("");
    node.append(tn);
    for (let i = 0; i < text.length; i++) {
      tn.textContent += text[i];
      if (i % 2 === 0) await wait(11);
    }
  }

  async function renderTurn(turn: Turn, animated: boolean) {
    const block = el("div", "demo-turn");
    stage!.append(block);

    block.append(el("p", "demo-role", "Analyst"));
    const q = el("p", "demo-q");
    block.append(q);
    if (animated) await typeInto(q, turn.question);
    else q.textContent = turn.question;

    const retr = el("div", "demo-retrieve");
    retr.append(el("p", "demo-role", `Retrieving — k=${turn.retrieved.length}`));
    block.append(retr);
    await wait(animated ? 320 : 0);
    for (const c of turn.retrieved) {
      const row = el("div", "demo-chunk");
      row.append(el("span", "demo-chunk-score", c.score.toFixed(2)));
      row.append(el("span", "demo-chunk-text", c.snippet));
      retr.append(row);
      await wait(animated ? 160 : 0);
    }

    block.append(el("p", "demo-role", turn.abstained ? "Assistant — abstained" : "Assistant"));
    const a = el("p", "demo-a");
    block.append(a);
    for (const seg of turn.answer) {
      if (animated) await typeInto(a, seg.text);
      else a.append(document.createTextNode(seg.text));
      if (seg.cite) a.append(citeChip(seg.cite));
    }
    await wait(animated ? 240 : 0);
  }

  async function play(animated: boolean) {
    if (running) return;
    running = true;
    replay!.disabled = true;
    stage!.innerHTML = "";
    root.querySelectorAll("[data-demo-src]").forEach((s) => s.classList.remove("demo-src-active"));
    for (const turn of demoScript.turns) {
      await renderTurn(turn, animated);
      await wait(animated ? 380 : 0);
    }
    if (trace && animated) trace.open = true;
    replay!.disabled = false;
    running = false;
  }

  const start = () => {
    if (started) return;
    started = true;
    staticEl!.hidden = true;
    stage!.hidden = false;
    replay!.hidden = false;
    void play(!REDUCED);
  };

  replay.addEventListener("click", () => void play(!REDUCED));

  if (typeof IntersectionObserver === "undefined") {
    start();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          start();
          io.disconnect();
          break;
        }
      }
    },
    { rootMargin: "0px 0px -20% 0px" },
  );
  io.observe(root);
}
