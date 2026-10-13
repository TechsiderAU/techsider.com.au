// The contact page's data (spec §8.11, §10.2), validated by contactData in
// src/content/page-schemas.ts. /contact/ reads the reply time from here, and so does /contact/sent/,
// which goes live with the form: no other page states a reply time. The providers and the
// sub-processors also fill the Trust page's Part A table, so the two pages can't disagree.
// INTERNATIONAL is the "For organisations outside Australia" block (go-global §7.3), validated by
// internationalData: only its confirmed lines render.
// ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2)
import type { ContactData, InternationalData } from "../content/page-schemas.ts";
import { DELIVERY_MODEL } from "../lib/fixed-copy.ts";
import { SITE } from "./nav.ts";

export const CONTACT: ContactData = {
  // ⚑ owner: confirm the reply-time promise (spec §12 item 9)
  replyTime: "two business days",
  // The reply sentence's time base (go-global §4.5, D7) and the business's time zone (go-global §8.4).
  replyTimeBase: "Sydney time (AEST/AEDT)",
  timeZone: "Australia/Sydney",
  // FormSubmit requires one-time inbox activation after the first submission. Native POST keeps
  // its reCAPTCHA enabled and returns to /contact/sent/ after acceptance; no AJAX success guess.
  // https://formsubmit.co/documentation
  formEndpoint: `https://formsubmit.co/${SITE.email}`,
  submitMode: "native",
  // ⚑ owner: confirm FormSubmit's storage/access countries with the provider (spec §12 item 1)
  formProvider: { name: "FormSubmit", country: "Storage countries not yet confirmed" },
  redirectField: "_next",
  hiddenFields: {
    _subject: "New Techsider website enquiry",
    _template: "table",
    // Preserve the exact page: cross-origin referrer policies otherwise report only the homepage.
    _url: "https://techsider.com.au/contact/",
  },
  honeypotField: "_honey",
  // ⚑ owner: confirm the email provider and its storage country with the provider, not from DNS (spec §12 item 1)
  emailProvider: { name: "Lark Suite", country: "Not yet confirmed with Lark Suite" },
  // The services that touch website and email data today, as the Trust page's Part A table lists them.
  // ⚑ owner: confirm each storage country with the provider (spec §12 item 1)
  subProcessors: [
    {
      entity: "GitHub Pages",
      purpose: "Hosts and serves this website's files",
      country: "Not yet confirmed with GitHub",
      data: "The website's public files, and the requests made for them",
    },
    {
      entity: "Cloudflare",
      purpose: "Runs the domain's DNS and passes requests to the website",
      country: "Not yet confirmed with Cloudflare",
      data: "Requests to the website, on their way to GitHub Pages",
    },
    {
      entity: "Lark Suite",
      purpose: "Hosts our email, including the enquiries you send us",
      country: "Not yet confirmed with Lark Suite",
      data: "Emails you send us, and the enquiries FormSubmit forwards: the details you enter and, when JavaScript runs, your browser's time zone",
    },
    {
      entity: "FormSubmit",
      purpose: "Receives website enquiries and emails them to our mailbox",
      country: "Storage countries not yet confirmed",
      data: "The enquiry fields you submit and requests used for spam protection",
    },
  ],
  whatNext: [
    "A 30-minute Fit Call about what you want to fix. If your platform's AI already does the job, you hear that on the call.",
    "An NDA before you share anything confidential, if you want one.",
    "A written proposal: the scope, what you get, your time, the timeline and the go/no-go gate.",
  ],
  // ⚑ owner: a security contact address for security.txt (spec §12 item 7); every request goes to the one mailbox until then
  deflection: [
    { title: "Security, privacy and media", body: "For security reports, privacy requests or media enquiries, email us with the details.", email: SITE.email },
  ],
};

export const INTERNATIONAL: InternationalData = [
  { id: "entity", text: "Techsider Pty Ltd, ABN 12 636 205 868, headquartered in Sydney, Australia.", confirmed: true, gate: null },
  { id: "delivery", text: DELIVERY_MODEL, confirmed: true, gate: null },
  {
    id: "certifications",
    text: "We hold no ISO/IEC 27001 or ISO/IEC 42001 certification, no SOC 2 attestation report and no Cyber Essentials certificate.",
    confirmed: true,
    gate: null,
  },
  // ⚑ owner: publish the dpa line only after the lawyer review (go-global §2.3, O2)
  {
    id: "dpa",
    text: "We sign a data processing agreement. Our team reaches your systems from Australia, which counts as a transfer, so for personal data from the EU or UK the agreement includes the EU standard contractual clauses, or the UK IDTA or UK Addendum.",
    confirmed: false,
    gate: "legal",
  },
  // ⚑ owner: add the EU/UK representative's details if one is appointed (go-global §7.3, O1)
  { id: "representative", text: "Our EU/UK representative: …", confirmed: false, gate: "owner" },
];
