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
//   /contact/sent/ (the form's data-sent). A rejection that names fields shows their errors; any
//   other answer says the enquiry wasn't sent. No answer (fetch rejects: an answer blocked for CORS,
//   or a dropped connection) says only that it may not have been sent, and points to the email
//   address, since the provider may have it. The form keeps every answer either way;
// - one enquiry at a time: a submit while one is on its way does nothing. The button is never
//   disabled, so focus never drops to <body>. A page restored from the back-forward cache after
//   the message-sent page opened starts afresh.
// The words come from the markup: each error line's data-missing and data-invalid, and the
// summary's data-say-* lines, which ContactForm.astro writes from src/lib/contact-form.ts.
import { ENQUIRY_FIELDS, errorLine, preselection, problemOf, rejectedFields, type EnquiryField, type Problem } from "../lib/contact-form";

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
  let sending = false;
  // Back from /contact/sent/ can restore this page as it was left, mid-send: start it afresh.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    sending = false;
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

  const tell = (state: "sending" | "failed", line = "") => {
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
    event.preventDefault();
    if (sending) return;
    const invalid: EnquiryField[] = [];
    for (const name of ENQUIRY_FIELDS) {
      const problem = problemOf(field(name).control.validity);
      show(name, problem);
      if (problem !== null) invalid.push(name);
    }
    if (invalid.length > 0) {
      report(invalid);
      return;
    }
    sending = true;
    tell("sending", say.saySending);
    const body = new URLSearchParams();
    for (const [key, value] of new FormData(form)) body.append(key, typeof value === "string" ? value : value.name);
    try {
      const response = await fetch(action, { method: "POST", body, headers: { Accept: "application/json" } });
      if (response.ok) {
        location.assign(sent);
        return;
      }
      const rejected = rejectedFields(await response.json().catch(() => null));
      sending = false;
      if (rejected.length === 0) {
        tell("failed", say.sayFailed);
        return;
      }
      // The browser found nothing wrong with these answers, so the provider's rule is the stricter one.
      for (const name of rejected) show(name, "invalid");
      report(rejected);
    } catch {
      // No answer to read: the provider may still have the enquiry (ledger ruling R4).
      sending = false;
      tell("failed", say.sayUnconfirmed);
    }
  });
}
