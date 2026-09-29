// The ① Document Registers replay (spec §8.8, §9.1 ①): a DemoRenderer for src/scripts/demo-engine.ts.
// It replays the frame's own static transcript (RegisterTranscript.astro), so what it shows can't
// differ from the final state, and it loads no data. Each run copies the transcript as it stands,
// with the register the toggle last chose, into the engine's aria-hidden stage: ids, links and
// buttons are disarmed, so nothing in the stage can take focus. The copy starts with every row of
// that register and every exception-queue entry hidden (visibility only, so the stage has the
// transcript's layout from the first frame and the swap back moves nothing). Then it reveals a
// row, its values one at a time, and the row's queue entries. A row with a flagged value (marked
// data-register-flagged) then yields its announcement, which the transcript carries in
// data-register-announce; the register's summary comes last and counts the rest.
import type { Playback } from "../playback.ts";
import type { DemoRenderer, DemoStep } from "../demo-engine.ts";
import { REPLAY_INTRO } from "../../lib/register.ts";

/** Pacing, in playback milliseconds: before each value, and at the end of each row. */
export const PACE = { value: 110, row: 260 } as const;

const PENDING = "rg-pending";

/** A copy of the transcript that can't take focus or clash with the page's ids. */
function disarmedCopy(transcript: HTMLElement): HTMLElement {
  const copy = transcript.cloneNode(true) as HTMLElement;
  copy.hidden = false; // the engine hides the transcript before the run starts
  copy.removeAttribute("data-register-transcript");
  copy.setAttribute("data-register-replay", "");
  for (const attr of ["id", "aria-labelledby", "tabindex"]) {
    for (const el of copy.querySelectorAll(`[${attr}]`)) el.removeAttribute(attr);
  }
  for (const link of copy.querySelectorAll("a")) link.removeAttribute("href");
  for (const button of copy.querySelectorAll<HTMLButtonElement>("button")) button.disabled = true;
  return copy;
}

export const registerRenderer: DemoRenderer = {
  intro: REPLAY_INTRO,
  async *steps(stage: HTMLElement, pb: Playback): AsyncGenerator<DemoStep, void, undefined> {
    const transcript = stage.closest("[data-demo-frame]")?.querySelector<HTMLElement>("[data-register-transcript]");
    if (!transcript) return;
    const copy = disarmedCopy(transcript);
    const register = [...copy.querySelectorAll<HTMLElement>("[data-register]")].find((r) => !r.hidden);
    if (!register) return;
    const rows = [...register.querySelectorAll<HTMLElement>("tr[data-register-row]")];
    const entries = [...register.querySelectorAll<HTMLElement>("[data-register-queue-item]")];
    for (const el of [...rows, ...entries]) el.classList.add(PENDING);
    for (const row of rows) for (const cell of row.querySelectorAll<HTMLElement>("td")) cell.classList.add(PENDING);
    stage.append(copy);
    for (const row of rows) {
      row.classList.remove(PENDING); // the document's name shows; its values follow one by one
      for (const cell of row.querySelectorAll<HTMLElement>("td")) {
        await pb.wait(PACE.value);
        if (pb.cancelled) return;
        cell.classList.remove(PENDING);
      }
      await pb.wait(PACE.row);
      if (pb.cancelled) return;
      const doc = row.getAttribute("data-register-row");
      for (const entry of entries) {
        if (entry.getAttribute("data-register-queue-item")?.startsWith(`${doc}:`)) entry.classList.remove(PENDING);
      }
      // Only a row with a flagged value gets its own line (the summary counts the rest), so the log
      // carries the exceptions rather than a "none flagged" line every 700 ms (Review Focus 1).
      if (row.getAttribute("data-register-flagged") !== null) yield { announce: row.getAttribute("data-register-announce") ?? "" };
    }
    yield { announce: register.getAttribute("data-register-summary") ?? "" };
  },
};
