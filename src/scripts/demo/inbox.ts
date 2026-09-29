// The ③ Draft-for-Approval replay (spec §8.8, §9.1): a DemoRenderer for src/scripts/demo-engine.ts.
// - steps(stage, pb) draws the whole view into the stage at once, every part not yet shown marked
//   data-inbox-pending (visibility: hidden, in InboxTranscript's styles), then reveals it in place:
//   each message arrives, is sorted, and has its draft typed; then the approval queue and the trace
//   log. So the stage is the transcript's height from the first frame, and neither a step nor the
//   engine's swap back to the transcript moves anything below it (spec §11.4 CLS).
// - Each finished step yields its line from inboxPlan() for the engine's polite log.
// - A run stops drawing at its next await once its playback is cancelled, or once a later run of
//   this renderer has started, so Replay mid-run leaves exactly one view in the stage.
// The markup and words are InboxTranscript.astro's, from src/lib/inbox-copy.ts, and
// tests/demo-inbox.test.mjs holds the finished view's text to the built transcript's. No DOM
// access at import time: the tests run it in Node on tests/support/fake-dom.mjs.
import type { Playback } from "../playback.ts";
import type { DemoRenderer, DemoStep } from "../demo-engine.ts";
import {
  APPROVAL_LABEL, CHANNEL_TAG, DECISIONS, DECISION_NOTE, DECISION_SR, DRAFT_LABEL, TRACE_LABEL, WAITING_TAG,
  approvalLine, draftTo, escalatedLine, filedLine, formatMetric, inboxPlan, inboxSummary, introLine, introText, outcomeRows,
} from "../../lib/inbox-copy.ts";
import type { InboxData } from "../../content/schemas.ts";

/**
 * The script's pace, in ms. The real inbox's steps take about 13 s of script time. On the engine,
 * which holds each of the ten step lines for its 2.5 s STEP_GAP, a run takes about 38 s.
 */
export const PACE = { arrive: 300, sort: 350, draft: 200, tick: 12, chars: 2, panel: 400, traceStep: 120 } as const;

const PENDING = "data-inbox-pending";

interface DraftParts {
  box: HTMLElement;
  typed: Text;
  untyped: Text;
  text: string;
}
interface ItemParts {
  el: HTMLElement;
  outcome: HTMLElement;
  draft: DraftParts | null;
}
export interface InboxView {
  root: HTMLElement;
  items: ItemParts[];
  approval: HTMLElement;
  trace: HTMLElement;
  traceSteps: HTMLElement[];
}

function el(tag: string, cls?: string, text?: string, attrs: Record<string, string> = {}): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  for (const [name, value] of Object.entries(attrs)) n.setAttribute(name, value);
  return n;
}

/** "[word]", its brackets hidden from assistive technology, as MockPanel's status chips. */
function bracket(cls: string, word: string): HTMLElement {
  const tag = el("span", cls);
  tag.append(el("span", undefined, "[", { "aria-hidden": "true" }), document.createTextNode(word), el("span", undefined, "]", { "aria-hidden": "true" }));
  return tag;
}

/**
 * The inbox view InboxTranscript.astro renders, as DOM. With `pending`, every part the replay
 * reveals carries data-inbox-pending, and each draft's text waits in its hidden `untyped` node.
 */
