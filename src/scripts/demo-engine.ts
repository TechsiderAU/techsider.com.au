// The canned-demo replay engine (spec §6.5, §8.8, §9.1), generic over a renderer per demo kind.
// It generalises the Phase 0 engine (the old src/scripts/demo.ts) and keeps each of its
// accessibility guarantees:
// - The controls ([data-demo-controls]: Pause/Resume, "Skip to result", Replay) sit before the
//   stage in DOM order and ship hidden; a run reveals them. Replay is never disabled. Pause and
//   Skip are disabled only when a run ends, and if either held focus, focus moves to Replay first,
//   so it never drops to <body>.
// - The renderer types into the stage ([data-demo-stage]), which stays aria-hidden and is never a
//   live region. Each finished step is appended once, as a <p data-log="step">, to the visually
//   hidden polite log ([data-demo-log]); the log also takes one line when a run starts, when it is
//   paused or resumed, and when it ends. After each step line the run holds for STEP_GAP of
//   playback time, so a screen reader can finish one line before the next lands.
// - The final state is the frame's static transcript ([data-demo-transcript], DemoFrame's
//   `transcript` slot), the same content the replay types out. A run hides it and shows the stage
//   in its place, holding the transcript's height so the page doesn't jump; a finished or skipped
//   run hides the stage and shows the transcript again. Skip abandons the run at once, so the steps
//   it skipped are never announced.
// - Replay abandons the current run (its renderer stops drawing into the stage), clears the stage
//   and the log, and starts again.
// - Under prefers-reduced-motion nothing runs: the static transcript stays, and the controls stay
//   hidden. A run doesn't start on its own under someone already reading the transcript either:
//   when keyboard focus is inside it, or once the visitor has clicked in the frame or moved focus
//   into it (a screen reader's browse mode can activate a link and leave DOM focus where it was).
//   The controls then appear in the ended state, with Replay ready.
// bootDemos() starts each demo when its frame scrolls into view, loading that kind's renderer
// (and its data) only then, as its own chunk (spec §11.4).
import { createPlayback, type Playback } from "./playback.ts";

export interface DemoStep {
  /** The line the log announces once this step has finished drawing. */
  announce: string;
}

export interface DemoRenderer {
  /** The log's first line for each run: what is about to play and how to stop it. */
  intro: string;
  /**
   * Draws one run into the stage (emptied and aria-hidden when it is called), yielding once per
   * finished step. It waits only through `pb.wait()`, so Pause holds it. Once `pb.cancelled` is
   * true it must draw nothing more into the stage and return.
   */
  steps(stage: HTMLElement, pb: Playback): AsyncGenerator<DemoStep, void, undefined>;
}

/** The engine's own log lines; the renderer supplies the intro and the steps. */
export const LOG = {
  paused: "Replay paused.",
  resumed: "Replay resumed.",
  finished: "Replay finished. The full transcript is shown.",
  skipped: "Skipped to the result. The full transcript is shown.",
} as const;

/** The least playback time between two step announcements, in ms: about one short line of speech (Review Focus 1). */
export const STEP_GAP = 2500;

export type LogKind = "start" | "step" | "control" | "end";

