// The gallery's stand-in form provider (Phase E Task 1). The gallery's contact page posts its
// enquiry to tests/support/mock-form.mjs, which playwright.config.mjs starts on this port beside the
// static servers, so a browser test can follow an enquiry all the way to the message-sent page. The
// field names are Formspark's, which the mock implements. The endpoint is http on loopback, which
// contactData (https only) would refuse: this is a test double, never content, so ContactSpecimen
// spreads it over the contact fixture without the schema. Only the gallery imports it.
import type { ContactData } from "../content/page-schemas";

export const MOCK_FORM_PORT = 4324;

export const MOCK_FORM: Pick<ContactData, "formEndpoint" | "redirectField" | "hiddenFields" | "honeypotField"> = {
  formEndpoint: `http://127.0.0.1:${MOCK_FORM_PORT}/f/fixture-form`,
  redirectField: "_redirect",
  hiddenFields: { _append: "false" },
  honeypotField: "_gotcha",
};
