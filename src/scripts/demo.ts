import { demoScript, type Turn } from "../lib/demoScript";
import { createPlayback, type Playback } from "./playback";

const REDUCED =
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text) n.textContent = text;
  return n;
}

export function initDemo(): void {
  const root = document.querySelector<HTMLElement>("[data-demo-root]");
  if (!root) return;
  const stage = root.querySelector<HTMLElement>("[data-demo-stage]");
  const staticEl = root.querySelector<HTMLElement>("[data-demo-static]");
  const controls = root.querySelector<HTMLElement>("[data-demo-controls]");
  const pauseBtn = root.querySelector<HTMLButtonElement>("[data-demo-pause]");
  const skipBtn = root.querySelector<HTMLButtonElement>("[data-demo-skip]");
  const replay = root.querySelector<HTMLButtonElement>("[data-demo-replay]");
  const status = root.querySelector<HTMLElement>("[data-demo-status]");
  const trace = root.querySelector<HTMLDetailsElement>("[data-demo-trace]");
  if (!stage || !staticEl || !controls || !pauseBtn || !skipBtn || !replay || !status) return;

  const total = demoScript.turns.length;
  let started = false;
  let current: Playback | null = null;

  const announce = (msg: string) => {
    status.textContent = msg;
  };
  const setPauseLabel = (paused: boolean) => {
    pauseBtn.textContent = paused ? "Resume" : "Pause";
  };

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

  // Chips are not focusable while the stage is aria-hidden; they become focusable when the run finishes.
  const citeChip = (cite: number): HTMLButtonElement => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "demo-cite";
    b.tabIndex = -1;
    b.textContent = `[${cite}]`;
    b.setAttribute("aria-label", `Show source ${cite}`);
    b.addEventListener("click", () => highlightSource(cite));
    return b;
  };

  async function typeInto(node: HTMLElement, text: string, pb: Playback) {
    const tn = document.createTextNode("");
    node.append(tn);
    for (let i = 0; i < text.length; i++) {
      if (pb.skipped) {
        tn.textContent += text.slice(i);
        return;
      }
      tn.textContent += text[i];
      if (i % 2 === 0) await pb.wait(11);
    }
  }

  async function renderTurn(turn: Turn, pb: Playback): Promise<void> {
    if (pb.cancelled) return; // Replay pressed in the pause between turns: don't append to the new run's stage
    const block = el("div", "demo-turn");
    stage!.append(block);

    block.append(el("p", "demo-role", "Analyst"));
    const q = el("p", "demo-q");
    block.append(q);
    await typeInto(q, turn.question, pb);
    if (pb.cancelled) return;

    const retr = el("div", "demo-retrieve");
    retr.append(el("p", "demo-role", `Retrieving — k=${turn.retrieved.length} · illustrative scores`));
    block.append(retr);
    await pb.wait(320);
    for (const c of turn.retrieved) {
      if (pb.cancelled) return;
      const row = el("div", "demo-chunk");
      row.append(el("span", "demo-chunk-score", c.score.toFixed(2)));
      row.append(el("span", "demo-chunk-text", c.snippet));
      retr.append(row);
      await pb.wait(160);
    }
    if (pb.cancelled) return;

    block.append(el("p", "demo-role", turn.abstained ? "Assistant — abstained" : "Assistant"));
    const a = el("p", "demo-a");
    block.append(a);
    for (const seg of turn.answer) {
      await typeInto(a, seg.text, pb);
      if (pb.cancelled) return;
      if (seg.cite) a.append(citeChip(seg.cite));
    }
    await pb.wait(240);
  }

  async function play(): Promise<void> {
    current?.cancel(); // Replay mid-run: abandon the old run; it only touches detached nodes from here on.
    const pb = createPlayback({ instant: REDUCED });
    current = pb;

    stage!.innerHTML = "";
    stage!.setAttribute("aria-hidden", "true"); // typing is visual only; progress goes to the status region
    root!.querySelectorAll("[data-demo-src]").forEach((s) => s.classList.remove("demo-src-active"));
    pauseBtn!.disabled = false;
    skipBtn!.disabled = false;
    setPauseLabel(false);
    announce(`Demo playing: ${total} questions. Use Pause or Skip to result at any time.`);

    for (let i = 0; i < total; i++) {
      await renderTurn(demoScript.turns[i], pb);
      if (pb !== current || pb.cancelled) return;
      announce(`Answer ${i + 1} of ${total} typed. Press Skip to result to read it now.`);
      await pb.wait(380);
    }
    if (pb !== current) return;

    stage!.removeAttribute("aria-hidden");
    stage!.querySelectorAll<HTMLButtonElement>(".demo-cite").forEach((b) => (b.tabIndex = 0));
    // Disabling a focused button drops keyboard focus to <body>; hand it to Replay (always enabled).
    const hadFocus = document.activeElement === pauseBtn || document.activeElement === skipBtn;
    pauseBtn!.disabled = true;
    skipBtn!.disabled = true;
    if (hadFocus) replay!.focus();
    setPauseLabel(false);
    if (trace && !REDUCED) trace.open = true;
    announce("Demo finished. The full transcript and its sources are shown.");
  }

  pauseBtn.addEventListener("click", () => {
    if (!current || current.skipped) return;
    if (current.paused) {
      current.resume();
      setPauseLabel(false);
      announce("Demo resumed.");
    } else {
      current.pause();
      setPauseLabel(true);
      announce("Demo paused.");
    }
  });
  skipBtn.addEventListener("click", () => {
    current?.skip();
    setPauseLabel(false);
  });
  replay.addEventListener("click", () => void play());

  const start = () => {
    if (started) return;
    started = true;
    staticEl.hidden = true;
    stage.hidden = false;
    controls.hidden = false;
    void play();
  };

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
