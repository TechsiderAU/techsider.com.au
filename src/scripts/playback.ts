// Pause / skip / cancel control for the scripted demo (WCAG 2.2.2 Pause, Stop, Hide).
// DOM-free so it can be unit-tested with `node --test`.

export interface Playback {
  readonly paused: boolean;
  readonly skipped: boolean;
  readonly cancelled: boolean;
  /** Resolves after `ms` of playback time. Holds while paused; resolves immediately once skipped. */
  wait(ms: number): Promise<void>;
  pause(): void;
  resume(): void;
  /** Jump to the end: every pending and future wait resolves immediately. */
  skip(): void;
  /** Abandon this run (e.g. Replay pressed mid-run). Implies skip. */
  cancel(): void;
}

export function createPlayback(opts: { instant?: boolean } = {}): Playback {
  let paused = false;
  let skipped = opts.instant === true;
  let cancelled = false;
  let gate: Promise<void> | null = null;
  let releaseGate: (() => void) | null = null;
  const pending = new Set<() => void>();

  const sleep = (ms: number): Promise<void> =>
    new Promise<void>((resolve) => {
      if (skipped) {
        resolve();
        return;
      }
      const finish = (): void => {
        clearTimeout(timer);
        pending.delete(finish);
        resolve();
      };
      const timer = setTimeout(finish, ms);
      pending.add(finish);
    });

  const resume = (): void => {
    if (!paused) return;
    paused = false;
    const release = releaseGate;
    gate = null;
    releaseGate = null;
    release?.();
  };

  const skip = (): void => {
    skipped = true;
    for (const finish of [...pending]) finish();
    resume();
  };

  return {
    get paused() {
      return paused;
    },
    get skipped() {
      return skipped;
    },
    get cancelled() {
      return cancelled;
    },
    async wait(ms: number): Promise<void> {
      await sleep(ms);
      while (paused && !skipped && gate) await gate;
    },
    pause(): void {
      if (paused || skipped) return;
      paused = true;
      gate = new Promise<void>((resolve) => {
        releaseGate = resolve;
      });
    },
    resume,
    skip,
    cancel(): void {
      cancelled = true;
      skip();
    },
  };
}
