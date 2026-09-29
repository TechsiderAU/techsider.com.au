// The ② Knowledge Assistant replay (spec §8.8, §9.1): a DemoRenderer for src/scripts/demo-engine.ts.
// It types the demo's scenarios into the engine's aria-hidden stage in the static transcript's own
// structure and classes (src/components/demo/AssistantTranscript.astro), with its words from
// src/lib/assistant-copy.ts, so when a run ends the transcript takes the stage's place without a
// jump. For each scenario it draws the heading lines and the sources at once, then each turn in
// order: the question typed, the retrieved passages one by one, the outcome line, the answer typed
// with its citation marks, what the test caught (if anything) and the trace. A step is one turn.
// Nothing here is interactive or has an id: the stage is aria-hidden, and the transcript owns the
// links and the source ids.
import type { Playback } from "../playback.ts";
import type { DemoRenderer, DemoStep } from "../demo-engine.ts";
import type { AssistantData, AssistantTurn } from "../../content/schemas.ts";
import { attributionParts } from "../../lib/attribution.ts";
import {
  CAUGHT_LABEL, ILLUSTRATIVE_NOTE, OUTCOME, QUESTION_LABEL, RETRIEVED_LABEL, SOURCES_LABEL,
  announcements, chunkCite, introText, metricText, scenarioLabel,
  type AssistantScenario,
} from "../../lib/assistant-copy.ts";

/** Pacing, in playback milliseconds: two characters per tick, as the Phase 0 demo typed. */
export const PACE = { tick: 11, retrieve: 320, passage: 160, turn: 380, scenario: 600 } as const;

function el(tag: string, cls: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Types `text` into `node`, two characters a tick; all at once when the playback is instant. */
async function typeInto(node: HTMLElement, text: string, pb: Playback): Promise<void> {
  const typed = document.createTextNode("");
  node.append(typed);
  for (let i = 2; ; i += 2) {
    if (pb.cancelled) return;
    if (pb.skipped || i >= text.length) {
      typed.textContent = text;
      return;
    }
    typed.textContent = text.slice(0, i);
    await pb.wait(PACE.tick);
  }
}

function heading(scenario: AssistantScenario, index: number, total: number): HTMLElement {
  const head = el("div", "assist-head");
  const label = scenarioLabel(index, total);
  if (label !== null) head.append(el("p", "assist-kicker", label));
  head.append(el("p", "assist-title", scenario.title));
  const corpus = el("p", "assist-corpus", "Corpus: ");
  corpus.append(el("span", "assist-link", scenario.corpus.title), `, ${scenario.corpus.version}`);
  head.append(corpus);
  return head;
}

function sources(scenario: AssistantScenario): HTMLElement {
  const box = el("div", "assist-sources");
  box.append(el("p", "assist-role", SOURCES_LABEL));
  const list = el("ol", "assist-source-list");
  for (const source of scenario.sources) {
    const item = el("li", "assist-source");
    const label = el("p", "assist-source-label", `[${source.cite}] `);
    label.append(el("span", "assist-link", source.label));
    item.append(label, el("p", "assist-source-text", source.text));
    list.append(item);
  }
  const attribution = el("p", "assist-attribution");
  for (const part of attributionParts(scenario.corpus.attribution)) {
    if (part.kind === "text") attribution.append(part.text);
    else if (part.kind === "title") attribution.append(el("cite", "", part.text));
    else attribution.append(el("span", "assist-link", part.text));
  }
  box.append(list, attribution);
  return box;
}

async function drawTurn(list: HTMLElement, turn: AssistantTurn, pb: Playback): Promise<void> {
  if (pb.cancelled) return; // cancelled in the pause before this turn: draw none of it
  const item = el("li", "assist-turn");
  item.setAttribute("data-outcome", turn.outcome);
  list.append(item);
  item.append(el("p", "assist-role", QUESTION_LABEL));
  const question = el("p", "assist-q");
  item.append(question);
  await typeInto(question, turn.question, pb);
  if (pb.cancelled) return;

  const retrieval = el("div", "assist-retrieval");
  const passages = el("ol", "assist-chunks");
  retrieval.append(el("p", "assist-role", RETRIEVED_LABEL), passages);
  item.append(retrieval);
  await pb.wait(PACE.retrieve);
  for (const chunk of turn.retrieved) {
    if (pb.cancelled) return;
    const row = el("li", "assist-chunk");
    row.append(el("span", "assist-score", metricText(chunk.score)), " ", el("span", "assist-chunk-cite", chunkCite(chunk.cite)), " ", el("span", "assist-snippet", chunk.snippet));
    passages.append(row);
    await pb.wait(PACE.passage);
  }
  if (pb.cancelled) return;

  const outcome = el("p", "assist-role assist-outcome", OUTCOME[turn.outcome].label);
  outcome.setAttribute("data-status", OUTCOME[turn.outcome].status);
  const answer = el("p", "assist-a");
  item.append(outcome, answer);
  for (const segment of turn.answer) {
    await typeInto(answer, segment.text, pb);
    if (pb.cancelled) return;
    if (segment.cite !== undefined) answer.append(el("span", "assist-cite", `[${segment.cite}]`));
  }
  if (turn.caught !== undefined) {
    const caught = el("p", "assist-caught");
    caught.append(el("span", "assist-caught-label", CAUGHT_LABEL), ` ${turn.caught}`);
    item.append(caught);
  }
  const trace = el("ol", "assist-trace");
  for (const step of turn.trace) {
    const row = el("li", "assist-trace-step");
    row.append(el("span", "assist-trace-label", step.label), " ", el("span", "assist-trace-detail", step.detail), " ", el("span", "assist-trace-ms", metricText(step.ms)));
    trace.append(row);
  }
  item.append(trace);
}

/** The ② demo's renderer over its data file's `data` (src/data/demos/knowledge-assistant.json). */
export function assistantRenderer(data: AssistantData): DemoRenderer {
  const lines = announcements(data);
  return {
    intro: introText(data),
    async *steps(stage: HTMLElement, pb: Playback): AsyncGenerator<DemoStep, void, undefined> {
      if (pb.cancelled) return;
      const root = el("div", "assist");
      root.append(el("p", "assist-note", ILLUSTRATIVE_NOTE));
      stage.append(root); // the only node drawn into the stage itself; a cleared stage drops it
      let n = 0;
      for (const [index, scenario] of data.scenarios.entries()) {
        if (index > 0) await pb.wait(PACE.scenario);
        if (pb.cancelled) return;
        const box = el("div", "assist-scenario");
        box.setAttribute("data-scenario", scenario.id);
        const turns = el("ol", "assist-turns");
        box.append(heading(scenario, index, data.scenarios.length), turns, sources(scenario));
        root.append(box);
        for (const turn of scenario.turns) {
          await drawTurn(turns, turn, pb);
          if (pb.cancelled) return;
          yield { announce: lines[n++] };
          await pb.wait(PACE.turn);
        }
      }
    },
  };
}