export function buildView(data: InboxData, pending: boolean): InboxView {
  const hold = (n: HTMLElement): HTMLElement => {
    if (pending) n.setAttribute(PENDING, "");
    return n;
  };
  const summary = inboxSummary(data);
  const root = el("div", "inbox-view", undefined, { "data-inbox-view": "" });
  root.append(el("p", "inbox-intro", introLine(data)));

  const list = el("ol", "inbox-list");
  const items = data.messages.map((m): ItemParts => {
    const item = hold(el("li", "inbox-item", undefined, { "data-inbox-item": "", "data-inbox-action": m.action, "data-inbox-channel": m.channel }));
    const meta = el("p", "inbox-meta");
    meta.append(bracket("inbox-channel", CHANNEL_TAG[m.channel]), el("span", "inbox-from", m.from));
    item.append(meta);
    if (m.subject) item.append(el("p", "inbox-subject", m.subject));
    item.append(el("p", "inbox-body", m.body));
    const outcome = hold(el("dl", "inbox-outcome", undefined, { "data-inbox-outcome": "" }));
    for (const [term, value] of outcomeRows(m)) {
      const row = el("div");
      row.append(el("dt", undefined, term), el("dd", undefined, value));
      outcome.append(row);
    }
    item.append(outcome);
    let draft: DraftParts | null = null;
    if (m.draft) {
      const box = hold(el("div", "inbox-draft", undefined, { "data-inbox-draft": "" }));
      const text = el("p", "inbox-draft-text");
      const typed = document.createTextNode(pending ? "" : m.draft);
      const untyped = document.createTextNode(pending ? m.draft : "");
      const rest = el("span", "inbox-untyped", undefined, { "aria-hidden": "true" });
      rest.append(untyped);
      text.append(typed, rest);
      box.append(el("p", "inbox-label", DRAFT_LABEL), text);
      item.append(box);
      draft = { box, typed, untyped, text: m.draft };
    }
    list.append(item);
    return { el: item, outcome, draft };
  });
  root.append(list);

  const approval = hold(el("div", "inbox-panel", undefined, { "data-inbox-approval": "" }));
  approval.append(el("p", "inbox-label", APPROVAL_LABEL), el("p", undefined, approvalLine(summary)));
  const queue = el("ul", "inbox-queue");
  for (const m of summary.drafts) {
    const row = el("li", undefined, undefined, { "data-inbox-approval-item": "" });
    row.append(bracket("inbox-status", WAITING_TAG), document.createTextNode(` ${draftTo(m)}`));
    queue.append(row);
  }
  approval.append(queue);
  for (const line of [escalatedLine(summary), filedLine(summary)]) if (line !== null) approval.append(el("p", undefined, line));
  const decision = el("div", "inbox-decision");
  decision.append(el("p", "sr-only", DECISION_SR));
  for (const label of DECISIONS) decision.append(el("span", "inbox-btn", label, { "aria-hidden": "true" }));
  approval.append(decision, el("p", "inbox-note", DECISION_NOTE));
  root.append(approval);

  const trace = hold(el("div", "inbox-panel", undefined, { "data-inbox-trace": "" }));
  const steps = el("ol", "inbox-trace-list");
  const traceSteps = data.trace.map((t) => {
    const row = hold(el("li", "inbox-trace-step", undefined, { "data-inbox-trace-step": "" }));
    row.append(el("span", "inbox-trace-label", t.label), el("span", "inbox-trace-detail", t.detail), el("span", "inbox-trace-ms", formatMetric(t.ms)));
    steps.append(row);
    return row;
  });
  trace.append(el("p", "inbox-label", TRACE_LABEL), steps);
  root.append(trace);

  return { root, items, approval, trace, traceSteps };
}

export function inboxRenderer(data: InboxData): DemoRenderer {
  const plan = inboxPlan(data);
  let latest = 0;
  return {
    intro: introText(data),
    async *steps(stage: HTMLElement, pb: Playback): AsyncGenerator<DemoStep, void, undefined> {
      const run = ++latest;
      const live = () => run === latest && !pb.cancelled;
      if (!live()) return;
      const show = (n: HTMLElement) => n.removeAttribute(PENDING);
      const view = buildView(data, true);
      stage.replaceChildren(view.root);

      for (const step of plan) {
        if (step.kind === "message") {
          const item = view.items[step.index];
          await pb.wait(PACE.arrive);
          if (!live()) return;
          show(item.el);
          await pb.wait(PACE.sort);
          if (!live()) return;
          show(item.outcome);
          if (item.draft) {
            await pb.wait(PACE.draft);
            if (!live()) return;
            show(item.draft.box);
            const { typed, untyped, text } = item.draft;
            for (let i = PACE.chars; i < text.length && !pb.skipped; i += PACE.chars) {
              typed.data = text.slice(0, i);
              untyped.data = text.slice(i);
              await pb.wait(PACE.tick);
              if (!live()) return;
            }
            typed.data = text;
            untyped.data = "";
          }
        } else if (step.kind === "approval") {
          await pb.wait(PACE.panel);
          if (!live()) return;
          show(view.approval);
        } else {
          await pb.wait(PACE.panel);
          if (!live()) return;
          show(view.trace);
          for (const row of view.traceSteps) {
            await pb.wait(PACE.traceStep);
            if (!live()) return;
            show(row);
          }
        }
        yield { announce: step.announce };
        if (!live()) return;
      }
    },
  };
}
