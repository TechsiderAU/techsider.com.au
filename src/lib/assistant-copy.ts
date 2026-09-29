// The ② Knowledge Assistant demo's words (spec §8.8, §9.1), in one place for its two renderings:
// the static transcript (src/components/demo/AssistantTranscript.astro) and the replay that types
// it out (src/scripts/demo/assistant.ts). Both build their text from these functions, so the
// replay can never say what the transcript doesn't (tests/demo-assistant.test.mjs compares them).
// Attributions go through src/lib/attribution.ts. Node-importable: fixed-copy.ts is plain
// TypeScript, and the schema import is type-only.
import type { AssistantData, AssistantTurn } from "../content/schemas.ts";
import { ACCEPTANCE_TEST_LABEL } from "./fixed-copy.ts";

export type AssistantScenario = AssistantData["scenarios"][number];
export type Outcome = AssistantTurn["outcome"];

/** A typed metric (spec §9.3) as the site prints one: the value, then its unit ("0.91", "41ms"), as TracePanel does. */
export function metricText(m: { value: number; unit?: string }): string {
  return `${m.value}${m.unit ?? ""}`;
}

/** Printed once, above the first scenario: the scores and timings are part of the script. */
export const ILLUSTRATIVE_NOTE = "Scores and timings are illustrative: a scripted replay, not a measured run.";
export const QUESTION_LABEL = "Question";
export const SOURCES_LABEL = "Sources";
export const UNCITED = "not cited";
export const CAUGHT_LABEL = "What the test caught:";

/** "Scenario 1 of 2"; nothing when the demo has one scenario. */
export function scenarioLabel(index: number, total: number): string | null {
  return total > 1 ? `Scenario ${index + 1} of ${total}` : null;
}

/**
 * The retrieved list's label. It names no k: the list shows the passages this turn displays, and the
 * retriever's k is in the trace's Retrieve step, so a count here would contradict it.
 */
export const RETRIEVED_LABEL = "Retrieved passages";

/** A retrieved passage's citation mark: "[2]", or "not cited" for a passage the answer didn't use (cite 0). */
export function chunkCite(cite: number): string {
  return cite > 0 ? `[${cite}]` : UNCITED;
}

/**
 * The line above each answer. The status is the token that colours it (ok, review, blocked); the
 * words carry the meaning on their own (spec §6.6: status is never shown by colour alone). The
 * false-answer label names the test as §4.4 requires: Techsider testing its own system.
 */
export const OUTCOME: Record<Outcome, { label: string; status: "ok" | "review" | "blocked" }> = {
  answered: { label: "Answer", status: "ok" },
  refused: { label: "Refused: the answer isn't in these documents", status: "review" },
  "false-answer-caught": { label: `False answer, caught by the ${ACCEPTANCE_TEST_LABEL.toLowerCase()}`, status: "blocked" },
};

/** The citations an answer makes, in first-use order, without repeats. */
export function citesIn(turn: AssistantTurn): number[] {
  const out: number[] = [];
  for (const seg of turn.answer) if (seg.cite !== undefined && !out.includes(seg.cite)) out.push(seg.cite);
  return out;
}

/** "source 1", "sources 1 and 2", "sources 1, 2 and 4". */
function sourceList(cites: number[]): string {
  if (cites.length === 1) return `source ${cites[0]}`;
  return `sources ${cites.slice(0, -1).join(", ")} and ${cites[cites.length - 1]}`;
}

const turnCount = (data: AssistantData) => data.scenarios.reduce((n, s) => n + s.turns.length, 0);

/** What the log says when a replay starts. */
export function introText(data: AssistantData): string {
  const scenarios = data.scenarios.length;
  const from = scenarios > 1 ? ` from ${scenarios} scenarios` : "";
  return `Replay started: ${turnCount(data)} questions${from}. Use Pause to hold it, or Skip to result to read the full transcript now.`;
}

/**
 * What the log says as each question's turn finishes, one line per turn in replay order. The first
 * turn of each scenario names it. No line repeats how to skip ahead: the intro says it once, and a
 * shorter line leaves a screen reader time to finish it before the next lands (Review Focus 1).
 */
export function announcements(data: AssistantData): string[] {
  const total = turnCount(data);
  const lines: string[] = [];
  data.scenarios.forEach((scenario, si) => {
    scenario.turns.forEach((turn, ti) => {
      const n = lines.length + 1;
      const label = ti === 0 ? scenarioLabel(si, data.scenarios.length) : null;
      // A scenario title is a sentence with its own full stop (spec §3.3), so it isn't given another.
      const head = label === null ? "" : `${label}, ${scenario.title.replace(/\.$/, "")}. `;
      const cites = citesIn(turn);
      const outcome =
        turn.outcome === "answered"
          ? cites.length > 0 ? `Answered, citing ${sourceList(cites)}.` : "Answered."
          : turn.outcome === "refused"
            ? "Refused: the answer isn't in these documents."
            : `${OUTCOME["false-answer-caught"].label}.`; // spec §4.4's label, as on screen
      lines.push(`${head}Question ${n} of ${total}: ${turn.question} ${outcome}`);
    });
  });
  return lines;
}
