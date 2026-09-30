// The ③ Draft-for-Approval demo's words (spec §8.8, §9.1): a synthetic property-management shared
// inbox. The static transcript (src/components/demo/InboxTranscript.astro) and the replay
// (src/scripts/demo/inbox.ts) both take their text from here, so the replay's final state and the
// no-JS transcript say the same thing in the same words, and each step's log line is fixed in one
// place. DOM-free and Node-importable: tests/demo-inbox.test.mjs runs it over the real data.
import type { InboxData } from "../content/schemas.ts";

export type InboxMessage = InboxData["messages"][number];
type Metric = InboxData["trace"][number]["ms"];

/** The view's first line. The data never names the office: every sender and property is invented. */
export const INBOX_INTRO = "Synthetic shared inbox, outside the property system. Every sender, property and message is invented.";
/** The bracket tag before each sender (the Acid Signal bracket device, spec §3.3). */
export const CHANNEL_TAG: Record<InboxMessage["channel"], string> = { email: "email", sms: "sms" };
/** The channel's name in running text and in the log. */
export const CHANNEL_NAME: Record<InboxMessage["channel"], string> = { email: "email", sms: "SMS" };
/** What the automation did with a message: its Action row, and the end of its log line. */
export const ACTION_LABEL: Record<InboxMessage["action"], string> = {
  "draft-for-approval": "Drafted for approval",
  escalate: "Escalated to a property manager, with no draft",
  file: "Filed, with no reply",
};
export const OUTCOME_TERMS = { category: "Sorted as", action: "Action", reason: "Why" } as const;
export const DRAFT_LABEL = "Draft, waiting for approval";
export const APPROVAL_LABEL = "Approval queue";
export const WAITING_TAG = "waiting";
export const TRACE_LABEL = "Trace log · illustrative timings";
/** The approval screen's decision row: shown, never clickable (as MockPanel's decision row). */
export const DECISIONS = ["Approve and send", "Edit", "Reject"] as const;
export const DECISION_SR = `Decision buttons shown for illustration: ${DECISIONS.join(", ")}.`;
export const DECISION_NOTE = "Shown for illustration: in this replay, nothing is sent.";

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const AU = new Intl.NumberFormat("en-AU");

/** A typed metric as the page shows it: "2,910 ms". */
export function formatMetric(m: Metric): string {
  return m.unit ? `${AU.format(m.value)} ${m.unit}` : AU.format(m.value);
}

/** The intro line: the fixed synthetic notice, then how many messages came in, on which channels. */
export function introLine(data: InboxData): string {
  const channels = (["email", "sms"] as const).filter((c) => data.messages.some((m) => m.channel === c));
  return `${INBOX_INTRO} ${count(data.messages.length, "message", "messages")}, by ${channels.map((c) => CHANNEL_NAME[c]).join(" and ")}.`;
}

/** The three rows under each message: its category, the action taken, and why. */
export function outcomeRows(m: InboxMessage): [string, string][] {
  return [
    [OUTCOME_TERMS.category, m.category],
    [OUTCOME_TERMS.action, ACTION_LABEL[m.action]],
    [OUTCOME_TERMS.reason, m.reason],
  ];
}

export interface InboxSummary {
  drafts: InboxMessage[];
  escalated: InboxMessage[];
  filed: InboxMessage[];
}

export function inboxSummary(data: InboxData): InboxSummary {
  const by = (action: InboxMessage["action"]) => data.messages.filter((m) => m.action === action);
  return { drafts: by("draft-for-approval"), escalated: by("escalate"), filed: by("file") };
}

/**
 * One approval-queue row: who the draft goes to, and what it's about. No draft goes to a tenant
 * (controller ruling 5), so the recipient is the message's `to`, not its sender; and the row names the
 * message's category, in the demo's own words, not the sender's subject line, whose "our" would be the
 * sender's (final review D4-M3).
 */
export function draftTo(m: InboxMessage): string {
  return `Draft to ${m.to}: ${m.category}`;
}

export function approvalLine(s: InboxSummary): string {
  return `${count(s.drafts.length, "draft waits", "drafts wait")} for a property manager. Nothing is sent until a person approves it.`;
}

/** Null when nothing was escalated, so neither the view nor the log mentions it. */
export function escalatedLine(s: InboxSummary): string | null {
  return s.escalated.length ? `Escalated to a property manager, with no draft: ${s.escalated.map((m) => m.from).join("; ")}.` : null;
}

/** Null when nothing was filed. */
export function filedLine(s: InboxSummary): string | null {
  return s.filed.length ? `Filed, with no reply: ${s.filed.map((m) => m.from).join("; ")}.` : null;
}

/** The log's first line for each run (the engine's DemoRenderer.intro). */
export function introText(data: InboxData): string {
  return `Replay started: ${count(data.messages.length, "message", "messages")} in a synthetic shared inbox, each sorted, then the approval queue and the trace log. Use Pause to hold it, or Skip to result to read the full transcript now.`;
}

export type InboxStep =
  | { kind: "message"; index: number; message: InboxMessage; announce: string }
  | { kind: "approval"; announce: string }
  | { kind: "trace"; announce: string };

/**
 * The replay, step by step: one step per message in inbox order, then the approval queue, then
 * the trace log. `announce` is the line the engine appends once to the polite log when the step
 * finishes (spec §8.8): what arrived, how it was sorted and what was done with it. An escalation
 * also says why, because that is the step a listener most needs to hear.
 */
export function inboxPlan(data: InboxData): InboxStep[] {
  const n = data.messages.length;
  const summary = inboxSummary(data);
  const messages: InboxStep[] = data.messages.map((m, index) => {
    const about = m.subject ? `, about "${m.subject}"` : "";
    const why = m.action === "escalate" ? ` ${m.reason}` : "";
    return {
      kind: "message",
      index,
      message: m,
      announce: `Message ${index + 1} of ${n}, ${CHANNEL_NAME[m.channel]} from ${m.from}${about}. Sorted as ${m.category}. ${ACTION_LABEL[m.action]}.${why}`,
    };
  });
  const approval = [approvalLine(summary), escalatedLine(summary), filedLine(summary)].filter((line) => line !== null).join(" ");
  return [
    ...messages,
    { kind: "approval", announce: `${APPROVAL_LABEL}: ${approval}` },
    { kind: "trace", announce: `Trace log: ${count(data.trace.length, "step", "steps")} recorded, with illustrative timings.` },
  ];
}

/** The log's step lines, in replay order. */
export function announcements(data: InboxData): string[] {
  return inboxPlan(data).map((step) => step.announce);
}
