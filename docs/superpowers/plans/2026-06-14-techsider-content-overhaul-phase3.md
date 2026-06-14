# Techsider Content Overhaul — Phase 3 (canned interactive demo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the centerpiece proof artifact — a client-side, canned interactive RAG demo that replays a real, grounded retrieval interaction over a public APRA document, with citations, a trace/evals panel, and an honest abstention.

**Architecture:** A `Demo.astro` section renders a server-side **static transcript fallback** (works with no JS) plus an empty animation stage. A vanilla-TS engine (`src/scripts/demo.ts`), lazy-initialised via `IntersectionObserver`, swaps the fallback for an animated replay built from a single typed data module (`src/lib/demoScript.ts`). No backend, no live model, no framework, no new dependencies.

**Tech Stack:** Astro 5.18, Tailwind v4, vanilla TypeScript (bundled by Vite via an Astro `<script>`).

---

## Verification model (read first — DIFFERENT from Phases 1 & 2)

This phase ships **interactive JavaScript**, so **a green build does NOT prove it works.** Per task the gate is still `npm run build`, but the acceptance task (Task 4) **requires real browser QA** — drive the page in a headless/real browser (the `browse` skill, or manually) and confirm the animation, citation clicks, trace toggle, abstention, replay, the no-JS fallback, reduced-motion, and keyboard all behave. Do not call Phase 3 done on build-pass alone.

Per-task loop: edit → `npm run build` (no errors) → (Tasks 2–3) open `npm run dev` and watch the section → commit. Commit messages end with:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

**Branch:** continue on `content-overhaul`.

**Design tokens** (`src/styles/global.css`): `bg`, `bg-elev`, `bg-deep`, `text`, `text-mute`, `text-dim`, `accent`, `accent-ink`, `border`, `border-soft`; `font-serif`, `font-sans`. No raw hex.

**CONTENT VERIFICATION GATE:** The demo asserts a real regulatory fact (CPS 230 ¶32 / ¶37). The text in `demoScript.ts` is transcribed verbatim from APRA's Prudential Handbook, but — like the Phase 2 posts — **the branch must not merge to `main` until the user confirms the regulatory content.** The persistent "Recorded illustrative demo" badge and the "public reference data" corpus label are **mandatory and must never be removed or call the demo "live".**

**Existing client-script pattern:** `src/components/HeroScene.astro` already uses an Astro `<script>` that imports a module (Three.js). We follow the same pattern: `Demo.astro` has a `<script>` importing `../scripts/demo`.

---

## File structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/demoScript.ts` | **Create** | Typed, grounded scripted transcript (the single source of truth) |
| `src/components/Demo.astro` | **Create** | Section markup: heading, persistent badge, corpus label, SSR static-transcript fallback, empty animation stage, sources panel, trace/evals `<details>`, replay button, styles, client `<script>` |
| `src/scripts/demo.ts` | **Create** | The replay engine: lazy-init, animation, citation/trace interactivity, reduced-motion + no-JS handling, ARIA |
| `src/pages/index.astro` | Modify | Insert `<Demo />` between `<Industries />` and `<Insights />` |

---

## Task 1: The grounded transcript data module

Pure typed data — the verbatim CPS 230 text, the retrieved chunks, the answer segments with citation refs, the trace, evals, and the abstention turn. No UI.

**Files:**
- Create: `src/lib/demoScript.ts`

- [ ] **Step 1: Create the data module**

Create `src/lib/demoScript.ts` with exactly:

