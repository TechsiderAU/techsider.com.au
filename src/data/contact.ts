// The contact page's data (spec §8.11, §10.2), validated by contactData in
// src/content/page-schemas.ts. /contact/ reads the reply time from here, and so does /contact/sent/,
// which goes live with the form: no other page states a reply time. The providers and the
// sub-processors also fill the Trust page's Part A table, so the two pages can't disagree.
// ⚑ owner: every commitment in this file must be in the standard engagement terms (spec §12 item 2)
import type { ContactData } from "../content/page-schemas.ts";
import { SITE } from "./nav.ts";

export const CONTACT: ContactData = {
  // ⚑ owner: confirm the reply-time promise (spec §12 item 9)
  replyTime: "two business days",
  // The form posts to any provider that takes a plain POST and keeps the enquiry fields' names
  // (spec §10.2). Until the owner chooses one, /contact/ has no form and leads with the email
  // address, and /contact/sent/ stays planned.
  // Going live is one change, made once the privacy policy is live (spec §8.11): set the endpoint,
  // the provider and its three field settings below, add the provider to subProcessors, and put
  // /contact/sent/ live in nav.ts. The build fails while the endpoint and /contact/sent/ disagree,
  // and tests/contact-form.test.mjs while the privacy policy or the sub-processor row is missing.
  // The tests that pin today's state (no endpoint, /contact/sent/ planned) move in the same change.
  // ⚑ owner: choose the form provider and create its form (spec §10.2, §12 item 1), then set its endpoint here
  formEndpoint: null,
  // ⚑ owner: name the chosen form provider and its storage country (spec §12 item 1); no row names one until then
  formProvider: null,
  // The provider's own field names. Formspark: redirectField "_redirect", hiddenFields
  // { _append: "false" }. Formcarry: redirectField "_next", no hidden fields. Forminit sets its
  // redirect in its dashboard (redirectField null), but stores only inputs named fi-…, so choosing
  // it also means renaming the enquiry fields. All three treat a submission whose "_gotcha" is
  // filled as spam.
  redirectField: null,
  hiddenFields: {},
  honeypotField: "_gotcha",
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
      data: "Emails you send us: your name, your email address and your message",
    },
  ],
  whatNext: [
    "A 30-minute Fit Call about what you want to fix. If your platform's AI already does the job, you hear that on the call.",
    "An NDA before you share anything confidential, if you want one.",
    "A written proposal: the scope, what you get, your time, the timeline and the go/no-go gate.",
  ],
  // ⚑ owner: a security contact address for security.txt (spec §12 item 7); every request goes to the one mailbox until then
  deflection: [
    { title: "Security disclosure", body: "Report a weakness in this website or our email: what you found, where and when.", email: SITE.email },
    { title: "Privacy request", body: "Ask what personal information we hold about you, or ask us to correct or delete it.", email: SITE.email },
    { title: "Press", body: "Send media questions about Techsider.", email: SITE.email },
  ],
};
