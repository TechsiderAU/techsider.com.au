// The one reply-time sentence (go-global §4.5, R6). /contact/ (in its hero), /contact/sent/ and
// /llms.txt build it from CONTACT, so the reply time itself is written once, in src/data/contact.ts:
// never write it here, not even in a comment (tests/company-pages.test.mjs fails any other src/
// file that holds it). Plain TypeScript with no imports, so node tests import it directly.

/** `We reply within ${replyTime}, ${replyTimeBase}.`; subject "Techsider" gives `Techsider replies within …` (the /llms.txt fact). */
export function replySentence(contact: { replyTime: string; replyTimeBase: string }, subject: "We" | "Techsider" = "We"): string {
  const opening = subject === "We" ? "We reply" : "Techsider replies";
  return `${opening} within ${contact.replyTime}, ${contact.replyTimeBase}.`;
}