```ts
// Scripted transcript for the canned RAG demo. The source text is transcribed
// verbatim from APRA's public Prudential Standard CPS 230 (handbook.apra.gov.au).
// This is illustrative reference data — not a record of client work.

export interface Chunk {
  /** citation number this chunk maps to, or 0 for an uncited (distractor) candidate */
  cite: number;
  /** cosine/RRF similarity score 0..1 */
  score: number;
  snippet: string;
}

export interface AnswerSegment {
  text: string;
  /** citation number to attach as a chip after this segment */
  cite?: number;
}

export interface Source {
  cite: number;
  label: string;
  /** exact verbatim source text */
  text: string;
}

export interface TraceStep {
  label: string;
  detail: string;
  ms: number;
}

export interface Evals {
  groundedness: string;
  faithfulness: string;
  recall: string;
}

export interface Turn {
  question: string;
  retrieved: Chunk[];
  answer: AnswerSegment[];
  sources: Source[];
  trace: TraceStep[];
  evals: Evals;
  abstained?: boolean;
}

export interface DemoScript {
  doc: string;
  turns: Turn[];
}

export const demoScript: DemoScript = {
  doc: "Prudential Standard CPS 230 — Operational Risk Management · APRA (public reference data)",
  turns: [
    {
      question: "What are our incident-notification timeframes under CPS 230?",
      retrieved: [
        {
          cite: 1,
          score: 0.91,
          snippet:
            "…must notify APRA as soon as possible, and not later than 72 hours, after becoming aware of an operational risk incident…",
        },
        {
          cite: 2,
          score: 0.74,
          snippet:
            "Critical operations are processes…which, if disrupted beyond tolerance levels, would have a material adverse impact…",
        },
        { cite: 0, score: 0.39, snippet: "(business continuity — tolerance levels for critical operations)" },
        { cite: 0, score: 0.31, snippet: "(roles and responsibilities of the Board)" },
      ],
      answer: [
        { text: "Under CPS 230, an operational risk incident must be notified to APRA " },
        {
          text:
            "as soon as possible, and no later than 72 hours, after you become aware of it — where the incident is likely to have a material financial impact or a material impact on your ability to maintain critical operations",
          cite: 1,
        },
        { text: ". " },
        {
          text:
            "“Critical operations” here means processes that, if disrupted beyond tolerance levels, would have a material adverse impact on your depositors, policyholders or other customers, or on your role in the financial system",
          cite: 2,
        },
        { text: "." },
      ],
      sources: [
        {
          cite: 1,
          label: "CPS 230 · Operational risk incidents · ¶32",
          text:
            "An APRA-regulated entity must notify APRA as soon as possible, and not later than 72 hours, after becoming aware of an operational risk incident that it determines to be likely to have a material financial impact or a material impact on the ability of the entity to maintain its critical operations.",
        },
        {
          cite: 2,
          label: "CPS 230 · Definitions · ¶37",
          text:
            "Critical operations are processes undertaken by an APRA-regulated entity or its service provider which, if disrupted beyond tolerance levels, would have a material adverse impact on its depositors, policyholders, beneficiaries or other customers, or its role in the financial system.",
        },
      ],
      trace: [
        { label: "Retrieve", detail: "hybrid (BM25 + dense), k=4, reciprocal-rank fusion", ms: 38 },
        { label: "Rerank", detail: "cross-encoder, keep top 2", ms: 21 },
        { label: "Generate", detail: "grounded prompt, cite-as-you-write", ms: 1180 },
      ],
      evals: {
        groundedness: "pass — every claim carries a citation",
        faithfulness: "0.98",
        recall: "2 / 2 relevant clauses in top-k",
      },
    },
    {
      question: "And what's the financial penalty if we miss the 72-hour deadline?",
      retrieved: [
        { cite: 0, score: 0.34, snippet: "…notify APRA as soon as possible, and not later than 72 hours…" },
      ],
      answer: [
        {
          text:
            "That isn't stated in the provided documents. CPS 230 sets the 72-hour notification obligation, but the excerpts here don't specify any financial penalty for late notification — so I won't guess. Escalating to a human, with the relevant clause attached.",
        },
      ],
      sources: [],
      trace: [
        { label: "Retrieve", detail: "hybrid (BM25 + dense), k=4", ms: 35 },
        { label: "Abstain", detail: "top score 0.34 < grounding threshold 0.60 → refuse", ms: 2 },
      ],
      evals: {
        groundedness: "pass — abstained, no unsupported claim",
        faithfulness: "n/a — no answer generated",
        recall: "no supporting clause in corpus",
      },
      abstained: true,
    },
  ],
};
```

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: completes with no errors (TypeScript compiles; module is unused for now).

- [ ] **Step 3: Commit**

```bash
git add src/lib/demoScript.ts
git commit -m "feat: grounded scripted-transcript data for the RAG demo"
```

---

## Task 2: Demo section + SSR static fallback

Render the section, the persistent honesty badge, the corpus label, the full **static transcript** (the no-JS/reduced-motion fallback — fully readable proof), the sources panel, the trace/evals `<details>`, an (initially hidden) empty animation stage, and a hidden replay button. **No client `<script>` yet** (that arrives in Task 3, so this task still builds). Wire it into the page.

**Files:**
- Create: `src/components/Demo.astro`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Create Demo.astro**

Create `src/components/Demo.astro` with exactly:

