// The enquiry form's enhancement (spec §10.2). Without JavaScript the form is a plain POST to the
// form provider, which redirects to /contact/sent/, and the browser's own validation stops an
// incomplete enquiry. With it:
// - ?industry= and ?interest= preselect their select, but only with a value it offers (spec §10.1);
// - the form checks itself (novalidate): each error shows under its field, tied to it by
//   aria-describedby and aria-invalid, the polite summary above the fields lists the errors, each
//   linking to its field, and focus moves to the first field with an error. A field's error goes
//   once it is answered;
// - a complete enquiry goes by fetch: the same urlencoded fields a plain POST sends, with
//   Accept: application/json, so the provider answers in JSON instead of redirecting. A 2xx opens
//   /contact/sent/ (the form's data-sent). A supported 422 validation rejection names field errors; all
//   other outcomes, including server errors, CORS, connection loss and the 30-second deadline,
//   leave delivery unconfirmed and advise email instead of resubmitting. Answers stay in place;
// - one enquiry at a time: a submit while one is on its way does nothing. The button is never
//   disabled, so focus never drops to <body>. A page restored from the back-forward cache after
//   the message-sent page opened starts afresh.
// The words come from the markup: each error line's data-missing and data-invalid, and the
// summary's data-say-* lines, which ContactForm.astro writes from src/lib/contact-form.ts.
import { ENQUIRY_FIELDS, errorLine, preselection, problemOf, rejectedFields, type EnquiryField, type Problem } from "../lib/contact-form";

/** Deadline for the whole attempt, including response-body parsing. No automatic retry. */
export const SUBMISSION_DEADLINE_MS = 30_000;

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface Field {
  control: Control;
  error: HTMLElement;
}

function isControl(el: unknown): el is Control {
  return el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement;
}

/** The values a select offers, less its "Choose one" placeholder; nothing for any other control. */
function offered(control: Control): string[] {
  return control instanceof HTMLSelectElement ? [...control.options].map((o) => o.value).filter((v) => v !== "") : [];
}