export interface DemoHandle {
  /** Starts the first run. Calling it again does nothing: after that, Replay restarts runs. */
  start(): void;
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The frames a visitor has used before their run could start: clicked in (with a pointer, or a
// screen reader activating a link from its browse mode) or moved focus into. A run never starts on
// its own in one of them; Replay still starts one.
const watched = new WeakSet<HTMLElement>();
const used = new WeakSet<HTMLElement>();

function watchUse(frame: HTMLElement): void {
  if (watched.has(frame)) return;
  watched.add(frame);
  const mark = (): void => {
    used.add(frame);
  };
  frame.addEventListener("click", mark);
  frame.addEventListener("focusin", mark);
}

function part<T extends HTMLElement>(scope: HTMLElement, hook: string): T {
  const found = scope.querySelector<T>(`[${hook}]`);
  if (found === null) throw new Error(`mountDemo: no [${hook}] in the demo`);
  return found;
}

/**
 * Wires one demo: `root` is its [data-demo-root], inside a DemoFrame whose transcript slot holds
 * the static transcript. Nothing runs until start().
 */
export function mountDemo(
  root: HTMLElement,
  renderer: DemoRenderer,
  options: { reducedMotion?: boolean } = {},
): DemoHandle {
  const reducedMotion = options.reducedMotion ?? prefersReducedMotion();
  const frame = root.closest<HTMLElement>("[data-demo-frame]");
  if (frame === null) throw new Error("mountDemo: the demo root is not inside a [data-demo-frame]");
  watchUse(frame);
  const transcript = part(frame, "data-demo-transcript");
  const controls = part(root, "data-demo-controls");
  const pauseBtn = part<HTMLButtonElement>(root, "data-demo-pause");
  const skipBtn = part<HTMLButtonElement>(root, "data-demo-skip");
  const replayBtn = part<HTMLButtonElement>(root, "data-demo-replay");
  const stage = part(root, "data-demo-stage");
  const log = part(root, "data-demo-log");

  let current: Playback | null = null;
  let started = false;

  const say = (text: string, kind: LogKind): void => {
    const line = document.createElement("p");
    line.setAttribute("data-log", kind);
    line.textContent = text;
    log.append(line);
  };
  const setPauseLabel = (paused: boolean): void => {
    pauseBtn.textContent = paused ? "Resume" : "Pause";
  };

  // The ended state: the static transcript is the result. Disabling a focused button would drop
  // keyboard focus to <body>, so focus moves to Replay (never disabled) first.
  const end = (): void => {
    const hadFocus = document.activeElement === pauseBtn || document.activeElement === skipBtn;
    stage.hidden = true;
    stage.style.minHeight = "";
    transcript.hidden = false;
    setPauseLabel(false);
    pauseBtn.disabled = true;
    skipBtn.disabled = true;
    if (hadFocus) replayBtn.focus();
  };

  async function play(): Promise<void> {
    current?.cancel(); // Replay mid-run: the old run stops drawing, and its loop below returns.
    const pb = createPlayback();
    current = pb;
    // Hiding the transcript must not take keyboard focus with it (a browser that doesn't focus a
    // clicked button, such as Safari, can leave it on a citation link): Replay takes it.
    if (transcript.contains(document.activeElement)) replayBtn.focus();
    // Hold the transcript's height while the stage replaces it (measured only while it shows).
    if (!transcript.hidden) stage.style.minHeight = `${transcript.offsetHeight}px`;
    transcript.hidden = true;
    stage.replaceChildren();
    stage.hidden = false;
    log.replaceChildren();
    pauseBtn.disabled = false;
    skipBtn.disabled = false;
    setPauseLabel(false);
    say(renderer.intro, "start");
    for await (const step of renderer.steps(stage, pb)) {
      if (pb !== current || pb.cancelled) return;
      say(step.announce, "step");
      // Hold the renderer at its yield so a screen reader can finish this line before the next
      // lands. Pause holds the wait; Skip and Replay release it at once (pb.wait resolves on skip).
      await pb.wait(STEP_GAP);
      if (pb !== current || pb.cancelled) return;
    }
    if (pb !== current || pb.cancelled) return;
    end();
    say(LOG.finished, "end");
  }

  pauseBtn.addEventListener("click", () => {
    const pb = current;
    if (pb === null || pb.cancelled) return;
    if (pb.paused) {
      pb.resume();
      setPauseLabel(false);
      say(LOG.resumed, "control");
    } else {
      pb.pause();
      setPauseLabel(true);
      say(LOG.paused, "control");
    }
  });
  skipBtn.addEventListener("click", () => {
    const pb = current;
    if (pb === null || pb.cancelled) return;
    pb.cancel(); // the steps not yet drawn are never announced
    end();
    say(LOG.skipped, "end");
  });
  replayBtn.addEventListener("click", () => void play());

  return {
    start(): void {
      if (started || reducedMotion) return;
      started = true;
      controls.hidden = false;
      if (used.has(frame) || transcript.contains(document.activeElement)) {
        // Someone is reading the transcript, with the keyboard or a screen reader: leave it, and
        // offer Replay.
        end();
        return;
      }
      void play();
    },
  };
}

export type DemoLoader = () => Promise<DemoRenderer>;

function whenVisible(el: HTMLElement, go: () => void): void {
  if (typeof IntersectionObserver === "undefined") {
    go();
    return;
  }
  const observe = (): void => {
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        go();
      },
      { rootMargin: "0px 0px -20% 0px" },
    );
    io.observe(el);
  };
  // A page opened at an anchor (/solutions/<id>/#faq) makes the browser's own scroll there with the
  // load event (tabs.ts's revealWhenSettled() waits for it too). Observed any earlier, a hero frame
  // can count as in view at the top of the page for a moment, and start a replay nobody scrolled to.
  if (document.readyState === "complete") observe();
  else addEventListener("load", observe, { once: true });
}

/**
 * Starts every [data-demo-root] on the page once its frame scrolls into view: a demo page's hero
 * at once, the Home band and a solution hero when the visitor reaches them. The kind's loader
 * (by data-demo-kind) runs only then. Under prefers-reduced-motion nothing loads. If a loader
 * fails, the static transcript stays as it is.
 */
export function bootDemos(loaders: Record<string, DemoLoader>): void {
  if (prefersReducedMotion()) return;
  for (const root of document.querySelectorAll<HTMLElement>("[data-demo-root]")) {
    const kind = root.getAttribute("data-demo-kind") ?? "";
    const load = loaders[kind];
    if (load === undefined) throw new Error(`bootDemos: no renderer for demo kind "${kind}"`);
    const frame = root.closest<HTMLElement>("[data-demo-frame]") ?? root;
    watchUse(frame); // from the page's start: a click before the frame counts as in view counts too
    whenVisible(frame, () => {
      load()
        .then((renderer) => mountDemo(root, renderer).start())
        .catch((error: unknown) => console.error(error));
    });
  }
}