```astro
---
import { demoScript } from "../lib/demoScript";
const [main, abstain] = demoScript.turns;
const transcript = [main, abstain];
---
<section id="demo" class="px-6 py-24 md:py-32 border-b border-border">
  <div class="max-w-5xl mx-auto">
    <p class="text-xs uppercase tracking-[0.2em] text-accent font-medium mb-4">See it work</p>
    <h2 class="font-serif font-normal text-3xl md:text-4xl leading-[1.15] text-text max-w-[26ch] mb-4">
      Production RAG, doing the unglamorous part.
    </h2>
    <p class="text-text-mute text-base leading-relaxed max-w-[58ch] mb-6">
      A recorded walkthrough of a retrieval system answering a regulated question — with citations you can open, a visible trace, and an honest refusal when the answer isn't in the source.
    </p>

    <p class="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-text-dim border border-border rounded-full px-3 py-1.5 mb-6">
      <span class="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true"></span>
      Recorded illustrative demo — runs entirely in your browser, no live model or backend
    </p>

    <div class="rounded-xl border border-border bg-bg-elev overflow-hidden" data-demo-root>
      <div class="px-4 py-2.5 border-b border-border text-[11px] text-text-dim bg-bg-deep/40">
        Source corpus: {demoScript.doc}
      </div>

      <div class="grid md:grid-cols-[1fr_18rem]">
        <div class="p-5 md:p-6 min-h-[18rem]">
          <div data-demo-static>
            {transcript.map((turn) => (
              <div class="mb-6 last:mb-0">
                <p class="text-[11px] uppercase tracking-[0.14em] text-text-dim mb-1">Analyst</p>
                <p class="text-text font-medium mb-3">{turn.question}</p>
                <p class="text-[11px] uppercase tracking-[0.14em] text-text-dim mb-1">
                  {turn.abstained ? "Assistant — abstained" : "Assistant"}
                </p>
                <p class="text-text-mute text-sm leading-relaxed">
                  {turn.answer.map((seg) => (
                    <Fragment>
                      {seg.text}
                      {seg.cite ? (
                        <a href={`#demo-src-${seg.cite}`} class="text-accent align-super text-[10px] no-underline ml-0.5">[{seg.cite}]</a>
                      ) : null}
                    </Fragment>
                  ))}
                </p>
              </div>
            ))}
          </div>

          <div data-demo-stage hidden aria-live="polite"></div>

          <div class="mt-5">
            <button type="button" data-demo-replay hidden
              class="text-xs font-semibold bg-accent text-accent-ink px-3 py-1.5 rounded hover:opacity-90 transition-opacity">
              ▶ Replay
            </button>
          </div>
        </div>

        <aside class="border-t md:border-t-0 md:border-l border-border p-5 md:p-6 bg-bg-deep/30" data-demo-sources>
          <p class="text-[11px] uppercase tracking-[0.14em] text-text-dim mb-3">Sources</p>
          {main.sources.map((s) => (
            <div id={`demo-src-${s.cite}`} data-demo-src={s.cite} class="mb-4 last:mb-0 scroll-mt-24 rounded-md -mx-2 px-2 py-1.5 transition-colors">
              <p class="text-[11px] text-accent font-semibold mb-1">[{s.cite}] {s.label}</p>
              <p class="text-text-dim text-xs leading-relaxed">{s.text}</p>
            </div>
          ))}
          <p class="text-[10px] text-text-dim/70 mt-4 leading-relaxed">
            Public reference data. Your engagement runs on your own corpus and infrastructure.
          </p>
        </aside>
      </div>

      <details class="border-t border-border px-5 md:px-6 py-3" data-demo-trace>
        <summary class="cursor-pointer text-text-mute text-xs uppercase tracking-[0.14em]">Trace &amp; evals</summary>
        <div class="mt-3 grid sm:grid-cols-2 gap-5">
          <div>
            <p class="text-[11px] uppercase tracking-[0.14em] text-text-dim mb-2">Pipeline</p>
            <ul class="space-y-1.5">
              {main.trace.map((step) => (
                <li class="text-xs text-text-mute flex justify-between gap-3">
                  <span><span class="text-text">{step.label}</span> — {step.detail}</span>
                  <span class="text-text-dim tabular-nums whitespace-nowrap">{step.ms} ms</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p class="text-[11px] uppercase tracking-[0.14em] text-text-dim mb-2">Evals</p>
            <ul class="space-y-1.5 text-xs text-text-mute">
              <li>Groundedness: <span class="text-text">{main.evals.groundedness}</span></li>
              <li>Faithfulness: <span class="text-text">{main.evals.faithfulness}</span></li>
              <li>Retrieval recall: <span class="text-text">{main.evals.recall}</span></li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Wire Demo into the page (between Industries and Insights)**

In `src/pages/index.astro`, import `Demo` and place it between `<Industries />` and `<Insights />`. The frontmatter import list and body become:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import Nav from "../components/Nav.astro";
import Hero from "../components/Hero.astro";
import TrustStrip from "../components/TrustStrip.astro";
import Services from "../components/Services.astro";
import Approach from "../components/Approach.astro";
import WhyUs from "../components/WhyUs.astro";
import Industries from "../components/Industries.astro";
import Demo from "../components/Demo.astro";
import Insights from "../components/Insights.astro";
import Faq from "../components/Faq.astro";
import Contact from "../components/Contact.astro";
---

<BaseLayout>
  <Nav />
  <Hero />
  <TrustStrip />
  <Services />
  <Approach />
  <WhyUs />
  <Industries />
  <Demo />
  <Insights />
  <Faq />
  <Contact />
</BaseLayout>
```

- [ ] **Step 3: Build gate**

Run: `npm run build`
Expected: completes with no errors.

- [ ] **Step 4: Visual check**

`npm run dev` → scroll to the Demo section. Confirm the static transcript reads correctly (both turns including the abstention), the badge and corpus label show, the Sources panel lists ¶32 and ¶37 with verbatim text, the citation `[1]`/`[2]` anchors jump to the right source, and "Trace & evals" expands. The stage and Replay button are hidden (no engine yet).

- [ ] **Step 5: Commit**

```bash
git add src/components/Demo.astro src/pages/index.astro
git commit -m "feat: demo section with SSR static-transcript fallback; wire into page"
```

---

## Task 3: The replay engine

Create the engine and attach it. It lazy-inits on scroll, hides the static fallback, animates the replay from the data, wires citation chips and source highlighting, reveals the trace, and supports replay. Honors `prefers-reduced-motion` (instant final state) and absent `IntersectionObserver` (init immediately).

**Files:**
- Create: `src/scripts/demo.ts`
- Modify: `src/components/Demo.astro` (add the `<script>` and the stage `<style>`)

- [ ] **Step 1: Create the engine**

Create `src/scripts/demo.ts` with exactly:

```ts
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
```

- [ ] **Step 2: Attach the engine and add stage styles in Demo.astro**

In `src/components/Demo.astro`, add a client `<script>` and a `<style>` block at the very end of the file (after the closing `</section>`). Append exactly:

```astro
<script>
  import { initDemo } from "../scripts/demo";
  initDemo();
</script>

<style>
  :global([data-demo-stage] .demo-turn) { margin-bottom: 1.5rem; }
  :global([data-demo-stage] .demo-role) {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--color-text-dim);
    margin-bottom: 0.25rem;
  }
  :global([data-demo-stage] .demo-q) { color: var(--color-text); font-weight: 500; margin-bottom: 0.75rem; }
  :global([data-demo-stage] .demo-a) { color: var(--color-text-mute); font-size: 0.875rem; line-height: 1.7; }
  :global([data-demo-stage] .demo-retrieve) {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 0.6rem 0.75rem;
    margin-bottom: 0.9rem;
    background: var(--color-bg-deep);
  }
  :global([data-demo-stage] .demo-chunk) {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
    margin-top: 0.4rem;
    font-size: 0.75rem;
  }
  :global([data-demo-stage] .demo-chunk-score) {
    font-variant-numeric: tabular-nums;
    color: var(--color-accent);
    font-weight: 600;
    flex-shrink: 0;
  }
  :global([data-demo-stage] .demo-chunk-text) { color: var(--color-text-dim); }
  :global(.demo-cite) {
    color: var(--color-accent);
    font-size: 10px;
    vertical-align: super;
    margin-left: 1px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
  }
  :global(.demo-cite:hover) { text-decoration: underline; }
  :global([data-demo-src].demo-src-active) {
    background: color-mix(in srgb, var(--color-accent) 14%, transparent);
    box-shadow: inset 2px 0 0 var(--color-accent);
  }
</style>
```

- [ ] **Step 3: Build gate**

Run: `npm run build`
Expected: completes with no errors (Vite bundles `src/scripts/demo.ts`).

- [ ] **Step 4: Visual check (dev)**

`npm run dev` → scroll the Demo into view. Confirm: the static block is replaced by the animated stage; the question types, the retrieve panel reveals 4 chunks with scores, the answer streams with `[1]`/`[2]` chips, the abstention turn plays, the trace auto-opens, clicking a chip highlights the matching source, and Replay re-runs it.

- [ ] **Step 5: Commit**

```bash
git add src/scripts/demo.ts src/components/Demo.astro
git commit -m "feat: canned RAG demo replay engine (animation, citations, trace, replay)"
```

---

## Task 4: Acceptance pass — BROWSER QA REQUIRED (verification only)

A green build is not sufficient for this phase. Verify behaviour in a real browser.

- [ ] **Step 1: Clean build + preview**

Run: `npm run build` then `npm run preview`. Confirm no errors and the home page serves.

- [ ] **Step 2: Interactive QA in a real browser** (use the `browse` skill or a manual browser)

On the served page, scroll to the Demo and confirm, in order: the framing/heading + persistent badge are visible; the question types out; the retrieve panel shows 4 chunks **with scores and k=4**; the answer streams with inline `[1]`/`[2]` chips; clicking `[1]` highlights ¶32 and `[2]` highlights ¶37 in the Sources panel; the second turn shows the **abstention** ("isn't stated… escalating to a human"); the Trace & evals panel shows the pipeline steps + latencies + eval lines; **Replay** restarts the sequence.

- [ ] **Step 3: Fallback + accessibility checks**

- **No-JS:** disable JavaScript and reload — confirm the full static transcript, citations (as anchor jumps), sources, and trace are all present and readable (proof survives).
- **Reduced motion:** enable "reduce motion" at the OS/browser level and reload — confirm the demo shows the final state without typing animation and is still interactive.
- **Keyboard:** Tab to the citation chips and Replay button and activate them with Enter/Space; confirm the `<details>` summary is keyboard-toggleable.
- **ARIA:** confirm `[data-demo-stage]` carries `aria-live="polite"`.

- [ ] **Step 4: Content + honesty + performance**

- Confirm the Sources panel text matches CPS 230 ¶32 and ¶37 **verbatim**, and the corpus is labelled "public reference data".
- Confirm the persistent badge is present and the word **"live" appears nowhere** in the section.
- Confirm the demo is **lazy-initialised** (the engine only starts on scroll-in via IntersectionObserver) and does not regress hero LCP — spot-check with Lighthouse/`web-perf` that LCP stays sub-2s on mobile.

- [ ] **Step 5: Scope + deps**

Confirm no new npm dependency was added (`git diff main...HEAD -- package.json` shows only Phase 2's `@astrojs/rss`). No backend, no network calls in `demo.ts`.

- [ ] **Step 6: Flag the content gate**

Report that Phase 3 is built and browser-verified, but — like the Phase 2 posts — the demo asserts regulatory content (CPS 230) and **must not merge to `main` until the user has confirmed it.**

---

## Self-review (plan author)

**Spec coverage (design spec §7 + demo_spec):**
- Client-side `Demo.astro` + deferred script + scripted-transcript module; no backend/framework → Tasks 1–3 ✓
- State machine `idle → asking → retrieving → answering → done`, play/replay → engine `play()`/`renderTurn()` + Replay button ✓
- 5–7 step flow: framing badge → retrieve w/ scores + k → streamed answer → inline `[n]` chips → source highlight → trace/evals → abstention → reset → Tasks 2–3 ✓
- Corpus = real public APRA CPS 230 text, labelled public reference data; answer claims match cited source verbatim → Task 1 data (¶32/¶37) ✓
- Honest abstention beat → turn 2 (`abstained`) ✓
- Persistent "Recorded illustrative demo… no live model or backend" badge + reframing line; never "live" → Demo.astro badge + Task 4 Step 4 ✓
- Lazy-load via IntersectionObserver; reduced-motion fallback; no-JS fallback; keyboard; ARIA live → engine + Demo.astro static block + Task 4 Step 3 ✓
- Placed after Industries, before Insights → Task 2 wiring ✓
- User-verified before merge → CONTENT VERIFICATION GATE + Task 4 Step 6 ✓

**Placeholder scan:** No TBD/TODO. Full code for the data module, component, and engine is provided. No new deps.

**Type/identifier consistency:** `Turn`/`Chunk`/`Source`/`AnswerSegment`/`Evals` defined in Task 1 and imported in Task 3 (`import { demoScript, type Turn }`). DOM hooks are consistent across Demo.astro and demo.ts: `[data-demo-root]`, `[data-demo-static]`, `[data-demo-stage]`, `[data-demo-replay]`, `[data-demo-trace]`, `[data-demo-src]`, `[data-demo-sources]`, anchor ids `#demo-src-<cite>`. Engine CSS classes (`demo-turn`, `demo-role`, `demo-q`, `demo-a`, `demo-retrieve`, `demo-chunk`, `demo-chunk-score`, `demo-chunk-text`, `demo-cite`, `demo-src-active`) are all defined in the Task 3 `<style>` block. Import paths: `Demo.astro`→`../scripts/demo`, `demo.ts`→`../lib/demoScript` (matches `src/components`, `src/scripts`, `src/lib`).
```