/** Enhances one enquiry form. A form without its summary, its sent page or a field's error line stays a plain POST. */
export function initContactForm(form: HTMLFormElement): void {
  const summary = form.querySelector<HTMLElement>("[data-form-summary]");
  const sent = form.dataset.sent;
  const action = form.getAttribute("action");
  const fields = new Map<EnquiryField, Field>();
  for (const name of ENQUIRY_FIELDS) {
    const control = form.elements.namedItem(name);
    const error = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
    if (isControl(control) && error) fields.set(name, { control, error });
  }
  if (!summary || !sent || !action || fields.size !== ENQUIRY_FIELDS.length) return;
  const field = (name: EnquiryField) => fields.get(name) as Field;
  const say = summary.dataset;

  const chosen = preselection(location.search, { industry: offered(field("industry").control), interest: offered(field("interest").control) });
  for (const [name, value] of Object.entries(chosen) as [EnquiryField, string][]) {
    const { control } = field(name);
    if (control.value === "") control.value = value;
  }

  form.noValidate = true;
  let nativeSubmitted = false;
  let active: { controller: AbortController; timer: number } | null = null;
  const cancel = () => {
    if (!active) return;
    const previous = active;
    active = null; // Invalidate before abort can reject an old continuation.
    window.clearTimeout(previous.timer);
    previous.controller.abort();
  };
  // A persisted restore invalidates all continuations and resources of the previous attempt.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    cancel();
    nativeSubmitted = false;
    summary.replaceChildren();
    delete summary.dataset.state;
  });

  const show = (name: EnquiryField, problem: Problem | null) => {
    const { control, error } = field(name);
    error.textContent = problem === null ? "" : errorLine({ missing: error.dataset.missing ?? "", invalid: error.dataset.invalid }, problem);
    error.hidden = problem === null;
    const ids = (control.getAttribute("aria-describedby") ?? "").split(/\s+/).filter((id) => id !== "" && id !== error.id);
    if (problem !== null) ids.push(error.id);
    if (ids.length > 0) control.setAttribute("aria-describedby", ids.join(" "));
    else control.removeAttribute("aria-describedby");
    if (problem === null) control.removeAttribute("aria-invalid");
    else control.setAttribute("aria-invalid", "true");
  };

  const tell = (state: "sending" | "unconfirmed", line = "") => {
    const p = document.createElement("p");
    p.textContent = line;
    summary.replaceChildren(p);
    summary.dataset.state = state;
  };

  const report = (names: EnquiryField[]) => {
    const title = document.createElement("p");
    title.textContent = say.sayInvalid ?? "";
    const list = document.createElement("ul");
    for (const name of names) {
      const { control, error } = field(name);
      const link = document.createElement("a");
      link.href = `#${control.id}`;
      link.dataset.errorLink = name;
      link.textContent = error.textContent;
      const item = document.createElement("li");
      item.append(link);
      list.append(item);
    }
    summary.replaceChildren(title, list);
    summary.dataset.state = "invalid";
    field(names[0]).control.focus();
  };

  // A summary link moves focus to its field: following the fragment alone would only scroll.
  summary.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[data-error-link]") : null;
    if (!link) return;
    event.preventDefault();
    field(link.dataset.errorLink as EnquiryField).control.focus();
  });

  const recheck = (event: Event) => {
    for (const [name, { control }] of fields) {
      if (control === event.target && control.getAttribute("aria-invalid") === "true" && control.validity.valid) show(name, null);
    }
  };
  form.addEventListener("input", recheck);
  form.addEventListener("change", recheck);

  form.addEventListener("submit", async (event) => {
    if (active || nativeSubmitted) {
      event.preventDefault();
      return;
    }
    const invalid: EnquiryField[] = [];
    for (const name of ENQUIRY_FIELDS) {
      const problem = problemOf(field(name).control.validity);
      show(name, problem);
      if (problem !== null) invalid.push(name);
    }
    if (invalid.length > 0) {
      event.preventDefault();
      report(invalid);
      return;
    }
    // Keep the provider's browser POST, spam challenge and redirect intact.
    if (form.dataset.submitMode === "native") {
      nativeSubmitted = true;
      tell("sending", say.saySending);
      return;
    }
    event.preventDefault();
    const attempt = { controller: new AbortController(), timer: 0 };
    active = attempt;
    attempt.timer = window.setTimeout(() => {
      if (active !== attempt) return;
      cancel();
      tell("unconfirmed", say.sayUnconfirmed);
    }, SUBMISSION_DEADLINE_MS);
    tell("sending", say.saySending);
    const body = new URLSearchParams();
    for (const [key, value] of new FormData(form)) body.append(key, typeof value === "string" ? value : value.name);
    try {
      const response = await fetch(action, { method: "POST", body, headers: { Accept: "application/json" }, signal: attempt.controller.signal });
      if (active !== attempt) return;
      if (response.ok) {
        // Keep submit suppression during navigation; pageshow invalidates it on a restore.
        window.clearTimeout(attempt.timer);
        attempt.controller.abort(); // The success body is not used; release its transport.
        location.assign(sent);
        return;
      }
      // Only the local supported 422 validation contract proves a field rejection. A 5xx with
      // an errors-shaped body still cannot establish whether the provider delivered the enquiry.
      const rejected = response.status === 422 ? rejectedFields(await response.json().catch(() => null)) : [];
      if (active !== attempt) return;
      cancel();
      if (rejected.length === 0) {
        tell("unconfirmed", say.sayUnconfirmed);
        return;
      }
      for (const name of rejected) show(name, "invalid");
      report(rejected);
    } catch {
      if (active !== attempt) return;
      cancel();
      tell("unconfirmed", say.sayUnconfirmed);
    } finally {
      window.clearTimeout(attempt.timer);
    }
  });
}
